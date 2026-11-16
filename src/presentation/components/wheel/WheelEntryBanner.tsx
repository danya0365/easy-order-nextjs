import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, FerrisWheel } from "lucide-react";

import { wheelService } from "@/src/presentation/lib/lucky-wheel";

/**
 * Member-area entry to the lucky wheel (order history / member card). Also the
 * lazy grant point for the monthly free spin. Renders nothing when the wheel
 * is off for the shop.
 */
export async function WheelEntryBanner({ slug, shopId, customerId }: { slug: string; shopId: string; customerId: string }) {
  const svc = wheelService();
  const gate = await svc.gate(shopId).catch(() => null);
  if (!gate?.enabled || !gate.campaign) return null;
  if (gate.campaign.monthlyFreeEnabled) await svc.ensureMonthlyTicket(shopId, customerId).catch(() => false);
  const tickets = await svc.ticketCount(shopId, customerId);
  const t = await getTranslations("wheel");
  return (
    <Link
      href={`/s/${slug}/wheel`}
      data-testid="wheel-entry"
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-400 p-4 text-on-brand shadow-md"
    >
      <FerrisWheel className="size-9 shrink-0" />
      <span className="flex-1">
        <span className="block font-bold">{gate.campaign.name}</span>
        <span className="block text-sm opacity-90">
          {tickets > 0 ? t("entryTickets", { count: tickets }) : t("entryNoTickets")}
        </span>
      </span>
      <ChevronRight className="size-5" />
    </Link>
  );
}
