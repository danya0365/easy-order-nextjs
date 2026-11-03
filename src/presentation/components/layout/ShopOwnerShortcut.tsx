"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";

import { SHOP_HINT_COOKIE } from "@/src/infrastructure/auth/shop-hint";

type Result = { owner: boolean; href?: string };

function hasHint(): boolean {
  return document.cookie.split(/;\s*/).some((c) => c.startsWith(`${SHOP_HINT_COOKIE}=`));
}

/**
 * Owner/staff shortcut in the public shop header. Server HTML never includes
 * it (keeps public pages cacheable + no extra SSR query). On the client it
 * probes /api/shop/owner-check ONLY when the non-sensitive hint cookie exists,
 * caching the answer per slug in sessionStorage. Anonymous → zero requests.
 */
export function ShopOwnerShortcut({
  slug,
  label,
  className,
}: {
  slug: string;
  label: string;
  className: string;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHint()) return;
    const key = `eo_owner_check:${slug}`;
    let cached: Result | null = null;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) cached = JSON.parse(raw) as Result;
    } catch {
      /* sessionStorage unavailable — fall through to fetch */
    }
    let alive = true;
    const result: Promise<Result> = cached
      ? Promise.resolve(cached)
      : fetch(`/api/shop/owner-check?slug=${encodeURIComponent(slug)}`, {
          credentials: "same-origin",
          cache: "no-store",
        })
          .then((res) => (res.ok ? (res.json() as Promise<Result>) : { owner: false }))
          .then((r) => {
            try {
              sessionStorage.setItem(key, JSON.stringify(r));
            } catch {
              /* ignore */
            }
            return r;
          });
    result
      .then((r) => {
        if (alive && r.owner && r.href) setHref(r.href);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!href) return null;
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-testid="header-manage-shop"
      className={`${className} sm:w-auto sm:gap-1.5 sm:px-3 sm:text-sm sm:font-semibold`}
    >
      <Settings className="size-5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
