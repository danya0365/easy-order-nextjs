import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Enforces the semantic-theme CSS rule (.agents/skills/nextjs-semantic-theme):
// never hardcode colors in className — always use theme-mapped utilities
// (bg-brand-500, text-on-brand, text-muted, bg-card, border-border …).
// Justified exceptions (e.g. a third-party brand color) use an inline
// `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
const RESTRICTED_COLOR_SYNTAX = [
  {
    // bg-[#fff] / text-[rgb(...)] / ring-[hsl(...)] — arbitrary color values
    selector:
      "Literal[value=/\\b(bg|text|border|ring|fill|stroke|from|via|to|outline|shadow|decoration|divide|placeholder|caret|accent)-\\[(#|rgb|hsl)/]",
    message:
      "ห้าม hardcode สีใน className (เช่น bg-[#...]) — ใช้ token ของธีม เช่น bg-brand-500, text-on-brand",
  },
  {
    selector:
      "TemplateElement[value.raw=/\\b(bg|text|border|ring|fill|stroke|from|via|to|outline|shadow|decoration|divide|placeholder|caret|accent)-\\[(#|rgb|hsl)/]",
    message:
      "ห้าม hardcode สีใน className (เช่น bg-[#...]) — ใช้ token ของธีม เช่น bg-brand-500, text-on-brand",
  },
  {
    // bg-gray-100 / text-slate-500 … — raw neutral palettes that should be tokens
    selector:
      "Literal[value=/\\b(bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder)-(gray|slate|zinc|neutral|stone)-\\d/]",
    message:
      "ห้ามใช้สี neutral palette ตรงๆ (gray/slate/zinc/neutral/stone) — ใช้ token เช่น text-foreground, text-muted, bg-card, border-border",
  },
  {
    selector:
      "TemplateElement[value.raw=/\\b(bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder)-(gray|slate|zinc|neutral|stone)-\\d/]",
    message:
      "ห้ามใช้สี neutral palette ตรงๆ (gray/slate/zinc/neutral/stone) — ใช้ token เช่น text-foreground, text-muted, bg-card, border-border",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...RESTRICTED_COLOR_SYNTAX],
    },
  },
  // Architecture tripwire (instant editor feedback for the most common slip).
  // The full layer contract is enforced by dependency-cruiser (npm run depcruise
  // / lint:all / CI) — see .dependency-cruiser.cjs. This mirrors only the single
  // highest-value rule so a wrong import lights up red while you type.
  {
    files: ["src/presentation/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/src/infrastructure/di/container",
              message:
                "component ห้ามแตะ DI container — เรียก use case จาก server component หรือ action แทน",
            },
          ],
          patterns: [
            {
              group: ["@/src/infrastructure/repositories/*"],
              message: "component ห้าม import repository ตรงๆ",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
