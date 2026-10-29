import type { IAdminLoginLinkRepository, AdminLoginLink } from "@/src/application/repositories/IAdminLoginLinkRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { User } from "@/src/domain/entities";
import {
  ONE_TIME_LOGIN_EXPIRY,
  type OneTimeLoginExpiry,
  generateOneTimeLoginToken,
  hashOneTimeLoginToken,
  hashesEqual,
  isWellFormedToken,
} from "@/src/domain/services/one-time-login";

/** Accounts a one-time link may log in as: active, belongs to the shop, never admins. */
export function eligibleAccounts(users: User[], shopId: string): User[] {
  return users.filter(
    (u) =>
      u.isActive &&
      u.shopId === shopId &&
      (u.role === "shop_owner" || u.role === "branch_staff"),
  );
}

export class CreateOneTimeLoginLinkUseCase {
  constructor(
    private readonly links: IAdminLoginLinkRepository,
    private readonly shops: IShopRepository,
    private readonly users: IUserRepository,
  ) {}

  async execute(input: {
    shopId: string;
    adminId: string;
    expiry: OneTimeLoginExpiry;
    targetUserId?: string | null;
    now?: Date;
  }): Promise<{ token: string; link: AdminLoginLink }> {
    const ttl = ONE_TIME_LOGIN_EXPIRY[input.expiry];
    if (!ttl) throw new Error("ระยะเวลาหมดอายุไม่ถูกต้อง");
    const shop = await this.shops.findById(input.shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const target = input.targetUserId || null;
    if (target) {
      const ok = eligibleAccounts(await this.users.listByShop(shop.id), shop.id).some(
        (u) => u.id === target,
      );
      if (!ok) throw new Error("บัญชีนี้ไม่ได้อยู่ในร้านนี้");
    }
    const now = input.now ?? new Date();
    const token = generateOneTimeLoginToken();
    const link = await this.links.create({
      shopId: shop.id,
      tokenHash: hashOneTimeLoginToken(token),
      createdBy: input.adminId,
      targetUserId: target,
      expiresAt: new Date(now.getTime() + ttl).toISOString(),
    });
    return { token, link };
  }
}

export type OneTimeLinkCheck =
  | { kind: "invalid" }
  | { kind: "ok"; link: AdminLoginLink; shopName: string; accounts: User[] };

/** Validate a raw token WITHOUT consuming it. */
export class ResolveOneTimeLoginLinkUseCase {
  constructor(
    private readonly links: IAdminLoginLinkRepository,
    private readonly shops: IShopRepository,
    private readonly users: IUserRepository,
  ) {}

  async execute(token: unknown, now: Date = new Date()): Promise<OneTimeLinkCheck> {
    if (!isWellFormedToken(token)) return { kind: "invalid" };
    const hash = hashOneTimeLoginToken(token);
    const link = await this.links.findByTokenHash(hash);
    if (
      !link ||
      !hashesEqual(link.tokenHash, hash) ||
      link.usedAt ||
      link.revokedAt ||
      link.expiresAt <= now.toISOString()
    ) {
      return { kind: "invalid" };
    }
    const shop = await this.shops.findById(link.shopId);
    if (!shop) return { kind: "invalid" };
    let accounts = eligibleAccounts(await this.users.listByShop(shop.id), shop.id);
    if (link.targetUserId) accounts = accounts.filter((u) => u.id === link.targetUserId);
    if (accounts.length === 0) return { kind: "invalid" };
    return { kind: "ok", link, shopName: shop.name, accounts };
  }
}

/** Re-validate, check the chosen account, and atomically burn the link. */
export class ConsumeOneTimeLoginLinkUseCase {
  constructor(
    private readonly links: IAdminLoginLinkRepository,
    private readonly shops: IShopRepository,
    private readonly users: IUserRepository,
  ) {}

  async execute(
    token: unknown,
    userId: string,
    now: Date = new Date(),
  ): Promise<{ user: User; link: AdminLoginLink }> {
    const check = await new ResolveOneTimeLoginLinkUseCase(
      this.links,
      this.shops,
      this.users,
    ).execute(token, now);
    if (check.kind !== "ok") throw new Error("ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว");
    const user = check.accounts.find((u) => u.id === userId);
    if (!user) throw new Error("ไม่สามารถเข้าสู่ระบบด้วยบัญชีนี้ได้");
    const won = await this.links.consume(check.link.id, user.id, now.toISOString());
    if (!won) throw new Error("ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว");
    return { user, link: check.link };
  }
}
