import "server-only";

import {
  BULK_MAX_IDS,
  filterBulkItems,
  pageOf,
  type BulkItem,
  type BulkListQuery,
} from "@/src/domain/services/menu-bulk";
import { container } from "@/src/infrastructure/di/container";

export interface BulkListItemDto extends BulkItem {
  description: string | null;
}

export interface BulkPageResult {
  error?: string;
  items: BulkListItemDto[];
  page: number;
  totalPages: number;
  total: number;
  /** Every filtered item (capped at BULK_MAX_IDS) — only when `withAll`. */
  all?: BulkListItemDto[];
}

/** Shared by the /shop/menu page (SSR) and the client: ONE page of the bulk list. */
export async function loadBulkPage(shopId: string, q: BulkListQuery, withAll = false): Promise<BulkPageResult> {
  const rows = await container.menuItemRepository.listByShop(shopId);
  const dto = (i: (typeof rows)[number]): BulkListItemDto => ({
    id: i.id,
    shopId: i.shopId,
    name: i.name,
    description: i.description ?? null,
    categoryId: i.categoryId,
    priceSatang: i.priceSatang,
    isAvailable: i.isAvailable,
    isRecommended: i.isRecommended,
  });
  const filtered = filterBulkItems(rows, q);
  const pg = pageOf(filtered, q.page);
  return {
    items: pg.items.map(dto),
    page: pg.page,
    totalPages: pg.totalPages,
    total: pg.total,
    all: withAll ? filtered.slice(0, BULK_MAX_IDS).map(dto) : undefined,
  };
}

