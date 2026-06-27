import "server-only";

import { GenericContainer } from "@/src/infrastructure/di/container.generic";

import { DrizzleShopRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopRepository";
import { DrizzleBranchRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBranchRepository";

import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";

/**
 * Server-side composition root. The 🟢 generic core (account/auth, billing,
 * notifications, audit, rate-limit, payments, shared services) lives in
 * `GenericContainer` (container.generic.ts) — keep that as-is. This subclass
 * adds the 🔴 **domain** repositories. For Easy Order the tenant is still a
 * `Shop` (+ `Branch`); the ordering domain (menu / orders) is registered here
 * as it's built. See docs/FORKING.md.
 */
class Container extends GenericContainer {
  readonly shopRepository: IShopRepository = new DrizzleShopRepository();
  readonly branchRepository: IBranchRepository = new DrizzleBranchRepository();
}

const globalForContainer = globalThis as unknown as {
  __esContainer?: Container;
};

export const container = globalForContainer.__esContainer ?? new Container();
if (process.env.NODE_ENV !== "production") {
  globalForContainer.__esContainer = container;
}
