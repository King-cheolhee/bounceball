/**
 * 햅틱 진동 추상화.
 *  - 토스 앱/샌드박스: SDK `generateHapticFeedback({ type })`.
 *  - 일반 브라우저(개발): navigator.vibrate 폴백.
 */
import { isInTossEnv } from './sdk';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';

export type HapticType = 'soft' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERN: Record<HapticType, number | number[]> = {
  soft: 10,
  medium: 18,
  heavy: 35,
  success: [10, 40, 12],
  error: [22, 60, 22],
};

// 우리 햅틱 종류 → SDK HapticFeedbackType 매핑
const SDK_TYPE = {
  soft: 'tickWeak',
  medium: 'tickMedium',
  heavy: 'basicMedium',
  success: 'success',
  error: 'error',
} as const;

let enabled = true;

export function setHapticEnabled(value: boolean) {
  enabled = value;
}

export function haptic(type: HapticType): void {
  if (!enabled) return;
  if (isInTossEnv()) {
    try {
      void generateHapticFeedback({ type: SDK_TYPE[type] });
      return;
    } catch {
      // 폴백
    }
  }
  const navAny = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof navAny.vibrate === 'function') {
    try {
      navAny.vibrate(PATTERN[type]);
    } catch {
      // ignore
    }
  }
}
