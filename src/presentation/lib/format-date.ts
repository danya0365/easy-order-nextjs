/**
 * Shared Thai-locale date formatters for user-facing timestamps. Always render
 * in Asia/Bangkok — Workers (SSR) run in UTC, so relying on the runtime zone
 * showed UTC times.
 */
export const BANGKOK_TZ = "Asia/Bangkok";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    timeZone: BANGKOK_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: BANGKOK_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("th-TH", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}
