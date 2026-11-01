"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch the server-rendered job list every `seconds` while the tab is visible. */
export function RiderAutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
