# Changelog

ทุกการเปลี่ยนแปลงที่สำคัญของโปรเจคนี้จะถูกบันทึกในไฟล์นี้ — รูปแบบอิง
[Keep a Changelog](https://keepachangelog.com/) และเวอร์ชั่นอิง SemVer ตาม [`VERSIONING.md`](VERSIONING.md)

## [Unreleased]

### Added
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
