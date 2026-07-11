/**
 * 인앱 광고 — 앱인토스 전체화면 광고(loadFullScreenAd / showFullScreenAd) 연동.
 *
 *  - 토스 앱/샌드박스 + SDK 지원: 실제 광고 노출(전면형·보상형 모두 운영 ID).
 *  - 일반 브라우저(개발·검증): GamePlayPage가 MockAdOverlay로 폴백 렌더.
 *
 * 앱인토스 정책 준수:
 *  - 사전 로딩 필수(실시간 로딩 금지) — GamePlayPage 진입 시 preloadAd 호출.
 *  - 광고 재생 중 게임 음악 일시정지, 종료 후 자동 재개(GamePlayPage가 showAd 상태로 처리).
 *  - 보상형은 보상 이벤트(userEarnedReward) 수신 시에만 보상 지급.
 *
 * ⚠️ 광고 ID 상태(2026-07-11): 전면형·보상형 모두 콘솔 승인 운영 adGroupId 적용 완료.
 *    인앱 광고 운영에는 사업자 등록이 필요하다.
 */
import { isInTossEnv } from './sdk';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

export type AdType = 'interstitial' | 'rewarded';

// 광고 그룹 ID — 전면형·보상형 모두 콘솔 발급 운영 ID (2026-07-11 승인).
const AD_GROUP_ID: Record<AdType, string> = {
  interstitial: 'ait.v2.live.b5a8766b61d547e4',
  rewarded: 'ait.v2.live.55440ecc937e4613',
};

const loaded: Record<AdType, boolean> = { interstitial: false, rewarded: false };
const loadCleanup: Record<AdType, (() => void) | null> = { interstitial: null, rewarded: null };

/** 실제 전체화면 광고를 사용할 수 있는 환경인가 (토스 + SDK 지원). */
export function canUseRealAd(): boolean {
  if (!isInTossEnv()) return false;
  try {
    return loadFullScreenAd.isSupported() === true && showFullScreenAd.isSupported() === true;
  } catch {
    return false;
  }
}

/** 광고 사전 로딩 (앱인토스 정책: 재생 시점 실시간 로딩 금지). 즉시 반환하고 로딩은 비동기로 진행. */
export async function preloadAd(type: AdType): Promise<void> {
  if (!canUseRealAd()) {
    loaded[type] = true; // 브라우저 mock: 즉시 준비된 것으로 간주
    return;
  }
  try {
    loadCleanup[type]?.();
    loaded[type] = false;
    loadCleanup[type] = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID[type] },
      onEvent: (e) => {
        if (e.type === 'loaded') loaded[type] = true;
      },
      onError: () => {
        loaded[type] = false;
      },
    });
  } catch {
    loaded[type] = false;
  }
}

export function isAdReady(type: AdType): boolean {
  return loaded[type];
}

/**
 * 실제 전체화면 광고 노출. (토스 환경에서만 호출 — 브라우저는 MockAdOverlay로 처리)
 * resolve 값: 보상형 광고에서 보상을 획득하면 true, 그 외(전면/중단/실패)는 false.
 */
export function presentRealAd(type: AdType): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let earned = false;
    let settled = false;
    let showCleanup: (() => void) | null = null;
    let timeoutId = 0;
    const done = (rewarded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      // 브리지 리스너 해제 (누수 방지)
      try {
        showCleanup?.();
      } catch {
        // ignore
      }
      loaded[type] = false;
      // 다음 광고를 위해 미리 로드
      void preloadAd(type);
      resolve(rewarded);
    };
    try {
      showCleanup = showFullScreenAd({
        options: { adGroupId: AD_GROUP_ID[type] },
        onEvent: (e) => {
          if (e.type === 'userEarnedReward') {
            earned = true;
          } else if (e.type === 'dismissed') {
            done(type === 'rewarded' ? earned : false);
          } else if (e.type === 'failedToShow') {
            done(false);
          }
        },
        onError: () => done(false),
      });
    } catch {
      done(false);
    }
    // 안전장치: 닫힘 이벤트가 끝내 오지 않을 경우 게임이 영구 정지되지 않도록 복구
    if (!settled) {
      timeoutId = window.setTimeout(() => done(type === 'rewarded' ? earned : false), 90000);
    }
  });
}
