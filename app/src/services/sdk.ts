/**
 * 앱인토스 SDK 접근의 단일 지점 — "지금 토스 앱/샌드박스 안에서 실행 중인가?" 판정.
 *
 * 각 services(auth/storage/ads/analytics/haptic 등)는 이 판정으로 분기한다:
 *  - 토스 앱·샌드박스: 실제 SDK 사용
 *  - 일반 브라우저(개발·헤드리스 검증): 기존 폴백(localStorage/UUID/MockAdOverlay) 사용
 *
 * getOperationalEnvironment()는 토스 브리지가 없는 일반 브라우저에서 throw할 수 있으므로
 * try/catch로 감싸 안전하게 false(=폴백)로 떨어뜨린다. 결과는 1회만 계산해 캐시한다.
 */
import { getOperationalEnvironment, closeView, graniteEvent } from '@apps-in-toss/web-framework';

let cached: boolean | null = null;

/** 토스 앱 또는 샌드박스 환경이면 true. 일반 브라우저면 false. */
export function isInTossEnv(): boolean {
  if (cached !== null) return cached;
  try {
    const env = getOperationalEnvironment();
    cached = env === 'toss' || env === 'sandbox';
  } catch {
    cached = false;
  }
  return cached;
}

/** 미니앱 닫기(종료). 브라우저(개발)에서는 닫을 수 없어 no-op. */
export async function closeMiniApp(): Promise<void> {
  if (isInTossEnv()) {
    try {
      await closeView();
    } catch {
      // ignore
    }
  }
}

/**
 * 토스 네이티브 뒤로가기 이벤트 구독 (지원 시). 종료 확인 모달을 띄우는 데 사용.
 * cleanup 함수를 반환한다. 브라우저/미지원 환경에서는 빈 cleanup.
 */
export function onTossBackEvent(handler: () => void): () => void {
  if (!isInTossEnv()) return () => {};
  try {
    return graniteEvent.addEventListener('backEvent', { onEvent: handler });
  } catch {
    return () => {};
  }
}
