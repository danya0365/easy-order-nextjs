import type {
  LeadLostReason,
  LeadStatus,
  LeadVisitReaction,
} from "@/src/domain/entities";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand";

/**
 * Maps each enum value to a `leads`-namespace message key (resolve with a
 * `leads` translator: `t(LEAD_STATUS_KEY[status])`). Labels live in
 * `messages/th.json` so they stay in the i18n catalog; tone/pin/order are
 * presentation metadata and stay here.
 */
export const LEAD_STATUS_KEY: Record<
  LeadStatus,
  "statusNew" | "statusVisited" | "statusInterested" | "statusWon" | "statusLost"
> = {
  new: "statusNew",
  visited: "statusVisited",
  interested: "statusInterested",
  won: "statusWon",
  lost: "statusLost",
};

export const LEAD_STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "neutral",
  visited: "brand",
  interested: "warning",
  won: "success",
  lost: "danger",
};

/** Hex fill for the map marker, by status. */
export const LEAD_STATUS_PIN: Record<LeadStatus, string> = {
  new: "#94a3b8",
  visited: "#3b82f6",
  interested: "#f59e0b",
  won: "#22c55e",
  lost: "#ef4444",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "visited",
  "interested",
  "won",
  "lost",
];

export const LEAD_LOST_REASON_KEY: Record<
  LeadLostReason,
  | "lostNotInterested"
  | "lostTooExpensive"
  | "lostNoSmartphone"
  | "lostClosedBusiness"
  | "lostCompetitor"
  | "lostOther"
> = {
  not_interested: "lostNotInterested",
  too_expensive: "lostTooExpensive",
  no_smartphone: "lostNoSmartphone",
  closed_business: "lostClosedBusiness",
  competitor: "lostCompetitor",
  other: "lostOther",
};

export const LEAD_LOST_REASON_ORDER: LeadLostReason[] = [
  "not_interested",
  "too_expensive",
  "no_smartphone",
  "closed_business",
  "competitor",
  "other",
];

export const LEAD_REACTION_KEY: Record<
  LeadVisitReaction,
  "reactionPositive" | "reactionNeutral" | "reactionNegative" | "reactionNoAnswer"
> = {
  positive: "reactionPositive",
  neutral: "reactionNeutral",
  negative: "reactionNegative",
  no_answer: "reactionNoAnswer",
};

export const LEAD_REACTION_ORDER: LeadVisitReaction[] = [
  "positive",
  "neutral",
  "negative",
  "no_answer",
];
