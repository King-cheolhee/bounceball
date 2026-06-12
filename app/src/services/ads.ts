/**
 * 광고 추상화 레이어. 1단계: Mock(짧은 검정 페이드 + 카운트다운 시뮬레이션).
 * 2단계: `@apps-in-toss/framework`의 `loadAppsInTossAdMob` / `showAppsInTossAdMob`로 교체.
 *
 * 앱인토스 정책 준수:
 * - 사전 로딩 (실시간 로딩 금지)
 * - 광고 재생 중 게임 음악 일시정지
 * - 종료 후 음악 자동 재개
 * - 보상형은 완전 시청 시에만 보상 지급
 */
export type AdType = 'interstitial' | 'rewarded';

const INTERSTITIAL_ID = 'ait-ad-test-interstitial-id';
const REWARDED_ID = 'ait-ad-test-rewarded-id';

interface AdListener {
  onShow?: () => void;
  onClose?: (rewarded: boolean) => void;
}

const loaded: Record<AdType, boolean> = {
  interstitial: false,
  rewarded: false,
};

let activeListener: AdListener | null = null;

export function setAdListener(listener: AdListener | null) {
  activeListener = listener;
}

export async function preloadAd(type: AdType): Promise<void> {
  loaded[type] = true;
  await new Promise((r) => setTimeout(r, 50));
}

export function isAdReady(type: AdType): boolean {
  return loaded[type];
}

/** 전면 광고 표시 (Mock UI를 띄우기 위한 이벤트를 발행). 종료 시 resolve. */
export function showInterstitial(): Promise<void> {
  return new Promise((resolve) => {
    document.dispatchEvent(
      new CustomEvent<AdEventDetail>('mock-ad:show', {
        detail: {
          type: 'interstitial',
          adUnitId: INTERSTITIAL_ID,
          onClose: () => {
            loaded.interstitial = false;
            activeListener?.onClose?.(false);
            resolve();
          },
          onShow: () => activeListener?.onShow?.(),
        },
      }),
    );
  });
}

/** 보상형 광고 표시. resolve(true) = 보상 지급, resolve(false) = 시청 중단. */
export function showRewarded(): Promise<boolean> {
  return new Promise((resolve) => {
    document.dispatchEvent(
      new CustomEvent<AdEventDetail>('mock-ad:show', {
        detail: {
          type: 'rewarded',
          adUnitId: REWARDED_ID,
          onClose: (rewarded) => {
            loaded.rewarded = false;
            activeListener?.onClose?.(rewarded);
            resolve(rewarded);
          },
          onShow: () => activeListener?.onShow?.(),
        },
      }),
    );
  });
}

export interface AdEventDetail {
  type: AdType;
  adUnitId: string;
  onClose: (rewarded: boolean) => void;
  onShow: () => void;
}
