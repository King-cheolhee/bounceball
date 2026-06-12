import { useEffect } from 'react';
import { Overlay } from './Overlay';

interface Props {
  stage: number;
  onContinue: () => void;
  totalCleared?: boolean;
}

export function StageClearOverlay({ stage, onContinue, totalCleared }: Props) {
  useEffect(() => {
    const id = setTimeout(onContinue, totalCleared ? 1800 : 1100);
    return () => clearTimeout(id);
  }, [onContinue, totalCleared]);

  return (
    <Overlay dim={0.75}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Pretendard, sans-serif' }}>
        {totalCleared ? (
          <>
            <div style={{ fontSize: 16, letterSpacing: '0.3em', opacity: 0.7 }}>GRAND MASTER</div>
            <div style={{ fontSize: 54, fontWeight: 900, marginTop: 12, letterSpacing: '0.05em' }}>ALL CLEAR</div>
            <div style={{ fontSize: 14, marginTop: 14, opacity: 0.7 }}>20 스테이지 정복 완료</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, letterSpacing: '0.3em', opacity: 0.6 }}>STAGE {String(stage).padStart(2, '0')}</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8, letterSpacing: '0.08em' }}>CLEAR</div>
          </>
        )}
      </div>
    </Overlay>
  );
}
