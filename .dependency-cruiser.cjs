/**
 * Architecture rules for the Clean-Architecture layering described in
 * `.agents/skills/nextjs-clean-arch-drizzle/SKILL.md`, enforced mechanically.
 *
 * Run: `npm run depcruise` (also part of `npm run lint:all` + CI).
 * Graph: `npm run depcruise:graph` → docs/ARCHITECTURE.md (mermaid).
 *
 * Scope note: this checks the STRUCTURAL rules (layer dependency direction,
 * server-only presence, no cycles). SEMANTIC rules an import graph can't see
 * (every query scoped by shopId, requireRole present, logic in the right use
 * case) stay covered by the integration tests + review.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-pure",
      severity: "error",
      comment:
        "domain ต้อง pure — ห้ามรู้จัก Next.js / ORM / React หรือ layer นอก",
      from: { path: "^src/domain" },
      to: {
        path: "^(src/(application|infrastructure|presentation)|node_modules/(next|drizzle-orm|@libsql|react|react-dom))",
      },
    },
    {
      name: "app-no-infra",
      severity: "error",
      comment:
        "application = interface + use case — depend on interface เท่านั้น ห้าม import infrastructure/ORM/presentation",
      from: { path: "^src/application" },
      to: {
        path: "^(src/(infrastructure|presentation)|node_modules/(drizzle-orm|@libsql|next))",
      },
    },
    {
      name: "component-no-container",
      severity: "error",
      comment:
        "presentation component ห้ามแตะ DI container / repository ตรงๆ — เรียก use case จาก server component หรือ action แทน",
      from: { path: "^src/presentation/components" },
      to: { path: "^src/infrastructure/(di/container|repositories)" },
    },
    {
      name: "no-cycle",
      severity: "error",
      comment: "ห้ามมี dependency cycle",
      from: {},
      to: { circular: true },
    },
  ],

  required: [
    {
      name: "repo-server-only",
      severity: "error",
      comment: 'ทุก Drizzle repository ต้องขึ้นต้นด้วย import "server-only"',
      module: { path: "^src/infrastructure/repositories/drizzle/Drizzle.+\\.ts$" },
      to: { path: "^server-only$" },
    },
    {
      name: "secret-service-server-only",
      severity: "error",
      comment: 'service ที่แตะ crypto/secret ต้อง import "server-only"',
      module: {
        path: "^src/infrastructure/services/(BcryptPasswordHasher|ManualSlipPaymentVerifier|TurnstileVerifier)\\.ts$",
      },
      to: { path: "^server-only$" },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    // Resolve the `@/*` path alias + understand type-only imports.
    tsConfig: { fileName: "tsconfig.json" },
    // Type-only imports are erased at compile time → don't count them as real
    // dependencies (a `import type` across layers is allowed, per the audit).
    tsPreCompilationDeps: false,
    // Tests live inside src/ (some integration tests in src/application import
    // the infra container on purpose) → exclude them from the layer rules.
    exclude: { path: "\\.test\\.ts$|^src/test/" },
  },
};
