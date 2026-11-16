import { getTranslations } from "next-intl/server";

import type { SpinResult } from "@/src/domain/entities";
import { Badge } from "@/src/presentation/components/ui/Badge";

export type RewardState = "pending" | "redeemed" | "expired" | "points" | "thanks";

export function rewardState(r: SpinResult, now = new Date()): RewardState {
  if (r.rewardStatus === "redeemed") return "redeemed";
  if (r.rewardStatus === "pending") {
    return r.expiresAt && r.expiresAt < now.toISOString() ? "expired" : "pending";
  }
  return r.prizeType === "points" ? "points" : "thanks";
}

export async function RewardStatusBadge({ result }: { result: SpinResult }) {
  const t = await getTranslations("wheel");
  const s = rewardState(result);
  const map = {
    pending: { tone: "warning", label: t("statusPending") },
    redeemed: { tone: "success", label: t("statusRedeemed") },
    expired: { tone: "danger", label: t("statusExpired") },
    points: { tone: "brand", label: t("statusPoints") },
    thanks: { tone: "neutral", label: t("statusThanks") },
  } as const;
  return <Badge tone={map[s].tone}>{map[s].label}</Badge>;
}

export function wheelPrizeKind(type: SpinResult["prizeType"]): "points" | "free_item" | "gift" | "thanks" {
  return type === "points" || type === "free_item" || type === "gift" ? type : "thanks";
}
