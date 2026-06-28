# Changelog

ทุกการเปลี่ยนแปลงที่สำคัญของโปรเจคนี้จะถูกบันทึกในไฟล์นี้ — รูปแบบอิง
[Keep a Changelog](https://keepachangelog.com/) และเวอร์ชั่นอิง SemVer ตาม [`VERSIONING.md`](VERSIONING.md)

## [Unreleased]

### Added
- **แดชบอร์ดร้าน: checklist เริ่มต้นใช้งาน + แบนเนอร์ไฮไลต์ฟีเจอร์** — `FeatureCarousel`
  (สไลด์อัตโนมัติ: สถิติ/โปรโมท/รีวิว/ปิดร้านชั่วคราว) + `OnboardingSuggestions` (checklist
  อัจฉริยะ โชว์เฉพาะขั้นที่ยังไม่ได้ทำ: เพิ่มเมนู/ตั้ง kiosk+PromptPay/เชื่อม LINE/เพิ่มพนักงาน,
  ปิดทีละข้อได้ เก็บใน localStorage) — แสดงเฉพาะเจ้าของร้านจริง
- **บันทึกผู้เปิดออเดอร์ + audit (staff accountability)** — เพิ่มคอลัมน์ `orders.performed_by`
  (migration 0008): ออเดอร์ที่เปิดจากเคาน์เตอร์ (POS) บันทึกพนักงาน/เจ้าของที่เปิด + ลง audit log
  `order_placed`; ออเดอร์จาก kiosk (ลูกค้าสั่งเอง) เป็น null
- **แก้รูปหน้าร้านแบบ inline สำหรับเจ้าของ** — เจ้าของที่เปิดหน้า `/s/[slug]` ของร้านตัวเองเห็น
  ปุ่มเปลี่ยน/เพิ่มรูปปก-โปรไฟล์ + แกลเลอรี่แก้ไขได้ทันที (สไตล์ Facebook) — ลูกค้าทั่วไปไม่เห็น,
  การเขียนยังถูก guard ฝั่ง server
- **ปิดช่องโหว่จาก clone audit (Phase 9): บัญชี/ความปลอดภัยของ owner + staff** — เจ้าของร้าน
  จัดการบัญชีตัวเองได้แล้วที่ `/shop/security` (เปลี่ยนรหัสผ่าน, เปิด 2FA/TOTP, ดู/ออกจากระบบ
  อุปกรณ์, ผูก LINE) — แสดงเฉพาะเซสชันเจ้าของจริง (แอดมินที่ impersonate จัดการบัญชีตัวเองที่
  แดชบอร์ดแอดมิน); พนักงานได้ 2FA + รายการอุปกรณ์เพิ่มที่ `/staff/settings` (คอมโพเนนต์มีอยู่แล้ว
  แต่ wire ไว้แค่หน้าแอดมิน)
- **แจ้งเตือนเจ้าของเมื่อมีรีวิวใหม่** — `submitReviewAction` ยิง notification `shop_received_review`
  (รีวิวใหม่เท่านั้น ไม่ยิงตอนแก้)
- **Cron ติดตามลีด** — เพิ่มงาน `lead-follow-ups` ใน `/api/cron` (env `CRON_LEAD_FOLLOWUPS`):
  แจ้งแอดมินถึงลีดที่ถึงกำหนดติดตาม + stamp กันแจ้งซ้ำ (idempotent) + คืน notification type
  `lead_follow_up_due`
- **PWA + metadata + loading** — per-shop `site.webmanifest` (ติดตั้งเป็นแอปต่อร้าน scoped `/s/<slug>`),
  `generateMetadata` (title + manifest) บน `/s/[slug]` และ `/me`, และ loading skeleton ของ
  `/s/[slug]`, `/me`, `/admin/analytics`, `/admin/reviews`
- **การ์ดสถิติบนแดชบอร์ดร้าน** `/shop` — ออเดอร์ในคิว / เมนู / ลูกค้า / สาขา (แตะไปหน้านั้นได้)
- **หน้า public ของร้าน `/s/[slug]` เทียบเท่า Easy Stamp (พาริตี้): ข้อมูลร้าน + แผนที่สาขา** —
  เพิ่ม **`ShopProfile`** (ตาราง `shop_profiles`, migration 0007): เจ้าของกรอก
  เกี่ยวกับร้าน / เวลาทำการ / เบอร์โทร / LINE / Facebook / Instagram / เว็บไซต์ ในหน้า
  `/shop/settings` (section "รายละเอียดร้าน") → แสดงบนหน้า public เป็นการ์ด About /
  เวลาทำการ+ติดต่อ / ที่อยู่ + ปุ่ม **นำทางด้วย Google Maps**. คอมโพเนนต์หน้า public
  ทำใหม่ให้เทียบเท่าต้นฉบับ: `ShopHero` (ปก+โปรไฟล์+เรตติ้ง), `ShopGallery`, `ShopDetails`
  (ตัดการ์ดรางวัลแสตมป์ออก), รีวิวแบบ **โหลดเพิ่ม** (`ShopReviewsSection`/`PublicReviewList`/
  `ReviewItem` + `loadMorePublicReviewsAction`), PWA add-to-home, แจ้งเตือนร้านปิดชั่วคราว
  และลิงก์ privacy/tos ท้ายหน้า — ประวัติการสั่ง (แทนบัตรแสตมป์) ยังอยู่ครบ
- **ตัวแก้ตำแหน่งสาขาบนแผนที่ (`BranchLocationEditor`)** — หน้า `/shop/branches` เพิ่มแผนที่
  maplibre ปักหมุด/ลากหมุด/ใช้ตำแหน่งปัจจุบัน + กรอกที่อยู่ ต่อสาขา (action
  `updateBranchLocationAction` มีอยู่แล้วแต่ไม่มี UI — ตอนนี้ใช้งานได้) → พิกัดไหลไปขึ้น
  หมุดบนแผนที่หน้าแรกและปุ่มนำทางบนหน้าร้านอัตโนมัติ
- **พอร์ต generic ที่ตกหล่น (Phase 7/7): เครื่องมือลีดของแอดมิน (leads CRM) + geocoding** —
  `/admin/leads` (รายการ/สร้าง/รายละเอียด/แผนที่): เก็บร้านที่จะ onboard, ปักหมุด/ค้นหาตำแหน่ง
  (OSM Nominatim/Overpass ผ่าน `/api/geo/*`), บันทึกการเข้าพบ + สถานะ (new→won/lost), อัปรูปสถานที่,
  และ **แปลงลีดเป็นร้านจริง** (สร้าง shop+owner+สาขา พร้อมพิกัด); ตาราง `leads`+`lead_visit_logs`
  (migration 0006); geocoder อยู่ใน container.generic อยู่แล้ว (dangling) — ตอนนี้ใช้งานจริง
- **พอร์ต generic ที่ตกหล่น (Phase 6/7): สตูดิโอโปสเตอร์โปรโมท (promote)** — หน้า `/shop/promote`
  สร้างโปสเตอร์ (เทมเพลต/พรอมต์ AI แบบ copy-to-clipboard/อัปรูปเอง) หลายขนาด แล้ว export PNG;
  **reframe จาก "สะสมแสตมป์→รางวัล" ของเดิมเป็น domain การสั่งอาหาร** — ชูชื่อร้าน + ข้อความโปรอิสระ
  (พิมพ์เอง) + QR ไป `/s/[slug]` (ไม่มี reward/threshold)
- **พอร์ต generic ที่ตกหล่น (Phase 5/7): แดชบอร์ดสถิติ (analytics)** — หน้า `/shop/analytics`
  (เจ้าของ) + `/admin/analytics` (แอดมิน) ด้วย recharts: สรุปยอด (ออเดอร์/ยอดขาย/ลูกค้า),
  กราฟแนวโน้มรายวัน (ออเดอร์ + รายได้ แกนคู่, บัคเก็ตเป็นวันเวลากรุงเทพ), แยกตามสถานะ + ลูกค้า/ร้าน
  ขายดี, เลือกช่วง 7/30/90 วัน — **metric เป็นออเดอร์/รายได้** (ไม่ใช่แสตมป์แบบ Easy Stamp)
- **พอร์ต generic ที่ตกหล่น (Phase 4/7): รีวิวร้าน (reviews)** — ลูกค้าที่ผูกอุปกรณ์แล้วให้ดาว
  1–5 + คอมเมนต์ (1 รีวิว/ร้าน แก้ได้) ในหน้า `/s/[slug]`, เจ้าของตอบกลับที่ `/shop/reviews`,
  แอดมินซ่อนรีวิวไม่เหมาะสมที่ `/admin/reviews`; **คืนการแสดงเรตติ้ง (ดาว) ใน popup แผนที่และการ์ด
  `/shops`** (ตาราง `shop_reviews`, migration 0005)
- **พอร์ต generic ที่ตกหล่น (Phase 3/7): หน้าจัดการลูกค้า `/shop/customers` + PDPA** — รายชื่อลูกค้า
  (ค้นหาชื่อ/เบอร์), ดาวน์โหลดข้อมูลลูกค้าเป็น JSON (`/api/shop/customers/[id]/data-export`,
  รวมประวัติออเดอร์), และลบข้อมูลส่วนตัว (anonymize — ตัดชื่อ/เบอร์/QR + อุปกรณ์ผูก แต่เก็บออเดอร์
  แบบไม่ระบุตัวตน); คืน tab "ลูกค้า" ในเมนูร้าน
- **พอร์ต generic ที่ตกหล่น (Phase 2/7): รูปภาพร้าน (shop images)** — รูปโปรไฟล์/ปก/แกลเลอรี่
  อัปโหลดผ่านหน้าตั้งค่าร้าน (ครอป+ย่อขนาดด้วย `ImageCropField`, เก็บใน R2/local ผ่าน `slipStorage`),
  เสิร์ฟผ่าน `/api/shop-images/[id]`, แสดงในการ์ด `/shops`, popup แผนที่ และ hero/แกลเลอรี่หน้า
  `/s/[slug]`; orphaned-file cron รู้จัก prefix `shops/` แล้ว
- **พอร์ตฟีเจอร์ generic ที่ตกหล่นตอน clone กลับมา (Phase 1/7): หมวดร้าน (shop categories)** —
  ตาราง `shop_categories` + `shops.categoryId`, seed 7 หมวด (กาแฟ/เบเกอรี่/อาหาร/เครื่องดื่ม/ของหวาน/
  สตรีทฟู้ด/อื่นๆ), เลือกหมวดในหน้าตั้งค่าร้าน, **คืน filter chips ตามหมวดในหน้า `/shops`** และโชว์
  หมวดใน popup แผนที่
- เริ่มต้นโปรเจค **Easy Order** โดย clone จาก Easy Stamp (SaaS starter) — เก็บแกน generic
  (auth / billing / multi-tenant / notifications / audit / ops / i18n / theme) แล้วเปลี่ยน domain
  เป็นระบบสั่งอาหารหน้าร้านบนแท็บเล็ต (kiosk)
- **แผนที่ร้านค้าหน้าแรก + directory `/shops`** (พอร์ตกลับจาก Easy Stamp ที่ตกหล่นตอน clone):
  หน้าแรก `/` แสดงแผนที่ maplibre ปักหมุดสาขาที่เปิดอยู่ (popup → ดูร้านที่ `/s/[slug]`),
  `/shops` เป็นรายการร้านที่เปิดอยู่ — เวอร์ชั่นเรียบ (ไม่มีรีวิว/หมวด/รูปโปรไฟล์แบบ Easy Stamp);
  คืน tab Map/Shops ใน `CustomerTabBar`

### Changed
- **ล้าง domain "แสตมป์/แต้ม" ที่หลงเหลือจากการ clone ออกทั้งหมด** — เขียนหน้า marketing/legal
  (`/tutorial`, `/info`, `/privacy`) ใหม่ให้เป็น domain การสั่งอาหาร, reword ข้อความ live ที่ยัง
  พูดถึงแสตมป์ (billing/pause/security/paused notice), เปลี่ยนชื่อไฟล์ recovery codes และโดเมน
  อีเมล seed `easystamp.test` → `easyorder.test`, และเขียน social alt-text ใหม่

### Removed
- โค้ด/i18n ที่ตายแล้วจากยุคแสตมป์: i18n namespaces `stamp`/`reviews`/`analytics`/`promote`/`leads`
  + 61 dead keys, component `StampDots` และ `SettingsTabs` ที่ไม่ถูกใช้งาน

## [0.1.0] - 2026-06-27
- จุดเริ่มต้น (bootstrap จาก easy-stamp v1.19.0)
