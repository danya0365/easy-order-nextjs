import type { PlatformSettings } from "@/src/domain/entities";

export interface UpdatePlatformSettingsInput {
  billingUiEnabled?: boolean;
  orderThresholdBillingEnabled?: boolean;
  orderThresholdCount?: number;
  shopSuspensionEnabled?: boolean;
}

/**
 * Platform-wide singleton settings (id = "default"). `get()` must always
 * return a row — creating the default one if an install predates the seed.
 */
export interface IPlatformSettingsRepository {
  get(): Promise<PlatformSettings>;
  update(input: UpdatePlatformSettingsInput): Promise<PlatformSettings>;
}
