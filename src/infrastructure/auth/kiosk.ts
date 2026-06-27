import "server-only";

import { cookies } from "next/headers";

import { container } from "@/src/infrastructure/di/container";
import { isProd } from "@/src/infrastructure/config/env";

/**
 * Kiosk-mode device state. A shop owner activates a device (while authenticated);
 * we mint a DB-backed kiosk-session row and store its opaque id in this cookie.
 * Walk-in customers then order anonymously on that device. Orders are scoped to
 * the shop FROM THIS SERVER-VALIDATED SESSION — never from client input — so a
 * forged cookie or a request from off-site can't place an order for a shop.
 */
const KIOSK_COOKIE = "eo_kiosk";
const KIOSK_TTL_MS = 12 * 60 * 60 * 1000; // a working day

/** Activate kiosk mode for a shop on this device. Caller must already be authorized. */
export async function startKioskSession(
  shopId: string,
  label?: string | null,
): Promise<void> {
  const expiresAt = new Date(Date.now() + KIOSK_TTL_MS);
  const session = await container.kioskSessionRepository.create({
    shopId,
    label: label ?? null,
    expiresAt: expiresAt.toISOString(),
  });
  (await cookies()).set(KIOSK_COOKIE, session.id, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The shop this device is in kiosk mode for, or null (validated against the DB). */
export async function getKioskShopId(): Promise<string | null> {
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!token) return null;
  const session = await container.kioskSessionRepository.findValid(
    token,
    new Date(),
  );
  return session?.shopId ?? null;
}

/**
 * Require an active kiosk session and return its shop id. Throws when the device
 * isn't in kiosk mode — the guard that makes remote/fake orders impossible.
 */
export async function requireKioskShop(): Promise<string> {
  const shopId = await getKioskShopId();
  if (!shopId) throw new Error("อุปกรณ์นี้ยังไม่ได้เปิดโหมดหน้าร้าน");
  return shopId;
}

/** Exit kiosk mode on this device: revoke the session row + clear the cookie. */
export async function endKioskSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(KIOSK_COOKIE)?.value;
  if (token) {
    await container.kioskSessionRepository.delete(token);
    store.delete(KIOSK_COOKIE);
  }
}

export { KIOSK_COOKIE };
