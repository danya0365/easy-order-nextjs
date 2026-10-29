import type { MemberPolicyOverrides } from "@/src/domain/services/member-policy";
import type { Role } from "../types/roles";

export type ShopStatus = "active" | "suspended_by_admin";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type TopupTxType = "topup" | "adjustment";
export type NotificationType =
  | "payment_submitted"
  | "payment_approved"
  | "payment_rejected"
  | "contact_request"
  | "contact_resolved"
  | "new_order"
  | "shop_received_review"
  | "lead_follow_up_due"
  | "security_alert";
export type ContactRequestStatus = "open" | "resolved";

/** Append-only security/support audit event. */
export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  shopId: string | null;
  ip: string | null;
  userAgent: string | null;
  /** JSON string of extra context, or null. */
  metadata: string | null;
  createdAt: string;
}

// --- Tenant (the merchant account) ---

/** Reference data: a shop type (cafe, bakery, ...) for the public directory. */
export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

// --- Analytics (read models; order-based) ---

/** One Bangkok-day bucket: order count + revenue (satang) for that day. */
export interface AnalyticsDailyPoint {
  day: string; // "YYYY-MM-DD" (Asia/Bangkok)
  orders: number;
  revenueSatang: number;
}

/** Headline totals over a date range. */
export interface AnalyticsSummary {
  orders: number;
  revenueSatang: number;
  customers: number;
}

/** A labelled breakdown row (by order status, or per shop on the platform view). */
export interface AnalyticsBreakdownRow {
  key: string;
  name: string;
  orders: number;
  revenueSatang: number;
}

// --- Leads (admin shop-acquisition CRM) ---

export type LeadStatus = "new" | "visited" | "interested" | "won" | "lost";
export type LeadLostReason =
  | "not_interested"
  | "too_expensive"
  | "no_smartphone"
  | "closed_business"
  | "competitor"
  | "other";
export type LeadVisitReaction = "positive" | "neutral" | "negative" | "no_answer";

export interface Lead {
  id: string;
  name: string;
  categoryId: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Storage key of the shop photo; served via /api/lead-photos/[leadId]. */
  photoUrl: string | null;
  status: LeadStatus;
  /** Only set when status = "lost". */
  lostReason: LeadLostReason | null;
  nextFollowUpAt: string | null;
  /** When the last follow-up reminder for the current due date was sent. */
  followUpNotifiedAt: string | null;
  notes: string | null;
  /** Set on conversion: the real shop created from this lead. */
  convertedShopId: string | null;
  convertedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadVisitLog {
  id: string;
  leadId: string;
  reaction: LeadVisitReaction;
  statusBefore: LeadStatus | null;
  statusAfter: LeadStatus | null;
  note: string | null;
  performedBy: string;
  createdAt: string;
}

export interface LeadMapLocation {
  leadId: string;
  name: string;
  status: LeadStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
}

/** A customer's review of a shop (rating + optional comment + owner reply). */
export interface ShopReview {
  id: string;
  shopId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Aggregate rating for a shop (average + count, hidden excluded). */
export interface ReviewSummary {
  average: number;
  count: number;
}

export type ShopImageKind = "profile" | "gallery" | "cover";

/** Owner-uploaded shop imagery (profile/cover/gallery). */
export interface ShopImage {
  id: string;
  shopId: string;
  kind: ShopImageKind;
  storageKey: string;
  sortOrder: number;
  createdAt: string;
}

/**
 * Owner-managed public-facing shop details (1:1 with a shop). All optional;
 * shown on the public page /s/[slug].
 */
export interface ShopProfile {
  shopId: string;
  description: string | null;
  openingHours: string | null;
  phone: string | null;
  lineUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  updatedAt: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  /** Optional shop type (cafe/bakery/...) for the public directory, or null. */
  categoryId: string | null;
  /** Storefront logo shown in the kiosk header (public URL), or null. */
  logoUrl: string | null;
  /** PromptPay target used to render the order-payment QR, or null. */
  promptpayTarget: string | null;
  /** Whether a kiosk PIN has been set (the hash itself never leaves infra). */
  hasKioskPin: boolean;
  /** Self-service mode: customers self-pay + tap "ชำระเงินแล้ว" → order auto paid+completed. */
  selfService: boolean;
  /** Online ordering channel (customers order from the web outside the kiosk). */
  onlineOrderingEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  /** Delivery charge in satang added to online delivery orders. */
  deliveryFeeSatang: number;
  /** Free-form delivery instructions shown on the online order form. */
  deliveryNotes: string | null;
  /** Minimum subtotal (satang) for an online order; null = no minimum. */
  minOrderSatang: number | null;
  /** Platform admin allow-list for the loyalty module. */
  loyaltyAllowedByAdmin: boolean;
  /** Shop toggle for loyalty. Effective = allowed && enabled. */
  loyaltyEnabled: boolean;
  /** Platform admin allow-list for the promotions module. */
  promotionsAllowedByAdmin: boolean;
  /** Shop toggle for promotions. Effective = allowed && enabled. */
  promotionsEnabled: boolean;
  /** Stamp-card kind toggle (requires effective module). */
  stampCardEnabled: boolean;
  /** Spend-points kind toggle (requires effective module). */
  spendPointsEnabled: boolean;
  /** Shop toggle for OTP verification on static member registration. Default false. */
  memberOtpEnabled: boolean;
  /** Pause NEW static-QR member signups (existing members unaffected). */
  memberSignupPaused: boolean;
  /** Per-shop membership policy overrides (null = default). */
  memberPolicyOverrides: MemberPolicyOverrides;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  shopId: string;
  name: string;
  isActive: boolean;
  /** Physical location, null until the owner sets it. */
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  shopId: string | null;
  branchId: string | null;
  isActive: boolean;
  /** LINE Messaging API push target, null until the operator links their LINE. */
  lineUserId: string | null;
  /** Whether TOTP two-factor is active (secret confirmed). Never exposes the secret. */
  totpEnabled: boolean;
  /** Platform superadmin flag (platform_admin only). */
  isSuperadmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** User row including the password hash — never leaves the infrastructure layer. */
export interface UserWithSecret extends User {
  passwordHash: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
}

// --- Ordering domain (menu + orders) ---

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
export type OrderPaymentMethod = "promptpay_qr" | "cash";
export type OrderPaymentStatus = "unpaid" | "paid";
/** Where the order originated: kiosk self-serve, counter staff, or online web. */
export type OrderChannel = "kiosk" | "counter" | "online";
/** How the order reaches the customer. */
export type FulfillmentType = "pickup" | "delivery" | "dine_in";

export interface MenuCategory {
  id: string;
  shopId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  description: string | null;
  /** Unit price in satang. */
  priceSatang: number;
  imageUrl: string | null;
  isAvailable: boolean;
  /** Owner-marked for the public recommended section. */
  isRecommended: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  shopId: string;
  /** Link to the menu item; null if that item was later deleted. */
  menuItemId: string | null;
  /** Name + price snapshot so later menu edits don't rewrite order history. */
  nameSnapshot: string;
  unitPriceSatang: number;
  quantity: number;
  lineTotalSatang: number;
}

export interface Order {
  id: string;
  shopId: string;
  /** Per-shop daily running number, shown when calling the order. */
  orderNo: number;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  subtotalSatang: number;
  totalSatang: number;
  /** Origin of the order (kiosk/counter/online). */
  channel: OrderChannel;
  fulfillmentType: FulfillmentType;
  /** Drop-off address for delivery orders; null otherwise. */
  deliveryAddress: string | null;
  note: string | null;
  /** Optional customer who placed the order (null for anonymous walk-ins). */
  customerId: string | null;
  /** Name/phone snapshotted at order time (shown in the queue even if erased). */
  customerName: string | null;
  customerPhone: string | null;
  /** Operator who placed it from the counter UI; null for kiosk self-serve. */
  performedBy: string | null;
  paidAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An order with its line items (read model). */
export interface OrderWithItems extends Order {
  items: OrderItem[];
  /**
   * Email of the operator (owner/staff) who placed the order, resolved for the
   * queue/history views. null for kiosk self-serve; undefined when not resolved.
   */
  performedByEmail?: string | null;
}

/**
 * A customer of a shop, identified by phone (normalized digits). Optional —
 * a walk-in order stays anonymous unless the customer gives a phone.
 */
export interface Customer {
  id: string;
  shopId: string;
  phone: string;
  displayName: string | null;
  /** Opaque code embedded in the customer's QR (staff scan instead of typing). */
  publicCode: string;
  /** Online order membership status: 'none' | 'pending' | 'approved' | 'rejected'. */
  onlineOrderStatus: "none" | "pending" | "approved" | "rejected" | "expired";
  /** ISO 8601 timestamp when the pending online-order request was created. */
  onlineOrderRequestedAt: string | null;
  /** ISO 8601 timestamp when the status was last reviewed by staff. */
  onlineOrderReviewedAt: string | null;
  /** User ID of the staff member who approved/rejected. */
  onlineOrderReviewedBy: string | null;
  /** Last rejection time (kept across re-requests; drives the 30-day cooldown). */
  onlineOrderRejectedAt: string | null;
  /** CRM: shop-internal note. */
  note?: string | null;
  /** CRM: lowercase tags ("vip", "regular", custom). */
  tags?: string[];
  /** CRM: shop block (no ordering / re-signup). */
  blockedAt?: string | null;
  blockedBy?: string | null;
  /** CRM: new-member order cap lifted early. */
  newMemberClearedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Billing ---

/** Platform-wide singleton settings (soft-launch billing switches). */
export interface PlatformSettings {
  id: string;
  billingUiEnabled: boolean;
  orderThresholdBillingEnabled: boolean;
  orderThresholdCount: number;
  /** Off = overdue shops keep working (warn-only); admin suspension still applies. */
  shopSuspensionEnabled: boolean;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  shopId: string;
  status: SubscriptionStatus;
  /** Per-day rate for custom top-ups, in satang. */
  pricePerDaySatang: number;
  /** Vestigial old monthly price; unused going forward. */
  amountSatang: number;
  currentPeriodStartAt: string;
  /** Expiry / paid-through date. */
  currentPeriodDueAt: string;
  /** Set when the shop is temporarily paused (billing clock frozen); else null. */
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  shopId: string;
  subscriptionId: string;
  amountSatang: number;
  /** Base days this top-up buys. */
  daysToAdd: number;
  /** Free bonus days granted on approval. */
  bonusDays: number;
  /** Preset package id, or null for a custom-day order. */
  packageId: string | null;
  slipUrl: string;
  status: PaymentStatus;
  submittedBy: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectReason: string | null;
  coversPeriodStartAt: string | null;
  coversPeriodDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopupTransaction {
  id: string;
  shopId: string;
  paymentId: string | null;
  type: TopupTxType;
  daysAdded: number;
  bonusDaysAdded: number;
  amountSatang: number;
  expiryBeforeAt: string | null;
  expiryAfterAt: string;
  performedBy: string;
  note: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export type ContactRequestSource = "operator" | "public";

export interface ContactRequest {
  id: string;
  /** Null for public (login-page) requests. */
  shopId: string | null;
  createdBy: string | null;
  /** Email the reporter typed (public requests) — helps admin find the account. */
  email: string | null;
  source: ContactRequestSource;
  ipAddress: string | null;
  subject: string;
  message: string;
  contactChannel: string;
  status: ContactRequestStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/**
 * An account previously used to sign in on this device (FB-style account
 * switcher). Stored device-side; never includes credentials or a session.
 */
export interface KnownAccount {
  email: string;
  role: Role;
}


// --- Shop promotions (customer-facing promo cards) ---

export interface ShopPromotion {
  id: string;
  shopId: string;
  title: string;
  description: string | null;
  /** Optional image URL (https). */
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  /** ISO 8601 show-window; null = open-ended on that side. */
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Loyalty (stamp card + spend points) ---

export interface LoyaltyStampType {
  id: string;
  shopId: string;
  name: string;
  threshold: number;
  rewardText: string;
  priceSatang: number | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Identity anchor only — balances live per stamp type. */
export interface LoyaltyStampCard {
  id: string;
  shopId: string;
  customerId: string;
  updatedAt: string;
}

export interface LoyaltyStampBalance {
  id: string;
  cardId: string;
  stampTypeId: string;
  currentStamps: number;
  lifetimeStamps: number;
  rewardsEarned: number;
  updatedAt: string;
}

export type LoyaltyStampTxType = "earn" | "redeem_adjust";

export interface LoyaltyStampTransaction {
  id: string;
  shopId: string;
  branchId: string | null;
  customerId: string;
  cardId: string;
  stampTypeId: string | null;
  type: LoyaltyStampTxType;
  quantity: number;
  performedBy: string;
  note: string | null;
  createdAt: string;
}

export interface LoyaltyStampRedemption {
  id: string;
  shopId: string;
  branchId: string | null;
  customerId: string;
  cardId: string;
  stampTypeId: string | null;
  rewardTextSnapshot: string;
  stampsSpent: number;
  performedBy: string;
  createdAt: string;
}

export interface StampTypeProgress {
  type: LoyaltyStampType;
  currentStamps: number;
  lifetimeStamps: number;
  rewardsEarned: number;
  eligibleToRedeem: boolean;
  remaining: number;
}

export interface CustomerStampCardView {
  customer: Customer;
  types: StampTypeProgress[];
}

export interface LoyaltyPointsSettings {
  id: string;
  shopId: string;
  /** Satang of spend = 1 point (e.g. 10000 → ฿100 = 1 pt). */
  satangPerPoint: number;
  minRedeemPoints: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyPointsBalance {
  id: string;
  shopId: string;
  customerId: string;
  currentPoints: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string;
}

export type LoyaltyPointsTxType = "earn" | "redeem" | "adjust";

export interface LoyaltyPointsTransaction {
  id: string;
  shopId: string;
  customerId: string;
  type: LoyaltyPointsTxType;
  quantity: number;
  performedBy: string | null;
  orderId: string | null;
  rewardId: string | null;
  note: string | null;
  createdAt: string;
}

export interface LoyaltyPointsReward {
  id: string;
  shopId: string;
  name: string;
  pointsCost: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPointsView {
  customer: Customer;
  balance: LoyaltyPointsBalance;
  settings: LoyaltyPointsSettings;
  rewards: LoyaltyPointsReward[];
}
