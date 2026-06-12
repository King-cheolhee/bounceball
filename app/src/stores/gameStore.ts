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
import { INITIAL_LIVES, TOTAL_STAGES } from '../utils/constants';

type Screen = 'splash' | 'menu' | 'play' | 'settings';

interface GameState {
  screen: Screen;
  currentStage: number;
  checkpointStage: number;
  maxClearedStage: number;
  lives: number;
  bonusLives: number; // 보상형 광고로 받은 추가 목숨
  hydrated: boolean;
  isGameOver: boolean;
  isStageClearing: boolean;
  isPaused: boolean;
  showAd: 'interstitial' | 'rewarded' | null;
  pendingNextStage: number | null;

  hydrate: () => Promise<void>;
  goToScreen: (screen: Screen) => void;
  startFromProgress: () => Promise<void>;
  startFromCheckpoint: () => Promise<void>;
  onDeath: () => Promise<void>;
  onStageCleared: () => Promise<void>;
  consumeAd: (rewarded: boolean) => void;
  reviveWithAd: () => void;
  retryStage: () => void;
  giveUpToCheckpoint: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  reset: () => Promise<void>;
  beginPlaySession: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'splash',
  currentStage: 1,
  checkpointStage: 1,
  maxClearedStage: 0,
  lives: INITIAL_LIVES,
  bonusLives: 0,
  hydrated: false,
  isGameOver: false,
  isStageClearing: false,
  isPaused: false,
  showAd: null,
  pendingNextStage: null,

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
    const { currentStage } = get();
    await incrementPlays();
    set({
      screen: 'play',
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
    });
    // currentStage 그대로 사용
  },

  async startFromCheckpoint() {
    const cp = await persistReturnToCheckpoint();
    set({
      screen: 'play',
      currentStage: cp,
      lives: INITIAL_LIVES,
      isGameOver: false,
      isStageClearing: false,
      isPaused: false,
      showAd: null,
      pendingNextStage: null,
    });
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
    };
    if (next > TOTAL_STAGES) {
      // 게임 전체 클리어
      updates.pendingNextStage = null;
    } else {
      updates.pendingNextStage = next;
    }
    // 체크포인트 갱신
    if ([6, 11, 16].includes(next)) {
      updates.checkpointStage = next;
    }
    set(updates);
  },

  consumeAd(rewarded: boolean) {
    const { showAd } = get();
    if (showAd === 'rewarded' && rewarded) {
      set({
        bonusLives: 0,
        lives: INITIAL_LIVES + 3,
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
    });
  },

  async beginPlaySession() {
    await incrementPlays();
  },
}));

/** 클리어 후 다음 스테이지 진입 (광고 필요 시 광고 트리거). */
export async function advanceAfterClear() {
  const state = useGameStore.getState();
  const next = state.pendingNextStage;
  if (next === null) {
    // 전체 클리어
    useGameStore.setState({
      isStageClearing: false,
      screen: 'menu',
    });
    return;
  }
  // 10, 15 클리어 후 전면 광고
  const previousStage = next - 1;
  if (previousStage === 10 || previousStage === 15) {
    useGameStore.setState({ showAd: 'interstitial' });
  } else {
    useGameStore.setState({
      currentStage: next,
      pendingNextStage: null,
      isStageClearing: false,
      lives: INITIAL_LIVES,
    });
    await saveProgress({ currentStage: next });
  }
}
