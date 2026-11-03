import { test } from "node:test";
import assert from "node:assert/strict";

import type { ICreditRepository } from "@/src/application/repositories/ICreditRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import { CreditService, type CreditMemo } from "./CreditService";

/** Fake repo that records every call; only getConfigRaw/getBalance answer. */
function fakeRepo(platform: unknown) {
  const calls: string[] = [];
  const repo = new Proxy({} as ICreditRepository, {
    get: (_t, prop: string) => async (id?: string) => {
      calls.push(prop);
      if (prop === "getConfigRaw") return id === "platform" ? platform : null;
      if (prop === "getBalance") return 1234;
      if (prop === "findEntryByKey") return null;
      return null;
    },
  });
  return { repo, calls };
}

const memoMap = (): CreditMemo => {
  const m = new Map<string, Promise<unknown>>();
  return (k, fn) => {
    if (!m.has(k)) m.set(k, fn());
    return m.get(k) as never;
  };
};

test("master switch off: gate/status/today cost one memoised config read, no wallet queries", async () => {
  const { repo, calls } = fakeRepo({ enabled: false });
  const svc = new CreditService(repo, {} as ISlipStorage, undefined, memoMap());
  await svc.assertCanTakeOrder("s1");
  assert.equal(await svc.getTodayProgress("s1"), null);
  const st = await svc.getStatus("s1");
  assert.equal(st.enabled, false);
  assert.equal(st.gate.allowed, true);
  assert.deepEqual(calls, ["getConfigRaw"]);
  // Admin views can still ask for the balance.
  assert.equal((await svc.getStatus("s1", { withBalance: true })).balanceSatang, 1234);
});

test("saving the platform config invalidates the per-request memo", async () => {
  const { repo } = fakeRepo({ enabled: false });
  const svc = new CreditService(repo, {} as ISlipStorage, undefined, memoMap());
  assert.equal(await svc.isMasterEnabled(), false);
  const saved = await svc.savePlatformConfig({ enabled: true }, null);
  assert.equal(saved.enabled, true);
  // The fake repo still answers the old row, but the memo key moved on → re-read happens.
  const { repo: r2, calls } = fakeRepo({ enabled: true });
  const svc2 = new CreditService(r2, {} as ISlipStorage, undefined, memoMap());
  await svc2.isMasterEnabled();
  await svc2.isMasterEnabled();
  assert.deepEqual(calls, ["getConfigRaw"]);
});
