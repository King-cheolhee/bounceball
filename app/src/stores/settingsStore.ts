import { create } from 'zustand';
import { loadSettings, saveSettings } from '../services/storage';
import { sound } from '../services/sound';
import { setHapticEnabled } from '../services/haptic';

interface SettingsState {
  sound: boolean;
  haptic: boolean;
  /** 잔상 트레일 (V2) — 원작 BOUND 포물선 잔상 오마주. 멀미 민감 사용자는 OFF */
  trail: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSound: (value: boolean) => Promise<void>;
  setHaptic: (value: boolean) => Promise<void>;
  setTrail: (value: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sound: true,
  haptic: true,
  trail: true,
  hydrated: false,
  async hydrate() {
    const data = await loadSettings();
    sound.setEnabled(data.sound);
    setHapticEnabled(data.haptic);
    set({ sound: data.sound, haptic: data.haptic, trail: data.trail, hydrated: true });
  },
  async setSound(value: boolean) {
    set({ sound: value });
    sound.setEnabled(value);
    await saveSettings({ sound: value });
  },
  async setHaptic(value: boolean) {
    set({ haptic: value });
    setHapticEnabled(value);
    await saveSettings({ haptic: value });
  },
  async setTrail(value: boolean) {
    set({ trail: value });
    await saveSettings({ trail: value });
  },
}));
