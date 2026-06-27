---
name: nextjs-theme-css
description: >
  กฎการเขียน CSS และจัดการ Theme Variables สำหรับ Next.js + Tailwind v4.
  ใช้เมื่อต้องการสร้างหรือแก้ไข theme.css และระบบ design tokens.
version: "1.0"
metadata:
  author: dan
  stack: next.js, tailwindcss v4, css variables
  pattern: theme-tokens
---

## โครงสร้างไฟล์ CSS

```
public/styles/
├── index.css       → Entry point (import tailwind + ไฟล์อื่น)
├── theme.css       → Variables, @theme, dark mode
├── base.css        → Base element styles (body)
└── components.css  → Component styles (ถ้าจำเป็น)
```

## กฎเหล็กสำหรับ theme.css

### 1. ประกาศตัวแปรใน `:root` เท่านั้น

```css
:root {
  /* Surface Colors */
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;

  /* Border */
  --border: #e2e8f0;

  /* Brand Scale */
  --brand-50: #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #3b82f6;
  --brand-600: #2563eb;
  --brand-700: #1d4ed8;
  --brand-800: #1e40af;
  --brand-900: #1e3a8a;

  /* Surface Scale */
  --surface-50: #f8fafc;
  --surface-100: #f1f5f9;
  --surface-200: #e2e8f0;
  /* ... */
}
```

### 2. Override ใน `.dark` เท่านั้น

```css
.dark {
  /* Surface Colors */
  --background: #09090b;
  --foreground: #fafafa;
  --card: #09090b;
  --card-foreground: #fafafa;

  /* Border */
  --border: #27272a;

  /* Brand (สว่างขึ้นใน dark mode) */
  --brand-50: #1e3a8a;
  --brand-100: #1e40af;
  /* ... */

  /* Surface Scale (dark) */
  --surface-50: #18181b;
  --surface-100: #27272a;
  /* ... */
}
```

### 3. `@theme inline` ใช้ `var()` เท่านั้น

**ห้าม**ประกาศสีใหม่ใน `@theme {}`

```css
@theme inline {
  /* Font */
  --font-sans: "Noto Sans Thai", var(--font-noto-sans-thai), ...;

  /* Surface - ใช้ var() */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);

  /* Border - ใช้ var() */
  --color-border: var(--border);

  /* Brand Scale - ใช้ var() ทั้งหมด */
  --color-brand-50: var(--brand-50);
  --color-brand-100: var(--brand-100);
  /* ... */

  /* Surface Scale - ใช้ var() ทั้งหมด */
  --color-surface-50: var(--surface-50);
  --color-surface-100: var(--surface-100);
  /* ... */
}
```

## Naming Convention

| Prefix         | ใช้ใน              | ตัวอย่าง                                   |
| -------------- | ------------------ | ------------------------------------------ |
| `--background` | Semantic colors    | `--background`, `--foreground`             |
| `--brand-*`    | Brand colors scale | `--brand-500`                              |
| `--surface-*`  | Neutral scale      | `--surface-100`, `--surface-800`           |
| `--color-*`    | Tailwind v4 theme  | `--color-brand-500`, `--color-surface-100` |

## Usage Pattern

```css
/* ใน base.css หรือ components.css */
body {
  background-color: var(--background); /* ใช้ตัวแปร :root โดยตรง */
  color: var(--foreground);
}
```

```tsx
// ใน React components - ใช้ Tailwind utilities
<div className="bg-brand-500 text-surface-50" />
```

## ข้อห้าม

1. **ห้าม**ประกาศสี hardcoded ใน `@theme inline`
2. **ห้าม**ใช้ `!important` กับ CSS variables
3. **ห้าม**สร้างตัวแปรนอก `:root` และ `.dark`
4. **ห้าม**ใช้ชื่อตัวแปรซ้ำซ้อน (เช่น `--color-blue` กับ `--color-brand-500`)
