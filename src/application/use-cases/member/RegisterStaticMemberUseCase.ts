import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { IMemberSignupGuardRepository } from "@/src/application/repositories/IMemberSignupGuardRepository";
import type { Customer } from "@/src/domain/entities";
import { normalizePhone } from "@/src/domain/services/phone";
import {
  DAY_MS,
  HOUR_MS,
  effectiveMemberPolicy,
} from "@/src/domain/services/member-policy";
import {
  STATIC_JOIN_POLICY,
  isPendingExpired,
  isSuspiciousPhone,
  isValidThaiMobile,
  staticJoinTokenMatches,
} from "@/src/domain/services/static-join-guard";

export interface RegisterStaticMemberResult {
  token: string;
  customer: Customer;
}

/** Request context for anti-spam checks (IP is pre-hashed — never raw). */
export interface RegisterStaticMemberContext {
  /** `k` from the static QR — must match the shop's current join token. */
  joinKey: string | null | undefined;
  ipHash?: string | null;
  deviceId?: string | null;
  now?: Date;
}

export class StaticJoinError extends Error {
  constructor(
    readonly code:
      | "invalid_qr"
      | "paused"
      | "rate_limited"
      | "queue_full"
      | "phone_invalid"
      | "phone_blocked"
      | "reject_cooldown",
    message: string,
  ) {
    super(message);
    this.name = "StaticJoinError";
  }
}

/**
 * Register (or re-request) static-QR membership for a device.
 * Always leaves status=pending — shop must approve before order cookie grant.
 * Anti-spam: revocable QR key, pause toggle, per-device/IP daily cap,
 * per-shop open-pending cap, phone sanity, blocklist, 30-day reject cooldown.
 * OTP: when shop.memberOtpEnabled, require a non-empty code (SMS provider stub).
 */
export class RegisterStaticMemberUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly devices: ICustomerDeviceRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}

  async execute(
    slug: string,
    displayName: string,
    phone: string,
    otpCode: string | undefined,
    ctx: RegisterStaticMemberContext,
  ): Promise<RegisterStaticMemberResult> {
    const now = ctx.now ?? new Date();
    const shop = await this.shops.findBySlug(slug);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.onlineOrderingEnabled) {
      throw new Error("ร้านยังไม่เปิดรับสั่งออนไลน์");
    }

    const expected = await this.shops.getStaticJoinToken(shop.id);
    if (!staticJoinTokenMatches(expected, ctx.joinKey)) {
      throw new StaticJoinError(
        "invalid_qr",
        "QR ไม่ถูกต้องหรือถูกยกเลิกแล้ว กรุณาสแกน QR ล่าสุดที่ร้าน",
      );
    }
    if (shop.memberSignupPaused) {
      throw new StaticJoinError(
        "paused",
        "ร้านปิดรับสมาชิกใหม่ชั่วคราว กรุณาติดต่อร้าน",
      );
    }

    const policy = effectiveMemberPolicy(shop.memberPolicyOverrides);
    const pendingTtlMs = policy.pendingExpiryHours * HOUR_MS;

    const name = displayName.trim();
    if (name.length < 1 || name.length > 80) {
      throw new Error("กรุณากรอกชื่อ 1–80 ตัวอักษร");
    }

    const normalizedPhone = normalizePhone(phone);
    if (
      !isValidThaiMobile(normalizedPhone) ||
      isSuspiciousPhone(normalizedPhone)
    ) {
      throw new StaticJoinError(
        "phone_invalid",
        "เบอร์มือถือไม่ถูกต้อง (ต้องเป็น 06/08/09 และ 10 หลัก)",
      );
    }

    if (await this.guard.isPhoneBlocked(shop.id, normalizedPhone)) {
      throw new StaticJoinError(
        "phone_blocked",
        "เบอร์นี้ไม่สามารถลงทะเบียนกับร้านนี้ได้",
      );
    }

    // OTP stub: no SMS provider wired. When enabled, require non-empty code only.
    if (shop.memberOtpEnabled) {
      if (!otpCode || !otpCode.trim()) {
        throw new Error("กรุณากรอกรหัส OTP");
      }
    }

    const existing = await this.customers.findByPhone(shop.id, normalizedPhone);

    // Already approved: bind this device, keep approved status.
    if (existing?.onlineOrderStatus === "approved") {
      const { token } = await this.devices.create(existing.id);
      return { token, customer: existing };
    }

    if (existing?.onlineOrderRejectedAt) {
      const since = now.getTime() - new Date(existing.onlineOrderRejectedAt).getTime();
      if (since < policy.rejectCooldownDays * DAY_MS) {
        throw new StaticJoinError(
          "reject_cooldown",
          `เบอร์นี้ถูกร้านปฏิเสธ ลงทะเบียนใหม่ได้หลัง ${policy.rejectCooldownDays} วัน`,
        );
      }
    }

    // Still-open pending request: just bind this device (no new request).
    if (
      existing?.onlineOrderStatus === "pending" &&
      !isPendingExpired(existing.onlineOrderRequestedAt, now, pendingTtlMs)
    ) {
      const { token } = await this.devices.create(existing.id);
      return { token, customer: existing };
    }

    const dayAgo = new Date(
      now.getTime() - STATIC_JOIN_POLICY.signalWindowMs,
    ).toISOString();
    const recent = await this.guard.countRecentBySource(
      shop.id,
      ctx.ipHash ?? null,
      ctx.deviceId ?? null,
      dayAgo,
    );
    if (recent >= policy.signupsPerDevicePerDay) {
      throw new StaticJoinError(
        "rate_limited",
        "ลงทะเบียนจากอุปกรณ์นี้บ่อยเกินไป ลองใหม่พรุ่งนี้",
      );
    }

    const pendingCutoff = new Date(
      now.getTime() - pendingTtlMs,
    ).toISOString();
    const open = await this.customers.countOpenPending(shop.id, pendingCutoff);
    if (open >= policy.maxPendingRequests) {
      throw new StaticJoinError(
        "queue_full",
        "ร้านมีคำขอค้างมาก ลองใหม่ภายหลัง",
      );
    }

    const customer = await this.customers.findOrCreate(
      shop.id,
      normalizedPhone,
      name,
    );

    const nowIso = now.toISOString();
    const pending = await this.customers.requestOnlineOrderMembership(
      shop.id,
      customer.id,
      nowIso,
    );
    if (!pending) throw new Error("ลงทะเบียนไม่สำเร็จ");

    await this.guard.recordAttempt({
      shopId: shop.id,
      customerId: pending.id,
      ipHash: ctx.ipHash ?? null,
      deviceId: ctx.deviceId ?? null,
      phone: normalizedPhone,
    });

    const { token } = await this.devices.create(pending.id);
    return { token, customer: pending };
  }
}
