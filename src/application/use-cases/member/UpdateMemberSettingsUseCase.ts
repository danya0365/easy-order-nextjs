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
    };
    await this.shops.updateSettings(shopId, {
      memberPolicy: policy,
      memberOtpEnabled: input.memberOtpEnabled,
      memberSignupPaused: input.memberSignupPaused,
    });
    return {
      before,
      after: {
        policy,
        memberOtpEnabled: input.memberOtpEnabled,
        memberSignupPaused: input.memberSignupPaused,
      },
    };
  }
}
