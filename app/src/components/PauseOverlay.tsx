import { Button } from './Button';
import { Overlay } from './Overlay';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  stage: number;
  onResume: () => void;
  onRetry: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ stage, onResume, onRetry, onQuit }: Props) {
  // 잔상 토글을 일시정지에서 바로 — 멀미를 느끼는 시점은 플레이 중인데
  // 설정 화면은 메뉴에서만 접근 가능했다 (리뷰 확정 접근성 수정).
  // setTrail은 zustand 경유라 GamePlayPage의 trail effect가 즉시 엔진에 반영한다.
  const trailOn = useSettingsStore((s) => s.trail);
  const setTrail = useSettingsStore((s) => s.setTrail);

  return (
    <Overlay dim={0.65}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Pretendard, sans-serif' }}>
        <div style={{ fontSize: 14, letterSpacing: '0.2em', opacity: 0.6 }}>STAGE {String(stage).padStart(2, '0')}</div>
        <div style={{ fontSize: 40, fontWeight: 900, marginTop: 8, marginBottom: 28 }}>일시정지</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
          <Button onClick={onResume} size="lg" fullWidth>계속하기</Button>
          <Button onClick={onRetry} variant="secondary" fullWidth>다시 시도</Button>
          <Button onClick={onQuit} variant="ghost" fullWidth>메인 메뉴로</Button>
          <button
            onClick={() => void setTrail(!trailOn)}
            style={{
              marginTop: 6,
              fontSize: 12,
              letterSpacing: '0.1em',
              color: '#fff',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              opacity: 0.85,
            }}
            aria-pressed={trailOn}
          >
            잔상 트레일 {trailOn ? 'ON — 어지러우면 끄세요' : 'OFF'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
