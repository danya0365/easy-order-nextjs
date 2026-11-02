"use server";

import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { assertHalalMenuContent } from "@/src/domain/services/halal-menu";
import {
  canRunBulkOp,
  normalizeBulkIds,
  planBulk,
  type BulkItem,
  type BulkOp,
  type BulkSnapshot,
} from "@/src/domain/services/menu-bulk";
import type { User } from "@/src/domain/entities";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { getSession, requireShopWrite } from "@/src/infrastructure/auth/session";
import { db, schema, withScopedDb, type Database } from "@/src/infrastructure/db/client";
import { container } from "@/src/infrastructure/di/container";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export interface BulkResult {
  error?: string;
  changed?: number;
  /** Pre-change state of the changed rows — pass to undo (absent for delete). */
  undo?: BulkSnapshot[];
}

/** Owner / impersonating admin via requireShopWrite; branch_staff scoped to own shop. */
async function bulkActor(): Promise<{ actor: User; shopId: string }> {
  const user = await getSession();
  if (user?.role === "branch_staff") {
    if (!user.shopId) throw new Error("บัญชีนี้ไม่ได้ผูกกับร้านค้า");
    return { actor: user, shopId: user.shopId };
  }
  const { actor, shopId } = await requireShopWrite();
  return { actor, shopId };
}

async function loadOwned(shopId: string, ids: string[]): Promise<BulkItem[]> {
  const rows = await db
    .select()
    .from(schema.menuItems)
    .where(and(eq(schema.menuItems.shopId, shopId), inArray(schema.menuItems.id, ids)));
  // Ownership: every requested id must belong to THIS shop.
  if (rows.length !== ids.length) throw new Error("มีเมนูที่ไม่อยู่ในร้านนี้");
  return rows.map((r) => ({
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    description: r.description,
    categoryId: r.categoryId,
    priceSatang: r.priceSatang,
    isAvailable: r.isAvailable,
    isRecommended: r.isRecommended,
  }));
}

function updateStmt(db: Database, shopId: string, s: BulkSnapshot) {
  return db
    .update(schema.menuItems)
    .set({
      categoryId: s.categoryId,
      priceSatang: s.priceSatang,
      isAvailable: s.isAvailable,
      isRecommended: s.isRecommended,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.menuItems.id, s.id), eq(schema.menuItems.shopId, shopId)));
}

/**
 * Batch edit menu items. Re-plans from DB state (the client preview is only a
 * preview), validates ownership + permissions, then writes ALL rows in one
 * libSQL batch (a single transaction: all or nothing).
 */
export async function bulkUpdateMenuItemsAction(rawIds: string[], op: BulkOp): Promise<BulkResult> {
  try {
    const { actor, shopId } = await bulkActor();
    if (!op || typeof op !== "object" || !("kind" in op)) throw new Error("คำสั่งไม่ถูกต้อง");
    if (!canRunBulkOp(actor.role, op.kind)) throw new Error("พนักงานแก้ได้เฉพาะสถานะขาย/หมด");
    await assertShopActive(shopId);
    const ids = normalizeBulkIds(rawIds);
    const items = await loadOwned(shopId, ids);

    if (op.kind === "category") {
      const cat = await container.menuCategoryRepository.findById(op.categoryId);
      if (!cat || cat.shopId !== shopId) throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
      assertHalalMenuContent(cat.name);
    }
    const rows = planBulk(items, op);
    // Halal guard on every row that stays on the menu (names are unchanged by
    // these ops, but never let a batch re-publish non-halal content).
    if (op.kind !== "delete") {
      for (const r of rows) {
        const it = items.find((i) => i.id === r.id) as BulkItem & { description?: string | null };
        if (r.changed) assertHalalMenuContent(it.name, it.description);
      }
    }
    const changedRows = rows.filter((r) => r.changed);
    if (changedRows.length === 0) return { changed: 0, undo: [] };

    await withScopedDb(async (sdb) => {
      const stmts =
        op.kind === "delete"
          ? [sdb.delete(schema.menuItems).where(and(eq(schema.menuItems.shopId, shopId), inArray(schema.menuItems.id, ids)))]
          : changedRows.map((r) => updateStmt(sdb, shopId, r.after!));
      await sdb.batch(stmts as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    });

    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.menuBulkUpdated,
      targetType: "menu_item",
      targetId: null,
      shopId,
      ip: await getClientIp(),
      metadata: {
        op,
        count: changedRows.length,
        changes: changedRows.slice(0, 200).map((r) => ({ id: r.id, before: r.before, after: r.after })),
      },
    });
    revalidatePath("/shop/menu");
    return {
      changed: changedRows.length,
      undo: op.kind === "delete" ? undefined : changedRows.map((r) => r.before),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Undo a non-delete batch: restore the snapshot (same checks, one batch). */
export async function undoBulkMenuItemsAction(snapshots: BulkSnapshot[]): Promise<BulkResult> {
  try {
    const { actor, shopId } = await bulkActor();
    if (!Array.isArray(snapshots)) throw new Error("ข้อมูลไม่ถูกต้อง");
    const ids = normalizeBulkIds(snapshots.map((s) => s?.id));
    await assertShopActive(shopId);
    const items = await loadOwned(shopId, ids);
    const cats = new Set((await container.menuCategoryRepository.listByShop(shopId)).map((c) => c.id));
    const snaps = snapshots.map((s) => {
      const cur = items.find((i) => i.id === s.id)!;
      const staff = actor.role === "branch_staff";
      const price = Number(s.priceSatang);
      if (!staff && (!Number.isInteger(price) || price < 0)) throw new Error("ราคาไม่ถูกต้อง");
      if (!staff && !cats.has(s.categoryId)) throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
      return {
        id: s.id,
        isAvailable: !!s.isAvailable,
        isRecommended: staff ? cur.isRecommended : !!s.isRecommended,
        categoryId: staff ? cur.categoryId : s.categoryId,
        priceSatang: staff ? cur.priceSatang : price,
      };
    });
    await withScopedDb(async (sdb) => {
      const stmts = snaps.map((s) => updateStmt(sdb, shopId, s));
      await sdb.batch(stmts as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    });
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.menuBulkUndone,
      targetType: "menu_item",
      shopId,
      ip: await getClientIp(),
      metadata: { count: snaps.length, restored: snapshots.slice(0, 200) },
    });
    revalidatePath("/shop/menu");
    return { changed: snaps.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
