import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { Customer } from "@/src/domain/entities";

export type StaticJoinGateKind =
  | "approved"
  | "pending"
  | "rejected"
  | "needs_register"
  | "ordering_off"
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
    if (!memberToken) {
      return {
        kind: "needs_register",
        message: "ยังไม่ได้ผูกสมาชิก กรุณาลงทะเบียน",
      };
    }

    const device = await this.devices.findByToken(memberToken);
    if (!device || device.customer.shopId !== shop.id) {
      return {
        kind: "needs_register",
        message: "ไม่พบสมาชิกบนอุปกรณ์นี้ กรุณาลงทะเบียน",
      };
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
      case "none":
      default:
        return {
          kind: "needs_register",
          customer,
          message: "กรุณาลงทะเบียนก่อนสั่งออนไลน์",
        };
    }
  }
}
