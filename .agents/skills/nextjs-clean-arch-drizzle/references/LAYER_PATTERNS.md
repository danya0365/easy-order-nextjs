# Layer Patterns — เทมเพลตโค้ดคัดลอกใช้ได้จริง

เทมเพลตทั้งหมดดึงจากโปรเจคจริง แล้วแทน placeholder:

| Placeholder | ความหมาย | ตัวอย่าง |
|-------------|----------|----------|
| `[Entity]` | PascalCase เอกพจน์ | `User` |
| `[entity]` | camelCase เอกพจน์ | `user` |
| `[entities]` | camelCase พหูพจน์ (ชื่อตาราง/ฟิลด์) | `users` |
| `[Domain]` | กลุ่มฟีเจอร์ | `Auth`, `Shop` |
| `[Action]` | กริยาของ use case | `Login`, `CreateShop` |

ลำดับการสร้างฟีเจอร์ใหม่: **schema → repository (interface → impl) → wire DI → use case → server action → component**

---

## 0) Drizzle config + client

```ts
// drizzle.config.ts
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// โหลด .env* แบบเดียวกับ Next (drizzle-kit รันนอก runtime ของ Next)
loadEnvConfig(process.cwd());

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db"; // local = ไฟล์
const authToken = process.env.TURSO_AUTH_TOKEN;                  // prod = Turso creds

export default defineConfig({
  dialect: "turso",
  schema: "./src/infrastructure/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url, ...(authToken ? { authToken } : {}) },
  casing: "snake_case", // คอลัมน์เป็น snake_case อัตโนมัติจากชื่อ field แบบ camelCase
});
```

```ts
// src/infrastructure/db/client.ts
import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

// cache ข้าม HMR ใน dev เพื่อไม่เปิด connection ใหม่ทุกครั้งที่แก้โค้ด
const globalForDb = globalThis as unknown as {
  __dbClient?: Client;
  __db?: LibSQLDatabase<typeof schema>;
};

function buildClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return createClient({ url, authToken });
}

const client = globalForDb.__dbClient ?? buildClient();
if (process.env.NODE_ENV !== "production") globalForDb.__dbClient = client;

export const db = globalForDb.__db ?? drizzle(client, { schema, casing: "snake_case" });
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
export type Database = typeof db;
```

**Migration workflow**
- local: `npm run db:push` (drizzle-kit push — ลงสคีมาทันทีกับไฟล์ DB)
- generate: `npm run db:generate` → ได้ไฟล์ใน `drizzle/`
- prod: `scripts/vercel-migrate.mjs` รัน `db:migrate` เฉพาะตอน `VERCEL_ENV=production`

---

## 1) Schema (Drizzle)

```ts
// src/infrastructure/db/schema/_shared.ts
import { text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

/** primary key ที่แอปสร้างเอง (text/nanoid) — join มัลติเทแนนต์ง่าย */
export const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => nanoid());

/** ISO-8601 string ตั้งค่าตอน insert */
export const createdAt = () =>
  text()
    .notNull()
    .$defaultFn(() => new Date().toISOString());

/** ISO-8601 string ตั้งตอน insert และรีเฟรชตอน update */
export const updatedAt = () =>
  text()
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString());
```

```ts
// src/infrastructure/db/schema/[entities].ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { parents } from "./parents"; // ตารางที่อ้างถึง (ถ้ามี FK)

export const [entities] = sqliteTable(
  "[entities]",
  {
    id: id(),
    name: text().notNull(),
    // FK ไปตารางแม่ — scope มัลติเทแนนต์ผ่านคอลัมน์นี้
    parentId: text().references(() => parents.id, { onDelete: "cascade" }),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("[entities]_parent_idx").on(t.parentId),
    // ใส่ composite index ตาม query จริง เช่น (parentId, createdAt) สำหรับ list/pagination
    index("[entities]_parent_created_idx").on(t.parentId, t.createdAt),
  ],
);
```

```ts
// src/infrastructure/db/schema/index.ts — re-export ทุกตาราง (drizzle.config ชี้มาที่นี่)
export * from "./users";
export * from "./[entities]";
// ...
```

> เก็บ enum + type ของ role ไว้ใกล้ schema ได้ เช่น
> `export const USER_ROLES = ["platform_admin","shop_owner","branch_staff"] as const;`
> แล้ว `role: text({ enum: USER_ROLES }).notNull()`

---

## 2) Domain entity (pure interface)

```ts
// src/domain/entities/index.ts
export interface [Entity] {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string;
}

/** variant ที่พ่วง field ลับ — ใช้เฉพาะตอน verify, ห้ามหลุดออกนอก infra/use-case */
export interface [Entity]WithSecret extends [Entity] {
  passwordHash: string;
}
```

---

## 3) Repository: interface (application) → Drizzle impl (infrastructure)

```ts
// src/application/repositories/I[Entity]Repository.ts
import type { [Entity], [Entity]WithSecret } from "@/src/domain/entities";

export interface Create[Entity]Input {
  name: string;
  parentId?: string | null;
}

export interface I[Entity]Repository {
  create(input: Create[Entity]Input): Promise<[Entity]>;
  findById(id: string): Promise<[Entity] | null>;
  /** scope ด้วย tenant id เสมอ */
  listByParent(parentId: string): Promise<[Entity][]>;
  setActive(id: string, isActive: boolean): Promise<[Entity]>;
  /** คืน field ลับ — สำหรับ verify เท่านั้น */
  findByIdWithSecret(id: string): Promise<[Entity]WithSecret | null>;
}
```

```ts
// src/infrastructure/repositories/drizzle/Drizzle[Entity]Repository.ts
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { [Entity], [Entity]WithSecret } from "@/src/domain/entities";
import type {
  Create[Entity]Input,
  I[Entity]Repository,
} from "@/src/application/repositories/I[Entity]Repository";

type Row = typeof schema.[entities].$inferSelect;

// mapper เดียว: row (มี field ลับ) → entity (ไม่มี field ลับ)
function to[Entity](row: Row): [Entity] {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class Drizzle[Entity]Repository implements I[Entity]Repository {
  async create(input: Create[Entity]Input): Promise<[Entity]> {
    const [row] = await db
      .insert(schema.[entities])
      .values({ name: input.name, parentId: input.parentId ?? null })
      .returning();
    return to[Entity](row);
  }

  async findById(id: string): Promise<[Entity] | null> {
    const row = await db.query.[entities].findFirst({
      where: eq(schema.[entities].id, id),
    });
    return row ? to[Entity](row) : null;
  }

  async listByParent(parentId: string): Promise<[Entity][]> {
    const rows = await db.query.[entities].findMany({
      where: eq(schema.[entities].parentId, parentId),
    });
    return rows.map(to[Entity]);
  }

  async setActive(id: string, isActive: boolean): Promise<[Entity]> {
    const [row] = await db
      .update(schema.[entities])
      .set({ isActive })
      .where(eq(schema.[entities].id, id))
      .returning();
    return to[Entity](row);
  }

  async findByIdWithSecret(id: string): Promise<[Entity]WithSecret | null> {
    const row = await db.query.[entities].findFirst({
      where: eq(schema.[entities].id, id),
    });
    return row ? { ...to[Entity](row), passwordHash: row.passwordHash } : null;
  }
}
```

---

## 4) DI Container (composition root)

```ts
// src/infrastructure/di/container.ts
import "server-only";

import { Drizzle[Entity]Repository } from "@/src/infrastructure/repositories/drizzle/Drizzle[Entity]Repository";
import { BcryptPasswordHasher } from "@/src/infrastructure/services/BcryptPasswordHasher";

import type { I[Entity]Repository } from "@/src/application/repositories/I[Entity]Repository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/**
 * Composition root ฝั่ง server: singleton ของ repository + service ที่ wire impl จริงไว้.
 * จะสลับ implementation (เช่นเปลี่ยน storage/verifier) — แก้ "ที่นี่ที่เดียว" ไม่ต้องแตะ use case.
 */
class Container {
  readonly [entity]Repository: I[Entity]Repository = new Drizzle[Entity]Repository();
  // ...repo อื่นๆ...

  readonly passwordHasher: IPasswordHasher = new BcryptPasswordHasher();

  // service ที่ env กำหนด impl ได้ ใช้ factory:
  // readonly storage: IStorage = createStorage(); // R2 ถ้ามี env, ไม่งั้น local
}

// cache บน globalThis เพื่อกัน connection leak ตอน HMR ใน dev
const g = globalThis as unknown as { __container?: Container };
export const container = g.__container ?? new Container();
if (process.env.NODE_ENV !== "production") g.__container = container;
```

> service ที่เลือก impl ตาม env ให้ใช้ factory function แล้วเรียกใน field:
> ```ts
> function createStorage(): IStorage {
>   const cfg = r2ConfigFromEnv();
>   return cfg ? new R2Storage(cfg) : new LocalStorage();
> }
> ```

---

## 5) Use Case (constructor DI + execute เดียว)

```ts
// src/application/use-cases/[domain]/[Action]UseCase.ts
import type { [Entity] } from "@/src/domain/entities";
import type { I[Entity]Repository } from "@/src/application/repositories/I[Entity]Repository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/** อธิบายสิ่งที่ use case นี้ทำในบรรทัดเดียว */
export class [Action]UseCase {
  constructor(
    private readonly [entities]: I[Entity]Repository, // รับ "interface" ไม่ใช่ impl
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<[Entity] | null> {
    const normalized = email.trim().toLowerCase();
    const record = await this.[entities].findByIdWithSecret(normalized);
    if (!record || !record.isActive) return null;
    const ok = await this.hasher.compare(password, record.passwordHash);
    if (!ok) return null;
    const { passwordHash: _omit, ...entity } = record; // ตัด field ลับก่อนคืน
    void _omit;
    return entity;
  }
}
```

use case ที่ซับซ้อนรับหลาย repo ผ่าน constructor ได้ตามต้องการ — validate input, เช็ค uniqueness,
สร้างหลาย record ใน execute เดียว (เป็นที่รวม "ขั้นตอนธุรกิจ" ทั้งหมด)

---

## 6) Server Action (entrypoint ของ mutation)

```ts
// src/presentation/actions/[domain]-actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { container } from "@/src/infrastructure/di/container";
import { requireRole, createSession } from "@/src/infrastructure/auth/session";
import { [Action]UseCase } from "@/src/application/use-cases/[domain]/[Action]UseCase";

const schema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export interface FormState {
  error?: string;
  success?: string;
}

export async function [action]Action(
  _prev: FormState,        // ตัวแรกคือ state เดิม (ใช้กับ useActionState)
  formData: FormData,
): Promise<FormState> {
  // 1) validate ด้วย Zod
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  // 2) (ถ้าเป็น mutation ที่ต้อง auth) guard role — อย่าเชื่อ proxy อย่างเดียว
  // const user = await requireRole("shop_owner");

  // 3) เรียก use case ผ่าน container
  const useCase = new [Action]UseCase(
    container.[entity]Repository,
    container.passwordHasher,
  );
  const result = await useCase.execute(parsed.data.email, parsed.data.password);
  if (!result) return { error: "ไม่สำเร็จ" };

  // 4) side effect: revalidate cache หรือ redirect
  // revalidatePath("/[some-path]");
  await createSession(result.id);
  redirect("/"); // redirect throw — ต้องอยู่นอก try/catch เสมอ
}
```

**รูปแบบที่ใช้ try/catch** (อยากคืน error ให้ฟอร์มแทน throw):

```ts
export async function createStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("shop_owner");
    const shopId = user.shopId!;                 // scope ด้วย tenant id ของ user
    await new CreateStaffUseCase(
      container.userRepository,
      container.passwordHasher,
    ).execute({ shopId, /* ...fields จาก formData... */ });
    revalidatePath("/shop/staff");
    return { success: "เพิ่มพนักงานแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
```

**ฝั่ง client component** ผูกกับ action ด้วย `useActionState`:

```tsx
"use client";
import { useActionState } from "react";
import { createStaffAction } from "@/src/presentation/actions/shop-actions";

export function AddStaffForm() {
  const [state, action, pending] = useActionState(createStaffAction, {});
  return (
    <form action={action}>
      {/* fields */}
      {state.error && <p className="text-error">{state.error}</p>}
      <button disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึก"}</button>
    </form>
  );
}
```

---

## 7) Session Auth + Route Guard

```ts
// src/infrastructure/auth/session.ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { container } from "@/src/infrastructure/di/container";
import type { User } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "es_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** อ่าน+ตรวจ session จาก cookie → DB. นี่คือ authz "จริง" (proxy เป็นแค่ optimistic). */
export async function getSession(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await container.sessionRepository.findValid(token, new Date());
  return result?.user ?? null;
}

/** บังคับ login + role. เรียกบนสุดของทุก protected layout/page และในทุก action. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles.length > 0 && !roles.includes(user.role)) redirect("/login");
  return user;
}

/** ตรวจว่า user เป็นเจ้าของ tenant นี้ (role สูงสุด bypass). */
export function requireShopScope(user: User, shopId: string): void {
  if (user.role === "platform_admin") return;
  if (user.shopId !== shopId) throw new Error("Forbidden: scope mismatch");
}

/** สร้าง session row + เซ็ต httpOnly cookie. ใช้ใน Server Action เท่านั้น. */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await container.sessionRepository.create({
    userId,
    expiresAt: expiresAt.toISOString(),
  });
  (await cookies()).set(COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
```

```ts
// proxy.ts (รากโปรเจค — ชื่อนี้แทน middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "es_session";
const PROTECTED_PREFIXES = ["/admin", "/shop", "/staff"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // ส่ง pathname ให้ layout อ่านได้ (เช่นให้บางหน้า bypass guard)
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  // OPTIMISTIC เท่านั้น: เช็คแค่ "มี cookie ไหม" — authz จริงอยู่ใน layout/action
  if (needsAuth && !request.cookies.has(COOKIE_NAME)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/shop/:path*", "/staff/:path*"],
};
```

```ts
// src/domain/types/roles.ts
export type Role = "platform_admin" | "shop_owner" | "branch_staff";

/** หน้าแรกของแต่ละ role — ใช้ตอน redirect หลัง login */
export const ROLE_HOME: Record<Role, string> = {
  platform_admin: "/admin",
  shop_owner: "/shop",
  branch_staff: "/staff",
};
```

---

## สรุปกฎที่ห้ามพลาด

1. **interface ก่อน impl** — use case เห็นแค่ `I*`, ไม่เคยเห็น `Drizzle*`
2. **wire ที่ container เดียว** — สลับ impl โดยไม่แตะ use case
3. **business logic อยู่ใน use case** — action แค่ validate + เรียก + redirect/revalidate
4. **`requireRole()` ซ้ำในทุก action** — proxy เป็นแค่ optimistic
5. **scope ทุก query ด้วย tenant id** — multi-tenant ไม่มี RLS, บังคับใน app layer
6. **`"server-only"`** บนไฟล์ที่แตะ DB/secret/container
