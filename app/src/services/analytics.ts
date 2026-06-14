/**
 * 사용자 행동 기록.
 *  - 토스 앱/샌드박스: SDK `Analytics.screen`으로 이벤트 기록(이벤트 추적·A/B용).
 *  - 일반 브라우저(개발): console.info.
 * 실패해도 게임 흐름에 영향을 주지 않도록 best-effort.
 */
import { isInTossEnv } from './sdk';
import { Analytics } from '@apps-in-toss/web-framework';

export function logEvent(name: string, params?: Record<string, unknown>): void {
  if (isInTossEnv()) {
    try {
      // SDK 파라미터는 Primitive 값을 기대 — 호출 경계에서 캐스팅(베스트에포트)
      const screen = Analytics.screen as (p: { log_name: string; [k: string]: unknown }) => void;
      screen({ log_name: name, ...(params ?? {}) });
    } catch {
      // 기록 실패는 무시
    }
    return;
  }
  if (import.meta.env.DEV) {
    console.info('[analytics:mock]', name, params ?? {});
  }
}
