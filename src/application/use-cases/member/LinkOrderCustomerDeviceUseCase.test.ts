import { test } from "node:test";
import assert from "node:assert/strict";

import type { Customer } from "@/src/domain/entities";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import { LinkOrderCustomerDeviceUseCase } from "./LinkOrderCustomerDeviceUseCase";

function fakeDevices(bound: Record<string, { id: string; shopId: string }> = {}) {
  const created: string[] = [];
  const repo = {
    async create(customerId: string) {
      created.push(customerId);
      return { token: `tok-${customerId}` };
    },
    async findByToken(token: string) {
      const c = bound[token];
      return c ? { customer: c as unknown as Customer } : null;
    },
  } as unknown as ICustomerDeviceRepository;
  return { repo, created };
}

const base = { shopId: "s1", customerId: "c1", consent: false, currentToken: null };

test("auto links; off never; confirm only with consent", async () => {
  for (const [mode, consent, expect] of [
    ["auto", false, true],
    ["off", true, false],
    ["confirm", false, false],
    ["confirm", true, true],
  ] as const) {
    const { repo, created } = fakeDevices();
    const r = await new LinkOrderCustomerDeviceUseCase(repo).execute({ ...base, mode, consent });
    assert.equal(!!r, expect, `${mode}/${consent}`);
    assert.equal(created.length, expect ? 1 : 0);
  }
});

test("no customer → nothing; already bound to same customer → no new token", async () => {
  const { repo, created } = fakeDevices({ t: { id: "c1", shopId: "s1" } });
  const uc = new LinkOrderCustomerDeviceUseCase(repo);
  assert.equal(await uc.execute({ ...base, mode: "auto", customerId: null }), null);
  assert.equal(await uc.execute({ ...base, mode: "auto", currentToken: "t" }), null);
  // bound to a different customer → re-link to the order's customer
  const { repo: r2, created: c2 } = fakeDevices({ t: { id: "c9", shopId: "s1" } });
  assert.deepEqual(await new LinkOrderCustomerDeviceUseCase(r2).execute({ ...base, mode: "auto", currentToken: "t" }), { token: "tok-c1" });
  assert.equal(created.length, 0);
  assert.equal(c2.length, 1);
});
