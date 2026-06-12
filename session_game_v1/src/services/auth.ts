/**
 * 앱인토스 유저 식별. 1단계: 로컬에서 생성한 익명 UUID.
 * 2단계: `getUserKeyForGame()`로 교체.
 */
import { Storage } from './storage';

const USER_KEY = 'user_key';

function generateAnonymousKey(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'anon-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

export async function getUserKeyForGame(): Promise<string> {
  const existing = await Storage.getItem(USER_KEY);
  if (existing) return existing;
  const key = generateAnonymousKey();
  await Storage.setItem(USER_KEY, key);
  return key;
}
