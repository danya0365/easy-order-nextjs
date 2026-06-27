# Enforcement — บังคับ architecture rules ด้วยเครื่อง (ไม่ต้องตรวจ manual)

เป้าหมาย: ทำให้ **กฎเหล็ก** (layer dependency direction, `server-only`, no-cycle) fail ตั้งแต่ตอนเขียน
(editor/CLI) และ **block ไม่ให้ merge** บน CI — เหลือให้คน/AI review เฉพาะกฎเชิง semantic ที่ import-graph มองไม่เห็น

3 ชั้น: **dependency-cruiser** (สัญญา layer ทั้งหมด) · **ESLint tripwire** (feedback ทันทีตอนพิมพ์) · **CI gate** (block merge)

> เส้นแบ่งสำคัญ:
> - **Automated (import-graph จับได้):** domain pure · application ไม่แตะ infra/ORM · component ไม่แตะ container/repo · ทุก repo/secret-service มี `server-only` · ไม่มี dependency cycle
> - **ยังต้องพึ่ง test + review (semantic — จับด้วย import graph ไม่ได้):** ทุก query scope ด้วย tenant id (`shopId`) · มี `requireRole()` · business logic อยู่ใน use case จริง (ไม่ใช่แค่ import ถูก) → คุมด้วย **integration test** (use case + Drizzle repo จริงบน in-memory DB)

---

## 1. dependency-cruiser — แหล่ง truth เดียวของกฎ layer

```bash
npm i -D dependency-cruiser
```

`.dependency-cruiser.cjs` ที่ root (แก้ path/ชื่อให้ตรงโปรเจค — ปกติใช้ได้เลยถ้าโครงตรง skill):

```js
/** Architecture rules — enforce the Clean-Architecture layering mechanically.
 *  Run: `npm run depcruise` (also in `npm run lint:all` + CI). */
module.exports = {
  forbidden: [
    {
      name: "domain-pure",
      severity: "error",
      comment: "domain ต้อง pure — ห้ามรู้จัก Next.js / ORM / React หรือ layer นอก",
      from: { path: "^src/domain" },
      to: {
        path: "^(src/(application|infrastructure|presentation)|node_modules/(next|drizzle-orm|@libsql|react|react-dom))",
      },
    },
    {
      name: "app-no-infra",
      severity: "error",
      comment: "application = interface + use case — ห้าม import infrastructure/ORM/presentation",
      from: { path: "^src/application" },
      to: {
        path: "^(src/(infrastructure|presentation)|node_modules/(drizzle-orm|@libsql|next))",
      },
    },
    {
      name: "component-no-container",
      severity: "error",
      comment: "presentation component ห้ามแตะ DI container / repository ตรงๆ — เรียก use case จาก server component หรือ action แทน",
      from: { path: "^src/presentation/components" },
      to: { path: "^src/infrastructure/(di/container|repositories)" },
    },
    {
      name: "no-cycle",
      severity: "error",
      comment: "ห้ามมี dependency cycle",
      from: {},
      to: { circular: true },
    },
  ],

  required: [
    {
      // ทุก Drizzle repository ต้องขึ้นต้นด้วย import "server-only"
      name: "repo-server-only",
      severity: "error",
      module: { path: "^src/infrastructure/repositories/drizzle/Drizzle.+\\.ts$" },
      to: { path: "^server-only$" },
    },
    {
      // service ที่แตะ crypto/secret ต้อง server-only — *เติมชื่อ service ของโปรเจคเอง*
      // (ตัวอย่างจาก Easy Stamp: BcryptPasswordHasher | ManualSlipPaymentVerifier | TurnstileVerifier)
      name: "secret-service-server-only",
      severity: "error",
      module: { path: "^src/infrastructure/services/(PasswordHasher|<SecretServiceA>|<SecretServiceB>)\\.ts$" },
      to: { path: "^server-only$" },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },  // ⚠ จำเป็น — ให้ resolve alias `@/*`
    tsPreCompilationDeps: false,              // ⚠ `import type` ข้าม layer ไม่นับเป็น dependency
    exclude: { path: "\\.test\\.ts$|^src/test/" }, // test (integration import container โดยตั้งใจ)
  },
};
```

### ⚠ Gotchas (เสียเวลา debug มาแล้ว — อ่านก่อน)
- **`tsConfig` จำเป็น** ไม่งั้น resolve `@/*` ไม่เจอ → report เพี้ยน/หาว่าไม่มี dependency
- **`tsPreCompilationDeps: false`** ไม่งั้น `import type { X } from "@/src/application/..."` ใน component
  จะถูกนับเป็น cross-layer dependency (false positive) — ความจริง type ถูก erase ตอน compile จึงข้าม layer ได้
- **server-only match ด้วย `^server-only$`** ไม่ใช่ `node_modules/server-only` — depcruise resolve bare package
  เป็นชื่อ `"server-only"` เฉยๆ (เพราะ `doNotFollow: node_modules`)
- **exclude test ทุกที่** เพราะ integration test อยู่ใน `src/application/**` แต่ import `container` (infra) โดยตั้งใจ
- **ผลพลอยได้:** depcruise track dependency จริง**หลัง compile** — unused import จะถูก elide (ไม่ flag);
  ของจริงที่ "ใช้งาน" ข้าม layer ถึงจะโดนจับ (ส่วน source-level ให้ ESLint จับ — ดูข้อ 2)

---

## 2. ESLint tripwire — feedback ทันทีตอนพิมพ์

depcruise เป็น CLI (เห็นตอนรัน lint/CI) แต่ไม่ขึ้น squiggle ใน editor → เพิ่ม **block เดียว** ที่คุ้มสุด
ใน `eslint.config.mjs` (flat config) ให้ component ที่ import container/repo แดงทันที:

```js
{
  files: ["src/presentation/components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/src/infrastructure/di/container",
        message: "component ห้ามแตะ DI container — เรียก use case จาก server component หรือ action แทน",
      }],
      patterns: [{
        group: ["@/src/infrastructure/repositories/*"],
        message: "component ห้าม import repository ตรงๆ",
      }],
    }],
  },
},
```

(ESLint จับ **source-level** — แดงแม้ import ยังไม่ถูกใช้; depcruise จับ **usage จริง** — เสริมกัน)

---

## 3. package.json scripts

```jsonc
{
  "scripts": {
    "depcruise": "depcruise src --config .dependency-cruiser.cjs",
    "depcruise:graph": "depcruise src --config .dependency-cruiser.cjs --output-type mermaid --include-only \"^src\" --collapse 2",
    // รวม depcruise เข้า lint:all (ต่อท้าย eslint + stylelint ที่มีอยู่)
    "lint:all": "eslint && stylelint \"public/styles/**/*.css\" && depcruise src --config .dependency-cruiser.cjs"
  }
}
```

`depcruise:graph` → mermaid ระดับ layer (เอาไปแปะ `docs/ARCHITECTURE.md` ในบล็อก ```mermaid ได้เลย):
ควรเห็นลูกศรไหลทางเดียว `application→domain`, `infrastructure→{application,domain}`, `presentation→{ทั้งหมด}` — **ไม่มี** ลูกศรออกจาก domain

---

## 4. CI gate — GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
  pull_request:
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  verify:                      # gate หลัก เร็ว
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint:all   # eslint + stylelint + depcruise
      - run: npx tsc --noEmit
      - run: npm test
  e2e:                         # หนักกว่า (โหลด browser) → แยก job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

> ⚠ **ห้ามรัน `npm run build` ใน CI** ถ้า build script รัน migration ใส่ DB จริง (เช่น `scripts/vercel-migrate.mjs`
> ที่ยิง prod Turso) — build เป็นงานของ deploy (Vercel) ไม่ใช่ CI. test runner ควร force DB เป็น `:memory:`/ไฟล์ชั่วคราว
> เอง จึงรันได้โดยไม่ต้องมี secret · (ตั้ง branch protection ให้ `verify` เป็น required check ก่อน merge ได้)

---

## 5. ตรวจว่า rule จับได้จริง (พิสูจน์, แล้ว revert)

```bash
npm run depcruise          # ควรเขียว 0 violations กับโค้ดที่ clean อยู่แล้ว
# ลองพัง: import { container } ใน component สักไฟล์ (ที่ใช้งานจริง) → depcruise + eslint แดง
# ลองพัง: ลบ import "server-only" จาก repo สักตัว → depcruise required rule แดง
git checkout -- <files>    # คืนค่า
```

Checklist ติดตั้ง (โปรเจคใหม่): `npm i -D dependency-cruiser` → วาง `.dependency-cruiser.cjs` (แก้ชื่อ secret service)
→ เพิ่ม ESLint block → เพิ่ม scripts + รวม `lint:all` → วาง `ci.yml` → `npm run depcruise` ให้เขียว
