# CSS Theme Template

ไฟล์ต้นแบบสำหรับ `public/styles/theme.css`

## Complete Template

```css
@custom-variant dark (&:is(.dark *));

/* ============================================
   [Project] — Theme Tokens & Variables

   :root        → ประกาศตัวแปรทั้งหมด (Light mode)
   .dark        → Override ตัวแปรทั้งหมด (Dark mode)
   @theme inline → ใช้ตัวแปรจาก :root เท่านั้น
   ============================================ */

/* ============================================
   1. LIGHT MODE - ประกาศตัวแปรทั้งหมดที่นี่
   ============================================ */
:root {
  /* Surface Colors (Semantic) */
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;

  /* Border & Input */
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #3b82f6;

  /* Brand Colors (Primary - Blue) */
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

  /* Semantic Brand */
  --primary: var(--brand-500);
  --primary-foreground: #ffffff;

  /* Surface Scale (Gray/Slate) */
  --surface-50: #f8fafc;
  --surface-100: #f1f5f9;
  --surface-200: #e2e8f0;
  --surface-300: #cbd5e1;
  --surface-400: #94a3b8;
  --surface-500: #64748b;
  --surface-600: #475569;
  --surface-700: #334155;
  --surface-800: #1e293b;
  --surface-900: #0f172a;
}

/* ============================================
   2. DARK MODE - Override ทั้งหมดที่นี่
   ============================================ */
.dark {
  /* Surface Colors (Semantic) */
  --background: #09090b;
  --foreground: #fafafa;
  --card: #09090b;
  --card-foreground: #fafafa;
  --popover: #09090b;
  --popover-foreground: #fafafa;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;

  /* Border & Input */
  --border: #27272a;
  --input: #27272a;
  --ring: #3b82f6;

  /* Brand Colors (Inverted for visibility) */
  --brand-50: #1e3a8a;
  --brand-100: #1e40af;
  --brand-200: #1d4ed8;
  --brand-300: #2563eb;
  --brand-400: #3b82f6;
  --brand-500: #60a5fa;
  --brand-600: #93c5fd;
  --brand-700: #bfdbfe;
  --brand-800: #dbeafe;
  --brand-900: #eff6ff;

  /* Semantic Brand */
  --primary: var(--brand-500);
  --primary-foreground: #09090b;

  /* Surface Scale (Zinc Dark) */
  --surface-50: #18181b;
  --surface-100: #27272a;
  --surface-200: #3f3f46;
  --surface-300: #52525b;
  --surface-400: #71717a;
  --surface-500: #a1a1aa;
  --surface-600: #d4d4d8;
  --surface-700: #e4e4e7;
  --surface-800: #f4f4f5;
  --surface-900: #fafafa;
}

/* ============================================
   3. TAILWIND V4 THEME - ใช้ตัวแปรจาก :root เท่านั้น
      ห้ามประกาศสีใหม่ที่นี่
   ============================================ */
@theme inline {
  /* Font */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Surface (Semantic) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);

  /* Border & Input */
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Primary */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);

  /* Brand Scale */
  --color-brand-50: var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-200: var(--brand-200);
  --color-brand-300: var(--brand-300);
  --color-brand-400: var(--brand-400);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-700: var(--brand-700);
  --color-brand-800: var(--brand-800);
  --color-brand-900: var(--brand-900);

  /* Surface Scale */
  --color-surface-50: var(--surface-50);
  --color-surface-100: var(--surface-100);
  --color-surface-200: var(--surface-200);
  --color-surface-300: var(--surface-300);
  --color-surface-400: var(--surface-400);
  --color-surface-500: var(--surface-500);
  --color-surface-600: var(--surface-600);
  --color-surface-700: var(--surface-700);
  --color-surface-800: var(--surface-800);
  --color-surface-900: var(--surface-900);
}
```

## Color Scales Reference

### Brand Scale (Primary)
- `50-300` → Light backgrounds, subtle highlights
- `400-600` → Main actions, buttons, links (Primary)
- `700-900` → Hover states, dark accents

### Surface Scale
- `50-200` → Card backgrounds, hover states
- `300-500` → Borders, dividers, secondary text
- `600-900` → Primary text, strong contrast

### Semantic Mapping
| Semantic | Light | Dark |
|----------|-------|------|
| `--background` | `surface-50` | Zinc 950 |
| `--foreground` | `surface-900` | Zinc 50 |
| `--border` | `surface-200` | Zinc 800 |
| `--muted` | `surface-100` | Zinc 800 |
| `--muted-foreground` | `surface-500` | Zinc 400 |
