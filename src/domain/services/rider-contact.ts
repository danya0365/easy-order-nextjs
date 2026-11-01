/** Client-safe rider helpers (no node:crypto). */

/** LINE chat deep link for a LINE ID. */
/** Public URL of a rider's avatar (cache-busted by the storage key), or null. */
export function riderAvatarSrc(rider: { id: string; avatarUrl?: string | null }): string | null {
  if (!rider.avatarUrl) return null;
  const v = rider.avatarUrl.split("/").pop()?.split(".")[0] ?? "";
  return `/api/rider-avatars/${encodeURIComponent(rider.id)}?v=${encodeURIComponent(v)}`;
}

/**
 * What the customer sees about delivery on an order: en route (rider + call)
 * only while assigned/picked up; "delivered" once done; nothing otherwise.
 */
export function customerDeliveryView(order: {
  status: string;
  riderId: string | null;
  deliveryStatus: string | null;
}): "en_route" | "delivered" | null {
  if (order.status === "cancelled") return null;
  if (order.deliveryStatus === "delivered") return "delivered";
  if (order.riderId && (order.deliveryStatus === "assigned" || order.deliveryStatus === "picked_up")) {
    return "en_route";
  }
  return null;
}

export function lineChatUrl(lineId: string): string {
  return `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;
}
