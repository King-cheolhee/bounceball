/**
 * 화면 제어 — 가로 모드 고정 / 화면 항상 켜짐 / Safe Area.
 * 전부 토스 앱·샌드박스에서만 동작하고, 브라우저(개발)에서는 no-op이라
 * 기존 CSS env(safe-area-*) · RotatePrompt 안내가 그대로 폴백된다.
 */
import { isInTossEnv } from './sdk';
import { setDeviceOrientation, setScreenAwakeMode, SafeAreaInsets } from '@apps-in-toss/web-framework';

/** 가로 모드 고정. cleanup에서 세로로 복구(앱 전체 영향이므로 화면 이탈 시 원복). */
export function lockLandscape(): () => void {
  if (!isInTossEnv()) return () => {};
  try {
    void setDeviceOrientation({ type: 'landscape' });
  } catch {
    // ignore
  }
  return () => {
    try {
      void setDeviceOrientation({ type: 'portrait' });
    } catch {
      // ignore
    }
  };
}

/** 화면 항상 켜짐 on/off (게임 플레이 중 켜고, 나갈 때 끔). */
export function setAwake(enabled: boolean): void {
  if (!isInTossEnv()) return;
  try {
    void setScreenAwakeMode({ enabled });
  } catch {
    // ignore
  }
}

/** SDK Safe Area 인셋을 CSS 변수(--safe-*)에 반영. cleanup 반환(화면 방향 변경 구독 해제). */
export function syncSafeArea(): () => void {
  if (!isInTossEnv()) return () => {};
  const apply = (i: { top: number; bottom: number; left: number; right: number }) => {
    const root = document.documentElement;
    root.style.setProperty('--safe-top', `${i.top}px`);
    root.style.setProperty('--safe-bottom', `${i.bottom}px`);
    root.style.setProperty('--safe-left', `${i.left}px`);
    root.style.setProperty('--safe-right', `${i.right}px`);
  };
  try {
    apply(SafeAreaInsets.get());
    return SafeAreaInsets.subscribe({ onEvent: apply });
  } catch {
    return () => {};
  }
}
