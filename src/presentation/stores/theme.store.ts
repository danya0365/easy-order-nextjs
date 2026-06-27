import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeTemplate = "cafe" | "minimal" | "retro";

export const THEME_TEMPLATES: ThemeTemplate[] = ["cafe", "minimal", "retro"];
export const DEFAULT_TEMPLATE: ThemeTemplate = "cafe";

interface ThemeState {
  template: ThemeTemplate;
  dark: boolean;
  setTemplate: (template: ThemeTemplate) => void;
  toggleDark: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      template: DEFAULT_TEMPLATE,
      dark: false,
      setTemplate: (template) => set({ template }),
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      setDark: (dark) => set({ dark }),
    }),
    { name: "theme-storage", version: 1 },
  ),
);
