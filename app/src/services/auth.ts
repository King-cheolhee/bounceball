/**
 * 앱인토스 유저 식별.
 *  - 토스 앱/샌드박스: SDK `getUserKeyForGame()`로 게임 유저 식별키(HASH) 발급.
 *  - 일반 브라우저(개발·검증): 로컬 익명 UUID 폴백.
 *
 * 참고: SDK 2.7에서 `getUserKeyForGame`은 `getAnonymousKey` 권장으로 표시됐으나,
 * 앱인토스 '게임' 가이드와 출시 감사 기준이 명시적으로 `getUserKeyForGame`이라 이를 사용한다
 * (응답 형태 `{ type:'HASH', hash }`는 동일). 미지원/구버전 토스앱에서는 폴백한다.
 */
import { Storage } from './storage';
import { isInTossEnv } from './sdk';
import { getUserKeyForGame as sdkGetUserKeyForGame } from '@apps-in-toss/web-framework';

const USER_KEY = 'user_key';

function generateAnonymousKey(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'anon-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

export async function getUserKeyForGame(): Promise<string> {
  // 토스 환경: 실제 유저 식별키 발급 시도
  if (isInTossEnv()) {
    try {
      const res = await sdkGetUserKeyForGame();
      if (res && typeof res === 'object' && res.type === 'HASH' && res.hash) {
        // 재접속에도 동일 식별자를 쓰도록 저장 (네이티브 Storage 경유)
        await Storage.setItem(USER_KEY, res.hash);
        return res.hash;
      }
      // 'INVALID_CATEGORY' | 'ERROR' | undefined(구버전) → 아래 폴백
    } catch {
      // SDK 호출 실패 → 폴백
    }
  }
  // 폴백: 로컬 익명 UUID (기존 동작)
  const existing = await Storage.getItem(USER_KEY);
  if (existing) return existing;
  const key = generateAnonymousKey();
  await Storage.setItem(USER_KEY, key);
  return key;
}
