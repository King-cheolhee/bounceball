import { create } from 'zustand';
import {
  loadProgress,
  saveProgress,
  onStageClear as persistStageClear,
  returnToCheckpoint as persistReturnToCheckpoint,
  incrementDeaths,
  incrementPlays,
  resetProgress,
  loadStageRecords,
  mergeStageRecord,
  type StageRecord,
} from '../services/storage';
import { INITIAL_LIVES, TOTAL_STAGES, CHECKPOINTS, INTERSTITIAL_AD_STAGES } from '../utils/constants';
import { getUnlockMessage } from '../utils/story';

type Screen = 'splash' | 'menu' | 'play' | 'settings';

interface GameState {
  screen: Screen;
  currentStage: number;
  checkpointStage: number;
  maxClearedStage: number;
  lives: number;
  hydrated: boolean;
  isGameOver: boolean;
  isStageClearing: boolean;
  isPaused: boolean;
  showAd: 'interstitial' | 'rewarded' | null;
  pendingNextStage: number | null;
  /** 클리어 오버레이에 표시할 해금 메시지 (사운드 칩 채널 복구 등) */
  lastUnlockMsg: string | null;
  /** 현재 스테이지 진입 이후 사망 횟수 — 노데스(완수 메타) 판정용 (V2) */
  stageDeaths: number;
  /** 스테이지별 완수 기록 (부품 전량 / 노데스) — 진행 초기화에도 유지 (V2) */
  stageRecords: Record<number, StageRecord>;

  hydrate: () => Promise<void>;
  goToScreen: (screen: Screen) => void;
  startFromProgress: () => Promise<void>;
  /** 특정 스테이지로 바로 진입 (스테이지 셀렉트/확인용) */
  startStage: (stage: number) => Promise<void>;
  /** 사망 '계수' — 엔진이 사망 연출 시작 즉시 호출. 연출 중 일시정지→재시도로
   *  지연 콜백이 증발해도 노데스 기록·통계가 오염되지 않는다 (리뷰 확정) */
  countDeath: () => Promise<void>;
  /** 사망 '처리' — 연출 종료 후: 목숨 차감·게임오버 판정 (계수는 countDeath가 담당) */
  onDeath: () => Promise<void>;
  /** 클리어 직후 완수 기록 병합 — onStageCleared보다 먼저 호출할 것 (stageDeaths 사용) */
  recordStageResult: (stageId: number, allParts: boolean) => Promise<void>;
  onStageCleared: () => Promise<void>;
  /** 일시정지 → 메뉴 복귀: 진행(currentStage) 보존. 체크포인트 롤백은
   *  게임오버 전용(giveUpToCheckpoint) — 무경고 진행 손실 방지 (리뷰 확정) */
  quitToMenu: () => void;
  consumeAd: (rewarded: boolean) => void;
  reviveWithAd: () => void;
  retryStage: () => void;
  giveUpToCheckpoint: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  reset: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'splash',
  currentStage: 1,
  checkpointStage: 1,
  maxClearedStage: 0,
  lives: INITIAL_LIVES,
  hydrated: false,
  isGameOver: false,
  isStageClearing: false,
  isPaused: false,
  showAd: null,
  pendingNextStage: null,
  lastUnlockMsg: null,
  stageDeaths: 0,
  stageRecords: {},

  async hydrate() {
    const [data, records] = await Promise.all([loadProgress(), loadStageRecords()]);
    set({
      currentStage: Math.min(Math.max(data.currentStage, 1), TOTAL_STAGES),
      checkpointStage: Math.min(Math.max(data.checkpointStage, 1), TOTAL_STAGES),
      maxClearedStage: data.maxClearedStage,
      stageRecords: records,
      hydrated: true,
    });
  },

  goToScreen(screen) {
    set({ screen });
  },

  async startFromProgress() {
    await incrementPlays();
    set({
      screen: 'play',
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      lastUnlockMsg: null,
      stageDeaths: 0, // 새 진입 — 노데스 카운터 리셋
    });
    // currentStage 그대로 사용
  },

  async startStage(stage: number) {
    await incrementPlays();
    set({
      currentStage: Math.min(Math.max(stage, 1), TOTAL_STAGES),
      screen: 'play',
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      lastUnlockMsg: null,
      stageDeaths: 0,
    });
  },

  async countDeath() {
    set({ stageDeaths: get().stageDeaths + 1 });
    await incrementDeaths();
  },

  async onDeath() {
    const { lives } = get();
    const nextLives = lives - 1;
    if (nextLives > 0) {
      set({ lives: nextLives });
    } else {
      set({ lives: 0, isGameOver: true });
    }
  },

  async recordStageResult(stageId: number, allParts: boolean) {
    const noDeath = get().stageDeaths === 0;
    const records = await mergeStageRecord(stageId, { allParts, noDeath });
    set({ stageRecords: records });
  },

  async onStageCleared() {
    const { currentStage } = get();
    await persistStageClear(currentStage);
    const next = currentStage + 1;
    const prevMax = get().maxClearedStage;
    const updates: Partial<GameState> = {
      maxClearedStage: Math.max(prevMax, currentStage),
      isStageClearing: true,
      lastUnlockMsg: getUnlockMessage(currentStage),
    };
    if (next > TOTAL_STAGES) {
      // 게임 전체 클리어 — 다음 회차를 위해 처음부터로 저장
      // (기존 버그: Stage 20만 반복 재시작됐음 — 수정 완료)
      updates.pendingNextStage = null;
      await saveProgress({ currentStage: 1, checkpointStage: 1 });
    } else {
      updates.pendingNextStage = next;
    }
    // 체크포인트 갱신 — constants의 CHECKPOINTS 단일 소스 사용
    // (기존: [6,11,16] 하드코딩이 3곳에 흩어져 있었음 — 통일)
    if (CHECKPOINTS.includes(next)) {
      updates.checkpointStage = next;
    }
    set(updates);
  },

  consumeAd(rewarded: boolean) {
    const { showAd } = get();
    if (showAd === 'rewarded' && rewarded) {
      // 부활: 목숨을 3개로 리필 (HUD 하트 3개와 일치 — 기존 6개 버그 수정).
      // 스테이지를 처음부터 다시 시작하는 '새 시도'이므로 노데스 카운터도 리셋
      // (시도 단위 의미론 — 경로별 판정 비일관 수정, 리뷰 확정)
      set({
        lives: INITIAL_LIVES,
        isGameOver: false,
        showAd: null,
        stageDeaths: 0,
      });
    } else if (showAd === 'interstitial') {
      const next = get().pendingNextStage;
      if (next !== null) {
        set({
          currentStage: next,
          pendingNextStage: null,
          isStageClearing: false,
          lives: INITIAL_LIVES,
          showAd: null,
          lastUnlockMsg: null,
          stageDeaths: 0,
        });
      } else {
        set({ showAd: null });
      }
    } else {
      set({ showAd: null });
    }
  },

  reviveWithAd() {
    set({ showAd: 'rewarded' });
  },

  retryStage() {
    set({
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      // 처음부터 다시 시작하는 '새 시도' — 노데스 카운터 리셋 (시도 단위 의미론, 리뷰 확정)
      stageDeaths: 0,
    });
  },

  quitToMenu() {
    // 진행(currentStage)과 저장소는 건드리지 않는다 — 일시정지에서 메뉴로 나가는
    // 행위가 체크포인트 롤백(영구 진행 손실)을 일으키던 문제 수정 (리뷰 확정)
    set({
      screen: 'menu',
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      stageDeaths: 0,
    });
  },

  async giveUpToCheckpoint() {
    const cp = await persistReturnToCheckpoint();
    set({
      screen: 'menu',
      currentStage: cp,
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      stageDeaths: 0,
    });
  },

  pause() {
    set({ isPaused: true });
  },

  resume() {
    set({ isPaused: false });
  },

  async reset() {
    // 진행만 초기화 — 해금(부품/스킨)과 완수 기록(stageRecords)은 성취 데이터로 유지
    await resetProgress();
    set({
      currentStage: 1,
      checkpointStage: 1,
      maxClearedStage: 0,
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
      lastUnlockMsg: null,
      stageDeaths: 0,
    });
  },
}));

/** 클리어 후 다음 스테이지 진입 (광고 필요 시 광고 트리거). */
export async function advanceAfterClear() {
  const state = useGameStore.getState();
  const next = state.pendingNextStage;
  if (next === null) {
    // 전체 클리어 — 새 회차 준비 상태로 메뉴 복귀
    useGameStore.setState({
      isStageClearing: false,
      screen: 'menu',
      currentStage: 1,
      checkpointStage: 1,
      lastUnlockMsg: null,
      stageDeaths: 0,
    });
    return;
  }
  // 10, 15 클리어 후 전면 광고 (1~9 완전 무광고 — 앱인토스 다크패턴 금지 준수)
  const previousStage = next - 1;
  if (INTERSTITIAL_AD_STAGES.includes(previousStage)) {
    useGameStore.setState({ showAd: 'interstitial' });
  } else {
    useGameStore.setState({
      currentStage: next,
      pendingNextStage: null,
      isStageClearing: false,
      lives: INITIAL_LIVES,
      lastUnlockMsg: null,
      stageDeaths: 0,
    });
    await saveProgress({ currentStage: next });
  }
}
