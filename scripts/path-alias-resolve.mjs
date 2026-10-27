import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";

let root = process.cwd();
let emptyStub = pathToFileURL(resolvePath(root, "src/test/empty.ts")).href;

export async function initialize(data) {
  if (data?.root) root = data.root;
  if (data?.emptyStub) emptyStub = data.emptyStub;
}

function resolveExisting(absNoExt) {
  const candidates = [
    absNoExt,
    `${absNoExt}.ts`,
    `${absNoExt}.tsx`,
    `${absNoExt}.js`,
    `${absNoExt}.mjs`,
    resolvePath(absNoExt, "index.ts"),
    resolvePath(absNoExt, "index.tsx"),
    resolvePath(absNoExt, "index.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" || specifier === "client-only") {
    return nextResolve(emptyStub, context);
  }
  if (specifier.startsWith("@/")) {
    const found = resolveExisting(resolvePath(root, specifier.slice(2)));
    if (!found) return nextResolve(specifier, context);
    return nextResolve(pathToFileURL(found).href, context);
  }
  return nextResolve(specifier, context);
}
