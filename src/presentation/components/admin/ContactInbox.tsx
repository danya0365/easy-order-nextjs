"use client";

import { useTranslations } from "next-intl";

import type { ContactRequest } from "@/src/domain/entities";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Button } from "@/src/presentation/components/ui/Button";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import {
  loadMoreResolvedContactsAction,
  resolveContactAction,
} from "@/src/presentation/actions/contact-actions";

export interface ContactRow {
  request: ContactRequest;
  shopName: string;
}

export function ContactRequestRow({ request: r, shopName }: ContactRow) {
  const t = useTranslations("admin");
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{r.subject}</p>
            {r.source === "public" && (
              <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] text-accent-600">
                {t("ciFromLogin")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted">
            {r.source === "public" ? (r.email ?? t("ciAnonUser")) : shopName} ·{" "}
            {formatDateTime(r.createdAt)}
          </p>
        </div>
        {r.status === "open" ? (
          <Badge tone="warning">{t("ciStatusOpen")}</Badge>
        ) : (
          <Badge tone="success">{t("ciStatusResolved")}</Badge>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{r.message}</p>
      <p className="text-sm text-brand-700">{t("ciContactBack", { channel: r.contactChannel })}</p>
      {r.status === "open" && (
        <form action={resolveContactAction.bind(null, r.id)}>
          <Button type="submit" size="sm" variant="outline">
            {t("ciMarkResolved")}
          </Button>
        </form>
      )}
    </li>
  );
}

/**
 * Admin contact inbox. `initialItems` holds all open requests followed by the
 * first page of resolved ones; "load more" appends further resolved requests.
 */
export function ContactInbox({
  initialItems,
  initialCursor,
}: {
  initialItems: ContactRow[];
  initialCursor: string | null;
}) {
  return (
    <LoadMore
      initialItems={initialItems}
      initialCursor={initialCursor}
      loadMore={loadMoreResolvedContactsAction}
      getKey={(r) => r.request.id}
      renderItem={(r) => (
        <ContactRequestRow request={r.request} shopName={r.shopName} />
      )}
    />
  );
}
