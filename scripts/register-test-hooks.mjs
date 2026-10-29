import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const root = process.cwd();
register(
  pathToFileURL(resolvePath(root, "scripts/path-alias-resolve.mjs")).href,
  pathToFileURL(resolvePath(root, "package.json")).href,
  {
    data: {
      root,
      emptyStub: pathToFileURL(resolvePath(root, "src/test/empty.ts")).href,
    },
  },
);
