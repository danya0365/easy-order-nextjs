import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { PlatformSettings } from "@/src/domain/entities";
import type {
  IPlatformSettingsRepository,
  UpdatePlatformSettingsInput,
} from "@/src/application/repositories/IPlatformSettingsRepository";

/** The singleton row id — one install has exactly one platform settings row. */
const SETTINGS_ID = "default";

type Row = typeof schema.platformSettings.$inferSelect;

function toSettings(r: Row): PlatformSettings {
  return {
    id: r.id,
    billingUiEnabled: r.billingUiEnabled,
    orderThresholdBillingEnabled: r.orderThresholdBillingEnabled,
    orderThresholdCount: r.orderThresholdCount,
    shopSuspensionEnabled: r.shopSuspensionEnabled,
    updatedAt: r.updatedAt,
  };
}

function defaults(): PlatformSettings {
  return {
    id: SETTINGS_ID,
    billingUiEnabled: true,
    orderThresholdBillingEnabled: false,
    orderThresholdCount: 50,
    shopSuspensionEnabled: false,
    updatedAt: new Date().toISOString(),
  };
}

export class DrizzlePlatformSettingsRepository
  implements IPlatformSettingsRepository
{
  async get(): Promise<PlatformSettings> {
    const r = await db.query.platformSettings.findFirst({
      where: eq(schema.platformSettings.id, SETTINGS_ID),
    });
    if (r) return toSettings(r);
    // Install predates the migration seed → create the default row now.
    const [created] = await db
      .insert(schema.platformSettings)
      .values({ id: SETTINGS_ID })
      .onConflictDoNothing()
      .returning();
    if (created) return toSettings(created);
    // Lost an insert race — re-read the winner.
    const winner = await db.query.platformSettings.findFirst({
      where: eq(schema.platformSettings.id, SETTINGS_ID),
    });
    return winner ? toSettings(winner) : defaults();
  }

  async update(input: UpdatePlatformSettingsInput): Promise<PlatformSettings> {
    // Ensure the row exists before patching it (the migration seed may be absent).
    await this.get();
    const [r] = await db
      .update(schema.platformSettings)
      .set({
        ...(input.billingUiEnabled !== undefined
          ? { billingUiEnabled: input.billingUiEnabled }
          : {}),
        ...(input.orderThresholdBillingEnabled !== undefined
          ? { orderThresholdBillingEnabled: input.orderThresholdBillingEnabled }
          : {}),
        ...(input.orderThresholdCount !== undefined
          ? { orderThresholdCount: input.orderThresholdCount }
          : {}),
        ...(input.shopSuspensionEnabled !== undefined
          ? { shopSuspensionEnabled: input.shopSuspensionEnabled }
          : {}),
      })
      .where(eq(schema.platformSettings.id, SETTINGS_ID))
      .returning();
    return toSettings(r);
  }
}
