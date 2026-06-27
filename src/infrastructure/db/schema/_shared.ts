import { text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

/** App-generated primary key (text/nanoid) — keeps multi-tenant joins simple. */
export const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => nanoid());

/** ISO-8601 timestamp string, defaulted at insert time. */
export const createdAt = () =>
  text()
    .notNull()
    .$defaultFn(() => new Date().toISOString());

/** ISO-8601 timestamp, set on insert and refreshed on update. */
export const updatedAt = () =>
  text()
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString());
