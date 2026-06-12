import { Button } from './Button';
import { Overlay } from './Overlay';

interface Props {
  stage: number;
  onWatchAd: () => void;
  onRetry: () => void;
  onCheckpoint: () => void;
}

export function GameOverOverlay({ stage, onWatchAd, onRetry, onCheckpoint }: Props) {
  return (
    <Overlay dim={0.7}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Pretendard, sans-serif' }}>
        <div style={{ fontSize: 13, letterSpacing: '0.25em', opacity: 0.6 }}>STAGE {String(stage).padStart(2, '0')}</div>
        <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8, marginBottom: 6, letterSpacing: '0.08em' }}>GAME OVER</div>
        <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 28 }}>목숨을 모두 소진했습니다</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240 }}>
          <Button onClick={onWatchAd} size="lg" fullWidth>광고 보고 부활하기 (+3)</Button>
          <Button onClick={onRetry} variant="secondary" fullWidth>같은 스테이지 다시 시도</Button>
          <Button onClick={onCheckpoint} variant="ghost" fullWidth>메인 메뉴로 (체크포인트 복귀)</Button>
        </div>
      </div>
    </Overlay>
  );
}
