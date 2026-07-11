import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { RatingBadge } from '../components/RatingBadge';
import { useGameStore } from '../stores/gameStore';
import { useUnlockStore } from '../stores/unlockStore';
import { TOTAL_STAGES, GAME_RATING } from '../utils/constants';
import { STORY, CHAPTERS } from '../utils/story';
import { getSkin } from '../utils/skins';

interface Props {
  onStart: () => void;
  onSettings: () => void;
  onSelectStage: (stage: number) => void;
}

/**
 * 메인 메뉴 — B안 「마지막 픽셀 도트」.
 * 클리어한 스테이지만큼 LCD 세그먼트가 한 칸씩 점등된다:
 * 죽어가던 게임기 화면이 플레이어의 진행으로 되살아나는 진행도 시각화.
 */
export function MainMenuPage({ onStart, onSettings, onSelectStage }: Props) {
  const currentStage = useGameStore((s) => s.currentStage);
  const checkpointStage = useGameStore((s) => s.checkpointStage);
  const maxClearedStage = useGameStore((s) => s.maxClearedStage);
  const stageRecords = useGameStore((s) => s.stageRecords);
  const parts = useUnlockStore((s) => s.parts);
  const selectedSkin = useUnlockStore((s) => s.selectedSkin);
  const allCleared = maxClearedStage >= TOTAL_STAGES;
  const [confirmReset, setConfirmReset] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
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
        // 세로 여백은 화면 높이에 비례해 축소 — 토스 상단 바가 상시 공간을
        // 차지해 실기기 가시 높이가 낮다 (시작 버튼이 잘리던 원인)
        padding: 'calc(min(24px, 3vh) + var(--safe-top)) calc(40px + var(--safe-right)) calc(min(20px, 2.5vh) + var(--safe-bottom)) calc(40px + var(--safe-left))',
        fontFamily: 'Inter, Pretendard, sans-serif',
        // 스테이지 선택 등으로 내용이 화면보다 길어지면 세로 스크롤 허용
        // (전역 touch-action: none 차단을 이 화면에서만 해제)
        overflowY: 'auto',
        touchAction: 'pan-y',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          // 게임용 네이티브 더보기·닫기 버튼과 내부 UI가 겹치지 않게 비운다.
          paddingRight: 'var(--game-nav-reserved-right)',
        }}
      >
        <div>
          <div style={{ fontSize: 'clamp(20px, 7vh, 30px)', fontWeight: 900, letterSpacing: '0.06em' }}>탱탱볼해금</div>
          <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
            『{STORY.tagline}』 — {STORY.taglineSub}
          </div>
        </div>
        {/* 가로(낮은) 화면 공간 절약 — 세로 스택 대신 한 줄 배치 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
            ◆ {parts} · 스킨: {getSkin(selectedSkin).name}
          </div>
          <Button onClick={onSettings} variant="ghost" size="sm" ariaLabel="설정">
            ⚙ 설정 · 스킨
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 'min(18px, 2.5vh)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.5 }}>
            {allCleared ? '시스템 재부팅 완료 ✓' : 'NEXT STAGE'}
          </div>
          {/* 화면이 낮으면 숫자도 축소 — 시작 버튼까지 한 화면에 들어오게 */}
          <div style={{ fontSize: 'clamp(44px, 18vh, 84px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 6 }}>
            {String(currentStage).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 13, opacity: 0.55, marginTop: 'min(10px, 1.2vh)' }}>
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

        <button
          onClick={() => setShowSelect((v) => !v)}
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            opacity: 0.5,
            textTransform: 'uppercase',
            color: '#fff',
            background: 'transparent',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
          }}
        >
          스테이지 선택 {showSelect ? '▴' : '▾'}
        </button>
        {showSelect && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6, maxWidth: 360 }}>
            {Array.from({ length: TOTAL_STAGES }).map((_, i) => {
              const n = i + 1;
              const cleared = n <= maxClearedStage;
              // 클리어한 스테이지 + 다음 진행할 1개까지만 선택 가능. 그 이상은 잠금(클리어 위조 방지).
              const unlocked = n <= maxClearedStage + 1;
              return (
                <button
                  key={n}
                  onClick={unlocked ? () => onSelectStage(n) : undefined}
                  disabled={!unlocked}
                  style={{
                    aspectRatio: '1',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    color: cleared ? '#000' : '#fff',
                    background: cleared ? '#fff' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.45)',
                    opacity: unlocked ? 1 : 0.35,
                  }}
                  aria-label={unlocked ? `스테이지 ${n} 플레이` : `스테이지 ${n} (잠김)`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        {(currentStage > 1 || maxClearedStage > 0) && !confirmReset && (
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
            <span style={{ fontSize: 12, opacity: 0.7 }}>정말 초기화할까요? (부품·스킨·완수 기록 ◆/PERFECT는 유지)</span>
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
          flexWrap: 'wrap',
        }}
      >
        <span>화면 좌측 터치 → 좌</span>
        <span>화면 우측 터치 → 우</span>
        <span>PC: ← →</span>
      </div>

      {/* 게임법 §33 초기화면 등급 표시 — 전체이용가는 초기화면 상시 표시로 매시간 표시 면제.
          메뉴가 스크롤돼도 항상 보이도록 좌하단 고정(법정 상시 표시 보장).
          상세 제작정보표는 설정 화면에. */}
      <div
        style={{
          position: 'fixed',
          left: 'calc(12px + var(--safe-left))',
          bottom: 'calc(10px + var(--safe-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <RatingBadge size={40} />
        <div style={{ fontSize: 9, opacity: 0.5, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
          {GAME_RATING.rating}
          <br />
          {GAME_RATING.classificationNumber}
        </div>
      </div>
    </div>
  );
}
