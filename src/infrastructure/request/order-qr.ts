import "server-only";

import {
  CLAIM_TOKEN_TTL_S,
  mintBranchClaimToken,
  mintClaimToken,
} from "@/src/infrastructure/auth/order-access";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { getBaseUrl } from "@/src/presentation/lib/base-url";

/** Fresh order-QR (claim URL) image + the expiry a printout of it will have. */
export async function buildOrderAccessQr(shop: {
  id: string;
  slug: string;
  onlineOrderingEnabled: boolean;
}): Promise<{ qrDataUrl: string; expiresAtMs: number } | null> {
  if (!shop.onlineOrderingEnabled) return null;
  const token = mintClaimToken(shop.slug, shop.id);
  if (!token) return null;
  const url = `${await getBaseUrl()}/s/${shop.slug}/enter?t=${token}`;
  return { qrDataUrl: await renderQrDataUrl(url), expiresAtMs: Date.now() + CLAIM_TOKEN_TTL_S * 1000 };
}

/** Order-QR for ONE branch: scanning it sends the order to that branch. */
export async function buildBranchOrderQr(
  shop: { id: string; slug: string; onlineOrderingEnabled: boolean },
  branchId: string,
): Promise<{ qrDataUrl: string; url: string; expiresAtMs: number } | null> {
  if (!shop.onlineOrderingEnabled) return null;
  const token = mintBranchClaimToken(shop.slug, shop.id, branchId);
  if (!token) return null;
  const url = `${await getBaseUrl()}/s/${shop.slug}/enter?t=${token}&b=${encodeURIComponent(branchId)}`;
  return {
    qrDataUrl: await renderQrDataUrl(url),
    url,
    expiresAtMs: Date.now() + CLAIM_TOKEN_TTL_S * 1000,
  };
}
