"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { classifyShopNav, type PendingTarget } from "@/src/presentation/lib/shop-nav-pending";
import {
  ListSkeleton,
  MenuDetailSkeleton,
  MenuListSkeleton,
  OrderSkeleton,
} from "@/src/presentation/components/layout/ShopNavSkeletons";

type Pending = PendingTarget & { from: string; name?: string; img?: string; price?: string };

/**
 * Instant tap feedback for the public shop PWA: on a plain left-click/tap of an
 * in-shop link, cover the content area with the target route's skeleton until
 * the new route commits (pathname changes). Pure client; no server cost.
 */
export function ShopNavPending({ slug }: { slug: string }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Capture phase: next/link calls preventDefault() for client navigation,
      // so defaultPrevented can't be trusted. Same-page links (chips,
      // pagination) are filtered by classifyShopNav instead.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const t = classifyShopNav(a.getAttribute("href")!, slug, window.location);
      if (!t) return;
      setPending({ ...t, from: window.location.pathname, name: a.dataset.navName, img: a.dataset.navImg, price: a.dataset.navPrice });
    };
    const clear = () => setPending(null);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", clear);
    window.addEventListener("pageshow", clear);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", clear);
      window.removeEventListener("pageshow", clear);
    };
  }, [slug]);

  // Safety valve: never leave the overlay up if navigation silently fails.
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setPending(null), 15000);
    return () => window.clearTimeout(id);
  }, [pending]);

  // Route committed (pathname moved off the page we tapped from). If the server
  // route skeleton (loading.tsx, [data-route-skeleton]) is still streaming,
  // keep the overlay — it already shows the optimistic name/image/price — and
  // hide only once the real page replaced that skeleton. No double skeleton.
  const committed = !!pending && pending.from !== pathname;
  useEffect(() => {
    if (!committed) return;
    const done = () => {
      if (!document.querySelector("[data-route-skeleton]")) setPending(null);
    };
    const id = window.setTimeout(done, 0);
    const mo = new MutationObserver(done);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(id);
      mo.disconnect();
    };
  }, [committed]);

  if (!pending) return null;
  let body: React.ReactNode;
  switch (pending.kind) {
    case "menu": body = <MenuListSkeleton />; break;
    case "menuItem": body = <MenuDetailSkeleton name={pending.name} img={pending.img} price={pending.price} />; break;
    case "order": body = <OrderSkeleton />; break;
    case "home": body = <ListSkeleton hero />; break;
    default: body = <ListSkeleton />;
  }
  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden bg-background"
      data-testid="nav-skeleton"
      data-kind={pending.kind}
      aria-busy="true"
      role="status"
    >
      {body}
    </div>
  );
}
