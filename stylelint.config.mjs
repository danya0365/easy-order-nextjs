/**
 * Enforces the semantic-theme CSS rule (.agents/skills/nextjs-semantic-theme):
 * the token-map layer (`theme.css`) and entry (`index.css`) must use `var()`
 * only — NO raw hex / named colors. Real color values live exclusively in
 * `themes/*.css`, which is excluded from these rules below.
 *
 * Minimal config (no shared base) so Tailwind v4 at-rules (@theme, @import
 * "tailwindcss", @custom-variant, @layer) are not flagged — only the color
 * rules run.
 *
 * @type {import('stylelint').Config}
 */
const config = {
  rules: {
    "color-no-hex": true,
    "color-named": "never",
  },
  overrides: [
    {
      // Palettes: this is where real hex colors are defined, per the skill.
      files: ["public/styles/themes/**/*.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
      },
    },
  ],
};

export default config;
