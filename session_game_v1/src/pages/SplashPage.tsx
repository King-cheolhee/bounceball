import { useEffect } from 'react';

interface Props {
  onDone: () => void;
}

export function SplashPage({ onDone }: Props) {
  useEffect(() => {
    const id = setTimeout(onDone, 1100);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#000',
        color: '#fff',
        fontFamily: 'Inter, Pretendard, sans-serif',
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: '#fff',
          animation: 'splash-bounce 0.9s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes splash-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.1em', marginTop: 12 }}>탱탱볼해금</div>
      <div style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.4 }}>TANGTANGBALL</div>
    </div>
  );
}
