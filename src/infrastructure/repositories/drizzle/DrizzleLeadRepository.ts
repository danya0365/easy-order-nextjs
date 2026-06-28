import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  or,
} from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type {
  Lead,
  LeadLostReason,
  LeadMapLocation,
  LeadStatus,
} from "@/src/domain/entities";
import type {
  CreateLeadInput,
  ILeadRepository,
  ListLeadsOpts,
  UpdateLeadInput,
} from "@/src/application/repositories/ILeadRepository";
import type { Page } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.leads.$inferSelect;

function toLead(r: Row): Lead {
  return {
    id: r.id,
    name: r.name,
    categoryId: r.categoryId,
    address: r.address,
    phone: r.phone,
    latitude: r.latitude,
    longitude: r.longitude,
    photoUrl: r.photoUrl,
    status: r.status,
    lostReason: r.lostReason,
    nextFollowUpAt: r.nextFollowUpAt,
    followUpNotifiedAt: r.followUpNotifiedAt,
    notes: r.notes,
    convertedShopId: r.convertedShopId,
    convertedAt: r.convertedAt,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLeadRepository implements ILeadRepository {
  async create(input: CreateLeadInput): Promise<Lead> {
    const [r] = await db
      .insert(schema.leads)
      .values({
        name: input.name,
        categoryId: input.categoryId ?? null,
        address: input.address ?? null,
        phone: input.phone ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: input.notes ?? null,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        createdBy: input.createdBy ?? null,
      })
      .returning();
    return toLead(r);
  }

  async findById(id: string): Promise<Lead | null> {
    const r = await db.query.leads.findFirst({
      where: eq(schema.leads.id, id),
    });
    return r ? toLead(r) : null;
  }

  async page(opts: ListLeadsOpts = {}): Promise<Page<Lead>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.leads.findMany({
      where: and(
        opts.status ? eq(schema.leads.status, opts.status) : undefined,
        cursorWhere(schema.leads.createdAt, schema.leads.id, cur),
      ),
      orderBy: [desc(schema.leads.createdAt), desc(schema.leads.id)],
      limit: limit + 1,
    });
    return toPage(rows.map(toLead), limit);
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    const [r] = await db
      .update(schema.leads)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined
          ? { categoryId: input.categoryId }
          : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined
          ? { longitude: input.longitude }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.nextFollowUpAt !== undefined
          ? { nextFollowUpAt: input.nextFollowUpAt }
          : {}),
      })
      .where(eq(schema.leads.id, id))
      .returning();
    return toLead(r);
  }

  async setStatus(
    id: string,
    status: LeadStatus,
    lostReason?: LeadLostReason | null,
  ): Promise<Lead> {
    const [r] = await db
      .update(schema.leads)
      .set({ status, lostReason: status === "lost" ? lostReason ?? null : null })
      .where(eq(schema.leads.id, id))
      .returning();
    return toLead(r);
  }

  async setPhoto(id: string, photoUrl: string): Promise<Lead> {
    const [r] = await db
      .update(schema.leads)
      .set({ photoUrl })
      .where(eq(schema.leads.id, id))
      .returning();
    return toLead(r);
  }

  async markConverted(id: string, shopId: string): Promise<Lead> {
    const [r] = await db
      .update(schema.leads)
      .set({
        convertedShopId: shopId,
        convertedAt: new Date().toISOString(),
        status: "won",
      })
      .where(eq(schema.leads.id, id))
      .returning();
    return toLead(r);
  }

  async listMapLocations(): Promise<LeadMapLocation[]> {
    const rows = await db
      .select({
        leadId: schema.leads.id,
        name: schema.leads.name,
        status: schema.leads.status,
        latitude: schema.leads.latitude,
        longitude: schema.leads.longitude,
        address: schema.leads.address,
        phone: schema.leads.phone,
      })
      .from(schema.leads)
      .where(
        and(
          isNotNull(schema.leads.latitude),
          isNotNull(schema.leads.longitude),
          isNull(schema.leads.convertedShopId),
        ),
      )
      .orderBy(asc(schema.leads.name));

    // latitude/longitude are guaranteed non-null by the isNotNull filters above.
    return rows.map((r) => ({
      ...r,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
    }));
  }

  async listDueFollowUps(now: string): Promise<Lead[]> {
    const rows = await db.query.leads.findMany({
      where: and(
        isNotNull(schema.leads.nextFollowUpAt),
        lte(schema.leads.nextFollowUpAt, now),
        notInArray(schema.leads.status, ["won", "lost"]),
        // Idempotent: skip leads already announced for the *current* due date.
        // A reschedule pushes nextFollowUpAt past the stamp, re-arming the lead.
        or(
          isNull(schema.leads.followUpNotifiedAt),
          lt(schema.leads.followUpNotifiedAt, schema.leads.nextFollowUpAt),
        ),
      ),
      orderBy: asc(schema.leads.nextFollowUpAt),
    });
    return rows.map(toLead);
  }

  async markFollowUpsNotified(ids: string[], at: string): Promise<void> {
    if (ids.length === 0) return;
    await db
      .update(schema.leads)
      .set({ followUpNotifiedAt: at })
      .where(inArray(schema.leads.id, ids));
  }

  async allPhotoKeys(): Promise<string[]> {
    const rows = await db
      .select({ key: schema.leads.photoUrl })
      .from(schema.leads)
      .where(isNotNull(schema.leads.photoUrl));
    return rows.map((r) => r.key!).filter(Boolean);
  }
}
