import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { Customer } from "@/src/domain/entities";
import {
  isPendingExpired,
  staticJoinTokenMatches,
} from "@/src/domain/services/static-join-guard";

export type StaticJoinGateKind =
  | "approved"
  | "pending"
  | "rejected"
  | "needs_register"
  | "ordering_off"
  | "invalid_qr"
  | "signup_paused"
  | "not_found";

export interface ResolveStaticJoinGateResult {
  kind: StaticJoinGateKind;
  customer?: Customer;
  message: string;
}

/**
 * Resolve the static-join gate for `/s/[slug]/join`.
 * Dynamic `/enter?t=` is unrelated and must stay unchanged.
 */
export class ResolveStaticJoinGateUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(
    slug: string,
    memberToken?: string | null,
    joinKey?: string | null,
    now: Date = new Date(),
  ): Promise<ResolveStaticJoinGateResult> {
    const shop = await this.shops.findBySlug(slug);
    if (!shop) {
      return { kind: "not_found", message: "ไม่พบร้านค้า" };
    }
    if (!shop.onlineOrderingEnabled) {
      return {
        kind: "ordering_off",
        message: "ร้านยังไม่เปิดรับสั่งออนไลน์",
      };
    }
    // New signups need the CURRENT revocable QR key + signups not paused.
    // Existing members (valid eo_member cookie) pass regardless of `k`.
    const registerGate = async (
      customer?: Customer,
    ): Promise<ResolveStaticJoinGateResult> => {
      const expected = await this.shops.getStaticJoinToken(shop.id);
      if (!staticJoinTokenMatches(expected, joinKey)) {
        return {
          kind: "invalid_qr",
          customer,
          message: "QR ไม่ถูกต้องหรือถูกยกเลิกแล้ว",
        };
      }
      if (shop.memberSignupPaused) {
        return {
          kind: "signup_paused",
          customer,
          message: "ร้านปิดรับสมาชิกใหม่ชั่วคราว",
        };
      }
      return {
        kind: "needs_register",
        customer,
        message: "กรุณาลงทะเบียนก่อนสั่งออนไลน์",
      };
    };

    if (!memberToken) return registerGate();

    const device = await this.devices.findByToken(memberToken);
    if (!device || device.customer.shopId !== shop.id) {
      return registerGate();
    }

    const customer = device.customer;
    switch (customer.onlineOrderStatus) {
      case "approved":
        return {
          kind: "approved",
          customer,
          message: "อนุมัติแล้ว — สั่งออนไลน์ได้",
        };
      case "pending":
        if (isPendingExpired(customer.onlineOrderRequestedAt, now)) {
          return registerGate(customer);
        }
        return {
          kind: "pending",
          customer,
          message: "รอการอนุมัติจากร้าน",
        };
      case "rejected":
        return {
          kind: "rejected",
          customer,
          message: "คำขอถูกปฏิเสธ",
        };
      case "expired":
      case "none":
      default:
        return registerGate(customer);
    }
  }
}
