import "server-only";

import { headers } from "next/headers";

/**
 * Request-scoped memo for data that layouts (and the pages below them) need.
 *
 * Why: vinext 1.x probes every layout BEFORE rendering (to catch notFound /
 * redirect so the HTTP status is right), then renders it again for real. React
 * `cache()` is NOT shared between the probe and the render, so every awaited
 * DB call in a layout ran twice, serially, before the first byte — doubling
 * time-to-skeleton and DB/CPU. The per-request `headers()` object IS the same
 * instance in both passes (and distinct per request — verified with concurrent
 * requests), so it is the WeakMap key. Entries die with the request.
 *
 * Outside a request scope (scripts/tests) it just calls `fn`.
 */
const store = new WeakMap<object, Map<string, Promise<unknown>>>();

export async function requestMemo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let scope: object;
  try {
    scope = await headers();
  } catch {
    return fn();
  }
  let m = store.get(scope);
  if (!m) {
    m = new Map();
    store.set(scope, m);
  }
  let p = m.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn();
    m.set(key, p);
  }
  return p;
}
