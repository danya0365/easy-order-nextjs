import "server-only";

import { GenericContainer } from "@/src/infrastructure/di/container.generic";

import { DrizzleShopRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopRepository";
import { DrizzleShopCategoryRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopCategoryRepository";
import { DrizzleShopProfileRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopProfileRepository";
import { DrizzleShopImageRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopImageRepository";
import { DrizzleShopReviewRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopReviewRepository";
import { DrizzleAnalyticsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleAnalyticsRepository";
import { DrizzlePlatformAnalyticsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzlePlatformAnalyticsRepository";
import { DrizzleLeadRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLeadRepository";
import { DrizzleLeadVisitLogRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLeadVisitLogRepository";
import { DrizzleBranchRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBranchRepository";
import { DrizzleMenuCategoryRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuCategoryRepository";
import { DrizzleMenuItemRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMenuItemRepository";
import { DrizzleOrderRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleOrderRepository";
import { DrizzleCustomerRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerRepository";
import { DrizzleCustomerCrmRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerCrmRepository";
import type { ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import { DrizzleCustomerDeviceRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleCustomerDeviceRepository";
import { DrizzleBindCodeRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleBindCodeRepository";
import { DrizzleKioskSessionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleKioskSessionRepository";
import { DrizzlePlatformSettingsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzlePlatformSettingsRepository";
import { DrizzleLoyaltyStampTypeRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyStampTypeRepository";
import { DrizzleLoyaltyStampCardRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyStampCardRepository";
import { DrizzleLoyaltyStampBalanceRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyStampBalanceRepository";
import { DrizzleLoyaltyStampTransactionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyStampTransactionRepository";
import { DrizzleLoyaltyStampRedemptionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyStampRedemptionRepository";
import { DrizzleLoyaltyPointsSettingsRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyPointsSettingsRepository";
import { DrizzleLoyaltyPointsBalanceRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyPointsBalanceRepository";
import { DrizzleLoyaltyPointsTransactionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyPointsTransactionRepository";
import { DrizzleLoyaltyPointsRewardRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleLoyaltyPointsRewardRepository";
import { DrizzleShopPromotionRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleShopPromotionRepository";

import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IShopCategoryRepository } from "@/src/application/repositories/IShopCategoryRepository";
import type { IShopProfileRepository } from "@/src/application/repositories/IShopProfileRepository";
import type { IShopImageRepository } from "@/src/application/repositories/IShopImageRepository";
import type { IShopReviewRepository } from "@/src/application/repositories/IShopReviewRepository";
import type { IAnalyticsRepository } from "@/src/application/repositories/IAnalyticsRepository";
import type { IPlatformAnalyticsRepository } from "@/src/application/repositories/IPlatformAnalyticsRepository";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { ILeadVisitLogRepository } from "@/src/application/repositories/ILeadVisitLogRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { IBindCodeRepository } from "@/src/application/repositories/IBindCodeRepository";
import type { IKioskSessionRepository } from "@/src/application/repositories/IKioskSessionRepository";
import type { IPlatformSettingsRepository } from "@/src/application/repositories/IPlatformSettingsRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";
import type { ILoyaltyStampTransactionRepository } from "@/src/application/repositories/ILoyaltyStampTransactionRepository";
import type { ILoyaltyStampRedemptionRepository } from "@/src/application/repositories/ILoyaltyStampRedemptionRepository";
import type { ILoyaltyPointsSettingsRepository } from "@/src/application/repositories/ILoyaltyPointsSettingsRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import type { ILoyaltyPointsTransactionRepository } from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";
import type { ILoyaltyPointsRewardRepository } from "@/src/application/repositories/ILoyaltyPointsRewardRepository";
import { DrizzleAdminLoginLinkRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleAdminLoginLinkRepository";
import type { IAdminLoginLinkRepository } from "@/src/application/repositories/IAdminLoginLinkRepository";
import { DrizzleMemberSignupGuardRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleMemberSignupGuardRepository";
import type { IMemberSignupGuardRepository } from "@/src/application/repositories/IMemberSignupGuardRepository";
import type { IShopPromotionRepository } from "@/src/application/repositories/IShopPromotionRepository";

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
  readonly shopProfileRepository: IShopProfileRepository =
    new DrizzleShopProfileRepository();
  readonly shopImageRepository: IShopImageRepository =
    new DrizzleShopImageRepository();
  readonly shopReviewRepository: IShopReviewRepository =
    new DrizzleShopReviewRepository();
  readonly analyticsRepository: IAnalyticsRepository =
    new DrizzleAnalyticsRepository();
  readonly platformAnalyticsRepository: IPlatformAnalyticsRepository =
    new DrizzlePlatformAnalyticsRepository();
  readonly leadRepository: ILeadRepository = new DrizzleLeadRepository();
  readonly leadVisitLogRepository: ILeadVisitLogRepository =
    new DrizzleLeadVisitLogRepository();
  readonly branchRepository: IBranchRepository = new DrizzleBranchRepository();
  readonly menuCategoryRepository: IMenuCategoryRepository =
    new DrizzleMenuCategoryRepository();
  readonly menuItemRepository: IMenuItemRepository =
    new DrizzleMenuItemRepository();
  readonly orderRepository: IOrderRepository = new DrizzleOrderRepository();
  readonly customerRepository: ICustomerRepository =
    new DrizzleCustomerRepository();
  readonly customerCrmRepository: ICustomerCrmRepository =
    new DrizzleCustomerCrmRepository();
  readonly customerDeviceRepository: ICustomerDeviceRepository =
    new DrizzleCustomerDeviceRepository();
  readonly bindCodeRepository: IBindCodeRepository =
    new DrizzleBindCodeRepository();
  readonly kioskSessionRepository: IKioskSessionRepository =
    new DrizzleKioskSessionRepository();
  readonly platformSettingsRepository: IPlatformSettingsRepository =
    new DrizzlePlatformSettingsRepository();
  readonly loyaltyStampTypeRepository: ILoyaltyStampTypeRepository =
    new DrizzleLoyaltyStampTypeRepository();
  readonly loyaltyStampCardRepository: ILoyaltyStampCardRepository =
    new DrizzleLoyaltyStampCardRepository();
  readonly loyaltyStampBalanceRepository: ILoyaltyStampBalanceRepository =
    new DrizzleLoyaltyStampBalanceRepository();
  readonly loyaltyStampTransactionRepository: ILoyaltyStampTransactionRepository =
    new DrizzleLoyaltyStampTransactionRepository();
  readonly loyaltyStampRedemptionRepository: ILoyaltyStampRedemptionRepository =
    new DrizzleLoyaltyStampRedemptionRepository();
  readonly loyaltyPointsSettingsRepository: ILoyaltyPointsSettingsRepository =
    new DrizzleLoyaltyPointsSettingsRepository();
  readonly loyaltyPointsBalanceRepository: ILoyaltyPointsBalanceRepository =
    new DrizzleLoyaltyPointsBalanceRepository();
  readonly loyaltyPointsTransactionRepository: ILoyaltyPointsTransactionRepository =
    new DrizzleLoyaltyPointsTransactionRepository();
  readonly loyaltyPointsRewardRepository: ILoyaltyPointsRewardRepository =
    new DrizzleLoyaltyPointsRewardRepository();
  readonly shopPromotionRepository: IShopPromotionRepository =
    new DrizzleShopPromotionRepository();
  readonly memberSignupGuardRepository: IMemberSignupGuardRepository =
    new DrizzleMemberSignupGuardRepository();
  readonly adminLoginLinkRepository: IAdminLoginLinkRepository =
    new DrizzleAdminLoginLinkRepository();
}

const globalForContainer = globalThis as unknown as {
  __esContainer?: Container;
};

export const container = globalForContainer.__esContainer ?? new Container();
if (process.env.NODE_ENV !== "production") {
  globalForContainer.__esContainer = container;
}
