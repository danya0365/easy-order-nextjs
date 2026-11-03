import { toCustomerLinkMode, type CustomerLinkMode } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import {
  type MemberPolicy,
  effectiveMemberPolicy,
  validateMemberPolicy,
} from "@/src/domain/services/member-policy";

export interface UpdateMemberSettingsInput {
  policy: MemberPolicy;
  memberOtpEnabled: boolean;
  memberSignupPaused: boolean;
  /** Optional so older callers keep the stored mode. */
  customerLinkMode?: CustomerLinkMode;
}

export interface UpdateMemberSettingsResult {
  before: UpdateMemberSettingsInput;
  after: UpdateMemberSettingsInput;
}

/** Shop-editable static-QR membership + anti-spam settings (bounds-checked). */
export class UpdateMemberSettingsUseCase {
  constructor(private readonly shops: IShopRepository) {}

  async execute(
    shopId: string,
    input: UpdateMemberSettingsInput,
  ): Promise<UpdateMemberSettingsResult> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const policy = validateMemberPolicy({ ...input.policy });
    const before: UpdateMemberSettingsInput = {
      policy: effectiveMemberPolicy(shop.memberPolicyOverrides),
      memberOtpEnabled: shop.memberOtpEnabled,
      memberSignupPaused: shop.memberSignupPaused,
      customerLinkMode: shop.customerLinkMode,
    };
    const customerLinkMode =
      input.customerLinkMode === undefined ? shop.customerLinkMode : toCustomerLinkMode(input.customerLinkMode);
    await this.shops.updateSettings(shopId, {
      memberPolicy: policy,
      memberOtpEnabled: input.memberOtpEnabled,
      memberSignupPaused: input.memberSignupPaused,
      customerLinkMode,
    });
    return {
      before,
      after: {
        policy,
        memberOtpEnabled: input.memberOtpEnabled,
        memberSignupPaused: input.memberSignupPaused,
        customerLinkMode,
      },
    };
  }
}
