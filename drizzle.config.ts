import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the Next.js runtime, so load .env* files the same way
// Next does (e.g. .env.local for dev). Vars already in process.env — like the prod
// Turso creds injected by CI/shell — take priority and are not overridden.
loadEnvConfig(process.cwd());

// Local dev defaults to a file DB; production reads Turso creds from env.
const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  dialect: "turso",
  schema: "./src/infrastructure/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    ...(authToken ? { authToken } : {}),
  },
  casing: "snake_case",
});
