import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Overlay } from './Overlay';
import { AdType } from '../services/ads';

interface Props {
  type: AdType;
  onClose: (rewarded: boolean) => void;
}

const INTERSTITIAL_SECONDS = 4;
const REWARDED_SECONDS = 6;

export function MockAdOverlay({ type, onClose }: Props) {
  const totalSeconds = type === 'interstitial' ? INTERSTITIAL_SECONDS : REWARDED_SECONDS;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [skippable, setSkippable] = useState(false);
  // 부모 리렌더로 onClose 참조가 바뀌어도 카운트다운이 리셋되지 않도록 ref 경유
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const next = Math.max(0, totalSeconds - elapsed);
      setRemaining(next);
      if (type === 'interstitial' && elapsed >= 2) setSkippable(true);
      if (next === 0) {
        clearInterval(id);
        onCloseRef.current(type === 'rewarded');
      }
    }, 100);
    return () => clearInterval(id);
  }, [totalSeconds, type]);

  return (
    <Overlay dim={0.92}>
      <div
        style={{
          width: 'min(80vw, 480px)',
          height: 'min(70vh, 280px)',
          border: '2px dashed rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, Pretendard, sans-serif',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.6 }}>광고 · {type === 'rewarded' ? 'REWARDED' : 'INTERSTITIAL'}</div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{type === 'rewarded' ? '보상형 광고' : '전면 광고'}</div>
        <div style={{ fontSize: 12, opacity: 0.5, maxWidth: 320, textAlign: 'center', lineHeight: 1.5 }}>
          {/* 이 화면은 개발용 미리보기로 일반 브라우저에서만 보인다.
              토스 앱/샌드박스에서는 앱인토스 실제 광고가 노출된다(ads.ts presentRealAd). */}
          개발 환경 광고 미리보기
          {type === 'rewarded' ? ' · 끝까지 시청하면 목숨 +3' : ''}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', marginTop: 8 }}>
          {Math.ceil(remaining)}s
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        {type === 'interstitial' && (
          <Button
            onClick={() => onClose(false)}
            variant={skippable ? 'secondary' : 'ghost'}
            disabled={!skippable}
          >
            {skippable ? '건너뛰기' : '...'}
          </Button>
        )}
        {type === 'rewarded' && (
          <Button onClick={() => onClose(false)} variant="ghost">
            보상 포기하고 닫기
          </Button>
        )}
      </div>
    </Overlay>
  );
}
