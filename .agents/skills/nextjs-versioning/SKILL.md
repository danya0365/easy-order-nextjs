---
name: nextjs-versioning
description: >
  ตั้งระบบ versioning แบบ feature-based SemVer สำหรับโปรเจค Next.js —
  เลขเวอร์ชั่นมาจาก `package.json` ที่เดียว ไหลเข้า footer อัตโนมัติพร้อม commit sha
  ใช้ npm `version` lifecycle hook bump+commit+tag ในคำสั่งเดียว + CHANGELOG (Keep a Changelog)
  agent จะติดตั้งสคริปต์/ไฟล์ที่ขาด แล้วช่วยตัดสินใจ PATCH/MINOR/MAJOR ตอนออกรุ่น
version: "1.0"
metadata:
  author: marosdee
  stack: next.js, typescript, npm, git
  pattern: feature-semver-release
---

## คำอธิบาย

Skill นี้วางระบบ **Semantic Versioning แบบอิงฟีเจอร์ (feature-based SemVer)**: `MAJOR.MINOR.PATCH`

หลักคิดหลักคือ **เวอร์ชั่นมีแหล่งเดียว** = ฟิลด์ `version` ใน `package.json` —
ตอน build ถูกฝังเป็น env (`NEXT_PUBLIC_APP_VERSION`) แล้วแสดงเป็นแคปชันท้ายทุกหน้า
คู่กับ commit sha (เช่น `v1.9.0 (a1b2c3d)`) **จึงไม่ต้องแก้เลขเวอร์ชั่นที่ไฟล์อื่นเลย**

การออกรุ่นใช้ `npm version` (ผ่านสคริปต์ `release:*`) ซึ่ง bump `package.json` + สร้าง commit
`chore(release): vX.Y.Z` + git tag `vX.Y.Z` ให้ในคำสั่งเดียว และมี lifecycle hook `version`
ดึง `CHANGELOG.md` เข้า commit เดียวกันอัตโนมัติ

> `1.0.0` = รุ่น production แรกที่พร้อมใช้งานจริง (ก่อนหน้านั้นคือ `0.x`)

## เมื่อไหร่ควรใช้ Skill นี้

- เมื่อ user ต้องการตั้งระบบ versioning/release ให้โปรเจค Next.js ใหม่
- เมื่อ user พูดถึง "version", "เวอร์ชั่น", "release", "ออกรุ่น", "changelog", "bump", "git tag"
- เมื่อ user ถามว่า "การเปลี่ยนนี้ควรขยับเวอร์ชั่นเป็นเท่าไหร่" (ช่วยตัดสิน PATCH/MINOR/MAJOR)
- เมื่ออยากแสดงเลขเวอร์ชั่น + commit sha ใน footer ของแอป

## Reference Files

อ่านก่อนเริ่มงาน:

```
references/VERSIONING_PATTERN.md   ← คู่มือเต็ม + โค้ด template (scripts, embed, footer, CHANGELOG)
```

## เกณฑ์ขยับเลขแต่ละหลัก

| หลัก | ขยับเมื่อ | ตัวอย่าง |
|------|----------|---------|
| **PATCH** `1.0.x` | แก้บั๊ก, security hardening, ปรับ UX/ถ้อยคำ/สไตล์, ปรับ performance — **ไม่มีฟีเจอร์ใหม่** | แก้ปุ่มกดไม่ติด, แก้คำผิด, ปรับสีปุ่ม |
| **MINOR** `1.x.0` | ฟีเจอร์ใหม่ที่ผู้ใช้สังเกตได้ หรือจบกลุ่มงานใหม่ (backward-compatible) → reset patch เป็น 0 | เพิ่มหน้าใหม่, ระบบแจ้งเตือน, ฟีเจอร์ใหม่ |
| **MAJOR** `x.0.0` | เปลี่ยนใหญ่ที่กระทบ workflow/โมเดลธุรกิจของผู้ใช้ หรือ redesign ใหญ่ / breaking | รื้อระบบราคาใหม่, รื้อ UI ใหม่หมด |

**หลักคิดสั้น ๆ:** มีของใหม่ให้ผู้ใช้ใช้ไหม? → MINOR · แค่ทำให้ของเดิมดีขึ้น/หายพัง? → PATCH ·
ผู้ใช้ต้องปรับตัว/เรียนรู้ใหม่ไหม? → MAJOR

**ขยับตอน "ออกรุ่น" ไม่ใช่ทุก commit** — 1 release (กลุ่มการเปลี่ยนที่จะ deploy ขึ้น prod) = bump 1 ครั้ง
build แต่ละครั้งมี commit sha กำกับใน footer อยู่แล้ว จึงระบุ build ละเอียดได้โดยไม่ต้อง bump ถี่

## ขั้นตอนสรุป (Agent Workflow)

### Phase 1: Setup — ติดตั้งระบบ (ทำครั้งเดียวต่อโปรเจค)

1. **ตรวจสิ่งที่มีอยู่** — เปิด `package.json`, `next.config.ts`, หา footer/version component เดิม
2. **เพิ่มสคริปต์ + hook ใน `package.json`** (ดู template ใน reference):
   - `release:patch | release:minor | release:major` = `npm version <lvl> -m "chore(release): v%s"`
   - `"version": "git add CHANGELOG.md"` (lifecycle hook — npm เรียกอัตโนมัติก่อนสร้าง tag)
3. **ฝัง version เข้า build** — แก้ `next.config.ts` ให้ใส่ `env.NEXT_PUBLIC_APP_VERSION` จาก
   `process.env.npm_package_version` + `NEXT_PUBLIC_COMMIT_SHA` จาก git/VERCEL_GIT_COMMIT_SHA
4. **ทำ AppVersion footer** — hook/ฟังก์ชันอ่าน env → แสดง `vX.Y.Z (sha)` และวางท้าย layout/หน้า
5. **สร้าง `CHANGELOG.md`** (Keep a Changelog + section `[Unreleased]`) และ `VERSIONING.md` (กฎฉบับย่อ)
6. **ตั้ง `version` เริ่มต้น** ใน `package.json` ให้เหมาะ (โปรเจคก่อน prod = `0.x`)

### Phase 2: Release — ออกรุ่น (ทำทุกครั้งที่จะ deploy)

7. **เลือกระดับ** จากเกณฑ์ด้านบน (ถาม user ถ้าไม่ชัด)
8. **อัปเดต `CHANGELOG.md`** — ย้ายรายการจาก `## [Unreleased]` ไปเป็นหัวข้อเวอร์ชั่นใหม่ + วันที่
9. **ตรวจ working tree สะอาด** (commit งานฟีเจอร์ให้เรียบร้อยก่อน) แล้วรัน:
   ```bash
   npm run release:patch   # 1.0.0 -> 1.0.1
   npm run release:minor   # 1.0.1 -> 1.1.0
   npm run release:major   # 1.1.0 -> 2.0.0
   ```
10. **push + deploy**: `git push --follow-tags` (build prod ฝังเลขเวอร์ชั่นใหม่ลง footer ให้เอง)

## Placeholders

| Placeholder              | รูปแบบ            | ตัวอย่าง                                  |
| ------------------------ | ----------------- | ----------------------------------------- |
| `[ProjectName]`          | ชื่อแอป (footer)  | `Easy Stamp`                              |
| `[AppVersionComponent]`  | path component    | `src/presentation/components/.../AppVersion.tsx` |
| `[BuildTool]`            | Next / Vite / Node | `next.config.ts`                          |
| `[ChangelogFile]`        | ไฟล์ changelog    | `CHANGELOG.md`                            |

## หมายเหตุ

- **working tree ต้องสะอาดก่อน bump** — `npm version` จะ error ถ้ามีไฟล์ค้าง (ยกเว้นไฟล์ที่ hook `git add` ไว้)
- ไม่ต้อง bump ทุก commit / ทุก PR ย่อย — รวมเป็นรุ่นแล้วค่อย bump; build ย่อยระบุด้วย commit sha ใน footer
- ไม่ต้องแก้เลขเวอร์ชั่นในโค้ด/footer เอง — มาจาก `package.json` ที่เดียว
- ถ้าไม่ใช่ Next.js: ส่วนที่ต้องเปลี่ยนคือ "วิธีฝัง version เข้า build" (Vite ใช้ `define`/`import.meta.env`,
  plain Node อ่าน `require('./package.json').version`) — เกณฑ์ตัดสินเลข + flow release ใช้เหมือนกัน
- ดูโค้ด template ทั้งหมดใน `references/VERSIONING_PATTERN.md`
