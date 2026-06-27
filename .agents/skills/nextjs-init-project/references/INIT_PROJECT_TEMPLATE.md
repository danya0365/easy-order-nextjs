# โครงสร้างคำสั่งเริ่มต้นโปรเจค (Initial Project Prompt Template)

**คำอธิบาย:** ไฟล์นี้ใช้เป็น Prompt เริ่มต้น (System Instruction) สำหรับให้ AI เข้าใจโครงสร้าง, เทคโนโลยี, และรูปแบบการเขียนโค้ดของโปรเจคใหม่ โดยอิงตาม Clean Architecture 

---

## 📌 Context ย่อ (เปลี่ยนตามโปรเจคของคุณ)
- **Project Name:** `[ชื่อโปรเจค]`
- **Description:** `[คำอธิบายโปรเจคสั้นๆ เช่น แพลตฟอร์มคอร์สเรียนออนไลน์, ระบบจัดการสินค้า เป็นต้น]`

## 👥 ใครที่ต้องใช้ไฟล์นี้บ้าง?
ไฟล์นี้ทำหน้าที่เหมือน **"สัญญาว่าจ้างและคู่มือเริ่มงาน"** ระหว่าง:
1. **Developer (คุณ / Tech Lead):** ใช้เป็นตัวคุมโทน คุม Architecture และกำหนดกฎเกณฑ์ไม่ให้ AI เขียนโค้ดกระจัดกระจาย
2. **AI Assistant (เช่น Cursor, GitHub Copilot, ChatGPT):** ใช้เป็น System Prompt เพื่ออ่านทำความเข้าใจและเซ็ตบริบท (Context) ของโปรเจกต์ทั้งหมดก่อนเริ่ม Generate Code

### 💡 Use Case ในชีวิตจริง:
- **Scenario A (รับงาน Freelance ใหม่):** คุณเพิ่งรับงานทำ "ระบบคลินิกทำฟัน" แทนที่จะต้องมานั่งพิมพ์สั่ง AI ว่า "ใช้ Next.js นะ ใช้ Supabase ด้วย โฟลเดอร์ให้จัดแบบนี้..." คุณแค่ก็อปวางไฟล์นี้ เปลี่ยนชื่อโปรเจกต์ แล้วส่งให้ AI อ่านจบใน 1 วินาที
- **Scenario B (AI ลืมกฎ / บริบทหลุด):** ในระหว่างที่เขียนโค้ดไปหลายสิบไฟล์แล้ว AI อาจจะเริ่ม "หลอน" ลืมว่าต้องใช้ Clean Architecture คุณสามารถสั่ง AI ว่า *"ให้กลับไปอ่านกฎใน INIT_PROJECT_TEMPLATE.md แล้วแก้โค้ดนี้ใหม่"*
- **Scenario C (Onboarding ทีมงานใหม่):** ไฟล์นี้สามารถใช้ส่งให้ Junior Developer ในทีมอ่าน เพื่อให้เข้าใจ Tech Stack และ Workflow ของโปรเจกต์ได้รวดเร็ว

---

## 🛠️ Technology Stack & Constraints รหัสหลักสูตร
- **Framework:** Next.js 14+ (App Router เท่านั้น)
- **Database & Auth:** Supabase (SSR/Server Client)
- **Language:** TypeScript (Strict Mode)
- **Styling:** ให้ใช้ TailwindCSS และเขียน Global CSS หรือ Custom CSS ชั้นนำไว้ที่ไฟล์ `public/styles/index.css` เท่านั้น (ห้ามใช้ UI Library อื่น เว้นแต่จะระบุเพิ่ม)
- **State Management:** Zustand (สร้าง store ไว้ที่ `src/presentation/stores/`)
- **Form & Validation:** React Hook Form คู่กับ Zod เท่านั้น
- **Data Fetching:** ยึดหลัก Server Components คู่กับ Presenter Pattern (หรือ React Query ถ้าระบุเพิ่ม)
- **Animation:** `[ระบุ Library เช่น @react-spring/web, framer-motion หรือเอาออกถ้าไม่ใช้]`
- **Fonts:** `[ระบุ Font เช่น Noto_Sans_Thai จาก next/font/google]`

## 🚨 กฎเหล็ก (Core Rules)
1. **Architecture:** โครงสร้างโค้ดต้องอิงตามฟอร์แมต SOLID & Clean Architecture อย่างเคร่งครัด
   - `/app` - มีหน้าที่แค่ Routing, ฝัง Metadata และเรียกใช้ View Components
   - `/src/domain` - เก็บ Types (รวมถึง Supabase Types) และ Entities หลัก
   - `/src/application` - เก็บ Interfaces ของ Repositories
   - `/src/infrastructure` - เก็บ Implementation ของ Repository (เช่น Supabase Call)
   - `/src/presentation` - เก็บ UI Components, Hooks, Stores และ Presenters
2. **Page Creation:** ทุกครั้งที่สร้าง Page/Feature ใหม่ **ต้อง**ทำตาม Pattern ที่กำหนดไว้ใน `[ระบุ Path ของไฟล์ CREATE_PAGE_PATTERN.md ของคุณ เช่น /prompt/CREATE_PAGE_PATTERN.md]`
3. **Feature Requirements:** ยึดความต้องการและขอบเขตของระบบจากไฟล์ `[ระบุ Path ของไฟล์ FEATURE.md เช่น /prompt/FEATURE.md]` เสมอ
4. **No Assumption & No Floating Code:** ห้ามคิดฟีเจอร์เพิ่มเองนอกเหนือจากที่ระบุ และห้ามนำ Business Logic ไปผูกติดกับ UI Component โดยตรง ต้องผ่าน Presenter หรือ Hook เสมอ

---

## 🚀 แผนการทำงาน (Step-by-Step Execution)
> **⚠️ สำคัญมากสำหรับ AI:** กรุณาทำงานทีละขั้นตอนตามลำดับด้านล่างนี้ เมื่อเสร็จแต่ละ Step ให้ "หยุดรอ" เพื่อให้ฉัน (User) ตรวจสอบและอนุมัติ (Approve) ก่อน จึงจะดำเนินการใน Step ถัดไปได้ ห้ามทำรวดเดียวจบ

### Step 1: Database & System Design
- อ่าน Requirement จากไฟล์ Feature ที่อ้างอิงไว้
- ออกแบบ Database Schema (Table หลักๆ และความสัมพันธ์) ออกมาในรูปแบบ Markdown Table หรือ DBML
- ออกแบบ Interface/Type สำหรับ Mock Data เบื้องต้น
- 🛑 **[AI Stop & Ask]** หยุดทำงานและถามฉันว่า "Schema และ Data Structure นี้โอเคหรือไม่? มีส่วนไหนต้องการปรับเพิ่มก่อนเริ่มเขียนโค้ด UI หรือไม่?"

### Step 2: Core Layout & Navigation Setup
- สร้างหน้า MainLayout (`app/layout.tsx` และ Shared Components ที่เกี่ยวข้อง เช่น Navbar, Sidebar, Footer)
- ออกแบบ Theme และ Mood & Tone ตามที่ระบุ: `[ระบุธีมหรือสไตล์ เช่น อารมณ์คลีนๆ มินิมอล, หรือ สดใสน่ารัก]`
- ติดตั้ง Theme Toggle (Dark/Light mode) หากจำเป็น
- ต้องรองรับ Responsive Design (Mobile-first approach)
- เตรียม Placeholder สำหรับ Auth State (เช่น ปุ่ม Login / User Profile) ไว้ใน Header
- 🛑 **[AI Stop & Ask]** หยุดทำงานและรอฉันทดสอบ Layout เบื้องต้น

### Step 3: Reusable UI Components
- สร้าง UI Components พื้นฐานที่จำเป็นต้องใช้ซ้ำบ่อยๆ (เช่น Button, Card, Input) ตาม Design System เล็กๆ
- ใส่ Animation หรือ Interaction เบื้องต้น (hover, active states) ตามที่ระบุไว้ใน Tech Stack
- 🛑 **[AI Stop & Ask]** หยุดทำงานและรอฉันรีวิว Components

### Step 4: Core Features Implementation
- นำ Components จาก Step 3 มาประกอบเป็น "หน้าแรก (Landing Page)" (`app/page.tsx`) หรือ "หน้า Dashboard หลัก"
- เริ่มต้นวางโครงสร้างไฟล์ Presenter, Repository และ UseCases สำหรับ Feature แรกตาม `CREATE_PAGE_PATTERN.md`
- 🛑 **[AI Stop & Ask]** ติดตามผลและรอคำสั่งต่อไป
