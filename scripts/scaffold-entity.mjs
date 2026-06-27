#!/usr/bin/env node
/**
 * Scaffold the repetitive Clean-Arch boilerplate for a new entity.
 *
 *   node scripts/scaffold-entity.mjs <PascalName> [tableName]
 *   e.g.  node scripts/scaffold-entity.mjs QueueTicket queue_tickets
 *
 * Generates the three files that are near-identical every time — a repo
 * interface, its Drizzle implementation, and a "create" use-case — as COMPILING
 * stubs with TODO markers, then prints the remaining manual wiring (schema,
 * entity type, container, action, UI) with exact paths. It deliberately does NOT
 * touch shared files (entities/index.ts, the DI container, db/schema/index.ts) —
 * those edits are printed so you stay in control. See docs/EXTENDING.md.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const name = process.argv[2];
if (!name || !/^[A-Z][A-Za-z0-9]+$/.test(name)) {
  console.error(
    "Usage: node scripts/scaffold-entity.mjs <PascalName> [table_name]\n" +
      "  <PascalName> must be PascalCase, e.g. QueueTicket",
  );
  process.exit(1);
}
const camel = name[0].toLowerCase() + name.slice(1);
const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const table = process.argv[3] ?? `${kebab.replace(/-/g, "_")}s`;
const root = join(import.meta.dirname, "..");

function write(rel, contents) {
  // Containment guard: the resolved path must stay inside the repo root, so a
  // crafted name can never escape via traversal (defence-in-depth on top of the
  // strict name validation above).
  const abs = resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + sep)) {
    console.error(`! refusing to write outside the repo: ${rel}`);
    process.exit(1);
  }
  if (existsSync(abs)) {
    console.error(`! skip (exists): ${rel}`);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  console.log(`+ ${rel}`);
}

const iface = `import type { ${name} } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface Create${name}Input {
  shopId: string;
  // TODO: add the fields needed to create a ${name}.
}

export interface I${name}Repository {
  create(input: Create${name}Input): Promise<${name}>;
  findById(id: string): Promise<${name} | null>;
  /** Cursor-paginated list for a shop, newest first. */
  pageByShop(shopId: string, opts?: PageOpts): Promise<Page<${name}>>;
}
`;

const drizzle = `import "server-only";

import { db } from "@/src/infrastructure/db/client";
import { ${camel}s } from "@/src/infrastructure/db/schema";
import type {
  I${name}Repository,
  Create${name}Input,
} from "@/src/application/repositories/I${name}Repository";
import type { ${name} } from "@/src/domain/entities";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";

export class Drizzle${name}Repository implements I${name}Repository {
  async create(input: Create${name}Input): Promise<${name}> {
    // TODO: insert into ${camel}s and return the row mapped to ${name}.
    throw new Error("Drizzle${name}Repository.create not implemented");
  }

  async findById(id: string): Promise<${name} | null> {
    // TODO: select one by id (scope by shopId at the call site / use-case).
    throw new Error("Drizzle${name}Repository.findById not implemented");
  }

  async pageByShop(shopId: string, opts?: PageOpts): Promise<Page<${name}>> {
    // TODO: keyset pagination by (createdAt, id) — see an existing Drizzle repo.
    throw new Error("Drizzle${name}Repository.pageByShop not implemented");
  }
}
`;

const useCase = `import type {
  I${name}Repository,
  Create${name}Input,
} from "@/src/application/repositories/I${name}Repository";
import type { ${name} } from "@/src/domain/entities";

/** Creates a ${name}. Keep business rules here, not in the action/repo. */
export class Create${name}UseCase {
  constructor(private readonly ${camel}s: I${name}Repository) {}

  async execute(input: Create${name}Input): Promise<${name}> {
    // TODO: validate + enforce invariants, then persist.
    return this.${camel}s.create(input);
  }
}
`;

write(`src/application/repositories/I${name}Repository.ts`, iface);
write(
  `src/infrastructure/repositories/drizzle/Drizzle${name}Repository.ts`,
  drizzle,
);
write(`src/application/use-cases/${kebab}/Create${name}UseCase.ts`, useCase);

console.log(`
Next — manual wiring (these touch shared files, so do them by hand):

1. Schema: create src/infrastructure/db/schema/${kebab}.ts (a sqliteTable named
   "${table}") and re-export it from src/infrastructure/db/schema/index.ts.
   Then: npm run db:generate  (+ db:push against a LOCAL db — see DEPLOYMENT.md).

2. Entity type: add \`export interface ${name} { id: string; shopId: string; createdAt: string; /* ... */ }\`
   to src/domain/entities/index.ts (or infer from the schema row).

3. Container: register in src/infrastructure/di/container.ts (domain subclass):
     readonly ${camel}Repository: I${name}Repository = new Drizzle${name}Repository();

4. Action: add a server action in src/presentation/actions/ that calls
   new Create${name}UseCase(container.${camel}Repository).execute(...), guarded by
   requireShopWrite() + audited.

5. UI + tests, then run the gate: tsc · lint:all · test · next build.
   Full guide: docs/EXTENDING.md
`);
