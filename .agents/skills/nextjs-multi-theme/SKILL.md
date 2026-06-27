---
name: nextjs-multi-theme
description: >
  Next.js Multi-Theme System ด้วย CSS Variables + Zustand Persist + Runtime Switching
  รองรับหลาย UI Templates (core, minimal, retro-megazine) พร้อม namespace isolation
version: "1.0"
metadata:
  author: dan
  stack: next.js, tailwindcss v4, zustand, css variables
  pattern: multi-theme, runtime-switching
---

## Overview

Skill นี้ใช้สร้าง Next.js app ที่รองรับหลาย UI Templates พร้อม runtime theme switching ผ่าน Zustand persist

**Templates ที่มี:**

- `core` — อ่านง่าย เหมาะกับทุกวัย (Blue + Slate)
- `minimal` — เรียบง่าย เน้น whitespace (Neutral)
- `retro-megazine` — อบอุ่น editorial (Earth tones + Serif)

---

## Architecture Overview

### File Structure

```
public/styles/
├── index.css                    → Entry
├── themes/
│   ├── _shared.css              → @custom-variant, utilities
│   ├── core.css                 → --core-* variables
│   ├── minimal.css              → --minimal-* variables
│   └── retro-megazine.css       → --retro-megazine-* variables
└── components/
    └── (optional shared styles)

src/presentation/
├── stores/
│   └── theme.store.ts           → Zustand + persist
├── components/
│   └── theme-switcher.tsx       → UI สลับ theme
└── providers/
    └── theme-provider.tsx       → Apply data-theme
```

### CSS Architecture Rule

**ห้าม**ประกาศสีใน `@theme inline` โดยตรง — ต้องผ่าน CSS variables จาก `:root`

```css
/* ✅ ถูกต้อง */
:root {
  --core-primary: #2563eb;
}
@theme inline {
  --color-core-primary: var(--core-primary);
}

/* ❌ ผิด */
@theme inline {
  --color-core-primary: #2563eb; /* hardcoded! */
}
```

---

## Namespace Convention

| Template       | CSS Prefix           | Example                                       |
| -------------- | -------------------- | --------------------------------------------- |
| core           | `--core-*`           | `--core-primary`, `--core-spacing-md`         |
| minimal        | `--minimal-*`        | `--minimal-primary`, `--minimal-font-heading` |
| retro-megazine | `--retro-megazine-*` | `--retro-megazine-primary`                    |

### Variables ที่ต้องมีในแต่ละ Template

```css
/* Required variables per template */
--[namespace]-primary
--[namespace]-secondary
--[namespace]-background
--[namespace]-surface
--[namespace]-text
--[namespace]-text-muted
--[namespace]-border
--[namespace]-font-heading
--[namespace]-font-body
--[namespace]-spacing-xs|sm|md|lg|xl
```

---

## Template Selection Logic

### Store (Zustand)

```typescript
// src/presentation/stores/theme.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeTemplate = "core" | "minimal" | "retro-megazine";

interface ThemeState {
  template: ThemeTemplate;
  setTemplate: (template: ThemeTemplate) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      template: "core", // default
      setTemplate: (template) => set({ template }),
    }),
    { name: "theme-storage" },
  ),
);
```

### Provider

```tsx
// app/providers/theme-provider.tsx
"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/presentation/stores/theme.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const template = useThemeStore((state) => state.template);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", template);
  }, [template]);

  return <>{children}</>;
}
```

### CSS Selector Pattern

```css
/* Light mode (default) */
:root {
  --core-primary: #2563eb;
}

/* Dark mode - specific to template */
[data-theme="core"].dark,
.dark[data-theme="core"] {
  --core-primary: #3b82f6;
}
```

---

## Component Patterns by Template

### core (Readability Focus)

```tsx
// เน้น readability, contrast สูง
<button
  className="
  bg-core-primary text-white 
  px-core-spacing-md py-2 
  rounded-md font-medium
  focus:outline-none focus:ring-2 focus:ring-core-primary/50
"
>
  ดำเนินการ
</button>
```

### minimal (Whitespace Focus)

```tsx
// เน้น whitespace, ghost buttons
<button
  className="
  border border-minimal-border 
  text-minimal-text
  px-minimal-spacing-lg py-3 
  rounded-sm
  hover:bg-minimal-surface
"
>
  ดำเนินการ
</button>
```

### retro-megazine (Character Focus)

```tsx
// เน้น character, serif headings
<h1 className="font-retro-megazine-heading text-4xl text-retro-megazine-text">
  หัวข้อแบบ Serif
</h1>
<button className="
  bg-retro-megazine-primary text-white
  px-retro-spacing-md py-2
  rounded-full uppercase tracking-wide font-bold
">
  ดำเนินการ
</button>
```

---

## Validation Rules (for AI)

เมื่อ generate code ต้องตรวจสอบ:

1. **Namespace Match**: ใช้ CSS variables ที่ตรงกับ template ที่เลือก
2. **No Hardcoded Colors**: ห้ามใช้ hex/rgb โดยตรงในคลาส
3. **Dark Mode**: ต้องมี override ใน `[data-theme="X"].dark`
4. **Accessibility**:
   - Core template → contrast ratio 4.5:1+
   - Font size ไม่ต่ำกว่า 16px
   - Focus states ชัดเจน

---

## Prompt Patterns

### Generate with Template

```
"Create a [component/page] using [template-name] template"

Examples:
- "Create a dashboard layout using core template"
- "Create a landing page using retro-megazine template"
- "Create a settings page using minimal template"
```

### Switch Template

```
"Add theme switcher to [location]"
"Make this component work with all templates"
```

---

## References

- `references/templates.yaml` — Template registry ทั้งหมด
- `references/core.css` — Core template CSS example
- `references/minimal.css` — Minimal template CSS example
- `references/retro-megazine.css` — Retro template CSS example
- `examples/` — React component examples per template
