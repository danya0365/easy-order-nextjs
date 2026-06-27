// Theme Provider
// app/providers/theme-provider.tsx

"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/presentation/stores/theme.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { template, followSystem } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    
    if (followSystem) {
      // Optional: detect system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemPrefersDark);
    }
    
    // Set data-theme attribute
    root.setAttribute("data-theme", template);
  }, [template, followSystem]);

  return <>{children}</>;
}
