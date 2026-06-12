import { CSSProperties, ReactNode } from 'react';
import { sound } from '../services/sound';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ariaLabel,
  style,
  disabled,
}: Props) {
  const padding = size === 'sm' ? '8px 16px' : size === 'lg' ? '14px 32px' : '10px 24px';
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 18 : 15;
  const border =
    variant === 'primary'
      ? '2px solid #fff'
      : variant === 'secondary'
        ? '2px solid rgba(255,255,255,0.5)'
        : '2px solid transparent';
  const background = variant === 'primary' ? '#fff' : 'transparent';
  const color = variant === 'primary' ? '#000' : '#fff';

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sound.play('button');
        onClick?.();
      }}
      style={{
        padding,
        fontSize,
        fontFamily: 'Inter, Pretendard, sans-serif',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border,
        background,
        color,
        borderRadius: 6,
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'transform 0.08s ease-out, opacity 0.15s ease-out',
        ...style,
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}
