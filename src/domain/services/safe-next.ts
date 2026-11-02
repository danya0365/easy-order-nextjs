import type { Role } from "@/src/domain/types/roles";

/** Areas each role may be sent back to after login via `?next=`. */
const ROLE_AREAS: Record<Role, string[]> = {
  platform_admin: ["/admin", "/shop"],
  shop_owner: ["/shop"],
  branch_staff: ["/staff"],
};

/**
 * Validate a post-login `next` target. Only same-origin, absolute PATHS inside
 * the role's own area are allowed (no scheme, no `//host`, no backslashes, no
 * control chars) — prevents open redirects. Returns null when unsafe.
 */
export function safeNextPath(raw: unknown, role?: Role | null): string | null {
  if (typeof raw !== "string") return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  const next = raw.trim();
  if (!next || next.length > 512) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return null;
  if (/^\/[^/?#]*:/.test(next)) return null;
  let url: URL;
  try {
    url = new URL(next, "https://internal.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://internal.invalid") return null;
  const path = url.pathname;
  if (path === "/login" || path.startsWith("/login/")) return null;
  if (role) {
    const ok = ROLE_AREAS[role]?.some((a) => path === a || path.startsWith(`${a}/`));
    if (!ok) return null;
  }
  return `${path}${url.search}${url.hash}`;
}

/** `/login?next=…` for a path (or plain /login when the path is unsafe). */
export function loginUrlFor(path: string | null | undefined): string {
  const safe = safeNextPath(path ?? "");
  return safe && safe !== "/" ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
