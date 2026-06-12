import { Button } from '../components/Button';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  onBack: () => void;
}

export function SettingsPage({ onBack }: Props) {
  const sound = useSettingsStore((s) => s.sound);
  const haptic = useSettingsStore((s) => s.haptic);
  const setSound = useSettingsStore((s) => s.setSound);
  const setHaptic = useSettingsStore((s) => s.setHaptic);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        padding: 'calc(28px + var(--safe-top)) calc(40px + var(--safe-right)) calc(28px + var(--safe-bottom)) calc(40px + var(--safe-left))',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, Pretendard, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.06em' }}>설정</div>
        <Button onClick={onBack} variant="ghost" size="sm">← 메뉴</Button>
      </div>

      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 480 }}>
        <Row
          label="사운드"
          desc="효과음 재생 (백그라운드 전환 시 자동 일시정지)"
          enabled={sound}
          onToggle={() => setSound(!sound)}
        />
        <Row
          label="진동(햅틱)"
          desc="기기 진동으로 충돌 피드백"
          enabled={haptic}
          onToggle={() => setHaptic(!haptic)}
        />
      </div>

      <div style={{ marginTop: 'auto', fontSize: 11, opacity: 0.4, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
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
