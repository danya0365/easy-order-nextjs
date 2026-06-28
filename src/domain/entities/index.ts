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
  note: string | null;
  /** Optional customer who placed the order (null for anonymous walk-ins). */
  customerId: string | null;
  /** Name/phone snapshotted at order time (shown in the queue even if erased). */
  customerName: string | null;
  customerPhone: string | null;
  paidAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An order with its line items (read model). */
export interface OrderWithItems extends Order {
  items: OrderItem[];
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
  createdAt: string;
  updatedAt: string;
}

// --- Billing ---

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
