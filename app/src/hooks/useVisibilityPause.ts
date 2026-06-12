import { useEffect } from 'react';
import { sound } from '../services/sound';

/**
 * 백그라운드 전환 시 사운드 즉시 중지 — 앱인토스 검수 요구사항.
 * 복귀 시에는 뮤트 플래그만 해제하고 자동 재개하지 않는다(모바일 오디오 정책):
 * 사용자가 버튼을 눌러 게임을 재개할 때 AudioContext가 자연스럽게 resume된다.
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
