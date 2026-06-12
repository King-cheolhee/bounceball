import { create } from 'zustand';
import { loadUnlocks, saveUnlocks } from '../services/storage';
import { SKINS, DEFAULT_SKIN, isSkinId, type SkinId } from '../utils/skins';

/**
 * 해금 시스템 상태 — 부품(◆)과 스킨.
 * 부품은 스테이지를 "클리어"해야 적립된다 (죽으면 그 시도분은 소멸 — 재도전 동기).
 * 스킨은 순수 외형 변화만 — 밸런스 영향 금지가 원칙.
 */
interface UnlockState {
  parts: number;
  unlockedSkins: string[];
  selectedSkin: SkinId;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addParts: (n: number) => Promise<void>;
  buySkin: (id: SkinId) => Promise<boolean>;
  selectSkin: (id: SkinId) => Promise<void>;
}

export const useUnlockStore = create<UnlockState>((set, get) => ({
  parts: 0,
  unlockedSkins: ['dot'],
  selectedSkin: DEFAULT_SKIN,
  hydrated: false,

  async hydrate() {
    const data = await loadUnlocks();
    set({
      parts: data.parts,
      unlockedSkins: data.skins,
      selectedSkin: isSkinId(data.selectedSkin) ? data.selectedSkin : DEFAULT_SKIN,
      hydrated: true,
    });
  },

  async addParts(n: number) {
    if (n <= 0) return;
    const next = get().parts + n;
    set({ parts: next });
    await saveUnlocks({ parts: next });
  },

  /** 구매 성공 시 true. 부품 부족/이미 보유 시 false. */
  async buySkin(id: SkinId) {
    const def = SKINS.find((s) => s.id === id);
    if (!def) return false;
    const { parts, unlockedSkins } = get();
    if (unlockedSkins.includes(id)) return false;
    if (parts < def.cost) return false;
    const nextParts = parts - def.cost;
    const nextSkins = [...unlockedSkins, id];
    set({ parts: nextParts, unlockedSkins: nextSkins, selectedSkin: id });
    await saveUnlocks({ parts: nextParts, skins: nextSkins, selectedSkin: id });
    return true;
  },

  async selectSkin(id: SkinId) {
    if (!get().unlockedSkins.includes(id)) return;
    set({ selectedSkin: id });
    await saveUnlocks({ selectedSkin: id });
  },
}));
