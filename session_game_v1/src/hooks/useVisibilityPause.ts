import { useEffect } from 'react';
import { sound } from '../services/sound';

/**
 * 백그라운드 전환 시 사운드 즉시 중지 → 복귀 시 자동 재개.
 * 앱인토스 검수 요구사항.
 */
export function useVisibilityPause(onBackground: () => void, onForeground: () => void) {
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        sound.suspend();
        onBackground();
      } else {
        sound.resumeAfterBackground();
        onForeground();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [onBackground, onForeground]);
}
