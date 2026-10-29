import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const staging = parseEnv(readFileSync("/workspace/secrets/easy-order-staging-db.env", "utf8")) as Record<string, string>;
Object.assign(process.env, staging);

class WranglerR2 {
  constructor(private bucket: string) {}
  async save(): Promise<{ url: string }> { throw new Error("n/a"); }
  async saveObject(input: { key: string; contentType: string; bytes: Uint8Array }): Promise<{ url: string }> {
    const dir = mkdtempSync(join(tmpdir(), "nanara-r2-"));
    const file = join(dir, "blob");
    try {
      writeFileSync(file, input.bytes);
      const res = spawnSync("npx", ["wrangler","r2","object","put",`${this.bucket}/${input.key}`,`--file=${file}`,`--content-type=${input.contentType}`,"--remote"], {
        cwd: "/workspace/easy-order-cf", encoding: "utf8", env: { ...process.env, CLOUDFLARE_API_TOKEN: "" },
      });
      if (res.status !== 0) throw new Error(res.stderr || res.stdout);
      return { url: input.key };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  async read(): Promise<null> { return null; }
  async delete(): Promise<void> {}
  async list(): Promise<never[]> { return []; }
}

async function main() {
  const { DrizzleMenuItemRepository } = await import("../src/infrastructure/repositories/drizzle/DrizzleMenuItemRepository");
  const { SetMenuItemImageUseCase } = await import("../src/application/use-cases/menu/SetMenuItemImageUseCase");
  const { db, schema } = await import("../src/infrastructure/db/client");
  const storage = new WranglerR2("easy-order-dev") as any;
  const menuItems = new DrizzleMenuItemRepository();
  const setMenu = new SetMenuItemImageUseCase(menuItems, storage);
  const shop = await db.query.shops.findFirst({ where: eq(schema.shops.slug, "nanara") });
  if (!shop) throw new Error("no shop");
  const retries = [
    { file: "menu-khaopad-kung.jpg", name: "ข้าวผัดกุ้ง" },
    { file: "menu-kaprao-gai.jpg", name: "ข้าวกะเพราไก่ไข่ดาว" },
  ];
  const all = await menuItems.listByShop(shop.id);
  for (const u of retries) {
    const item = all.find((i) => i.name === u.name);
    if (!item) { console.error("missing", u.name); continue; }
    const bytes = new Uint8Array(readFileSync(join("/workspace/easy-order-cf/tmp/nanara-images", u.file)));
    const updated = await setMenu.execute(shop.id, item.id, { filename: u.file, contentType: "image/jpeg", bytes });
    console.log("ok", u.name, updated.imageUrl);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
