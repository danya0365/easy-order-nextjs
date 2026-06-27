# Versioning Pattern — Feature-based SemVer (Next.js)

คู่มือ + โค้ด template สำหรับวางระบบ versioning/release ที่ "เวอร์ชั่นมีแหล่งเดียว"
คัดลอกแล้วปรับ placeholder (`[ProjectName]` ฯลฯ) ได้เลย

---

## 1) `package.json` — scripts + lifecycle hook

```jsonc
{
  "name": "[project-name]",
  "version": "0.1.0",
  "scripts": {
    "release:patch": "npm version patch -m \"chore(release): v%s\"",
    "release:minor": "npm version minor -m \"chore(release): v%s\"",
    "release:major": "npm version major -m \"chore(release): v%s\"",
    "version": "git add CHANGELOG.md"
  }
}
```

**กลไก `npm version <level>` ทำให้ในคำสั่งเดียว:**

1. รัน lifecycle hook `preversion` (ถ้ามี — เช่นใส่ test/lint กันพังก็ได้)
2. bump `version` ใน `package.json` (+ `package-lock.json`)
3. รัน hook **`version`** → `git add CHANGELOG.md` ดึง changelog เข้า commit เดียวกับ tag
4. สร้าง commit `chore(release): vX.Y.Z` (จาก `-m`, `%s` = เลขใหม่)
5. สร้าง git tag `vX.Y.Z`

> ใช้ `npm` (มี hook `version`). ถ้าทีมใช้ `pnpm`/`yarn` กลไก hook ต่างกัน — ปรับตามนั้น
> ถ้า `npm version` ฟ้อง working tree สกปรก: commit งานก่อน หรือเพิ่ม `--force` เฉพาะเมื่อจำเป็น

---

## 2) ฝัง version เข้า build

### Next.js — `next.config.ts`

```ts
import { execSync } from "child_process";
import type { NextConfig } from "next";

const getCommitSha = () => {
  try {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA ||           // platform-provided บน CI/Vercel
      execSync("git rev-parse HEAD").toString().trim() // local build
    );
  } catch {
    return "";
  }
};

const nextConfig: NextConfig = {
  env: {
    // npm ตั้ง npm_package_version ให้เมื่อรันผ่าน `npm run build`
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
};

export default nextConfig;
```

> ต้อง build ผ่าน `npm run build` (ไม่ใช่ `next build` ตรง ๆ) เพื่อให้ `npm_package_version` ถูกตั้ง

### ทางเลือกอื่น (ถ้าไม่ใช่ Next.js)

```ts
// Vite — vite.config.ts
import pkg from "./package.json" assert { type: "json" };
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) }, // ใช้ผ่าน __APP_VERSION__
});
// หรืออ่าน import.meta.env.VITE_APP_VERSION ถ้าตั้งใน .env ตอน build
```

```js
// plain Node — ที่ runtime
const version = require("./package.json").version;
```

---

## 3) AppVersion footer

### hook/helper อ่าน env (server & client ใช้ได้ ไม่มี React hook ข้างใน)

```ts
// [AppVersionComponent dir]/useAppVersion.ts
export function useAppVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || "";
  const shortSha = commitSha.slice(0, 7);
  const displayVersion = shortSha ? `v${version} (${shortSha})` : `v${version}`;
  return { version, commitSha, shortSha, displayVersion };
}
```

### component

```tsx
// [AppVersionComponent].tsx
import { useAppVersion } from "./useAppVersion";

export function AppVersion({ className }: { className?: string }) {
  const { displayVersion } = useAppVersion();
  return (
    <p className={`text-center text-[11px] text-muted print:hidden ${className ?? ""}`}>
      [ProjectName] {displayVersion}
    </p>
  );
}
```

วาง `<AppVersion />` ท้าย root layout หรือท้ายแต่ละหน้า → ได้ `[ProjectName] v1.2.0 (a1b2c3d)`

---

## 4) `CHANGELOG.md` — Keep a Changelog

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Fixed

## [1.0.0] - 2026-01-01

### Added
- รุ่น production แรก

[Unreleased]: https://github.com/<org>/<repo>/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/<org>/<repo>/releases/tag/v1.0.0
```

**ตอนออกรุ่น:** ย้ายรายการจาก `[Unreleased]` ลงหัวข้อเวอร์ชั่นใหม่ + วันที่ แล้วเพิ่ม link ref
หมวดที่ใช้บ่อย: `Added` (ของใหม่→MINOR), `Changed`, `Fixed` (แก้บั๊ก→PATCH), `Removed`, `Security`

---

## 5) กฎตัดสินเลขเวอร์ชั่น (ฉบับเต็ม)

| หลัก | ขยับเมื่อ | ตัวอย่างจริง |
|------|----------|--------------|
| **PATCH** `1.0.x` | แก้บั๊ก, security, ปรับ UX/ถ้อยคำ/สไตล์, performance — ไม่มีฟีเจอร์ใหม่ | แก้ปุ่มติดต่อหาไม่เจอ, ใส่ expiry ให้ลิงก์, แก้คำผิด |
| **MINOR** `1.x.0` | ฟีเจอร์ใหม่ที่ผู้ใช้สังเกตได้ / จบกลุ่มงานใหม่ (backward-compatible) → reset patch=0 | เพิ่มหน้า tutorial, ระบบแจ้งเตือน + push, แผนที่, ประวัติ |
| **MAJOR** `x.0.0` | เปลี่ยนใหญ่กระทบ workflow/โมเดลธุรกิจ หรือ redesign ใหญ่ / breaking | เปลี่ยนระบบราคา-บิลทั้งระบบ, รื้อ UI ใหม่หมด |

**คำถามตัดสิน 3 ข้อ:** มีของใหม่ให้ผู้ใช้ใช้ไหม → MINOR · แค่ทำให้ของเดิมดีขึ้น/หายพัง → PATCH ·
ผู้ใช้ต้องปรับตัว/เรียนรู้ใหม่ → MAJOR

**กฎเสริม:**
- `1.0.0` = production แรก (ก่อนหน้าคือ `0.x` — ช่วง 0.x ถือว่ายังไม่ stable, breaking ได้ใน minor)
- bump ตอน "ออกรุ่น" ไม่ใช่ทุก commit — 1 release = bump 1 ครั้ง
- ขึ้น MINOR ให้ reset PATCH เป็น 0 · ขึ้น MAJOR ให้ reset MINOR+PATCH เป็น 0 (npm จัดการให้อยู่แล้ว)

---

## 6) Checklist ออกรุ่น

```
[ ] งานฟีเจอร์ commit ครบ, working tree สะอาด
[ ] ย้ายรายการ CHANGELOG จาก [Unreleased] → หัวข้อเวอร์ชั่น + วันที่ + อัปเดต link refs
[ ] เลือกระดับตามเกณฑ์ → npm run release:patch | minor | major
[ ] ตรวจว่ามี commit chore(release): vX.Y.Z + tag vX.Y.Z
[ ] git push --follow-tags
[ ] ยืนยัน footer prod แสดงเลขเวอร์ชั่นใหม่
```

---

## สิ่งที่ "ไม่ต้อง" ทำ

- ไม่ต้องแก้เลขเวอร์ชั่นในโค้ด/footer (มาจาก `package.json` ที่เดียว)
- ไม่ต้อง bump ทุก commit / ทุก PR ย่อย — รวมเป็นรุ่นแล้วค่อย bump
- ไม่ต้องเขียน commit/tag ของ release เอง — `npm version` ทำให้
