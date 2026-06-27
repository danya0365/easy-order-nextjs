---
name: nextjs-clean-arch-drizzle
description: >
  โครงสร้าง Clean Architecture แบบ Next.js (App Router) + Turso/libSQL + Drizzle ORM
  (DI container, Repository Interface → Drizzle impl, Use Case, Server Actions,
  custom session auth). ใช้เมื่อเริ่มโปรเจคใหม่ หรือต้องวางโครง layer/folder
  ให้ตรงแพทเทิร์นนี้ หรือเพิ่มฟีเจอร์ที่ต้องไหลครบทุก layer.
version: "1.1"
metadata:
  author: dan
  stack: next.js, typescript, turso/libsql, drizzle, tailwind v4
  pattern: clean-architecture-drizzle
---

## เมื่อไหร่ใช้ skill นี้

ใช้กับโปรเจค Next.js (App Router) ที่ data layer เป็น **Turso/libSQL + Drizzle ORM**
และ business logic ทำงานบน **Server (Server Components + Server Actions)** ไม่ใช่ client SPA

> ⚠️ **ต่างจาก `nextjs-create-page` / `nextjs-create-repo` / `nextjs-use-case-pattern`**
> ชุดนั้นเป็นสาย **Supabase + Mock Repository + Presenter/View** (data fetch ฝั่ง client)
> สาย skill นี้คือ **Drizzle + DI container + Server Action** — ไม่มี Presenter/Mock,
> ดึงข้อมูลใน Server Component, mutate ผ่าน Server Action เรียก Use Case โดยตรง
> **อย่าผสมสองสายในโปรเจคเดียว** — เลือกสายใดสายหนึ่ง

อ่านรายละเอียดเต็มก่อนลงมือเสมอ:

```
references/FOLDER_STRUCTURE.md   → tree + หน้าที่แต่ละโฟลเดอร์
references/LAYER_PATTERNS.md     → โค้ดเทมเพลตคัดลอกใช้ได้จริงของทุก pattern
references/ENFORCEMENT.md        → บังคับกฎ layer อัตโนมัติ (dependency-cruiser + ESLint + CI)
```

## 🚨 กฎเหล็ก (Core Rules)

- **Dependency ทิศทางเดียว:** `domain` → `application` → `infrastructure` → `presentation`
  layer ในต้องไม่ import layer นอก (`domain` ห้ามรู้จัก Drizzle/Next.js เลย)
- **Repository = interface ก่อนเสมอ:** ประกาศ `I[Entity]Repository` ใน `application/` แล้วค่อย
  implement `Drizzle[Entity]Repository` ใน `infrastructure/` — Use Case รู้จักเฉพาะ interface
- **Business logic อยู่ใน Use Case เท่านั้น:** ห้ามเขียน logic/Drizzle query ตรงๆ ใน Server Action
  หรือ Component — Action แค่ validate → เรียก Use Case → จัดการ redirect/revalidate
- **ทุก query scope ด้วย tenant id + ตรวจ role:** มัลติเทแนนต์บังคับใน application layer
  (`requireRole()` + scope ด้วย `shopId`/`branchId`) — ไม่มี RLS
- **`"server-only"`** บนทุกไฟล์ที่แตะ DB/secret/container เพื่อกัน import เข้า client

## 4 Layer (สรุป)

| Layer | โฟลเดอร์ | มีอะไร | ห้ามมี |
|-------|---------|--------|--------|
| **domain** | `src/domain/` | entities (interface), pure services, types/enums | async, I/O, import ภายนอก |
| **application** | `src/application/` | repository **interfaces** (`I*`), use cases, service interfaces | โค้ด ORM/HTTP จริง |
| **infrastructure** | `src/infrastructure/` | Drizzle impl, DB schema/client, DI container, auth, service impl | UI/React |
| **presentation** | `src/presentation/` + `app/` | Server/Client Components, Server Actions, hooks, lib | Drizzle query ตรงๆ |

## 6 Pattern หลัก (ดูเทมเพลตเต็มใน `references/LAYER_PATTERNS.md`)

1. **DI Container** — composition root เดียว (`src/infrastructure/di/container.ts`),
   wire `Drizzle*` impl เข้ากับ interface ทั้งหมด, cache singleton บน `globalThis`
   (กัน connection leak ตอน HMR), มาร์ก `"server-only"`. สลับ implementation ที่นี่ที่เดียว
2. **Repository** — `I[Entity]Repository` (application) + `Drizzle[Entity]Repository` (infrastructure)
   พร้อม `to[Entity]()` mapper (row → entity) และ variant `...WithSecret` เมื่อต้องส่ง field ลับ
3. **Use Case** — class, constructor DI รับ interface, มี `execute(...)` เดียว, จัดกลุ่มตาม domain
   (`use-cases/auth/`, `use-cases/shop/`, …), instantiate ด้วย `container.*` ใน Action
4. **Server Action** — ไฟล์ `*-actions.ts` ขึ้นต้น `"use server"`, validate ด้วย Zod,
   คืน `FormState { error?, success? }`, guard ด้วย `requireRole()`, จบด้วย `revalidatePath()`
   หรือ `redirect()` (redirect throw — ต้องอยู่นอก try/catch)
5. **Session auth** — cookie httpOnly `es_session` + ตาราง `sessions` + bcrypt,
   `getSession()/requireRole()/requireShopScope()/createSession()` ใน `infrastructure/auth/session.ts`,
   `proxy.ts` ทำแค่ optimistic cookie check (authz จริงอยู่ใน layout/action)
6. **Drizzle schema** — `schema/_shared.ts` helpers `id()/createdAt()/updatedAt()`,
   ทุกตาราง `sqliteTable` + index, `casing: "snake_case"`, `dialect: "turso"`,
   id = `nanoid` (text), timestamp = ISO-8601 string

## 🔒 บังคับกฎอัตโนมัติ (Enforcement) — อย่าตรวจ manual

กฎเหล็ก + ทิศทาง layer ทั้งหมดข้างบน **บังคับด้วยเครื่อง** ไม่ต้องพึ่งคน/AI ไล่อ่านทีละไฟล์
(เทมเพลตเต็ม copy ใช้ได้ใน `references/ENFORCEMENT.md`):

- **dependency-cruiser** (`.dependency-cruiser.cjs`) — `npm run depcruise` (อยู่ใน `lint:all` + CI):
  domain pure · application ห้ามแตะ infra/ORM · component ห้ามแตะ DI container/repo ·
  ทุก Drizzle repo + secret service ต้อง `import "server-only"` · ไม่มี dependency cycle
- **ESLint tripwire** — block import container/repo ใน component ตั้งแต่พิมพ์ (source-level, แดงใน editor)
- **CI gate** (GitHub Actions) — `lint:all + tsc + test` ทุก push/PR → block merge ถ้าผิด

> **เส้นแบ่ง:** import-graph จับ **structural** ได้ (layer direction, server-only, cycle) แต่จับ **semantic** ไม่ได้ —
> ทุก query scope ด้วย tenant id, มี `requireRole()`, logic อยู่ใน use case จริง → พวกนี้พึ่ง **integration test**
> (use case + Drizzle repo จริงบน in-memory DB) + review

## โครงสร้างโฟลเดอร์ (ย่อ)

```
app/
  (auth)/ (public)/ (platform)/ (shop)/ (staff)/   ← route groups แยกตาม role
  api/                                              ← webhook / REST
src/
  domain/         entities/ services/ types/
  application/    repositories/ (I*.ts)  use-cases/<domain>/  services/ (I*.ts)
  infrastructure/ di/container.ts  auth/  db/{client.ts,schema/}  repositories/drizzle/  services/
  presentation/   components/{ui,...}  actions/ (*-actions.ts)  hooks/ lib/
drizzle/          ← migration ที่ generate แล้ว
proxy.ts          ← optimistic auth gate (ไม่ใช่ middleware.ts)
```

## Naming Conventions

| สิ่งของ | แพทเทิร์น | ตัวอย่าง |
|--------|----------|----------|
| Repository interface | `I[Entity]Repository.ts` | `IUserRepository.ts` |
| Repository impl | `Drizzle[Entity]Repository.ts` | `DrizzleUserRepository.ts` |
| Use case | `[Domain][Action]UseCase.ts` | `LoginUseCase.ts`, `CreateShopUseCase.ts` |
| Server action file | `[domain]-actions.ts` | `auth-actions.ts`, `shop-actions.ts` |
| Component | PascalCase `.tsx` | `AddStaffForm.tsx`, `Button.tsx` |
| Schema file | `[entity].ts` (snake-case) | `users.ts`, `stamp-cards.ts` |
| DB column | `snake_case` (auto จาก casing) | `shop_id`, `line_user_id` |
| Domain entity | interface (ไม่ใช่ class) | `User`, `Shop`, `Session` |

## Tech Stack + Versioning

- **Next.js (App Router)** + **React 19** + **TypeScript** (strict)
- **Drizzle ORM** + **@libsql/client** (Turso) — dialect `turso`, casing `snake_case`
- **bcryptjs** (hash รหัสผ่าน), **Zod** (validate input), **nanoid** (id)
- **Tailwind v4** + custom `ui/` components (ไม่ใช้ shadcn) + lucide-react
- **dependency-cruiser** (architecture linter — บังคับ layer boundary + `server-only` ใน `lint:all` + CI)
- **Versioning:** SemVer, source เดียวที่ `package.json` → embed เป็น `NEXT_PUBLIC_APP_VERSION`
  ตอน build → แสดงที่ footer. bump ตอน release เท่านั้น (ไม่ bump ทุก commit)

## Checklist เริ่มโปรเจคใหม่ตามแพทเทิร์นนี้

1. วางโครง 4 layer ตาม `references/FOLDER_STRUCTURE.md`
2. ตั้ง `drizzle.config.ts` (dialect turso, casing snake_case) + `db/client.ts` (cache บน globalThis)
3. สร้าง `schema/_shared.ts` (`id/createdAt/updatedAt`) แล้วเริ่ม table แรก + `schema/index.ts`
4. สำหรับแต่ละ entity: `I[Entity]Repository` → `Drizzle[Entity]Repository` → wire ใน `container.ts`
5. business flow: `[Domain][Action]UseCase` (constructor DI) → เรียกจาก `*-actions.ts`
6. auth: `session.ts` (`requireRole`/`createSession`) + `proxy.ts` + layout guard ต่อ route group
7. ทุก mutation ต้องผ่าน Server Action → Use Case; ทุก query scope ด้วย tenant id
8. ตั้ง enforcement: `.dependency-cruiser.cjs` + ESLint tripwire + CI ตาม `references/ENFORCEMENT.md`
   แล้ว `npm run depcruise` ให้เขียว (กฎ layer จะถูกบังคับอัตโนมัติ ไม่ต้องตรวจ manual)

ดูเทมเพลตโค้ดเต็มทุก pattern ใน `references/LAYER_PATTERNS.md`
