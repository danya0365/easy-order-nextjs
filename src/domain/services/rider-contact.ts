/** Client-safe rider helpers (no node:crypto). */

/** LINE chat deep link for a LINE ID. */
/** Public URL of a rider's avatar (cache-busted by the storage key), or null. */
export function riderAvatarSrc(rider: { id: string; avatarUrl?: string | null }): string | null {
  if (!rider.avatarUrl) return null;
  const v = rider.avatarUrl.split("/").pop()?.split(".")[0] ?? "";
  return `/api/rider-avatars/${encodeURIComponent(rider.id)}?v=${encodeURIComponent(v)}`;
}

export function lineChatUrl(lineId: string): string {
  return `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;
}
