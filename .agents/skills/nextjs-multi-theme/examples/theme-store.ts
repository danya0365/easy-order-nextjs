// Theme Store with Zustand + Persist
// src/presentation/stores/theme.store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeTemplate = "core" | "minimal" | "retro-megazine";

interface ThemeState {
  template: ThemeTemplate;
  setTemplate: (template: ThemeTemplate) => void;
  // Optional: system preference detection
  followSystem: boolean;
  setFollowSystem: (follow: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      template: "core",
      setTemplate: (template) => set({ template, followSystem: false }),
      followSystem: true,
      setFollowSystem: (follow) => set({ followSystem: follow }),
    }),
    {
      name: "theme-storage",
      // Optional: version migration
      version: 1,
    }
  )
);
