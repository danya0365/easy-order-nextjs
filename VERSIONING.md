# กฎการตั้งเวอร์ชั่น (Versioning)

Easy Stamp ใช้ **Semantic Versioning แบบอิงฟีเจอร์**: `MAJOR.MINOR.PATCH`

เวอร์ชั่นมาจากที่เดียวคือ `version` ใน [`package.json`](package.json) — ตอน build จะถูกฝังเป็น
`NEXT_PUBLIC_APP_VERSION` (ดู [`next.config.ts`](next.config.ts)) แล้วแสดงเป็นแคปชันท้ายทุกหน้า
ผ่าน [`AppVersion`](src/presentation/components/layout/AppVersion.tsx) คู่กับ commit sha
(`v1.2.0 (a1b2c3d)`) **จึงไม่ต้องแก้เลขเวอร์ชั่นที่ไฟล์อื่นเลย**

> `1.0.0` = รุ่น production แรก (ปิดเฟส 2 พร้อมใช้งานจริง)

---

## เมื่อไรถึงขยับเลขแต่ละหลัก

| หลัก | ขยับเมื่อ | ตัวอย่าง |
|------|----------|---------|
| **PATCH** `1.0.x` | แก้บั๊ก, security hardening, ปรับ UX/ถ้อยคำ/สไตล์, ปรับ performance — **ไม่มีฟีเจอร์ใหม่** | แก้ปุ่มติดต่อหาไม่เจอ, ใส่ expiry ให้ LINE link-code, แก้คำผิด |
| **MINOR** `1.x.0` | ฟีเจอร์ใหม่ที่ผู้ใช้สังเกตได้ หรือจบกลุ่มงานใหม่ (backward-compatible) → reset patch เป็น 0 | ระบบแจ้งเตือน + LINE push, แผนที่ร้าน, ประวัติแลกรางวัล, เฟสใหม่ |
| **MAJOR** `x.0.0` | เปลี่ยนใหญ่ที่กระทบ workflow/โมเดลธุรกิจของผู้ใช้ หรือ redesign ใหญ่ / breaking | เปลี่ยนระบบราคา-บิลทั้งระบบ, รื้อ UI ใหม่หมด |

**หลักคิดสั้น ๆ:** มีของใหม่ให้ผู้ใช้ใช้ไหม? → MINOR. แค่ทำให้ของเดิมดีขึ้น/หายพัง? → PATCH.
ผู้ใช้ต้องปรับตัว/เรียนรู้ใหม่ไหม? → MAJOR.

**ขยับตอน "ออกรุ่น" ไม่ใช่ทุก commit** — 1 release (กลุ่มการเปลี่ยนที่จะ deploy ขึ้น prod) = bump 1 ครั้ง
build แต่ละครั้งมี commit sha กำกับใน footer อยู่แล้ว จึงระบุ build ละเอียดได้โดยไม่ต้อง bump ถี่

---

## ขั้นตอนออกรุ่น (release)

1. **อัปเดต [`CHANGELOG.md`](CHANGELOG.md)** — ย้ายรายการจาก `## [Unreleased]` ไปเป็นหัวข้อเวอร์ชั่นใหม่ + วันที่
2. **bump + commit + tag** ด้วยสคริปต์ (เลือกตามระดับ):
   ```bash
   npm run release:patch   # 1.0.0 -> 1.0.1
   npm run release:minor   # 1.0.1 -> 1.1.0
   npm run release:major   # 1.1.0 -> 2.0.0
   ```
   สคริปต์นี้ (เบื้องหลังคือ `npm version`) จะ: อัปเดต `package.json`, รวม `CHANGELOG.md` เข้า commit,
   สร้าง commit `chore(release): vX.Y.Z` และ git tag `vX.Y.Z` ให้อัตโนมัติ
   > ต้องไม่มีไฟล์ค้าง (working tree สะอาด) ก่อนรัน — commit งานฟีเจอร์ให้เรียบร้อยก่อน
3. **push + deploy**
   ```bash
   git push --follow-tags
   ```
   build prod (Vercel) จะฝังเลขเวอร์ชั่นใหม่ลง footer ให้เอง

---

## สิ่งที่ "ไม่ต้อง" ทำ
- ไม่ต้องแก้เลขเวอร์ชั่นในโค้ด/footer (มาจาก `package.json` ที่เดียว)
- ไม่ต้อง bump ทุก commit / ทุก PR ย่อย — รวมเป็นรุ่นแล้วค่อย bump
