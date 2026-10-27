import Link from "next/link";
import { Store } from "lucide-react";

/**
 * Compact top bar for the per-shop customer shell — shop name (+ logo when
 * available). Intentionally omits Easy Order platform branding; discovery of
 * other shops stays off this chrome.
 */
export function ShopShellHeader({
  slug,
  shopName,
  profileImageId,
}: {
  slug: string;
  shopName: string;
  profileImageId: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2.5 px-4 py-2.5">
        <Link
          href={`/s/${slug}`}
          className="flex min-w-0 items-center gap-2.5 text-foreground transition hover:opacity-90"
        >
          {profileImageId ? (
            // eslint-disable-next-line @next/next/no-img-element -- internal image route
            <img
              src={`/api/shop-images/${profileImageId}`}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Store className="size-4" />
            </span>
          )}
          <span className="truncate text-sm font-bold">{shopName}</span>
        </Link>
      </div>
    </header>
  );
}
