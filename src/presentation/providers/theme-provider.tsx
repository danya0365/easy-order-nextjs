"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/src/presentation/stores/theme.store";

/** Applies the active template + dark mode to <html> on change. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const template = useThemeStore((s) => s.template);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", template);
    root.classList.toggle("dark", dark);
  }, [template, dark]);

  return <>{children}</>;
}

/**
 * Blocking inline script that applies the persisted theme before first paint,
 * preventing a flash of the default theme for returning users.
 */
export function ThemeScript() {
  const code = `(function(){try{var s=JSON.parse(localStorage.getItem('theme-storage')||'{}');var t=(s.state&&s.state.template)||'cafe';var d=(s.state&&s.state.dark)||false;var r=document.documentElement;r.setAttribute('data-theme',t);if(d)r.classList.add('dark');}catch(e){document.documentElement.setAttribute('data-theme','cafe');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
