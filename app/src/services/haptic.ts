/**
 * 햅틱 진동 추상화. 1단계: navigator.vibrate.
 * 2단계: `generateHapticFeedback({ type })`로 교체.
 */
export type HapticType = 'soft' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERN: Record<HapticType, number | number[]> = {
  soft: 10,
  medium: 18,
  heavy: 35,
  success: [10, 40, 12],
  error: [22, 60, 22],
};

let enabled = true;

export function setHapticEnabled(value: boolean) {
  enabled = value;
}

export function haptic(type: HapticType): void {
  if (!enabled) return;
  const navAny = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof navAny.vibrate === 'function') {
    try {
      navAny.vibrate(PATTERN[type]);
    } catch {
      // ignore
    }
  }
}
