---
name: nextjs-semantic-theme
description: >
  Next.js gen-3 theming — ชุด semantic token ร่วมชุดเดียวสลับด้วย [data-theme] + dark mode
  per-theme (ramp inversion) + status/accent/on-brand + ฟอนต์ per-theme + Zustand persist
  และ FOUC script. ใช้เมื่อสร้าง/แก้ระบบธีมหลาย template ที่สลับได้ runtime บน Tailwind v4.
version: "1.0"
metadata:
  author: dan
  stack: next.js, tailwindcss v4, css variables, zustand
  pattern: semantic-tokens, multi-theme, runtime-switching
---

## Overview

ระบบธีมแบบ **generation 3** ที่ใช้จริงใน production (Easy Stamp) — รวมและแทนแนวคิดเชิงปฏิบัติของ
`nextjs-theme-css` (gen-1: กฎ token) และ `nextjs-multi-theme` (gen-2: namespaced runtime switch)

> Skill เก่า 2 ตัวยังอยู่เพื่ออ้างอิงประวัติ/โปรเจคเก่า — **โปรเจคใหม่ให้ยึด skill นี้**

**ต่างจากของเก่าอย่างไร:**

| ประเด็น          | gen-1/2 (เก่า)                       | gen-3 (skill นี้)                          |
| ---------------- | ------------------------------------ | ------------------------------------------- |
| ตัวแปรต่อธีม      | namespace `--core-*/--minimal-*`     | **semantic ร่วมชุดเดียว** สลับค่าด้วย `[data-theme]` |
| dark mode        | global `.dark`                       | **per-theme** `[data-theme="X"].dark`       |
| neutral          | `--surface-50..900`                  | `--muted` / `--muted-surface` / `--card`    |
| status/accent    | ไม่มี                                | มี `--success/-surface` ×3, `--accent-*`     |
| ปุ่ม primary dark | เสี่ยงข้อความพัง                      | `--on-brand` แยกจาก ramp                     |
| ฟอนต์            | คงที่                                | **per-theme** (retro = serif heading)        |

**ใช้เมื่อ:** สร้าง/แก้ `public/styles/`, เพิ่มธีมใหม่, ดีบั๊กสี dark mode, หรือเขียน component ที่ต้อง
รองรับทุกธีม

---

## สถาปัตยกรรม 4 ชั้น

```
next/font (layout.tsx) ─► --font-noto-thai / --font-noto-serif-thai   (CSS variable)
themes/<theme>.css     ─► ค่าจริง (hex) ของ token ต่อธีม              ([data-theme="X"] + .dark)
theme.css              ─► map token → Tailwind color ด้วย var() ล้วน  (@theme inline)
index.css              ─► entry: @import + @layer base (ผูก body/heading กับ token)
```

**ลำดับ `@import` ใน `index.css` (ห้ามสลับ):**

```css
@import "tailwindcss";        /* 1. ต้องมาก่อนสุด */
@import "./theme.css";        /* 2. ชั้น map (var-only) */
@import "./themes/cafe.css";  /* 3. palette — cafe ผูกกับ :root = default */
@import "./themes/minimal.css";
@import "./themes/retro.css";
```

`@layer base` ใน index.css ผูก element หลักกับ token (ใช้ `base` เพื่อให้ utility ของ Tailwind override ได้):

```css
@layer base {
  body { background-color: var(--background); color: var(--foreground); font-family: var(--font-body); }
  h1, h2, h3 { font-family: var(--font-heading-family); }  /* แยก heading เพื่อรองรับ serif ต่อธีม */
}
```

---

## กฎเหล็ก (ห้ามฝ่าฝืน)

1. **ชุด semantic token ร่วมชุดเดียว** — ไม่ namespace ต่อธีม ใช้ชื่อกลาง (`--brand-*`, `--background`, ...)
   แล้ว "สลับค่า" ตาม `[data-theme]`
2. **`@theme inline` ใช้ `var()` เท่านั้น** — ห้าม hardcode hex ใน `theme.css` ค่าจริงอยู่ใน `themes/*.css`

```css
/* ✅ ถูก — theme.css */
@theme inline { --color-brand-500: var(--brand-500); }
/* themes/cafe.css */
[data-theme="cafe"] { --brand-500: #f97316; }

/* ❌ ผิด — hardcode ในชั้น map */
@theme inline { --color-brand-500: #f97316; }
```

3. **dark variant เป็น class** — `@custom-variant dark (&:is(.dark *))` (toggle `.dark` บน `<html>`) ไม่ใช่ media query
4. **ห้าม hardcode สีใน className** — ใช้ utility ที่ map กับ token (`bg-brand-500`, `text-on-brand`, `text-muted`) เสมอ
5. **ทุกธีมต้องมี dark block** และตั้ง `--on-brand` ให้ถูก (ดูหัวข้อ dark)

---

## Token catalog (ย่อ)

ดูตารางเต็ม + utility ที่ map ใน [`references/tokens.md`](./references/tokens.md)

- **Surface:** `--background --foreground --card --card-foreground --muted --muted-surface --border --ring`
- **Brand ramp:** `--brand-50 … --brand-900` (ครบ 10)
- **On-brand:** `--on-brand` — สีตัวอักษร **บนพื้น brand-500/600** (แยกจาก ramp)
- **Accent:** `--accent-100/400/500/600`
- **Status:** `--success/-surface --warning/-surface --error/-surface`
- **Fonts:** `--font-body --font-heading-family`

---

## Dark mode — "เทคนิคพลิก ramp" (จุดสำคัญสุด)

ใน `[data-theme="X"].dark` ใช้สูตรเดียวกันทุกธีม:

- `--brand-50 … --brand-300` → **สีพื้น/ขอบเข้ม** (เช่น bg ของ EmptyState/badge)
- `--brand-500 … --brand-900` → **สีอ่อน/ข้อความ** (ไล่กลับหัวจาก light)
- override เฉพาะ `background/foreground/card/muted/border/ring` + `*-surface` ของ status

**กฎ `--on-brand` (ห้ามลืม):** `--on-brand` ถูกแยกออกจาก ramp ใน `theme.css` (`--color-on-brand: var(--on-brand)`)
เพื่อให้ข้อความบนปุ่ม primary ไม่พังตอนสลับ dark:

- ปุ่มยังเป็นสีเข้ม/อิ่ม (เช่น cafe ส้ม) → **ไม่ override** `--on-brand` คงเป็น `#fff`
- brand-500 กลายเป็น **สีอ่อน** (minimal/retro) → **ต้อง** set `--on-brand` เป็นสีเข้ม ไม่งั้นอ่านปุ่มไม่ออก

ดูตัวอย่างจริง: [`references/cafe.css`](./references/cafe.css) (คง on-brand), [`references/retro.css`](./references/retro.css) (set on-brand = `#1c1917`)

---

## ฟอนต์ per-theme

- โหลดด้วย `next/font/google` ใน `app/layout.tsx` → ได้ CSS variable (เช่น `--font-noto-thai`, `--font-noto-serif-thai`)
  + ต่อ `.variable` ลงใน `<html className>`
- palette ของธีมชี้ `--font-body` / `--font-heading-family` ไปยัง variable นั้น
- ตัวอย่าง: retro ใช้ `--font-heading-family: var(--font-noto-serif-thai), Georgia, serif` (ธีมเดียวที่ heading เป็น serif)
  ส่วน cafe/minimal ใช้ Sans ทั้ง body และ heading

ดู [`examples/layout-snippet.tsx`](./examples/layout-snippet.tsx)

---

## Runtime switching (Zustand + FOUC script)

3 ชิ้นทำงานร่วมกัน:

1. **Store** — Zustand `persist` เก็บ `template` + `dark` ใน localStorage key `"theme-storage"`
   → [`examples/theme-store.ts`](./examples/theme-store.ts)
2. **ThemeProvider** — client component ฟัง store แล้ว `setAttribute("data-theme")` + `classList.toggle("dark")`
   → [`examples/theme-provider.tsx`](./examples/theme-provider.tsx)
3. **ThemeScript** — inline **blocking** script ใน `<head>` อ่าน localStorage แล้ว apply ธีม **ก่อน first paint**
   → กัน FOUC (flash ธีม default) สำหรับผู้ใช้ที่กลับมา; key ต้องตรงกับ store
4. **ThemeSwitcher** — UI ปุ่มเลือก template + toggle dark → [`examples/theme-switcher.tsx`](./examples/theme-switcher.tsx)

> `<html>` ต้องมี `suppressHydrationWarning` เพราะ `data-theme`/`.dark` ถูก script mutate ฝั่ง client

---

## วิธีเพิ่มธีมใหม่

สรุป: สร้าง `themes/<id>.css` (light + dark ครบ token) → `@import` ใน index.css → เพิ่มชื่อใน
`ThemeTemplate` + `THEME_TEMPLATES` ของ store → (ถ้ามีฟอนต์ใหม่) เพิ่มใน layout → เพิ่มปุ่มใน switcher

ขั้นตอนละเอียด + ตัวอย่างเต็ม (ธีม `ocean`) + checklist: [`references/add-a-theme.md`](./references/add-a-theme.md)

---

## Do / Don't

**Do**
- ใช้ utility ที่ map กับ token เสมอ (`bg-card`, `text-muted`, `border-border`, `text-on-brand`)
- ทุกธีมมี light + dark block และ token ครบตาม `tokens.md`
- ตั้ง `--on-brand` ใน dark เมื่อ brand-500 กลายเป็นสีอ่อน
- คง `@theme inline` เป็น var() ล้วน

**Don't**
- ❌ hardcode hex ใน `@theme inline` หรือใน className (เช่น `bg-[#f97316]`)
- ❌ สร้าง namespace ต่อธีม (`--cafe-primary`) — ใช้ token ร่วม
- ❌ ลืม dark block หรือลืม `--on-brand` (ปุ่มจะอ่านไม่ออกใน dark)
- ❌ ใช้ media-query dark — ระบบนี้ class-based (`.dark` บน `<html>`)
- ❌ สลับลำดับ `@import` (tailwind ต้องมาก่อน)

---

## References

- [`references/theme.css`](./references/theme.css) — ชั้น map `@theme inline` (var-only) ตัวจริง
- [`references/index.css`](./references/index.css) — entry + `@layer base`
- [`references/cafe.css`](./references/cafe.css) — ธีม default + dark ramp (คง on-brand)
- [`references/retro.css`](./references/retro.css) — ฟอนต์ serif + on-brand เข้มใน dark
- [`references/tokens.md`](./references/tokens.md) — ตาราง token ทุกกลุ่ม + utility ที่ map
- [`references/add-a-theme.md`](./references/add-a-theme.md) — ขั้นตอนเพิ่มธีมใหม่ + checklist
- [`examples/`](./examples/) — store / provider+script / layout / switcher
