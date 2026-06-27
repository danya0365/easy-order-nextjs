import "server-only";

import { and, desc, eq, count } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { Notification } from "@/src/domain/entities";
import type {
  CreateNotificationInput,
  INotificationRepository,
} from "@/src/application/repositories/INotificationRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";
import { decodeCursor } from "@/src/application/repositories/pagination";
import { cursorWhere, toPage } from "./_cursor";

type Row = typeof schema.notifications.$inferSelect;

function toNotification(r: Row): Notification {
  return {
    id: r.id,
    userId: r.userId,
    type: r.type,
    title: r.title,
    body: r.body,
    linkUrl: r.linkUrl,
    isRead: r.isRead,
    readAt: r.readAt,
    createdAt: r.createdAt,
  };
}

export class DrizzleNotificationRepository implements INotificationRepository {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const [r] = await db
      .insert(schema.notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
      })
      .returning();
    return toNotification(r);
  }

  async listByUser(userId: string, limit = 50): Promise<Notification[]> {
    const rows = await db.query.notifications.findMany({
      where: eq(schema.notifications.userId, userId),
      orderBy: desc(schema.notifications.createdAt),
      limit,
    });
    return rows.map(toNotification);
  }

  async pageByUser(
    userId: string,
    opts: PageOpts = {},
  ): Promise<Page<Notification>> {
    const limit = opts.limit ?? 20;
    const cur = decodeCursor(opts.cursor);
    const rows = await db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.userId, userId),
        cursorWhere(
          schema.notifications.createdAt,
          schema.notifications.id,
          cur,
        ),
      ),
      orderBy: [
        desc(schema.notifications.createdAt),
        desc(schema.notifications.id),
      ],
      limit: limit + 1,
    });
    return toPage(rows.map(toNotification), limit);
  }

  async countUnread(userId: string): Promise<number> {
    const [r] = await db
      .select({ value: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );
    return r?.value ?? 0;
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date().toISOString() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );
  }
}
