# Token Catalog — semantic theme tokens

ตารางอ้างอิง token ทั้งหมดของระบบ พร้อมระบุว่า **ต้องประกาศใน palette ทุกธีมหรือไม่** และ map เป็น Tailwind
utility อะไร (ผ่าน `@theme inline` ใน `theme.css`)

> กฎ: ค่าจริง (hex) อยู่ใน `themes/<theme>.css` เท่านั้น — `theme.css` ทำหน้าที่ map ด้วย `var()` ล้วน

## Surface / Semantic

| Token (`:root` value) | `@theme inline` → Tailwind | Required ต่อธีม | ใช้ทำอะไร |
| --------------------- | -------------------------- | --------------- | --------- |
| `--background`        | `bg-background`            | ✅ light+dark   | พื้นหลังหน้า (ผูกกับ `body`) |
| `--foreground`        | `text-foreground`         | ✅ light+dark   | สีตัวอักษรหลัก |
| `--card`              | `bg-card`                 | ✅ light+dark   | พื้นการ์ด/แผง |
| `--card-foreground`   | `text-card-foreground`    | ✅ light+dark   | ตัวอักษรบนการ์ด |
| `--muted`             | `text-muted`              | ✅ light+dark   | ตัวอักษรรอง/คำอธิบาย |
| `--muted-surface`     | `bg-muted-surface`        | ✅ light+dark   | พื้นจาง (chip, track, hover) |
| `--border`            | `border-border`           | ✅ light+dark   | เส้นขอบ |
| `--ring`              | `ring-ring`               | ✅ light+dark   | focus ring |

## Brand ramp (50–900)

| Token            | Tailwind            | Required | หมายเหตุ |
| ---------------- | ------------------- | -------- | -------- |
| `--brand-50..900`| `bg/text/border-brand-{50..900}` | ✅ ครบ 10 สเต็ป (light) | ดู **dark = พลิก ramp** ด้านล่าง |

**Dark ramp (กฎพลิก):** ใน `[data-theme="X"].dark`
- `--brand-50 .. --brand-300` → กลายเป็น **สีพื้น/ขอบเข้ม** (เช่น bg ของ EmptyState)
- `--brand-500 .. --brand-900` → กลายเป็น **สีอ่อน/ข้อความ** (ไล่กลับหัว)
- ไม่จำเป็นต้อง override `--brand-400` ถ้าธีมไม่ได้ใช้ (cafe/minimal ข้าม 400 ใน dark ได้)

## On-brand (สำคัญสุดตอน dark)

| Token         | Tailwind        | Required | กฎ |
| ------------- | --------------- | -------- | -- |
| `--on-brand`  | `text-on-brand` | ✅ light; **dark = set เมื่อ brand-500 กลายเป็นสีอ่อน** | สีตัวอักษร/ไอคอน **บนพื้น brand-500/600** (เช่นปุ่ม primary) แยกจาก ramp เพื่อกันข้อความปุ่มพัง |

- cafe (dark): ปุ่มยังเป็นส้ม → **ไม่ override** `--on-brand` คงเป็น `#fff`
- minimal/retro (dark): brand-500 กลายเป็นสีอ่อน → **ต้อง** set `--on-brand` เป็นสีเข้ม (`#0a0a0a` / `#1c1917`)

## Accent (4 สเต็ป — ไม่ครบ ramp)

| Token                       | Tailwind                  | Required |
| --------------------------- | ------------------------- | -------- |
| `--accent-100/400/500/600`  | `bg/text-accent-{...}`    | ✅ light (dark ไม่บังคับ override) |

## Status (คู่ สี + พื้น)

| Token                | Tailwind                | Required |
| -------------------- | ----------------------- | -------- |
| `--success`          | `text-success`          | ✅ light |
| `--success-surface`  | `bg-success-surface`    | ✅ light + **override ใน dark** |
| `--warning`          | `text-warning`          | ✅ light |
| `--warning-surface`  | `bg-warning-surface`    | ✅ light + **override ใน dark** |
| `--error`            | `text-error`            | ✅ light |
| `--error-surface`    | `bg-error-surface`      | ✅ light + **override ใน dark** |

> ใน dark ปกติ override เฉพาะ `*-surface` (พื้นเข้ม) ส่วนสีตัวอักษร status คงค่าจาก light ได้

## Fonts

| Token                   | `@theme inline` → Tailwind | Required | หมายเหตุ |
| ----------------------- | -------------------------- | -------- | -------- |
| `--font-body`           | `--font-sans` → `font-sans`     | ✅ | ผูกกับ `body` |
| `--font-heading-family` | `--font-heading` → `font-heading` | ✅ | ผูกกับ `h1,h2,h3`; retro = serif |

ค่าฟอนต์ชี้ไปที่ CSS variable ของ `next/font` (เช่น `var(--font-noto-thai)`, `var(--font-noto-serif-thai)`)
ที่ inject ใน `app/layout.tsx`
