/**
 * One-off: upload nanara shop/menu images to STAGING (Turso + R2).
 *
 * Usage:
 *   PATH=/workspace/.tools/node22/bin:$PATH \
 *   TSX_TSCONFIG_PATH=tsconfig.test.json \
 *   npx tsx scripts/upload-nanara-images-staging.ts
 *
 * Turso: /workspace/secrets/easy-order-staging-db.env ONLY (refuses prod).
 * R2: prefers S3 creds from easy-order-r2.env; else wrangler fallback to easy-order-dev.
 */
import { parseEnv } from "node:util";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { eq } from "drizzle-orm";

const STAGING_ENV = "/workspace/secrets/easy-order-staging-db.env";
const R2_ENV = "/workspace/secrets/easy-order-r2.env";
const IMAGES_DIR = "/workspace/easy-order-cf/tmp/nanara-images";
const SHOP_SLUG = "nanara";
const R2_BUCKET_STAGING = "easy-order-dev";
const ACCOUNT_ID = "85712e4ee3d1f8ae7fb2ff3aa5a8a603";

type ShopKind = "cover" | "profile" | "gallery";

interface ShopUpload {
  file: string;
  kind: ShopKind;
}

interface MenuUpload {
  file: string;
  itemName: string;
}

const SHOP_UPLOADS: ShopUpload[] = [
  { file: "cover-wide.jpg", kind: "cover" },
  { file: "profile-avatar.jpg", kind: "profile" },
  { file: "gallery-interior.jpg", kind: "gallery" },
  { file: "gallery-food.jpg", kind: "gallery" },
  { file: "gallery-wok.jpg", kind: "gallery" },
];

const MENU_UPLOADS: MenuUpload[] = [
  { file: "menu-gailantua.jpg", itemName: "ไก่ล้านตัว" },
  { file: "menu-khaopad-gai.jpg", itemName: "ข้าวผัดไก่" },
  { file: "menu-tomyum.jpg", itemName: "ต้มยำกุ้ง" },
  { file: "menu-khaopad-kung.jpg", itemName: "ข้าวผัดกุ้ง" },
  { file: "menu-kaprao-gai.jpg", itemName: "ข้าวกะเพราไก่ไข่ดาว" },
  { file: "menu-kaprao-moo.jpg", itemName: "ข้าวกะเพราหมูสับไข่ดาว" },
  { file: "menu-padkaprao.jpg", itemName: "ผัดกะเพราไก่" },
  { file: "menu-cha-yen.jpg", itemName: "ชาเย็น" },
  { file: "menu-khaopad-moo.jpg", itemName: "ข้าวผัดหมู" },
];

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) throw new Error(`Missing env file: ${path}`);
  return parseEnv(readFileSync(path, "utf8")) as Record<string, string>;
}

function isPlaceholder(v: string | undefined): boolean {
  if (!v) return true;
  const s = v.trim().replace(/^["']|["']$/g, "");
  return s.length < 16 || (s.startsWith("[") && s.endsWith("]"));
}

function safeHost(url: string): string {
  try {
    return new URL(url.replace(/^libsql:/, "https:")).hostname;
  } catch {
    return "(unparseable)";
  }
}

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/** ISlipStorage that shells out to `wrangler r2 object` --remote. */
class WranglerR2SlipStorage {
  constructor(private readonly bucket: string) {}

  async save(): Promise<{ url: string }> {
    throw new Error("save(slip) not used by this script");
  }

  async saveObject(input: {
    key: string;
    contentType: string;
    bytes: Uint8Array;
  }): Promise<{ url: string }> {
    const dir = mkdtempSync(join(tmpdir(), "nanara-r2-"));
    const file = join(dir, "blob");
    try {
      writeFileSync(file, input.bytes);
      const res = spawnSync(
        "npx",
        [
          "wrangler",
          "r2",
          "object",
          "put",
          `${this.bucket}/${input.key}`,
          `--file=${file}`,
          `--content-type=${input.contentType}`,
          "--remote",
        ],
        {
          cwd: "/workspace/easy-order-cf",
          encoding: "utf8",
          env: { ...process.env, CLOUDFLARE_API_TOKEN: "" },
        },
      );
      if (res.status !== 0) {
        throw new Error(
          `wrangler put failed for ${input.key}: ${res.stderr || res.stdout}`,
        );
      }
      return { url: input.key };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  async read(
    key: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const dir = mkdtempSync(join(tmpdir(), "nanara-r2-get-"));
    const file = join(dir, "blob");
    try {
      const res = spawnSync(
        "npx",
        [
          "wrangler",
          "r2",
          "object",
          "get",
          `${this.bucket}/${key}`,
          `--file=${file}`,
          "--remote",
        ],
        {
          cwd: "/workspace/easy-order-cf",
          encoding: "utf8",
          env: { ...process.env, CLOUDFLARE_API_TOKEN: "" },
        },
      );
      if (res.status !== 0) return null;
      return { bytes: new Uint8Array(readFileSync(file)), contentType: "application/octet-stream" };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  async delete(key: string): Promise<void> {
    spawnSync(
      "npx",
      ["wrangler", "r2", "object", "delete", `${this.bucket}/${key}`, "--remote"],
      {
        cwd: "/workspace/easy-order-cf",
        encoding: "utf8",
        env: { ...process.env, CLOUDFLARE_API_TOKEN: "" },
      },
    );
  }

  async list(): Promise<never[]> {
    return [];
  }
}

async function main() {
  // 1) Staging Turso only
  const staging = loadEnvFile(STAGING_ENV);
  if (!staging.TURSO_DATABASE_URL || /prod/i.test(staging.TURSO_DATABASE_URL) && !/staging/i.test(staging.TURSO_DATABASE_URL)) {
    throw new Error("Refusing non-staging Turso URL in staging env file");
  }
  Object.assign(process.env, staging);
  const host = safeHost(process.env.TURSO_DATABASE_URL ?? "");
  if (!/staging/i.test(host)) {
    throw new Error(`Refusing Turso host without 'staging': ${host}`);
  }
  console.log(`turso_host=${host}`);

  // 2) R2: real S3 creds or wrangler fallback
  const r2env = loadEnvFile(R2_ENV);
  const s3Ok =
    !isPlaceholder(r2env.R2_ACCOUNT_ID) &&
    !isPlaceholder(r2env.R2_ACCESS_KEY_ID) &&
    !isPlaceholder(r2env.R2_SECRET_ACCESS_KEY) &&
    !isPlaceholder(r2env.R2_BUCKET);

  let storage: import("../src/application/services/ISlipStorage").ISlipStorage;
  if (s3Ok) {
    process.env.R2_ACCOUNT_ID = r2env.R2_ACCOUNT_ID;
    process.env.R2_ACCESS_KEY_ID = r2env.R2_ACCESS_KEY_ID;
    process.env.R2_SECRET_ACCESS_KEY = r2env.R2_SECRET_ACCESS_KEY;
    process.env.R2_BUCKET = r2env.R2_BUCKET;
    if (r2env.R2_ENDPOINT && !isPlaceholder(r2env.R2_ENDPOINT)) {
      process.env.R2_ENDPOINT = r2env.R2_ENDPOINT;
    }
    const { R2SlipStorage, r2ConfigFromEnv } = await import(
      "../src/infrastructure/services/R2SlipStorage"
    );
    const cfg = r2ConfigFromEnv();
    if (!cfg) throw new Error("R2 config incomplete after load");
    storage = new R2SlipStorage(cfg);
    console.log(`r2_mode=s3 bucket_set=yes account=${ACCOUNT_ID}`);
  } else {
    storage = new WranglerR2SlipStorage(R2_BUCKET_STAGING) as unknown as import("../src/application/services/ISlipStorage").ISlipStorage;
    console.log(
      `r2_mode=wrangler_cli bucket=${R2_BUCKET_STAGING} (vercel-prod.env R2 values are placeholders)`,
    );
  }

  // 3) Wire use-cases (after env is set so db client picks staging)
  const { DrizzleShopImageRepository } = await import(
    "../src/infrastructure/repositories/drizzle/DrizzleShopImageRepository"
  );
  const { DrizzleMenuItemRepository } = await import(
    "../src/infrastructure/repositories/drizzle/DrizzleMenuItemRepository"
  );
  const { SaveShopImageUseCase } = await import(
    "../src/application/use-cases/shop/SaveShopImageUseCase"
  );
  const { SetMenuItemImageUseCase } = await import(
    "../src/application/use-cases/menu/SetMenuItemImageUseCase"
  );
  const { db, schema } = await import("../src/infrastructure/db/client");

  const shopImages = new DrizzleShopImageRepository();
  const menuItems = new DrizzleMenuItemRepository();
  const saveShop = new SaveShopImageUseCase(shopImages, storage);
  const setMenu = new SetMenuItemImageUseCase(menuItems, storage);

  const shop = await db.query.shops.findFirst({
    where: eq(schema.shops.slug, SHOP_SLUG),
  });
  if (!shop) throw new Error(`Shop slug '${SHOP_SLUG}' not found on staging`);
  console.log(`shop_id=${shop.id} name=${shop.name}`);

  const counts = { cover: 0, profile: 0, gallery: 0, menu: 0 };
  const failed: string[] = [];

  for (const u of SHOP_UPLOADS) {
    const path = join(IMAGES_DIR, u.file);
    if (!existsSync(path)) {
      failed.push(`missing_file:${u.file}`);
      continue;
    }
    const bytes = new Uint8Array(readFileSync(path));
    try {
      const img = await saveShop.execute({
        shopId: shop.id,
        kind: u.kind,
        filename: u.file,
        contentType: contentTypeFor(u.file),
        bytes,
      });
      counts[u.kind] += 1;
      console.log(`shop_ok kind=${u.kind} file=${u.file} id=${img.id} key=${img.storageKey}`);
    } catch (e) {
      failed.push(`shop:${u.file}:${(e as Error).message}`);
      console.error(`shop_fail file=${u.file}`, (e as Error).message);
    }
  }

  const allItems = await menuItems.listByShop(shop.id);
  const byName = new Map(allItems.map((i) => [i.name, i]));

  for (const u of MENU_UPLOADS) {
    const path = join(IMAGES_DIR, u.file);
    if (!existsSync(path)) {
      failed.push(`missing_file:${u.file}`);
      continue;
    }
    const item = byName.get(u.itemName);
    if (!item) {
      failed.push(`no_menu_match:${u.itemName}`);
      console.error(`menu_fail no match for name=${u.itemName}`);
      continue;
    }
    const bytes = new Uint8Array(readFileSync(path));
    try {
      const updated = await setMenu.execute(shop.id, item.id, {
        filename: u.file,
        contentType: contentTypeFor(u.file),
        bytes,
      });
      counts.menu += 1;
      console.log(
        `menu_ok name=${u.itemName} file=${u.file} key=${updated.imageUrl}`,
      );
    } catch (e) {
      failed.push(`menu:${u.file}:${(e as Error).message}`);
      console.error(`menu_fail file=${u.file}`, (e as Error).message);
    }
  }

  const withImg = (await menuItems.listByShop(shop.id)).filter((i) => i.imageUrl);
  console.log(
    JSON.stringify({
      counts,
      failed,
      menu_with_image: withImg.length,
      menu_total: allItems.length,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
