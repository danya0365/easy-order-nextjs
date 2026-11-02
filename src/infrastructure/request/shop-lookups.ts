import "server-only";

import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "./request-memo";

/** Memoized per request: the /s/[slug] layout, its probe and the page share one query. */
export const shopBySlug = (slug: string) =>
  requestMemo(`shopBySlug:${slug}`, () => container.shopRepository.findBySlug(slug));

export const shopImages = (shopId: string) =>
  requestMemo(`shopImages:${shopId}`, () => container.shopImageRepository.listByShop(shopId));
