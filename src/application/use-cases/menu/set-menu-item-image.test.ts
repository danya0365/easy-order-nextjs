import { test } from "node:test";
import assert from "node:assert/strict";

import type { MenuItem } from "@/src/domain/entities";
import type {
  IMenuItemRepository,
  UpdateMenuItemInput,
} from "@/src/application/repositories/IMenuItemRepository";
import type {
  ISlipStorage,
  SaveObjectInput,
} from "@/src/application/services/ISlipStorage";
import { SetMenuItemImageUseCase } from "./SetMenuItemImageUseCase";

/** Valid 16-byte PNG (magic header + padding) — passes isSupportedImage. */
function pngBytes(): Uint8Array {
  const buf = new Uint8Array(16);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return buf;
}

function makeItem(over: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item-1",
    shopId: "shop-1",
    categoryId: "cat-1",
    name: "ชาเย็น",
    description: null,
    priceSatang: 5000,
    imageUrl: null,
    isAvailable: true,
    sortOrder: 0,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...over,
  };
}

/** In-memory item repo exposing just what the use-case touches. */
class FakeItems implements IMenuItemRepository {
  constructor(private item: MenuItem | null) {}
  async findById(id: string): Promise<MenuItem | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    if (!this.item || this.item.id !== id) throw new Error("not found");
    if (input.imageUrl !== undefined) this.item.imageUrl = input.imageUrl;
    return this.item;
  }
  async create(): Promise<MenuItem> {
    throw new Error("unused");
  }
  async listByShop(): Promise<MenuItem[]> {
    throw new Error("unused");
  }
  async listAvailableByShop(): Promise<MenuItem[]> {
    throw new Error("unused");
  }
  async delete(): Promise<void> {
    throw new Error("unused");
  }
  async allImageKeys(): Promise<string[]> {
    throw new Error("unused");
  }
}

class FakeStorage implements ISlipStorage {
  saved: SaveObjectInput | null = null;
  deleted: string[] = [];
  async saveObject(input: SaveObjectInput): Promise<{ url: string }> {
    this.saved = input;
    return { url: input.key };
  }
  async delete(key: string): Promise<void> {
    this.deleted.push(key);
  }
  async save(): Promise<{ url: string }> {
    throw new Error("unused");
  }
  async read() {
    return null;
  }
  async list() {
    return [];
  }
}

const validInput = () => ({
  filename: "photo.png",
  contentType: "image/png",
  bytes: pngBytes(),
});

test("stores the image under menu/{itemId} and persists the key", async () => {
  const items = new FakeItems(makeItem());
  const storage = new FakeStorage();
  const result = await new SetMenuItemImageUseCase(items, storage).execute(
    "shop-1",
    "item-1",
    validInput(),
  );
  assert.equal(storage.saved?.key, "menu/item-1.png");
  assert.equal(result.imageUrl, "menu/item-1.png");
});

test("rejects an item belonging to another shop", async () => {
  const items = new FakeItems(makeItem({ shopId: "shop-1" }));
  const storage = new FakeStorage();
  await assert.rejects(
    new SetMenuItemImageUseCase(items, storage).execute(
      "other-shop",
      "item-1",
      validInput(),
    ),
    /ไม่พบเมนู/,
  );
  assert.equal(storage.saved, null, "nothing stored for a foreign item");
});

test("rejects non-image bytes even when the MIME claims an image", async () => {
  const items = new FakeItems(makeItem());
  const storage = new FakeStorage();
  await assert.rejects(
    new SetMenuItemImageUseCase(items, storage).execute("shop-1", "item-1", {
      filename: "evil.png",
      contentType: "image/png",
      bytes: new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]), // "<html"
    }),
    /รองรับ|รูปภาพ/,
  );
});

test("rejects a disallowed content type", async () => {
  const items = new FakeItems(makeItem());
  const storage = new FakeStorage();
  await assert.rejects(
    new SetMenuItemImageUseCase(items, storage).execute("shop-1", "item-1", {
      ...validInput(),
      contentType: "image/gif",
    }),
    /รองรับ/,
  );
});

test("replacing a differently-keyed image deletes the old blob", async () => {
  const items = new FakeItems(makeItem({ imageUrl: "menu/item-1.webp" }));
  const storage = new FakeStorage();
  await new SetMenuItemImageUseCase(items, storage).execute(
    "shop-1",
    "item-1",
    validInput(), // → menu/item-1.png
  );
  assert.deepEqual(storage.deleted, ["menu/item-1.webp"]);
});

test("remove clears the key and deletes the blob", async () => {
  const items = new FakeItems(makeItem({ imageUrl: "menu/item-1.png" }));
  const storage = new FakeStorage();
  const result = await new SetMenuItemImageUseCase(items, storage).remove(
    "shop-1",
    "item-1",
  );
  assert.equal(result.imageUrl, null);
  assert.deepEqual(storage.deleted, ["menu/item-1.png"]);
});
