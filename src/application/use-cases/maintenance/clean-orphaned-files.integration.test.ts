import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import type {
  ISlipStorage,
  StoredObject,
} from "@/src/application/services/ISlipStorage";
import { CleanOrphanedFilesUseCase } from "./CleanOrphanedFilesUseCase";

before(migrateTestDb);

/** In-memory storage exposing only the list/delete surface cleanup needs. */
class FakeStorage implements ISlipStorage {
  readonly objects = new Map<string, Date>();
  add(key: string, lastModified: Date) {
    this.objects.set(key, lastModified);
  }
  async list(prefix: string): Promise<StoredObject[]> {
    return [...this.objects]
      .filter(([k]) => k.startsWith(prefix))
      .map(([key, lastModified]) => ({ key, lastModified }));
  }
  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
  async save(): Promise<{ url: string }> {
    throw new Error("unused");
  }
  async saveObject(): Promise<{ url: string }> {
    throw new Error("unused");
  }
  async read() {
    return null;
  }
}

function cleanup(storage: ISlipStorage) {
  return new CleanOrphanedFilesUseCase(container.paymentRepository, storage);
}

test("deletes only unreferenced blobs older than the grace window", async () => {
  const refKey = "slips/referenced.png";
  const now = new Date();
  const aged = new Date(now.getTime() - 2 * 86400_000);
  const storage = new FakeStorage();
  storage.add(refKey, aged); // referenced → spared
  storage.add("slips/orphan-old.png", aged); // unreferenced + aged → deleted
  storage.add("slips/orphan-new.png", now); // unreferenced but too new → spared

  const res = await cleanup(storage).execute({
    now,
    extraReferencedKeys: [refKey],
  });

  assert.equal(res.deleted, 1);
  assert.ok(storage.objects.has(refKey), "referenced blob kept");
  assert.ok(storage.objects.has("slips/orphan-new.png"), "fresh blob kept");
  assert.ok(!storage.objects.has("slips/orphan-old.png"), "stale orphan removed");
});

test("fails closed: a reference lookup error deletes nothing", async () => {
  const storage = new FakeStorage();
  storage.add("slips/whatever.png", new Date(0)); // ancient orphan
  // A payments repo whose key lookup throws → reference set can't be built.
  const brokenPayments = {
    ...container.paymentRepository,
    allSlipKeys: async () => {
      throw new Error("db down");
    },
  };
  const boom = new CleanOrphanedFilesUseCase(brokenPayments, storage);

  await assert.rejects(boom.execute({ now: new Date() }), /db down/);
  assert.ok(storage.objects.has("slips/whatever.png"), "nothing deleted on error");
});
