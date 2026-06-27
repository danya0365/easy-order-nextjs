import "server-only";

import { GenericContainer } from "@/src/infrastructure/di/container.generic";

import { DrizzleShopRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopRepository";
import { DrizzleBranchRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBranchRepository";
import { DrizzleMenuCategoryRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuCategoryRepository";
import { DrizzleMenuItemRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuItemRepository";
import { DrizzleOrderRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleOrderRepository";
import { DrizzleCustomerRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerRepository";
import { DrizzleKioskSessionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleKioskSessionRepository";

import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { IKioskSessionRepository } from "@/src/application/repositories/IKioskSessionRepository";

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
  readonly menuCategoryRepository: IMenuCategoryRepository =
    new DrizzleMenuCategoryRepository();
  readonly menuItemRepository: IMenuItemRepository =
    new DrizzleMenuItemRepository();
  readonly orderRepository: IOrderRepository = new DrizzleOrderRepository();
  readonly customerRepository: ICustomerRepository =
    new DrizzleCustomerRepository();
  readonly kioskSessionRepository: IKioskSessionRepository =
    new DrizzleKioskSessionRepository();
}

const globalForContainer = globalThis as unknown as {
  __esContainer?: Container;
};

export const container = globalForContainer.__esContainer ?? new Container();
if (process.env.NODE_ENV !== "production") {
  globalForContainer.__esContainer = container;
}
