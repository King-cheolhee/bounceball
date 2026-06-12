import { Button } from '../components/Button';
import { useSettingsStore } from '../stores/settingsStore';
import { useUnlockStore } from '../stores/unlockStore';
import { SKINS } from '../utils/skins';
import { sound } from '../services/sound';

interface Props {
  onBack: () => void;
}

export function SettingsPage({ onBack }: Props) {
  const soundOn = useSettingsStore((s) => s.sound);
  const hapticOn = useSettingsStore((s) => s.haptic);
  const trailOn = useSettingsStore((s) => s.trail);
  const setSound = useSettingsStore((s) => s.setSound);
  const setHaptic = useSettingsStore((s) => s.setHaptic);
  const setTrail = useSettingsStore((s) => s.setTrail);

  const parts = useUnlockStore((s) => s.parts);
  const unlockedSkins = useUnlockStore((s) => s.unlockedSkins);
  const selectedSkin = useUnlockStore((s) => s.selectedSkin);
  const buySkin = useUnlockStore((s) => s.buySkin);
  const selectSkin = useUnlockStore((s) => s.selectSkin);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        padding: 'calc(24px + var(--safe-top)) calc(40px + var(--safe-right)) calc(24px + var(--safe-bottom)) calc(40px + var(--safe-left))',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, Pretendard, sans-serif',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.06em' }}>설정</div>
        <Button onClick={onBack} variant="ghost" size="sm">← 메뉴</Button>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
        <Row
          label="사운드"
          desc="효과음·BGM 재생 (백그라운드 전환 시 자동 일시정지)"
          enabled={soundOn}
          onToggle={() => setSound(!soundOn)}
        />
        <Row
          label="진동(햅틱)"
          desc="기기 진동으로 충돌 피드백"
          enabled={hapticOn}
          onToggle={() => setHaptic(!hapticOn)}
        />
        <Row
          label="잔상 트레일"
          desc="공의 포물선 궤적 잔상 (원작 오마주). 화면 움직임이 어지러우면 끄세요"
          enabled={trailOn}
          onToggle={() => setTrail(!trailOn)}
        />
        <div style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.5 }}>
          ⓘ iPhone에서 소리가 나지 않으면 측면 무음 스위치를 확인하세요.
        </div>
      </div>

      {/* 스킨 샵 — 부품(◆)으로 해금. 외형만 변화, 밸런스 영향 없음 */}
      <div style={{ marginTop: 32, maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.06em' }}>스킨</div>
          <div style={{ fontSize: 13, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>보유 ◆ {parts}</div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
          스테이지에서 부품(◆)을 모아 클리어하면 적립됩니다. 스킨은 모양·잔상만 바뀝니다.
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SKINS.map((skin) => {
            const owned = unlockedSkins.includes(skin.id);
            const selected = selectedSkin === skin.id;
            const affordable = parts >= skin.cost;
            return (
              <div
                key={skin.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: selected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 6,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {skin.name}
                    {selected && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>사용 중</span>}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>{skin.desc}</div>
                </div>
                <div>
                  {owned ? (
                    selected ? (
                      <span style={{ fontSize: 12, opacity: 0.6, letterSpacing: '0.1em' }}>✓</span>
                    ) : (
                      <Button onClick={() => void selectSkin(skin.id)} variant="secondary" size="sm">
                        선택
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={async () => {
                        const ok = await buySkin(skin.id);
                        if (ok) sound.play('unlock');
                      }}
                      variant={affordable ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={!affordable}
                    >
                      해금 ◆ {skin.cost}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 28, fontSize: 11, opacity: 0.4, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        앱인토스 정책 준수 · 다크 모드 미지원 (라이트 기준 흑백 디자인)
      </div>
    </div>
  );
}

function Row({
  label,
  desc,
  enabled,
  onToggle,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 6,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{desc}</div>
      </div>
      <button
        onClick={onToggle}
        aria-pressed={enabled}
        style={{
          width: 56,
          height: 30,
          borderRadius: 999,
          background: enabled ? '#fff' : 'transparent',
          border: '2px solid #fff',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.12s ease-out',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 28 : 2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: enabled ? '#000' : '#fff',
            transition: 'left 0.16s ease-out',
          }}
        />
      </button>
    </div>
  );
}
