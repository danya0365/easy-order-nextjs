import { bindings, defineConfig, defineWorker } from "cf/config";

// Dual-worker scaffolding:
// - production (default / --mode production / no mode): "easy-order"
// - staging/dev (--mode staging | development | dev): "easy-order-dev"
export default defineConfig((ctx) => {
  const isDevMode =
    ctx.mode === "staging" || ctx.mode === "development" || ctx.mode === "dev";

  return {
    worker: defineWorker({
      name: isDevMode ? "easy-order-dev" : "easy-order",
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-10-27",
      compatibilityFlags: ["nodejs_compat"],
      assets: {
        htmlHandling: "none",
        notFoundHandling: "none",
        runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
      },
      env: {
        ASSETS: bindings.assets(),
        // Private object store for slips / shop / menu images.
        // Staging → easy-order-dev; prod → easy-order-prod.
        SLIP_BUCKET: bindings.r2({
          name: isDevMode ? "easy-order-dev" : "easy-order-prod",
        }),
      },
    }),
  };
});
