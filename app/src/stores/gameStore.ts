import { create } from 'zustand';
import {
  loadProgress,
  saveProgress,
  onStageClear as persistStageClear,
  returnToCheckpoint as persistReturnToCheckpoint,
  incrementDeaths,
  incrementPlays,
  resetProgress,
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

  hydrate: () => Promise<void>;
  goToScreen: (screen: Screen) => void;
  startFromProgress: () => Promise<void>;
  onDeath: () => Promise<void>;
  onStageCleared: () => Promise<void>;
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

  async hydrate() {
    const data = await loadProgress();
    set({
      currentStage: Math.min(Math.max(data.currentStage, 1), TOTAL_STAGES),
      checkpointStage: Math.min(Math.max(data.checkpointStage, 1), TOTAL_STAGES),
      maxClearedStage: data.maxClearedStage,
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
    });
    // currentStage 그대로 사용
  },

  async onDeath() {
    await incrementDeaths();
    const { lives } = get();
    const nextLives = lives - 1;
    if (nextLives > 0) {
      set({ lives: nextLives });
    } else {
      set({ lives: 0, isGameOver: true });
    }
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
      // 부활: 목숨을 3개로 리필 (HUD 하트 3개와 일치 — 기존 6개 버그 수정)
      set({
        lives: INITIAL_LIVES,
        isGameOver: false,
        showAd: null,
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
    });
  },

  pause() {
    set({ isPaused: true });
  },

  resume() {
    set({ isPaused: false });
  },

  async reset() {
    // 진행만 초기화 — 해금(부품/스킨)은 unlockStore 소관으로 유지된다
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
    });
    await saveProgress({ currentStage: next });
  }
}
