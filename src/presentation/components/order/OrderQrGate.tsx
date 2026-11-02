import Link from "next/link";
import { BookOpen, QrCode, UtensilsCrossed } from "lucide-react";

/**
 * Shown on /s/[slug]/order when the visitor has no valid shop-QR order
 * session (eo_order_<slug> cookie). Ordering stays impossible server-side too
 * (requireOrderAccess in the order action).
 */
export function OrderQrGate({
  slug,
  title,
  description,
  menuLabel,
  bookLabel,
}: {
  slug: string;
  title: string;
  description: string;
  menuLabel: string;
  bookLabel: string;
}) {
  return (
    <main
      data-testid="order-qr-gate"
      className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-brand-500/10">
        <QrCode className="size-10 text-brand-600" aria-hidden />
      </div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      <div className="flex w-full flex-col gap-3">
        <Link
          href={`/s/${slug}/menu`}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-600"
        >
          <UtensilsCrossed className="size-4" aria-hidden />
          {menuLabel}
        </Link>
        <Link
          href={`/s/${slug}/menu?view=book`}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
        >
          <BookOpen className="size-4" aria-hidden />
          {bookLabel}
        </Link>
      </div>
    </main>
  );
}
