import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  dim?: number; // 0~1
  align?: 'center' | 'top' | 'bottom';
}

export function Overlay({ children, dim = 0.55, align = 'center' }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(0,0,0,${dim})`,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : align === 'top' ? 'flex-start' : 'flex-end',
        padding: `calc(40px + var(--safe-top)) calc(40px + var(--safe-right)) calc(40px + var(--safe-bottom)) calc(40px + var(--safe-left))`,
        zIndex: 10,
      }}
    >
      {children}
    </div>
  );
}
