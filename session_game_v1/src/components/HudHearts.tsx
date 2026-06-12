interface Props {
  lives: number;
  max: number;
}

export function HudHearts({ lives, max }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Heart key={i} filled={i < lives} />
      ))}
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"
        fill={filled ? '#ffffff' : 'none'}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </svg>
  );
}
