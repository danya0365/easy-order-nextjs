---
name: nextjs-init-project
description: >
  เริ่มต้นโปรเจคใหม่ตาม Clean Architecture pattern
  (Next.js, Supabase, Tailwind, Zustand).
  ใช้เมื่อกําลังเริ่มสร้างโปรเจคใหม่ หรือต้องการเซ็ตบริบทโครงสร้างพื้นฐานของโปรเจค.
version: "1.0"
metadata:
  author: dan
  stack: next.js, typescript, supabase, tailwind, zustand
  pattern: clean-architecture
---

## วิธีเริ่มต้นโปรเจคใหม่

อ่านแนวทางหลักจากเทมเพลตก่อนเริ่มงานเสมอ:

```
references/INIT_PROJECT_TEMPLATE.md
```

## ขั้นตอนการเตรียมโครงสร้าง (Summary)

1.  **Tech Stack Selection** — ยืนยันเครื่องมือพื้นฐาน (Next.js 14+ App Router, Supabase, Tailwind, Zustand)
2.  **Clean Architecture Setup** — วางโครงสร้างโฟลเดอร์หลักให้ครบถ้วน:
    - `/app` - Routing & Page entry
    - `/src/domain` - Core Types & Entities
    - `/src/application` - Repository Interfaces
    - `/src/infrastructure` - Data Implementation (Supabase/API)
    - `/src/presentation` - Components, Stores, Hooks, Presenters
3.  **Step-by-Step Execution** — ดำเนินการตามแผนงาน 4 ขั้นตอน:
    - **Step 1:** Database & System Design (**🛑 AI Stop & Ask**)
    - **Step 2:** Core Layout & Navigation Setup (**🛑 AI Stop & Ask**)
    - **Step 3:** Reusable UI Components (**🛑 AI Stop & Ask**)
    - **Step 4:** Core Feature Implementation (**🛑 AI Stop & Ask**)

## 🚨 กฎเหล็ก (Core Rules)

- **Architecture First:** ห้ามเขียน Business Logic ไว้ใน UI Component โดยตรง
- **Wait for Approval:** เมื่อเสร็จแต่ละ Step ในแผนงาน ต้องหยุดรอคอนเฟิร์มจาก User ก่อนเสมอ
- **No Assumptions:** ห้ามคิดฟีเจอร์เพิ่มเองนอกเหนือจากที่ระบุใน Requirement

ดูรายละเอียดฉบับเต็มและตัวอย่างการตั้งค่าใน `references/INIT_PROJECT_TEMPLATE.md`
