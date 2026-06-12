import { useEffect } from 'react';
import { Overlay } from './Overlay';
import { sound } from '../services/sound';
import { STORY } from '../utils/story';

interface Props {
  stage: number;
  onContinue: () => void;
  totalCleared?: boolean;
  /** 해금 메시지 (사운드 칩 채널 복구 등) — 있으면 표시 시간이 늘어난다 */
  unlockMsg?: string | null;
  /** 이번 스테이지에서 적립한 부품 수 */
  partsCollected?: number;
}

export function StageClearOverlay({ stage, onContinue, totalCleared, unlockMsg, partsCollected }: Props) {
  useEffect(() => {
    const id = setTimeout(onContinue, totalCleared ? 3000 : unlockMsg ? 2000 : 1100);
    return () => clearTimeout(id);
  }, [onContinue, totalCleared, unlockMsg]);

  // 엔딩: 전원 복구 부팅음 / 챕터 해금: 팡파레
  useEffect(() => {
    if (totalCleared) {
      sound.play('boot');
    } else if (unlockMsg) {
      sound.play('unlock');
    }
  }, [totalCleared, unlockMsg]);

  return (
    <Overlay dim={0.75}>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Pretendard, sans-serif' }}>
        {totalCleared ? (
          <>
            <div style={{ fontSize: 16, letterSpacing: '0.3em', opacity: 0.7 }}>{STORY.subtitle}</div>
            <div style={{ fontSize: 54, fontWeight: 900, marginTop: 12, letterSpacing: '0.05em' }}>
              {STORY.allClearTitle}
            </div>
            <div style={{ fontSize: 14, marginTop: 14, opacity: 0.7 }}>{STORY.allClearBody}</div>
            <BootSegments />
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, letterSpacing: '0.3em', opacity: 0.6 }}>STAGE {String(stage).padStart(2, '0')}</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8, letterSpacing: '0.08em' }}>CLEAR</div>
            {partsCollected !== undefined && partsCollected > 0 && (
              <div style={{ fontSize: 13, marginTop: 10, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                ◆ {partsCollected} 적립
              </div>
            )}
            {unlockMsg && (
              <div style={{ fontSize: 14, marginTop: 14, letterSpacing: '0.04em', padding: '8px 18px', border: '1px solid rgba(255,255,255,0.5)', display: 'inline-block' }}>
                ─ {unlockMsg} ─
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}

/** 엔딩 전용 — 화면 세그먼트가 차례대로 점등되는 부팅 연출 */
function BootSegments() {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 22 }} aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 18,
            background: '#fff',
            animation: `boot-segment 0.18s ease-out both`,
            animationDelay: `${0.4 + i * 0.08}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes boot-segment {
          from { opacity: 0; transform: scaleY(0.2); }
          to { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
