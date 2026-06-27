# Changelog

ทุกการเปลี่ยนแปลงที่สำคัญของโปรเจคนี้จะถูกบันทึกในไฟล์นี้ — รูปแบบอิง
[Keep a Changelog](https://keepachangelog.com/) และเวอร์ชั่นอิง SemVer ตาม [`VERSIONING.md`](VERSIONING.md)

## [Unreleased]

### Added
- เริ่มต้นโปรเจค **Easy Order** โดย clone จาก Easy Stamp (SaaS starter) — เก็บแกน generic
  (auth / billing / multi-tenant / notifications / audit / ops / i18n / theme) แล้วเปลี่ยน domain
  เป็นระบบสั่งอาหารหน้าร้านบนแท็บเล็ต (kiosk)
- **แผนที่ร้านค้าหน้าแรก + directory `/shops`** (พอร์ตกลับจาก Easy Stamp ที่ตกหล่นตอน clone):
  หน้าแรก `/` แสดงแผนที่ maplibre ปักหมุดสาขาที่เปิดอยู่ (popup → ดูร้านที่ `/s/[slug]`),
  `/shops` เป็นรายการร้านที่เปิดอยู่ — เวอร์ชั่นเรียบ (ไม่มีรีวิว/หมวด/รูปโปรไฟล์แบบ Easy Stamp);
  คืน tab Map/Shops ใน `CustomerTabBar`

## [0.1.0] - 2026-06-27
- จุดเริ่มต้น (bootstrap จาก easy-stamp v1.19.0)
