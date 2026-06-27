import "server-only";

import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";

/**
 * Assemble the credentials handoff for a just-created shop: builds the login +
 * public URLs and the login QR. Shared by the admin create-shop and lead-convert
 * actions so the handoff is identical from both flows.
 */
export async function buildShopHandoff(input: {
  shopName: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<ShopHandoff> {
  const base = await getBaseUrl();
  const loginUrl = `${base}/login`;
  return {
    shopName: input.shopName,
    slug: input.slug,
    publicUrl: `${base}/s/${input.slug}`,
    ownerEmail: input.ownerEmail,
    ownerPassword: input.ownerPassword,
    loginUrl,
    loginQrDataUrl: await renderQrDataUrl(loginUrl),
  };
}
