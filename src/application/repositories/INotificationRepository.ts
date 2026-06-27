import type { Notification, NotificationType } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  listByUser(userId: string, limit?: number): Promise<Notification[]>;
  /** Cursor-paginated, newest first (inbox page). */
  pageByUser(userId: string, opts?: PageOpts): Promise<Page<Notification>>;
  countUnread(userId: string): Promise<number>;
  markAllRead(userId: string): Promise<void>;
}
