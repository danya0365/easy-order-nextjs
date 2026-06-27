# Demo Flow Pattern — Architecture Guide

## 1. Overview

Demo Flow คือระบบ presentation ที่จัดกลุ่ม features ของโปรเจคเป็น 3 ระดับ:

```
Flows (แต่ละ flow = 1 หน้าจอ/feature)
  └── Groups (จัดกลุ่มตาม module เช่น Sales, HR, Inventory)
        └── Scenarios (use cases — จับ flows มาเรียงเป็นสถานการณ์)
              └── Journeys (end-to-end — ครบวงจรจากต้นจนจบ)
```

### ใช้เมื่อไหร่

- **ก่อนเริ่มโค้ดจริง** — สร้าง mock pages เพื่อ demo ให้ลูกค้าเห็นภาพ
- **Presentation ให้ลูกค้า** — เปิด Presentation Mode แสดง flow ทีละ step
- **Internal review** — ตรวจ flows ว่าครบตาม requirements

---

## 2. Folder Structure

```
app/
└── demo-flow/                          ← route group สำหรับ demo
    ├── layout.tsx                      ← layout wrapper (landing-bg theme)
    ├── page.tsx                        ← hub page: แสดง groups + flow cards + links
    ├── _components/                    ← shared components (co-located)
    │   ├── flow-data.ts               ← FlowItem[], FlowGroup[] definitions
    │   ├── scenarios-data.ts           ← UseCase[] definitions
    │   ├── journey-data.ts             ← Journey[] definitions
    │   ├── flow-card.tsx               ← FlowCard component
    │   ├── demo-flow-mock-layout.tsx   ← reusable layout สำหรับ mock pages
    │   ├── smart-back-button.tsx       ← back button ที่รู้ว่ามาจาก scenario/journey
    │   ├── scenario-breadcrumb.tsx     ← breadcrumb เมื่อมาจาก scenario
    │   └── journey-icons.tsx           ← icon mapping สำหรับ journeys
    ├── scenarios/
    │   ├── page.tsx                    ← scenarios list page
    │   └── [id]/
    │       └── page.tsx               ← scenario detail — Presentation Mode
    ├── journey/
    │   ├── page.tsx                    ← journey list page
    │   └── [id]/
    │       └── page.tsx               ← journey detail — Presentation Mode
    └── mock/                           ← mock pages สำหรับแต่ละ flow
        ├── [flow-id-1]/
        │   └── page.tsx
        ├── [flow-id-2]/
        │   └── page.tsx
        └── ...

src/
└── presentation/
    ├── lib/
    │   └── cn.ts                       ← clsx + tailwind-merge utility
    └── stores/
        └── journey-store.ts            ← Zustand store (expanded journey)
```

---

## 3. Data Model

### 3.1 FlowItem & FlowGroup

```typescript
// app/demo-flow/_components/flow-data.ts

export interface FlowItem {
  id: string;           // unique kebab-case id (e.g. "create-quote")
  group: string;        // group id (e.g. "A", "B")
  title: string;        // display title
  description: string;  // 1-2 sentence description
  steps: string[];      // step-by-step bullet points
  roles: string[];      // involved roles (e.g. ["PM", "ลูกค้า"])
  badge?: string;       // optional badge text (e.g. "Core", "WOW")
  isWow?: boolean;      // highlight as WOW feature
  mockRoute?: string;   // link to mock page (e.g. "/demo-flow/mock/create-quote")
}

export interface FlowGroup {
  id: string;           // single char or short id (e.g. "A")
  title: string;        // group name
  subtitle: string;     // short description
  color: string;        // tailwind gradient (e.g. "from-orange-500 to-amber-500")
}
```

### 3.2 Scenario (UseCase)

```typescript
// app/demo-flow/_components/scenarios-data.ts

export interface ScenarioStep {
  flowId: string;       // references FlowItem.id
  title: string;        // step title in this scenario context
  description: string;  // step description
  mockRoute: string;    // link to mock page
  isOptional?: boolean; // optional step
}

export interface UseCase {
  id: string;              // unique kebab-case id
  title: string;           // scenario name
  description: string;     // scenario description
  icon: string;            // lucide icon name (e.g. "Briefcase")
  color: string;           // tailwind gradient
  steps: ScenarioStep[];   // ordered steps
  estimatedTime: string;   // e.g. "5-8 นาที"
  targetAudience: string[]; // e.g. ["เจ้าของร้าน", "PM"]
}
```

### 3.3 Journey

```typescript
// app/demo-flow/_components/journey-data.ts

export interface JourneyStep {
  flowId: string;
  title: string;
  description: string;
  mockRoute: string;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  icon: string;           // lucide icon name (from journeyIconMap)
  color: string;          // tailwind gradient
  steps: JourneyStep[];
  estimatedTime: string;
}
```

---

## 4. Component Architecture

### 4.1 Layout (`layout.tsx`)

```
Server Component
ทำหน้าที่:
  - Set metadata (title: "Demo Flow")
  - Wrap children ด้วย div.min-h-screen.landing-bg
```

### 4.2 Hub Page (`page.tsx`)

```
Server Component
ทำหน้าที่:
  - Hero section + links ไป scenarios & journeys
  - วนลูป flowGroups → แสดง group header + FlowCard grid
  - Import: flowGroups, flowItems, useCases จาก _components
```

### 4.3 FlowCard (`_components/flow-card.tsx`)

```
Client Component ("use client")
Props: { flow: FlowItem, groupColor: string }
ทำหน้าที่:
  - แสดง card พร้อม group badge, title, description
  - แสดง steps preview (first 2 items)
  - แสดง roles badges
  - ถ้ามี mockRoute → Link "ดูตัวอย่าง", ถ้าไม่มี → "Coming soon"
  - ถ้า isWow → เพิ่ม accent line + sparkle icon
```

### 4.4 DemoFlowMockLayout (`_components/demo-flow-mock-layout.tsx`)

```
Client Component ("use client")
Props: {
  children: ReactNode
  flowId: string        — ใช้ระบุ flow ปัจจุบัน
  title: string         — แสดงในส่วน header
  badge?: ReactNode     — optional badge/status ขวามือ
  maxWidth?: "md" | "2xl" | "5xl"  — ขนาด container
  backButtonFallback?: { href, label }  — fallback สำหรับ back button
}
ทำหน้าที่:
  - Sticky header พร้อม SmartBackButton + title + badge
  - ScenarioBreadcrumb (แสดงเมื่อมาจาก scenario)
  - Main content container ตาม maxWidth
```

### 4.5 SmartBackButton (`_components/smart-back-button.tsx`)

```
Client Component ("use client")
ทำหน้าที่:
  - อ่าน searchParams: from, scenario, journey
  - ถ้า from=scenarios → ลิงก์กลับไป scenario นั้น
  - ถ้า from=journey → ลิงก์กลับไป journey นั้น
  - ถ้าอยู่ใน Presentation Mode (scenarios/[id] หรือ journey/[id]) → ซ่อนตัวเอง
  - Default → ลิงก์กลับหน้า demo-flow
```

### 4.6 ScenarioBreadcrumb (`_components/scenario-breadcrumb.tsx`)

```
Client Component ("use client")
Props: { currentFlowId: string }
ทำหน้าที่:
  - อ่าน searchParams: from=scenarios, scenario=[id]
  - แสดง breadcrumb: Scenarios → [Scenario Title] → [Current Flow]
  - ซ่อนตัวเองถ้าไม่ได้มาจาก scenario
```

### 4.7 JourneyIcons (`_components/journey-icons.tsx`)

```
Client Component ("use client")
ทำหน้าที่:
  - Export journeyIconMap — mapping ชื่อ icon → lucide component
  - Export getJourneyIcon(name, className) — render icon จากชื่อ
  - Export type JourneyIconName
```

---

## 5. Page Architecture

### 5.1 Scenarios List (`scenarios/page.tsx`)

```
Client Component ("use client")
ทำหน้าที่:
  - Header + back link ไป /demo-flow
  - วนลูป useCases → แสดง card แต่ละ scenario
  - แต่ละ card มี: icon, title, description, meta (time + audience)
  - แสดง steps เป็น horizontal chain ของ links
  - แต่ละ step link ไป: mockRoute?from=scenarios&scenario=[id]
  - มี Presentation Mode link ไป scenarios/[id]
```

### 5.2 Scenario Detail — Presentation Mode (`scenarios/[id]/page.tsx`)

```
Client Component ("use client") wrapped in Suspense
ทำหน้าที่:
  - Full-screen layout: Sidebar (280-320px) + Main Content
  - Sidebar: กลับหน้า scenarios, scenario info, steps tree, progress bar
  - Main: top bar (step counter + nav buttons + theme toggle) + flow content
  - ใช้ flowComponents map — import ทุก mock page แล้ว map flowId → Component
  - URL: /demo-flow/scenarios/[id]?step=0 (step index ใน URL)
  - Navigation: ก่อนหน้า/ถัดไป buttons
  - Progress bar: แสดง current step / total steps
  - Auto-scroll sidebar ไป active step
```

### 5.3 Journey List (`journey/page.tsx`)

```
Client Component ("use client") wrapped in Suspense
ทำหน้าที่:
  - Header + back link ไป /demo-flow
  - วนลูป journeys → แสดง collapsible card
  - ใช้ Zustand store (useJourneyStore) เก็บ expandedJourneyId
  - เมื่อ expand → แสดง timeline steps
  - แต่ละ step link ไป: mockRoute?from=journey&journey=[id]&step=[n]
  - มี Presentation Mode link ไป journey/[id]
  - Auto-scroll ไป expanded journey เมื่อกลับมาจาก mock page
```

### 5.4 Journey Detail — Presentation Mode (`journey/[id]/page.tsx`)

```
Client Component ("use client") wrapped in Suspense
ทำหน้าที่:
  - เหมือน scenarios/[id] ทุกประการ
  - แต่ใช้ journeys data แทน useCases
  - ใช้ getJourneyIcon แทน iconMap
  - Store expanded journey ใน Zustand เมื่อเปิด detail
  - มี PlaceholderFlow component สำหรับ flows ที่ยังไม่มี mock
```

---

## 6. Mock Pages Pattern

### 6.1 โครงสร้าง Mock Page

```
app/demo-flow/mock/[flow-id]/page.tsx

ทุก mock page มีโครงสร้างเดียวกัน:
1. "use client" directive
2. Import DemoFlowMockLayout จาก _components
3. Function component [FlowName]Content — UI ของ flow
4. Default export wrapped ใน Suspense
```

### 6.2 Mock Page ใช้ DemoFlowMockLayout เป็น wrapper

```
<DemoFlowMockLayout
  flowId="[flow-id]"
  title="[Page Title]"
  badge={<span>...</span>}        // optional status badge
  maxWidth="md" | "2xl" | "5xl"   // layout width
  backButtonFallback={{ href: "/demo-flow", label: "กลับไปดู Flows" }}
>
  {/* Mock UI content */}
</DemoFlowMockLayout>
```

### 6.3 Mock Page Guidelines

- ใช้ hardcoded data — ไม่ต้อง fetch API
- ใช้ `useState` สำหรับ interactive states (confirm, loading, success)
- Fake loading ด้วย `setTimeout` 1-2 วินาที
- แสดง success state หลัง action
- ใช้ `landing-*` utility classes สำหรับ theme consistency
- ใช้ lucide-react icons
- Bottom section: SmartBackButton หรือ "next step" hint

---

## 7. Presentation Mode — flowComponents Map

ทั้ง `scenarios/[id]/page.tsx` และ `journey/[id]/page.tsx` ต้องมี:

```typescript
// Import ทุก mock page
import FlowAContent from "@/app/demo-flow/mock/flow-a/page";
import FlowBContent from "@/app/demo-flow/mock/flow-b/page";
// ... ทุก flow

// Map flowId → Component
const flowComponents: Record<string, React.ComponentType> = {
  "flow-a": FlowAContent,
  "flow-b": FlowBContent,
  // ... ทุก flow
};
```

> **สำคัญ**: ทุกครั้งที่เพิ่ม mock page ใหม่ ต้องอัพเดท flowComponents ทั้ง 2 ไฟล์

---

## 8. URL Query Parameters

### Mock pages รับ params เหล่านี้:

| Parameter   | ใช้โดย       | ตัวอย่าง                        | ใช้ทำอะไร                          |
| ----------- | ------------ | ------------------------------- | ---------------------------------- |
| `from`      | SmartBackButton, Breadcrumb | `scenarios` หรือ `journey` | ระบุว่ามาจากไหน |
| `scenario`  | SmartBackButton, Breadcrumb | `new-customer-full-flow`   | ระบุ scenario ที่มา |
| `journey`   | SmartBackButton             | `standard-job`             | ระบุ journey ที่มา |
| `step`      | Journey list, Presentation  | `3`                        | step number |
| `highlight` | Scenarios/Journey list       | `scenario-id`             | scroll + highlight card |

---

## 9. Zustand Store

### journey-store.ts

```typescript
// src/presentation/stores/journey-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

interface JourneyState {
  expandedJourneyId: string | null;
  expandJourney: (id: string) => void;
  collapseJourney: () => void;
  toggleJourney: (id: string) => void;
}
```

- **ทำไมต้อง persist**: เมื่อ user คลิกดู mock page แล้วกลับมา journey list → ต้องจำว่า journey ไหน expand อยู่
- **ใช้ localforage**: รองรับ Web (IndexedDB)

---

## 10. CSS Landing Theme

Demo Flow ใช้ CSS variables ชื่อ `landing-*` เพื่อรองรับ dark/light mode:

```css
/* ใน globals.css */

:root {
  /* Light mode */
  --landing-bg: #fafaf9;
  --landing-bg-secondary: #f5f5f4;
  --landing-fg: #1c1917;
  --landing-fg-muted: #78716c;
  --landing-fg-subtle: #a8a29e;
  --landing-primary: #f97316;          /* ← เปลี่ยนตาม brand */
  --landing-primary-light: #fb923c;
  --landing-primary-dark: #ea580c;
  --landing-accent: #f59e0b;
  --landing-card-bg: rgba(255, 255, 255, 0.8);
  --landing-border-subtle: rgba(0, 0, 0, 0.05);
  --landing-glass: rgba(255, 255, 255, 0.7);
  /* ... */
}

.dark {
  /* Dark mode */
  --landing-bg: #0c0c14;
  --landing-bg-secondary: #14141f;
  --landing-fg: #fafaf9;
  --landing-fg-muted: #a8a29e;
  --landing-fg-subtle: #78716c;
  --landing-card-bg: rgba(255, 255, 255, 0.02);
  --landing-border-subtle: rgba(255, 255, 255, 0.05);
  --landing-glass: rgba(255, 255, 255, 0.05);
  /* ... */
}
```

### Utility classes ที่ต้องกำหนดใน `@layer utilities`:

```css
@layer utilities {
  .landing-bg { background-color: var(--landing-bg); }
  .landing-bg-secondary { background-color: var(--landing-bg-secondary); }
  .landing-fg { color: var(--landing-fg); }
  .landing-fg-muted { color: var(--landing-fg-muted); }
  .landing-fg-subtle { color: var(--landing-fg-subtle); }
  .landing-card-bg { background-color: var(--landing-card-bg); }
  .landing-border-subtle { border-color: var(--landing-border-subtle); }
  .landing-glass {
    background-color: var(--landing-glass);
    backdrop-filter: blur(8px);
  }
}
```

### Tailwind v4 theme mapping (ใน `@theme inline`):

```css
@theme inline {
  --color-landing-bg: var(--landing-bg);
  --color-landing-bg-secondary: var(--landing-bg-secondary);
  --color-landing-fg: var(--landing-fg);
  --color-landing-fg-muted: var(--landing-fg-muted);
  --color-landing-fg-subtle: var(--landing-fg-subtle);
  --color-landing-primary: var(--landing-primary);
  --color-landing-card-bg: var(--landing-card-bg);
}
```

---

## 11. Agent Discovery Checklist

เมื่อ agent เริ่มสร้าง demo flow ให้ถาม user ทีละข้อ:

### ข้อมูลที่ต้องเก็บ

```
□ ชื่อโปรเจค
□ Primary color (brand color) — ใช้เป็น landing-primary
□ Flow Groups:
  □ Group ID (A, B, C, ...)
  □ Group Title
  □ Group Subtitle
  □ Group Color (tailwind gradient)
□ Flows ในแต่ละ Group:
  □ Flow ID (kebab-case)
  □ Title
  □ Description
  □ Steps (list of strings)
  □ Roles (list of strings)
  □ Badge (optional)
  □ isWow (optional)
□ Scenarios:
  □ Scenario ID
  □ Title + Description
  □ Icon (lucide name)
  □ Color (gradient)
  □ Steps (flowId + title + description + mockRoute)
  □ Estimated Time
  □ Target Audience
□ Journeys:
  □ Journey ID
  □ Title + Description
  □ Icon + Color
  □ Steps (flowId + title + description + mockRoute)
  □ Estimated Time
```

---

## 12. File Creation Order

สร้างไฟล์ตามลำดับนี้เพื่อหลีกเลี่ยง import errors:

1. `src/presentation/lib/cn.ts` (ถ้ายังไม่มี)
2. `src/presentation/stores/journey-store.ts`
3. `app/globals.css` — เพิ่ม landing theme variables
4. `app/demo-flow/layout.tsx`
5. `app/demo-flow/_components/flow-data.ts`
6. `app/demo-flow/_components/scenarios-data.ts`
7. `app/demo-flow/_components/journey-data.ts`
8. `app/demo-flow/_components/journey-icons.tsx`
9. `app/demo-flow/_components/smart-back-button.tsx`
10. `app/demo-flow/_components/scenario-breadcrumb.tsx`
11. `app/demo-flow/_components/demo-flow-mock-layout.tsx`
12. `app/demo-flow/_components/flow-card.tsx`
13. `app/demo-flow/mock/[flow-id]/page.tsx` — แต่ละ flow
14. `app/demo-flow/page.tsx`
15. `app/demo-flow/scenarios/page.tsx`
16. `app/demo-flow/scenarios/[id]/page.tsx`
17. `app/demo-flow/journey/page.tsx`
18. `app/demo-flow/journey/[id]/page.tsx`
