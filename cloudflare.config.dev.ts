import { bindings, defineConfig, defineWorker } from "cf/config";

// Static staging-only variant of cloudflare.config.ts.
// Keep in sync with the context factory version; swap in manually if a static
// config is preferred (e.g. `cp cloudflare.config.dev.ts cloudflare.config.ts`).
export default defineConfig({
  worker: defineWorker({
    name: "easy-order-dev",
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
    },
  }),
});
