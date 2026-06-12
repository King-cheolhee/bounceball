import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useGameStore } from '../stores/gameStore';
import { TOTAL_STAGES } from '../utils/constants';

interface Props {
  onStart: () => void;
  onSettings: () => void;
}

export function MainMenuPage({ onStart, onSettings }: Props) {
  const currentStage = useGameStore((s) => s.currentStage);
  const checkpointStage = useGameStore((s) => s.checkpointStage);
  const maxClearedStage = useGameStore((s) => s.maxClearedStage);
  const allCleared = maxClearedStage >= TOTAL_STAGES;
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    if (!confirmReset) return;
    const id = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(id);
  }, [confirmReset]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 'calc(28px + var(--safe-top)) calc(40px + var(--safe-right)) calc(28px + var(--safe-bottom)) calc(40px + var(--safe-left))',
        fontFamily: 'Inter, Pretendard, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.5 }}>TANGTANGBALL</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 6, letterSpacing: '0.06em' }}>탱탱볼해금</div>
        </div>
        <Button onClick={onSettings} variant="ghost" size="sm" ariaLabel="설정">
          ⚙ 설정
        </Button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.5 }}>NEXT STAGE</div>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 6 }}>
            {String(currentStage).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 13, opacity: 0.55, marginTop: 12 }}>
            체크포인트 {checkpointStage} · 최고 기록 Stage {maxClearedStage || '—'}
          </div>
        </div>

        <Button onClick={onStart} size="lg" style={{ minWidth: 240 }}>
          {allCleared ? '다시 도전하기' : currentStage === 1 ? '게임 시작' : '이어서 플레이'}
        </Button>

        {currentStage > 1 && !confirmReset && (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              opacity: 0.4,
              textTransform: 'uppercase',
              color: '#fff',
              background: 'transparent',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
            }}
          >
            진행 데이터 초기화
          </button>
        )}
        {confirmReset && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>정말 초기화할까요?</span>
            <Button
              onClick={async () => {
                await reset();
                setConfirmReset(false);
              }}
              variant="secondary"
              size="sm"
            >
              초기화
            </Button>
            <Button onClick={() => setConfirmReset(false)} variant="ghost" size="sm">
              취소
            </Button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          fontSize: 11,
          letterSpacing: '0.18em',
          opacity: 0.45,
          textTransform: 'uppercase',
        }}
      >
        <span>화면 좌측 터치 → 좌</span>
        <span>화면 우측 터치 → 우</span>
        <span>PC: ← →</span>
      </div>
    </div>
  );
}
