import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useGameStore } from '../stores/gameStore';
import { useUnlockStore } from '../stores/unlockStore';
import { TOTAL_STAGES } from '../utils/constants';
import { STORY, CHAPTERS } from '../utils/story';
import { getSkin } from '../utils/skins';

interface Props {
  onStart: () => void;
  onSettings: () => void;
}

/**
 * 메인 메뉴 — B안 「마지막 픽셀 도트」.
 * 클리어한 스테이지만큼 LCD 세그먼트가 한 칸씩 점등된다:
 * 죽어가던 게임기 화면이 플레이어의 진행으로 되살아나는 진행도 시각화.
 */
export function MainMenuPage({ onStart, onSettings }: Props) {
  const currentStage = useGameStore((s) => s.currentStage);
  const checkpointStage = useGameStore((s) => s.checkpointStage);
  const maxClearedStage = useGameStore((s) => s.maxClearedStage);
  const stageRecords = useGameStore((s) => s.stageRecords);
  const parts = useUnlockStore((s) => s.parts);
  const selectedSkin = useUnlockStore((s) => s.selectedSkin);
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
        padding: 'calc(24px + var(--safe-top)) calc(40px + var(--safe-right)) calc(20px + var(--safe-bottom)) calc(40px + var(--safe-left))',
        fontFamily: 'Inter, Pretendard, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.5 }}>
            {STORY.titleEn} · {STORY.subtitle}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6, letterSpacing: '0.06em' }}>탱탱볼해금</div>
          <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
            『{STORY.tagline}』 — {STORY.taglineSub}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <Button onClick={onSettings} variant="ghost" size="sm" ariaLabel="설정">
            ⚙ 설정 · 스킨
          </Button>
          <div style={{ fontSize: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
            ◆ {parts} · 스킨: {getSkin(selectedSkin).name}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.5 }}>
            {allCleared ? 'SYSTEM REBOOTED ✓' : 'NEXT STAGE'}
          </div>
          <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 6 }}>
            {String(currentStage).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 13, opacity: 0.55, marginTop: 10 }}>
            세이브 셀 {checkpointStage} · 최고 기록 Stage {maxClearedStage || '—'}
          </div>
        </div>

        {/* LCD 세그먼트 진행도 — 깬 만큼 화면이 되살아난다.
            V2 완수 메타 3단 표기: 점등=클리어 / 안의 ◆=부품 전량 / 점멸 테두리=PERFECT(전량+노데스) */}
        <div style={{ display: 'flex', gap: 14 }}>
          {CHAPTERS.map((ch) => (
            <div key={ch.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: ch.to - ch.from + 1 }).map((_, i) => {
                  const stageNo = ch.from + i;
                  const lit = stageNo <= maxClearedStage;
                  const rec = stageRecords[stageNo];
                  const allParts = lit && !!rec?.allParts;
                  const perfect = allParts && !!rec?.noDeath;
                  return (
                    <div
                      key={stageNo}
                      style={{
                        width: 14,
                        height: 20,
                        background: lit ? '#fff' : 'transparent',
                        border: '1px solid rgba(255,255,255,0.45)',
                        position: 'relative',
                        animation: perfect ? 'seg-perfect 1.6s ease-in-out infinite' : undefined,
                      }}
                      aria-label={`스테이지 ${stageNo} ${perfect ? 'PERFECT' : allParts ? '부품 전량' : lit ? '복구됨' : '미복구'}`}
                    >
                      {allParts && (
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: 6,
                            height: 6,
                            background: '#000',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', opacity: maxClearedStage >= ch.to ? 0.9 : 0.35 }}>
                {ch.en}
              </div>
            </div>
          ))}
          <style>{`
            @keyframes seg-perfect {
              0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
              50% { box-shadow: 0 0 0 2.5px rgba(255,255,255,0.85); }
            }
          `}</style>
        </div>
        {maxClearedStage > 0 && (
          <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: '0.1em' }}>
            ■ 클리어 · ■<span style={{ fontSize: 8 }}>◆</span> 부품 전량 · 점멸 = PERFECT(전량+노데스)
          </div>
        )}

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
              padding: 6,
              cursor: 'pointer',
            }}
          >
            진행 데이터 초기화
          </button>
        )}
        {confirmReset && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>정말 초기화할까요? (부품·스킨은 유지)</span>
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
