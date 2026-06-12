import { Button } from './Button';
import { Overlay } from './Overlay';

interface Props {
  stage: number;
  onResume: () => void;
  onRetry: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ stage, onResume, onRetry, onQuit }: Props) {
  return (
    <Overlay dim={0.65}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Pretendard, sans-serif' }}>
        <div style={{ fontSize: 14, letterSpacing: '0.2em', opacity: 0.6 }}>STAGE {String(stage).padStart(2, '0')}</div>
        <div style={{ fontSize: 40, fontWeight: 900, marginTop: 8, marginBottom: 28 }}>일시정지</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
          <Button onClick={onResume} size="lg" fullWidth>계속하기</Button>
          <Button onClick={onRetry} variant="secondary" fullWidth>다시 시도</Button>
          <Button onClick={onQuit} variant="ghost" fullWidth>메인 메뉴로</Button>
        </div>
      </div>
    </Overlay>
  );
}
