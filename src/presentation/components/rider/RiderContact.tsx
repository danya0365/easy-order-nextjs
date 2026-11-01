"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { lineChatUrl } from "@/src/domain/services/rider-contact";
import { Badge } from "@/src/presentation/components/ui/Badge";

export interface RiderContactInfo {
  id: string;
  name: string;
  phone: string;
  lineId: string | null;
  available: boolean;
  openJobs: number;
}

/** Availability badge (ว่าง/ไม่ว่าง) + open-job count. */
export function RiderStatusBadges({ rider }: { rider: RiderContactInfo }) {
  const t = useTranslations("rider");
  return (
    <span className="flex flex-wrap items-center gap-1" data-testid="rider-status">
      <Badge tone={rider.available ? "success" : "neutral"}>
        {rider.available ? t("available") : t("busy")}
      </Badge>
      <Badge tone={rider.openJobs > 0 ? "warning" : "neutral"}>
        {t("openJobs", { count: rider.openJobs })}
      </Badge>
    </span>
  );
}

/** Call (tel:) + LINE chat buttons (LINE only when a LINE ID is set). */
export function RiderContactButtons({ rider }: { rider: RiderContactInfo }) {
  const t = useTranslations("rider");
  const cls =
    "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <a href={`tel:${rider.phone}`} className={cls} data-testid="rider-call">
        <Phone className="size-3.5" />
        {t("call")}
      </a>
      {rider.lineId && (
        <a
          href={lineChatUrl(rider.lineId)}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          data-testid="rider-line"
        >
          <MessageCircle className="size-3.5" />
          {t("lineChat")}
        </a>
      )}
    </span>
  );
}
