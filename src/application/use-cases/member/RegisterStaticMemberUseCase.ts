import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { Customer } from "@/src/domain/entities";
import {
  isValidThaiPhone,
  normalizePhone,
} from "@/src/domain/services/phone";

export interface RegisterStaticMemberResult {
  token: string;
  customer: Customer;
}

/**
 * Register (or re-request) static-QR membership for a device.
 * Always leaves status=pending — shop must approve before order cookie grant.
 * OTP: when shop.memberOtpEnabled, require a non-empty code (SMS provider stub).
 */
export class RegisterStaticMemberUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(
    slug: string,
    displayName: string,
    phone: string,
    otpCode?: string,
  ): Promise<RegisterStaticMemberResult> {
    const shop = await this.shops.findBySlug(slug);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.onlineOrderingEnabled) {
      throw new Error("ร้านยังไม่เปิดรับสั่งออนไลน์");
    }

    const name = displayName.trim();
    if (name.length < 1 || name.length > 80) {
      throw new Error("กรุณากรอกชื่อ 1–80 ตัวอักษร");
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidThaiPhone(normalizedPhone)) {
      throw new Error("เบอร์โทรไม่ถูกต้อง");
    }

    // OTP stub: no SMS provider wired. When enabled, require non-empty code only.
    if (shop.memberOtpEnabled) {
      if (!otpCode || !otpCode.trim()) {
        throw new Error("กรุณากรอกรหัส OTP");
      }
      // OTP provider not wired; stub OK — accept any non-empty code.
    }

    const customer = await this.customers.findOrCreate(
      shop.id,
      normalizedPhone,
      name,
    );

    // Already approved: still bind this device, keep approved status.
    if (customer.onlineOrderStatus === "approved") {
      const { token } = await this.devices.create(customer.id);
      return { token, customer };
    }

    const nowIso = new Date().toISOString();
    const pending = await this.customers.requestOnlineOrderMembership(
      shop.id,
      customer.id,
      nowIso,
    );
    if (!pending) throw new Error("ลงทะเบียนไม่สำเร็จ");

    // Refresh display name if provided and empty/changed on request path.
    if (name && pending.displayName !== name) {
      // findOrCreate already filled empty names; no extra write needed.
    }

    const { token } = await this.devices.create(pending.id);
    return { token, customer: pending };
  }
}
