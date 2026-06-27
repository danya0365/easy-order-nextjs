# Folder Structure — Next.js Clean Architecture + Drizzle

โครงสร้างนี้แยก **4 layer** โดย dependency ไหลทิศทางเดียว:

```
domain  ←  application  ←  infrastructure
                ↑                ↑
            presentation (app/ + src/presentation/)
```

- `domain` ไม่รู้จักใครเลย (pure)
- `application` รู้จัก `domain` (ใช้ entity + ประกาศ interface)
- `infrastructure` implement interface ของ `application` (Drizzle, auth, services)
- `presentation` เรียก use case ผ่าน DI container; ประกอบ UI

---

## Tree เต็ม

```
<project-root>/
├── app/                              # Next.js App Router (presentation/route layer)
│   ├── (auth)/                       # route group: ฟอร์ม login (ไม่ต้อง auth)
│   │   └── login/page.tsx
│   ├── (public)/                     # route group: หน้า public (ไม่เช็ค role)
│   │   └── ...                        #   เช่น landing, /[slug], /privacy
│   ├── (platform)/                   # route group: เฉพาะ role สูงสุด (เช่น platform_admin)
│   │   ├── layout.tsx                #   guard: requireRole("platform_admin")
│   │   └── admin/...
│   ├── (shop)/                       # route group: เจ้าของร้าน/owner
│   │   ├── layout.tsx                #   guard: requireRole("shop_owner") + billing guard
│   │   └── shop/...
│   ├── (staff)/                      # route group: พนักงาน/staff
│   │   ├── layout.tsx
│   │   └── staff/...
│   ├── api/                          # REST / webhook (ไม่มี role guard อัตโนมัติ)
│   │   └── .../route.ts
│   ├── layout.tsx                    # root layout
│   └── globals.css
│
├── src/
│   ├── domain/                       # ───── Layer 1: PURE ─────
│   │   ├── entities/
│   │   │   └── index.ts              # interface ของ entity (User, Shop, Session, ...)
│   │   ├── services/                 # pure functions (ไม่มี async/I/O) — unit-test ง่าย
│   │   │   ├── <rule>.ts             #   เช่น pricing, status state-machine, formatting
│   │   │   └── <rule>.test.ts        #   ทดสอบด้วย `node --test` / tsx ได้ตรงๆ
│   │   └── types/
│   │       └── roles.ts              # Role union + ROLE_HOME map ฯลฯ
│   │
│   ├── application/                  # ───── Layer 2: CONTRACTS + ORCHESTRATION ─────
│   │   ├── repositories/
│   │   │   ├── I<Entity>Repository.ts   # interface เท่านั้น (เช่น IUserRepository.ts)
│   │   │   └── pagination.ts            # type ร่วม (Page<T>, cursor helpers) ถ้ามี
│   │   ├── use-cases/
│   │   │   ├── auth/                     # จัดกลุ่มตาม domain
│   │   │   │   ├── LoginUseCase.ts
│   │   │   │   └── ChangePasswordUseCase.ts
│   │   │   ├── shop/
│   │   │   └── <domain>/<Action>UseCase.ts
│   │   └── services/
│   │       ├── I<Capability>.ts         # interface ของ service ภายนอก (IPasswordHasher, ...)
│   │       └── <AppService>.ts          # app-level service ที่ประกอบ repo หลายตัว
│   │
│   ├── infrastructure/               # ───── Layer 3: IMPLEMENTATIONS ─────
│   │   ├── di/
│   │   │   └── container.ts          # composition root (singleton, cache บน globalThis)
│   │   ├── auth/
│   │   │   ├── session.ts            # getSession/requireRole/createSession (cookie+DB)
│   │   │   └── <guard>.ts            # guard เสริม เช่น billing/scope
│   │   ├── db/
│   │   │   ├── client.ts             # libSQL client + drizzle() (cache บน globalThis)
│   │   │   └── schema/
│   │   │       ├── _shared.ts        # helper: id() / createdAt() / updatedAt()
│   │   │       ├── <entity>.ts       # sqliteTable ต่อ entity (snake-case filename)
│   │   │       └── index.ts          # re-export ทุก table (drizzle.config ชี้มาที่นี่)
│   │   ├── repositories/
│   │   │   └── drizzle/
│   │   │       └── Drizzle<Entity>Repository.ts   # implements I<Entity>Repository
│   │   └── services/
│   │       └── <Concrete>.ts         # impl ของ I<Capability> (BcryptPasswordHasher, ...)
│   │
│   └── presentation/                 # ───── Layer 4: UI + ENTRYPOINTS ─────
│       ├── components/
│       │   ├── ui/                   # primitives ของตัวเอง (Button, Input, Card, cn.ts)
│       │   ├── layout/               # AppHeader, AppTabBar, ฯลฯ
│       │   └── <feature>/            # component จัดกลุ่มตามฟีเจอร์
│       ├── actions/
│       │   └── <domain>-actions.ts   # "use server" — entrypoint ของ mutation
│       ├── hooks/
│       └── lib/                      # helper ฝั่ง view (format-date, money, ...)
│
├── drizzle/                          # migration ที่ generate แล้ว (อย่าแก้มือ)
├── scripts/
│   ├── seed.ts
│   └── vercel-migrate.mjs            # รัน db:migrate เฉพาะตอน VERCEL_ENV=production
├── proxy.ts                          # optimistic auth gate (ชื่อนี้แทน middleware.ts)
├── drizzle.config.ts                 # dialect turso, casing snake_case
├── .dependency-cruiser.cjs           # architecture rules (layer boundary + server-only) → ดู ENFORCEMENT.md
├── eslint.config.mjs                 # lint + architecture tripwire (component ห้าม import container/repo)
├── .github/workflows/ci.yml          # CI gate: lint:all + tsc + test (+ e2e)
├── docs/ARCHITECTURE.md              # layer graph (gen จาก `npm run depcruise:graph`)
└── package.json                      # version = single source ของเลขเวอร์ชั่น
```

---

## หน้าที่แต่ละโฟลเดอร์ (สั้นๆ)

| โฟลเดอร์ | หน้าที่ | สิ่งที่ "ห้าม" อยู่ในนี้ |
|---------|--------|------------------------|
| `src/domain/entities` | รูปร่างข้อมูลหลัก (TS interface) | logic ที่มี side-effect |
| `src/domain/services` | กฎธุรกิจล้วน (pure, sync) | `async`, query, `import` ภายนอก, `@/` runtime dep |
| `src/application/repositories` | **สัญญา** การเข้าถึงข้อมูล (`I*`) | โค้ด Drizzle/SQL จริง |
| `src/application/use-cases` | ขั้นตอนธุรกิจ 1 เรื่อง/คลาส (รับ interface ผ่าน constructor) | อ้าง Drizzle/Next โดยตรง |
| `src/infrastructure/di` | wiring interface ↔ impl (จุดเดียว) | business logic |
| `src/infrastructure/db` | client + schema (Drizzle) | UI |
| `src/infrastructure/repositories/drizzle` | impl ของ `I*Repository` | business rule (ให้อยู่ใน use case) |
| `src/infrastructure/auth` | session/role/scope guard | UI |
| `src/presentation/components` | React component | query DB ตรงๆ |
| `src/presentation/actions` | `"use server"` entrypoint; validate + เรียก use case | business logic ก้อนใหญ่ |
| `app/(group)` | route + layout guard ต่อ role | data-access ตรงๆ (ผ่าน container) |

---

## App Router: route groups ตาม role

แต่ละ role มี route group + `layout.tsx` ของตัวเอง ทำ authz จริงที่ layout:

```tsx
// app/(shop)/layout.tsx  (pattern)
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("shop_owner");   // authz จริง (session.ts ตรวจ DB)
  // ...guard เสริม เช่น เช็คสถานะ billing แล้ว redirect ถ้าถูกระงับ...
  return (/* header + main + nav */ <>{children}</>);
}
```

`proxy.ts` ทำแค่ "มี cookie ไหม" (optimistic) — **ไม่** ใช่ที่ตรวจ role/scope จริง
เพราะ Server Action เป็น POST มายัง route ของมันเอง จึงต้อง `requireRole()` ซ้ำใน action เสมอ

ดูเทมเพลตโค้ดของแต่ละ pattern ใน `LAYER_PATTERNS.md`
