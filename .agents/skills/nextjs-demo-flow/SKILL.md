---
name: nextjs-demo-flow
description: >
  สร้างระบบ Demo Flow สำหรับนำเสนอโปรเจคให้ลูกค้าก่อนเริ่มพัฒนาจริง
  จัดกลุ่ม flows เป็น Groups → Scenarios → Journeys พร้อม Presentation Mode
  ใช้ได้กับทุก business domain — agent จะถาม user เรื่อง flows แล้วสร้างทั้งหมดใหม่
version: "1.0"
metadata:
  author: marosdee
  stack: next.js, typescript, tailwind, zustand, localforage, lucide-react
  pattern: demo-flow-presentation
---

## คำอธิบาย

Demo Flow คือระบบสำหรับสร้างหน้า demo ที่รวบรวม flows ทั้งหมดของโปรเจค
จัดกลุ่มเป็น **Groups**, **Scenarios** (use cases), และ **Journeys** (end-to-end)
เหมาะสำหรับนำเสนอลูกค้าก่อนเริ่มโค้ดจริง

## เมื่อไหร่ควรใช้ Skill นี้

- เมื่อ user ต้องการสร้าง demo page สำหรับ presentation ให้ลูกค้า
- เมื่อ user ต้องการจัดกลุ่ม features/flows ของโปรเจคเป็น scenarios
- เมื่อ user พูดถึง "demo flow", "flow presentation", "client demo"

## Reference Files

อ่านก่อนเริ่มงาน:

```
references/DEMO_FLOW_PATTERN.md     ← Architecture & step-by-step guide
references/DEMO_FLOW_TEMPLATES.md   ← Generic code templates (copy & adapt)
```

## ขั้นตอนสรุป (Agent Workflow)

### Phase 1: Discovery — ถาม user เก็บข้อมูล

1. **ถามชื่อโปรเจค** — ใช้ตั้ง metadata, ชื่อ route, หัวข้อ
2. **ถาม Flow Groups** — กลุ่มหลักของระบบ (เช่น การขาย, คลังสินค้า, HR)
3. **ถาม Flows ในแต่ละ Group** — ชื่อ, คำอธิบาย, steps, roles, mockRoute
4. **ถาม Scenarios** — use cases ที่ต้องการ demo (แต่ละ scenario ประกอบด้วย flows หลายตัว)
5. **ถาม Journeys** — end-to-end flows (ครบวงจรจากต้นจนจบ)

### Phase 2: Scaffold — สร้างโครงสร้าง

6. **สร้าง folder structure** ตาม pattern
7. **สร้าง CSS variables** สำหรับ landing theme (ถ้ายังไม่มี)
8. **สร้าง shared components** — FlowCard, DemoFlowMockLayout, SmartBackButton, ScenarioBreadcrumb, JourneyIcons
9. **สร้าง Zustand store** — journey-store สำหรับ expanded state

### Phase 3: Data & Pages — สร้าง content

10. **สร้าง data files** — flow-data.ts, scenarios-data.ts, journey-data.ts
11. **สร้าง main page** — demo-flow/page.tsx (hub page)
12. **สร้าง scenarios pages** — list + detail (presentation mode)
13. **สร้าง journey pages** — list + detail (presentation mode)
14. **สร้าง mock pages** — แต่ละ flow สร้าง mock page ใน `demo-flow/mock/[flow-id]/page.tsx`

### Phase 4: Review

15. **ตรวจสอบ** — ทุก flow มี mockRoute ชี้ถูก, scenarios/journeys อ้าง flowId ถูก
16. **ทดสอบ** — `npm run dev` แล้วเปิด `/demo-flow`

## Placeholders

| Placeholder         | รูปแบบ      | ตัวอย่าง                  |
| ------------------- | ----------- | ------------------------- |
| `[ProjectName]`     | ชื่อโปรเจค  | `Ok Studio Design`        |
| `[demo-flow]`       | route path  | `demo-flow`               |
| `[GroupId]`         | single char | `A`, `B`, `C`             |
| `[GroupTitle]`      | ภาษาไทย/EN  | `การขาย & ใบเสนอราคา`     |
| `[FlowId]`         | kebab-case  | `create-quote`            |
| `[FlowTitle]`      | ภาษาไทย/EN  | `สร้างใบเสนอราคา`         |
| `[ScenarioId]`     | kebab-case  | `new-customer-full-flow`  |
| `[JourneyId]`      | kebab-case  | `standard-job`            |

## Dependencies ที่ต้องมี

```bash
# Core (น่าจะมีอยู่แล้ว)
next react react-dom typescript tailwindcss

# Required
lucide-react    # Icons
next-themes     # Dark/Light toggle ใน Presentation Mode
zustand         # State management
localforage     # Persist expanded journey state

# Utility
clsx tailwind-merge  # cn() helper
```

## หมายเหตุ

- Mock pages ไม่จำเป็นต้องเชื่อมต่อ API จริง ใช้ hardcoded data สำหรับ demo
- Presentation Mode (scenarios/[id] และ journey/[id]) ใช้ import mock pages เป็น components
- ใช้ `landing-*` CSS utility classes สำหรับ theme ที่รองรับ dark/light mode
- ดูรายละเอียดทั้งหมดใน `references/DEMO_FLOW_PATTERN.md`
