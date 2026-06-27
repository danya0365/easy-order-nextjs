# วิธีเพิ่มธีมใหม่ (step-by-step)

ตัวอย่าง: เพิ่มธีม `ocean` (โทนฟ้า-เขียว) ใช้ Sans เป็นทั้ง body และ heading

## 1. สร้างไฟล์ palette: `public/styles/themes/ocean.css`

ต้องมี **2 บล็อก** เสมอ — light (`[data-theme="ocean"]`) และ dark (`[data-theme="ocean"].dark`)
ประกาศ token ให้ครบตาม [`tokens.md`](./tokens.md) (คัดลอกโครงจาก `cafe.css` แล้วเปลี่ยนค่า)

```css
[data-theme="ocean"] {
  /* Brand ramp 50–900 (ครบ 10 สเต็ป) */
  --brand-50:  #ecfeff;  --brand-100: #cffafe;  --brand-200: #a5f3fc;
  --brand-300: #67e8f9;  --brand-400: #22d3ee;  --brand-500: #0891b2;
  --brand-600: #0e7490;  --brand-700: #155e75;  --brand-800: #164e63;  --brand-900: #083344;

  /* Accent (4 สเต็ป) */
  --accent-100: #d1fae5; --accent-400: #34d399; --accent-500: #10b981; --accent-600: #059669;

  /* Surface / semantic */
  --background: #f0fdff;  --foreground: #0c1a1f;
  --card: #ffffff;        --card-foreground: #0c1a1f;
  --muted: #5b7782;       --muted-surface: #e6f7fa;
  --border: #cfeaf0;      --ring: #67e8f9;
  --on-brand: #ffffff;

  /* Status */
  --success: #16a34a; --success-surface: #dcfce7;
  --warning: #d97706; --warning-surface: #fef3c7;
  --error: #dc2626;   --error-surface: #fee2e2;

  /* Fonts (ชี้ไป next/font variable) */
  --font-body: var(--font-noto-thai), system-ui, sans-serif;
  --font-heading-family: var(--font-noto-thai), system-ui, sans-serif;
}

[data-theme="ocean"].dark,
.dark[data-theme="ocean"] {
  /* พลิก ramp: 50–300 = พื้นเข้ม, 500–900 = สีอ่อน/ข้อความ */
  --brand-50:  #0c2a33; --brand-100: #103741; --brand-200: #16505d; --brand-300: #1e6675;
  --brand-500: #22d3ee; --brand-600: #06b6d4; --brand-700: #67e8f9;
  --brand-800: #a5f3fc; --brand-900: #cffafe;
  --on-brand: #06222a;          /* ⚠️ brand-500 เป็นสีอ่อน → ตั้ง on-brand เป็นสีเข้ม */

  --background: #07171c; --foreground: #f0fdff;
  --card: #0c1a1f;       --card-foreground: #f0fdff;
  --muted: #8aa6b0;      --muted-surface: #0c1a1f;
  --border: #1e3a42;     --ring: #22d3ee;

  --success-surface: #14532d; --warning-surface: #451a03; --error-surface: #450a0a;
}
```

## 2. เพิ่ม `@import` ใน `public/styles/index.css`

```css
@import "./themes/ocean.css";
```

## 3. ลงทะเบียนใน store: `src/presentation/stores/theme.store.ts`

```ts
export type ThemeTemplate = "cafe" | "minimal" | "retro" | "ocean";
export const THEME_TEMPLATES: ThemeTemplate[] = ["cafe", "minimal", "retro", "ocean"];
```

## 4. (ถ้าใช้ฟอนต์ใหม่) เพิ่มใน `app/layout.tsx`

ถ้าธีมต้องการฟอนต์ที่ยังไม่โหลด — `import` จาก `next/font/google` กำหนด `variable` แล้วต่อ class
ลงใน `<html className>` และให้ palette ชี้ `--font-*` ไปยัง variable นั้น
(ocean ใช้ Noto Sans Thai เดิม → ข้ามขั้นนี้)

## 5. เพิ่มปุ่มเลือกใน switcher: `src/presentation/components/theme-switcher.tsx`

```tsx
const TEMPLATES = [
  { value: "cafe",    label: "คาเฟ่",   icon: Coffee },
  { value: "minimal", label: "มินิมอล", icon: Square },
  { value: "retro",   label: "เรโทร",   icon: Newspaper },
  { value: "ocean",   label: "โอเชียน", icon: Waves },   // ➕ ใหม่
];
```

## Checklist ก่อนถือว่าเสร็จ
- [ ] palette มีครบทั้ง **light + dark** block
- [ ] token ครบตาม `tokens.md` (surface, brand 50–900, on-brand, accent, status, fonts)
- [ ] dark พลิก ramp ถูกทิศ (50–300 เข้ม / 500–900 อ่อน)
- [ ] ตั้ง `--on-brand` ใน dark **ถ้า** brand-500 กลายเป็นสีอ่อน (อ่านปุ่ม primary ออก)
- [ ] เพิ่ม `@import` ใน index.css
- [ ] เพิ่มชื่อใน `ThemeTemplate` + `THEME_TEMPLATES`
- [ ] เพิ่มปุ่มใน switcher (+ ฟอนต์ใน layout ถ้าจำเป็น)
- [ ] ทดสอบ contrast: text บนพื้น (foreground/background, on-brand/brand-500) ≥ 4.5:1
