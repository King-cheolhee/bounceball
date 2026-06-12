import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine/GameEngine';
import { TOTAL_STAGES, STAGE_CLEAR_OVERLAY_MS } from '../utils/constants';
import { advanceAfterClear, useGameStore } from '../stores/gameStore';
import { useViewportSize } from '../hooks/useViewportSize';
import { useVisibilityPause } from '../hooks/useVisibilityPause';
import { HudHearts } from '../components/HudHearts';
import { Button } from '../components/Button';
import { PauseOverlay } from '../components/PauseOverlay';
import { GameOverOverlay } from '../components/GameOverOverlay';
import { StageClearOverlay } from '../components/StageClearOverlay';
import { MockAdOverlay } from '../components/MockAdOverlay';
import { sound } from '../services/sound';
import { submitScore } from '../services/leaderboard';
import { showInterstitial, showRewarded } from '../services/ads';
import { logEvent } from '../services/analytics';

interface Props {
  onExit: () => void;
}

export function GamePlayPage({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchTargetRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const viewport = useViewportSize();

  const currentStage = useGameStore((s) => s.currentStage);
  const lives = useGameStore((s) => s.lives);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isStageClearing = useGameStore((s) => s.isStageClearing);
  const isPaused = useGameStore((s) => s.isPaused);
  const showAd = useGameStore((s) => s.showAd);
  const pendingNextStage = useGameStore((s) => s.pendingNextStage);
  const maxClearedStage = useGameStore((s) => s.maxClearedStage);

  const onDeath = useGameStore((s) => s.onDeath);
  const onStageCleared = useGameStore((s) => s.onStageCleared);
  const retryStage = useGameStore((s) => s.retryStage);
  const giveUpToCheckpoint = useGameStore((s) => s.giveUpToCheckpoint);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reviveWithAd = useGameStore((s) => s.reviveWithAd);
  const consumeAd = useGameStore((s) => s.consumeAd);

  const [allCleared, setAllCleared] = useState(false);

  // Engine 초기화 (canvas mount 후 1회)
  useEffect(() => {
    const canvas = canvasRef.current;
    const touchTarget = touchTargetRef.current;
    if (!canvas || !touchTarget) return;

    const engine = new GameEngine(canvas, {
      onDeath: async () => {
        await onDeath();
        const state = useGameStore.getState();
        if (state.isGameOver) {
          logEvent('game_over', { stage: state.currentStage });
        } else {
          // 같은 스테이지 재시작
          engine.loadStage(state.currentStage);
        }
      },
      onStageClear: async (stageId) => {
        await onStageCleared();
        if (stageId >= TOTAL_STAGES) {
          setAllCleared(true);
          await submitScore(stageId);
        } else {
          await submitScore(stageId);
        }
      },
    });
    engineRef.current = engine;
    engine.attach(touchTarget);
    engine.resize(viewport.width, viewport.height);
    engine.loadStage(useGameStore.getState().currentStage);
    engine.start();
    sound.unlock();
    logEvent('stage_enter', { stage: useGameStore.getState().currentStage });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뷰포트 변경 시 resize
  useEffect(() => {
    engineRef.current?.resize(viewport.width, viewport.height);
  }, [viewport.width, viewport.height]);

  // 일시정지/재개 동기화
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused || isGameOver || isStageClearing || showAd) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  }, [isPaused, isGameOver, isStageClearing, showAd]);

  // 현재 스테이지가 바뀌면 엔진에도 반영
  useEffect(() => {
    if (!engineRef.current) return;
    if (isGameOver || isStageClearing || showAd) return;
    engineRef.current.loadStage(currentStage);
    logEvent('stage_enter', { stage: currentStage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage]);

  // 스테이지 클리어 자동 진행
  useEffect(() => {
    if (!isStageClearing || allCleared) return;
    const id = setTimeout(() => {
      void advanceAfterClear();
    }, STAGE_CLEAR_OVERLAY_MS);
    return () => clearTimeout(id);
  }, [isStageClearing, allCleared]);

  // 광고 표시 처리
  useEffect(() => {
    if (!showAd) return;
    sound.suspend();
    return () => {
      sound.resumeAfterBackground();
    };
  }, [showAd]);

  useVisibilityPause(
    useCallback(() => {
      // 자동 일시정지
      pause();
    }, [pause]),
    useCallback(() => {
      // 복귀 시 자동 재개하지 않고 사용자가 직접 누르도록 (사고 방지)
    }, []),
  );

  const handleAdLaunch = useCallback(async () => {
    if (showAd === 'interstitial') {
      await showInterstitial();
    } else if (showAd === 'rewarded') {
      await showRewarded();
    }
  }, [showAd]);

  useEffect(() => {
    if (showAd) {
      void handleAdLaunch();
    }
  }, [showAd, handleAdLaunch]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* 터치 영역 (캔버스 위 투명 레이어) */}
      <div
        ref={touchTargetRef}
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none',
          zIndex: 2,
        }}
        aria-hidden
      />

      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(12px + var(--safe-top))',
          left: 'calc(16px + var(--safe-left))',
          right: 'calc(16px + var(--safe-right))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#fff',
          fontFamily: 'Inter, Pretendard, sans-serif',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: '0.2em', opacity: 0.85 }}>
          STAGE {String(currentStage).padStart(2, '0')} <span style={{ opacity: 0.4 }}>/ {TOTAL_STAGES}</span>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <Button
            onClick={() => {
              if (!isPaused) pause();
              else resume();
            }}
            variant="ghost"
            size="sm"
            ariaLabel="일시정지"
          >
            ❙❙
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HudHearts lives={lives} max={3} />
        </div>
      </div>

      {/* 좌/우 인풋 가이드 (희미하게) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          zIndex: 1,
          opacity: 0.06,
        }}
      >
        <div style={{ flex: 1, borderRight: '1px solid #fff' }} />
        <div style={{ flex: 1 }} />
      </div>

      {/* 오버레이들 */}
      {isPaused && !isGameOver && !showAd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <PauseOverlay
            stage={currentStage}
            onResume={resume}
            onRetry={() => {
              resume();
              retryStage();
              engineRef.current?.loadStage(currentStage);
            }}
            onQuit={() => {
              resume();
              giveUpToCheckpoint();
              onExit();
            }}
          />
        </div>
      )}

      {isGameOver && !showAd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <GameOverOverlay
            stage={currentStage}
            onWatchAd={() => {
              reviveWithAd();
            }}
            onRetry={() => {
              retryStage();
              engineRef.current?.loadStage(currentStage);
            }}
            onCheckpoint={async () => {
              await giveUpToCheckpoint();
              onExit();
            }}
          />
        </div>
      )}

      {isStageClearing && !showAd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <StageClearOverlay
            stage={currentStage}
            totalCleared={allCleared}
            onContinue={() => {
              if (allCleared) {
                setAllCleared(false);
                onExit();
              }
            }}
          />
        </div>
      )}

      {showAd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
          <MockAdOverlay
            type={showAd}
            onClose={(rewarded) => {
              consumeAd(rewarded);
              const next = useGameStore.getState().currentStage;
              if (!useGameStore.getState().isGameOver && engineRef.current) {
                engineRef.current.loadStage(next);
              }
            }}
          />
        </div>
      )}

      {/* 디버그 도움말 (DEV만) */}
      {import.meta.env.DEV && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(8px + var(--safe-bottom))',
            left: 'calc(16px + var(--safe-left))',
            fontSize: 10,
            opacity: 0.3,
            color: '#fff',
            fontFamily: 'Inter, monospace',
            letterSpacing: '0.08em',
            pointerEvents: 'none',
          }}
        >
          DEV · ← / → 이동 · MAX {maxClearedStage} · NEXT {pendingNextStage ?? '-'}
        </div>
      )}
    </div>
  );
}
