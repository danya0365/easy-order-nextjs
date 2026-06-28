import "server-only";

import { GenericContainer } from "@/src/infrastructure/di/container.generic";

import { DrizzleShopRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopRepository";
import { DrizzleShopCategoryRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopCategoryRepository";
import { DrizzleShopImageRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopImageRepository";
import { DrizzleShopReviewRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopReviewRepository";
import { DrizzleAnalyticsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleAnalyticsRepository";
import { DrizzlePlatformAnalyticsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzlePlatformAnalyticsRepository";
import { DrizzleBranchRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBranchRepository";
import { DrizzleMenuCategoryRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuCategoryRepository";
import { DrizzleMenuItemRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuItemRepository";
import { DrizzleOrderRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleOrderRepository";
import { DrizzleCustomerRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerRepository";
import { DrizzleCustomerDeviceRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerDeviceRepository";
import { DrizzleBindCodeRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBindCodeRepository";
import { DrizzleKioskSessionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleKioskSessionRepository";

import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IShopCategoryRepository } from "@/src/application/repositories/IShopCategoryRepository";
import type { IShopImageRepository } from "@/src/application/repositories/IShopImageRepository";
import type { IShopReviewRepository } from "@/src/application/repositories/IShopReviewRepository";
import type { IAnalyticsRepository } from "@/src/application/repositories/IAnalyticsRepository";
import type { IPlatformAnalyticsRepository } from "@/src/application/repositories/IPlatformAnalyticsRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { IBindCodeRepository } from "@/src/application/repositories/IBindCodeRepository";
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
  readonly shopCategoryRepository: IShopCategoryRepository =
    new DrizzleShopCategoryRepository();
  readonly shopImageRepository: IShopImageRepository =
    new DrizzleShopImageRepository();
  readonly shopReviewRepository: IShopReviewRepository =
    new DrizzleShopReviewRepository();
  readonly analyticsRepository: IAnalyticsRepository =
    new DrizzleAnalyticsRepository();
  readonly platformAnalyticsRepository: IPlatformAnalyticsRepository =
    new DrizzlePlatformAnalyticsRepository();
  readonly branchRepository: IBranchRepository = new DrizzleBranchRepository();
  readonly menuCategoryRepository: IMenuCategoryRepository =
    new DrizzleMenuCategoryRepository();
  readonly menuItemRepository: IMenuItemRepository =
    new DrizzleMenuItemRepository();
  readonly orderRepository: IOrderRepository = new DrizzleOrderRepository();
  readonly customerRepository: ICustomerRepository =
    new DrizzleCustomerRepository();
  readonly customerDeviceRepository: ICustomerDeviceRepository =
    new DrizzleCustomerDeviceRepository();
  readonly bindCodeRepository: IBindCodeRepository =
    new DrizzleBindCodeRepository();
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
