import type { Metadata, Viewport } from "next";
import { Bike, CircleAlert, ShieldCheck, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  getRiderInviteToken,
  getRiderSession,
  riderLinkUseCases,
} from "@/src/infrastructure/auth/rider-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

function maskPhone(p: string): string {
  return p.length > 4 ? `${"•".repeat(Math.max(0, p.length - 4))}${p.slice(-4)}` : p;
}

const btn = "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold";

/** Confirm page for a shop link: accept an invitation / add a shop to the signed-in account. */
export default async function RiderJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const t = await getTranslations("rider");
  const { msg } = await searchParams;
  const token = await getRiderInviteToken();
  const current = await getRiderSession();
  const view = token ? await riderLinkUseCases().view(token, current).catch(() => null) : null;

  if (!view) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center" data-testid="rider-join-invalid">
        <Bike className="size-12 text-muted" />
        <h1 className="text-xl font-bold text-foreground">{msg || t("joinExpired")}</h1>
        <p className="text-base text-muted">{t("appInvalidDesc")}</p>
      </main>
    );
  }

  const attach = view.choices.includes("attach");
  const onlyNew = view.choices.length === 1 && view.choices[0] === "new_account";
  const label: Record<(typeof view.choices)[number], string> = {
    accept: t("joinAccept"),
    attach: t("joinAttach"),
    new_account: t("joinNewAccount"),
    switch: t("joinSwitch"),
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-10" data-testid="rider-join">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Store className="size-8" />
        </span>
        <h1 className="text-2xl font-bold text-foreground">
          {attach ? t("joinTitleAttach", { shop: view.shopName }) : t("joinTitleInvite", { shop: view.shopName })}
        </h1>
        <p className="text-base text-muted">
          {attach && view.current
            ? t("joinDescAttach", { name: view.current.name, phone: maskPhone(view.current.phone) })
            : t("joinDescInvite")}
        </p>
      </div>

      {onlyNew && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="rider-join-existing">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {t("joinExistingNote")}
        </p>
      )}
      {msg && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="rider-join-error">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {msg}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {view.choices.map((c, i) => (
          <form key={c} method="post" action="/rider-join/decide">
            <input type="hidden" name="choice" value={c} />
            <button
              className={`${btn} ${i === 0 ? "bg-brand-500 text-on-brand" : "border border-border bg-card text-foreground"}`}
              data-testid={`rider-join-${c}`}
            >
              {label[c]}
            </button>
          </form>
        ))}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="size-4" /> {t("joinPrivacy")}
      </p>
    </main>
  );
}
