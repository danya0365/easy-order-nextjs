import type { Metadata, Viewport } from "next";
import { Bike } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getSessionRider } from "@/src/infrastructure/auth/rider-session";
import { RiderBottomNav } from "@/src/presentation/components/rider/RiderBottomNav";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rider");
  return {
    title: t("rpTitle"),
    manifest: "/rider/site.webmanifest",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Rider app shell: cookie session (bound to the personal link) + bottom tabs. */
export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRider();
  if (!session) {
    const t = await getTranslations("rider");
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center"
        data-testid="rider-invalid"
      >
        <Bike className="size-12 text-muted" />
        <h1 className="text-xl font-bold text-foreground">{t("appInvalidTitle")}</h1>
        <p className="text-base text-muted">{t("appInvalidDesc")}</p>
      </main>
    );
  }
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      {children}
      <RiderBottomNav />
    </div>
  );
}
