import { create } from 'zustand';

export type SettingsTab = 'gateway' | 'plugins';

interface UIState {
  isSettingsOpen: boolean;
  settingsTab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  settingsTab: 'gateway',
  openSettings: (tab = 'gateway') => set({ isSettingsOpen: true, settingsTab: tab }),
  closeSettings: () => set({ isSettingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
}));

