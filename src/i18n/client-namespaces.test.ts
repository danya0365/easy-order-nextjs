import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

import { BASE_NAMESPACES, GROUP_DIRS, GROUP_NAMESPACES } from "./client-namespaces";

const ROOT = process.cwd();

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const c of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Namespaces used by `"use client"` files reachable from a route group. */
function traceGroup(dir: string): Set<string> {
  const seen = new Set<string>();
  const ns = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    if (src.slice(0, 300).includes("use client")) {
      for (const m of src.matchAll(/useTranslations\(\s*"(\w+)"/g)) ns.add(m[1]);
    }
    for (const m of src.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
      const r = resolve(file, m[1]);
      if (r) walk(r);
    }
  };
  const walkDir = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walkDir(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) walk(p);
    }
  };
  walkDir(join(ROOT, "app", dir));
  return ns;
}

test("every route group ships the client namespaces its components use", () => {
  for (const [group, dir] of Object.entries(GROUP_DIRS) as [keyof typeof GROUP_NAMESPACES, string][]) {
    const have = new Set<string>([...BASE_NAMESPACES, ...GROUP_NAMESPACES[group]]);
    const missing = [...traceGroup(dir)].filter((n) => !have.has(n));
    assert.deepEqual(missing, [], `${dir} missing client namespaces: ${missing.join(", ")}`);
  }
});

test("all route groups are mapped", () => {
  const groups = readdirSync(join(ROOT, "app")).filter((d) => /^\(.+\)$/.test(d));
  assert.deepEqual(groups.sort(), Object.values(GROUP_DIRS).sort());
});

test("root-level client files only use base namespaces", () => {
  const base = new Set<string>(BASE_NAMESPACES);
  for (const f of ["error.tsx", "global-error.tsx", "not-found.tsx"]) {
    const p = join(ROOT, "app", f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/useTranslations\(\s*"(\w+)"/g)) assert.ok(base.has(m[1]), `${f}: ${m[1]}`);
  }
});
