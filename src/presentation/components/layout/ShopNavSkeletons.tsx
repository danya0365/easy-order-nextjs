import { UtensilsCrossed } from "lucide-react";

import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

/**
 * Shared by the client tap overlay (ShopNavPending) and the server route
 * loading.tsx files (`route` marks them with data-route-skeleton so the overlay
 * stays on top until the real page replaces them — no double skeleton).
 */

/** Mirrors /s/[slug]/menu: cover, avatar header, toolbar, chips, 2-col grid. */
export function MenuListSkeleton({ route }: { route?: boolean } = {}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-8 pt-4" data-route-skeleton={route ? "menu" : undefined}>
      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <Skeleton className="h-36 w-full rounded-none sm:h-48" />
        <div className="flex items-start gap-3 px-4 pb-4">
          <div className="relative z-10 -mt-9 size-20 shrink-0 overflow-hidden rounded-full bg-card ring-4 ring-card">
            <Skeleton className="size-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </section>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[16, 20, 20, 20, 14, 16].map((w, i) => (
          <Skeleton key={i} className="h-9 shrink-0 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <GridCards />
    </main>
  );
}

function GridCards({ n = 6 }: { n?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="rounded-2xl bg-card p-2.5 ring-1 ring-border">
          <Skeleton className="aspect-4/3 w-full rounded-xl" />
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-12" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mirrors /s/[slug]/menu/[itemId]. When the tap came from a card we already
 * know name/image/price, so they render for real (optimistic) and only the
 * description + option groups shimmer.
 */
export function MenuDetailSkeleton({ name, img, price, route }: { name?: string; img?: string; price?: string; route?: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-8 pt-4" data-route-skeleton={route ? "menuItem" : undefined}>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-border md:grid md:grid-cols-2">
        <div className="aspect-square w-full bg-muted-surface">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element -- same URL the card already loaded (cached)
            <img src={img} alt="" className="size-full object-cover" />
          ) : name ? (
            <div className="flex size-full items-center justify-center text-muted">
              <UtensilsCrossed className="size-12 opacity-40" />
            </div>
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-3 w-24" />
          {name ? <h1 className="text-2xl font-bold text-foreground">{name}</h1> : <Skeleton className="h-8 w-3/4" />}
          {price ? <p className="text-2xl font-extrabold text-brand-700">{price}</p> : <Skeleton className="h-8 w-24" />}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-2 flex flex-col gap-3">
            <Skeleton className="h-5 w-28" />
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl bg-background p-3 ring-1 ring-border">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

/** Order page: menu grid + floating cart bar. */
export function OrderSkeleton({ route }: { route?: boolean } = {}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-24 pt-4" data-route-skeleton={route ? "order" : undefined}>
      <Skeleton className="h-7 w-48" />
      <div className="flex gap-2 overflow-hidden">
        {[16, 20, 20, 14, 16].map((w, i) => (
          <Skeleton key={i} className="h-9 shrink-0 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <GridCards />
    </main>
  );
}

/** Orders list / loyalty / promotions / home: header + stacked cards. */
export function ListSkeleton({ hero = false, route }: { hero?: boolean; route?: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6" data-route-skeleton={route ? "list" : undefined}>
      {hero ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-border">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="flex flex-col items-center gap-2 px-4 pb-5">
            <div className="-mt-12 size-24 overflow-hidden rounded-full bg-card ring-4 ring-card">
              <Skeleton className="size-full" />
            </div>
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
      ) : (
        <Skeleton className="h-7 w-40" />
      )}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-border">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </main>
  );
}
