/**
 * 앱인토스 Storage 추상화 레이어.
 *  - 토스 앱/샌드박스: 네이티브 `Storage`(@apps-in-toss/web-framework) — 앱 재시작에도 유지.
 *  - 일반 브라우저(개발·검증): localStorage, 그마저 막히면 메모리 폴백.
 *
 * 상위 호출부는 전부 async 인터페이스라 매체 교체에도 수정이 필요 없다.
 */
import { isInTossEnv } from './sdk';
import { Storage as TossStorage } from '@apps-in-toss/web-framework';

const PREFIX = 'tangtangball:';

const memoryFallback = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    memoryFallback.delete(key);
  }
}

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    if (isInTossEnv()) {
      try {
        return await TossStorage.getItem(PREFIX + key);
      } catch {
        // 네이티브 저장소 실패 → 폴백
      }
    }
    return safeGet(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isInTossEnv()) {
      try {
        await TossStorage.setItem(PREFIX + key, value);
        return;
      } catch {
        // 폴백
      }
    }
    safeSet(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (isInTossEnv()) {
      try {
        await TossStorage.removeItem(PREFIX + key);
        return;
      } catch {
        // 폴백
      }
    }
    safeRemove(key);
  },
};

import { CHECKPOINTS, INITIAL_LIVES } from '../utils/constants';

export interface ProgressData {
  currentStage: number;
  checkpointStage: number;
  maxClearedStage: number;
  totalPlays: number;
  totalDeaths: number;
}

const KEY_CURRENT = 'current_stage';
const KEY_CHECKPOINT = 'checkpoint_stage';
const KEY_MAX_CLEARED = 'max_cleared_stage';
const KEY_TOTAL_PLAYS = 'total_plays';
const KEY_TOTAL_DEATHS = 'total_deaths';
const KEY_SOUND = 'settings.sound';
const KEY_HAPTIC = 'settings.haptic';
const KEY_TRAIL = 'settings.trail';

function toInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadProgress(): Promise<ProgressData> {
  const [current, checkpoint, max, plays, deaths] = await Promise.all([
    Storage.getItem(KEY_CURRENT),
    Storage.getItem(KEY_CHECKPOINT),
    Storage.getItem(KEY_MAX_CLEARED),
    Storage.getItem(KEY_TOTAL_PLAYS),
    Storage.getItem(KEY_TOTAL_DEATHS),
  ]);
  return {
    currentStage: toInt(current, 1),
    checkpointStage: toInt(checkpoint, 1),
    maxClearedStage: toInt(max, 0),
    totalPlays: toInt(plays, 0),
    totalDeaths: toInt(deaths, 0),
  };
}

export async function saveProgress(data: Partial<ProgressData>): Promise<void> {
  const ops: Promise<void>[] = [];
  if (data.currentStage !== undefined) ops.push(Storage.setItem(KEY_CURRENT, String(data.currentStage)));
  if (data.checkpointStage !== undefined) ops.push(Storage.setItem(KEY_CHECKPOINT, String(data.checkpointStage)));
  if (data.maxClearedStage !== undefined) ops.push(Storage.setItem(KEY_MAX_CLEARED, String(data.maxClearedStage)));
  if (data.totalPlays !== undefined) ops.push(Storage.setItem(KEY_TOTAL_PLAYS, String(data.totalPlays)));
  if (data.totalDeaths !== undefined) ops.push(Storage.setItem(KEY_TOTAL_DEATHS, String(data.totalDeaths)));
  await Promise.all(ops);
}

/** 스테이지 클리어 후. 5/10/15 클리어 시 체크포인트(6/11/16) 자동 저장. */
export async function onStageClear(clearedStage: number): Promise<void> {
  const nextStage = clearedStage + 1;
  const prev = await loadProgress();
  const updates: Partial<ProgressData> = {
    currentStage: nextStage,
    maxClearedStage: Math.max(prev.maxClearedStage, clearedStage),
  };
  if (CHECKPOINTS.includes(nextStage)) {
    updates.checkpointStage = nextStage;
  }
  await saveProgress(updates);
}

/** 게임오버 후 체크포인트로 복귀. */
export async function returnToCheckpoint(): Promise<number> {
  const { checkpointStage } = await loadProgress();
  await saveProgress({ currentStage: checkpointStage });
  return checkpointStage;
}

/** 처음부터 다시 시작 (옵션 메뉴용). */
export async function resetProgress(): Promise<void> {
  await Promise.all([
    Storage.removeItem(KEY_CURRENT),
    Storage.removeItem(KEY_CHECKPOINT),
    Storage.removeItem(KEY_MAX_CLEARED),
    Storage.removeItem(KEY_TOTAL_PLAYS),
    Storage.removeItem(KEY_TOTAL_DEATHS),
  ]);
}

export async function incrementPlays(): Promise<void> {
  const prev = await loadProgress();
  await saveProgress({ totalPlays: prev.totalPlays + 1 });
}

export async function incrementDeaths(): Promise<void> {
  const prev = await loadProgress();
  await saveProgress({ totalDeaths: prev.totalDeaths + 1 });
}

// ===== 해금 시스템 (부품 ◆ / 스킨) =====
// 주의: 진행 데이터 초기화(resetProgress)에도 해금은 유지된다 — 수집 보상은 소멸하지 않음.
const KEY_PARTS = 'parts_total';
const KEY_SKINS = 'unlocked_skins';
const KEY_SKIN_SELECTED = 'selected_skin';

export interface UnlockData {
  parts: number;
  skins: string[];
  selectedSkin: string;
}

export async function loadUnlocks(): Promise<UnlockData> {
  const [parts, skins, selected] = await Promise.all([
    Storage.getItem(KEY_PARTS),
    Storage.getItem(KEY_SKINS),
    Storage.getItem(KEY_SKIN_SELECTED),
  ]);
  let skinList: string[] = ['dot'];
  if (skins) {
    try {
      const parsed = JSON.parse(skins);
      if (Array.isArray(parsed)) skinList = parsed.filter((s): s is string => typeof s === 'string');
    } catch {
      // 손상된 데이터 — 기본값 유지
    }
  }
  if (!skinList.includes('dot')) skinList.unshift('dot');
  return {
    parts: toInt(parts, 0),
    skins: skinList,
    selectedSkin: selected ?? 'dot',
  };
}

export async function saveUnlocks(data: Partial<UnlockData>): Promise<void> {
  const ops: Promise<void>[] = [];
  if (data.parts !== undefined) ops.push(Storage.setItem(KEY_PARTS, String(data.parts)));
  if (data.skins !== undefined) ops.push(Storage.setItem(KEY_SKINS, JSON.stringify(data.skins)));
  if (data.selectedSkin !== undefined) ops.push(Storage.setItem(KEY_SKIN_SELECTED, data.selectedSkin));
  await Promise.all(ops);
}

export async function loadSettings(): Promise<{ sound: boolean; haptic: boolean; trail: boolean }> {
  const [sound, haptic, trail] = await Promise.all([
    Storage.getItem(KEY_SOUND),
    Storage.getItem(KEY_HAPTIC),
    Storage.getItem(KEY_TRAIL),
  ]);
  return {
    sound: sound === null ? true : sound === 'true',
    haptic: haptic === null ? true : haptic === 'true',
    // 잔상 트레일 (V2) — 기본 ON (원작 BOUND 시그니처). 멀미 민감 시 OFF
    trail: trail === null ? true : trail === 'true',
  };
}

export async function saveSettings(data: { sound?: boolean; haptic?: boolean; trail?: boolean }): Promise<void> {
  const ops: Promise<void>[] = [];
  if (data.sound !== undefined) ops.push(Storage.setItem(KEY_SOUND, String(data.sound)));
  if (data.haptic !== undefined) ops.push(Storage.setItem(KEY_HAPTIC, String(data.haptic)));
  if (data.trail !== undefined) ops.push(Storage.setItem(KEY_TRAIL, String(data.trail)));
  await Promise.all(ops);
}

// ===== 완수 메타 (V2) — 스테이지별 기록: 부품 전량 수집 / 노데스 클리어 =====
// 진행 초기화(resetProgress)에도 유지 — 해금과 같은 '성취' 데이터 (의도된 설계)
const KEY_STAGE_RECORDS = 'stage_records';

export interface StageRecord {
  allParts: boolean;
  noDeath: boolean;
}

export async function loadStageRecords(): Promise<Record<number, StageRecord>> {
  const raw = await Storage.getItem(KEY_STAGE_RECORDS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<number, StageRecord>;
  } catch {
    // 손상된 데이터 — 기본값 유지
  }
  return {};
}

/** 기록은 상향만 — 한 번 달성한 allParts/noDeath는 다시 실패해도 유지된다. */
export async function mergeStageRecord(stageId: number, record: StageRecord): Promise<Record<number, StageRecord>> {
  const all = await loadStageRecords();
  const prev = all[stageId];
  all[stageId] = {
    allParts: (prev?.allParts ?? false) || record.allParts,
    noDeath: (prev?.noDeath ?? false) || record.noDeath,
  };
  await Storage.setItem(KEY_STAGE_RECORDS, JSON.stringify(all));
  return all;
}

export { INITIAL_LIVES };
