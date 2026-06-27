import "server-only";

import { cookies } from "next/headers";

// One cookie per shop slug so a device can be bound to multiple shops.
const MEMBER_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export function memberCookieName(slug: string): string {
  return `es_member_${slug}`;
}

/** Read the member device token for a shop (null if device not bound). */
export async function getMemberToken(slug: string): Promise<string | null> {
  return (await cookies()).get(memberCookieName(slug))?.value ?? null;
}

const PREFIX = "es_member_";

/** All shop bindings on this device — one cookie per shop the user joined. */
export async function getAllMemberTokens(): Promise<
  { slug: string; token: string }[]
> {
  const all = await cookies();
  return all
    .getAll()
    .filter((c) => c.name.startsWith(PREFIX) && c.value)
    .map((c) => ({ slug: c.name.slice(PREFIX.length), token: c.value }));
}

/** Set the member device token cookie. Server Actions / Route Handlers only. */
export async function setMemberCookie(
  slug: string,
  token: string,
): Promise<void> {
  (await cookies()).set(memberCookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + MEMBER_TTL_MS),
  });
}
