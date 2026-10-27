/**
 * Re-register the `@/` resolve hook AFTER `mock.module()` so it sits first in
 * Node's LIFO hook chain again. Required for action-layer integration tests:
 * mock.module breaks tsx tsconfig path mapping for later dynamic imports.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const parentURL = pathToFileURL(resolvePath(process.cwd(), "package.json")).href;
const resolveHookUrl = pathToFileURL(
  resolvePath(process.cwd(), "scripts/path-alias-resolve.mjs"),
).href;

const data = {
  root: process.cwd(),
  emptyStub: pathToFileURL(resolvePath(process.cwd(), "src/test/empty.ts")).href,
};

export function ensurePathAliases(): void {
  register(resolveHookUrl, parentURL, { data });
}
