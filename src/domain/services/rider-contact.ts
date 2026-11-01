/** Client-safe rider helpers (no node:crypto). */

/** LINE chat deep link for a LINE ID. */
export function lineChatUrl(lineId: string): string {
  return `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;
}
