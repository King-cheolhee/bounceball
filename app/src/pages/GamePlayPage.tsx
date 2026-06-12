import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine/GameEngine';
import { TOTAL_STAGES, STAGE_CLEAR_OVERLAY_MS } from '../utils/constants';
import { advanceAfterClear, useGameStore } from '../stores/gameStore';
import { useUnlockStore } from '../stores/unlockStore';
import { useViewportSize } from '../hooks/useViewportSize';
import { useVisibilityPause } from '../hooks/useVisibilityPause';
import { HudHearts } from '../components/HudHearts';
import { Button } from '../components/Button';
import { PauseOverlay } from '../components/PauseOverlay';
import { GameOverOverlay } from '../components/GameOverOverlay';
import { StageClearOverlay } from '../components/StageClearOverlay';
import { MockAdOverlay } from '../components/MockAdOverlay';
import { sound } from '../services/sound';
import { music } from '../services/music';
import { submitScore } from '../services/leaderboard';
import { preloadAd } from '../services/ads';
import { logEvent } from '../services/analytics';
import { getBgmLayers } from '../utils/story';

interface Props {
  onExit: () => void;
}

export function GamePlayPage({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchTargetRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const stageEffectMounted = useRef(false);
  const viewport = useViewportSize();

  const currentStage = useGameStore((s) => s.currentStage);
  const lives = useGameStore((s) => s.lives);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isStageClearing = useGameStore((s) => s.isStageClearing);
  const isPaused = useGameStore((s) => s.isPaused);
  const showAd = useGameStore((s) => s.showAd);
  const maxClearedStage = useGameStore((s) => s.maxClearedStage);
  const lastUnlockMsg = useGameStore((s) => s.lastUnlockMsg);

  const onDeath = useGameStore((s) => s.onDeath);
  const onStageCleared = useGameStore((s) => s.onStageCleared);
  const retryStage = useGameStore((s) => s.retryStage);
  const giveUpToCheckpoint = useGameStore((s) => s.giveUpToCheckpoint);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const reviveWithAd = useGameStore((s) => s.reviveWithAd);
  const consumeAd = useGameStore((s) => s.consumeAd);

  const selectedSkin = useUnlockStore((s) => s.selectedSkin);
  const addParts = useUnlockStore((s) => s.addParts);

  const [allCleared, setAllCleared] = useState(false);
  const [runParts, setRunParts] = useState(0);

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
      onStageClear: async (stageId, partsCollected) => {
        // 부품은 클리어해야 적립 (죽으면 그 시도분 소멸 — 재도전 동기)
        await addParts(partsCollected);
        await onStageCleared();
        if (stageId >= TOTAL_STAGES) {
          setAllCleared(true);
        }
        await submitScore(stageId);
      },
      onPartsChange: (parts) => {
        setRunParts(parts);
      },
    });
    engineRef.current = engine;
    engine.setSkin(useUnlockStore.getState().selectedSkin);
    engine.attach(touchTarget);
    engine.resize(viewport.width, viewport.height);
    engine.loadStage(useGameStore.getState().currentStage);
    engine.start();
    sound.unlock();
    logEvent('stage_enter', { stage: useGameStore.getState().currentStage });

    // 광고 사전 로딩 — 앱인토스 정책 (실시간 로딩 금지)
    void preloadAd('interstitial');
    void preloadAd('rewarded');

    return () => {
      engine.destroy();
      engineRef.current = null;
      music.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뷰포트 변경 시 resize
  useEffect(() => {
    engineRef.current?.resize(viewport.width, viewport.height);
  }, [viewport.width, viewport.height]);

  // 스킨 변경 반영
  useEffect(() => {
    engineRef.current?.setSkin(selectedSkin);
  }, [selectedSkin]);

  // BGM — 해금된 사운드 칩 채널 수만큼 적층, 템포는 스테이지 따라 상승.
  // 일시정지/광고/게임오버 중에는 정지 — 스케줄러가 suspend된 컨텍스트를
  // 자동 resume하는 정책 위반 경로를 차단한다 (리뷰 확정 버그 수정)
  useEffect(() => {
    const blocked = isPaused || isGameOver || isStageClearing || !!showAd;
    if (blocked) {
      music.stop();
      return;
    }
    music.start(getBgmLayers(maxClearedStage), currentStage);
  }, [isPaused, isGameOver, isStageClearing, showAd, currentStage, maxClearedStage]);

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
  // (mount 시에는 위의 초기화 effect가 이미 로드했으므로 건너뜀 — 이중 로드 버그 수정)
  useEffect(() => {
    if (!stageEffectMounted.current) {
      stageEffectMounted.current = true;
      return;
    }
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
    }, lastUnlockMsg ? STAGE_CLEAR_OVERLAY_MS + 900 : STAGE_CLEAR_OVERLAY_MS);
    return () => clearTimeout(id);
  }, [isStageClearing, allCleared, lastUnlockMsg]);

  // 광고 표시 중 게임 사운드 일시정지 (검수 요건)
  // 'ad' 사유로 별도 관리 — 광고 중 백그라운드 전환과 겹쳐도 안전
  useEffect(() => {
    if (!showAd) return;
    sound.suspend('ad');
    return () => {
      sound.resumeFrom('ad');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 14, letterSpacing: '0.2em', opacity: 0.85 }}>
            STAGE {String(currentStage).padStart(2, '0')} <span style={{ opacity: 0.4 }}>/ {TOTAL_STAGES}</span>
          </span>
          <span style={{ fontSize: 13, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
            ◆ {runParts}
          </span>
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
            unlockMsg={lastUnlockMsg}
            partsCollected={runParts}
            onContinue={() => {
              if (allCleared) {
                setAllCleared(false);
                // 메모리 상태도 Stage 1로 리셋 — 이게 없으면 같은 세션의
                // '다시 도전하기'가 Stage 20부터 시작됐다 (리뷰 확정 버그)
                void advanceAfterClear();
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
              const stageBefore = useGameStore.getState().currentStage;
              consumeAd(rewarded);
              const st = useGameStore.getState();
              // 스테이지가 바뀌었으면 currentStage effect가 로드하므로 여기선
              // 스테이지 불변(부활 등)일 때만 직접 로드 — 이중 로드 방지
              if (!st.isGameOver && engineRef.current && st.currentStage === stageBefore) {
                engineRef.current.loadStage(st.currentStage);
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
          DEV · ← / → 이동 · MAX {maxClearedStage}
        </div>
      )}
    </div>
  );
}
