// Central rule constants (section 5, 10). Keep all tunable rule sets here.

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "packed",
  "QC",
  "pickedUp",
  "droppedOff",
  "outForDelivery",
  "postponed",
  "outOfStock",
  "delivered",
  "collected",
  "returned",
  "RTW",
  "RTO",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "delivered",
  "collected",
  "cancelled",
  "returned",
  "RTW",
  "RTO",
]);

export const SUCCESS_STATUSES: ReadonlySet<OrderStatus> = new Set(["delivered", "collected"]);
export const FAILED_STATUSES: ReadonlySet<OrderStatus> = new Set(["returned", "cancelled", "RTW", "RTO"]);

export const ISSUE_FLAG_TYPES = [
  "ticket",
  "return_missing_items",
  "return_wrong_items",
  "invalid_address",
  "invalid_phone_number",
  "delayed_shipment",
  "defective_items",
  "other",
] as const;
export type IssueFlagType = (typeof ISSUE_FLAG_TYPES)[number];

export const REPORTER_ROLES = ["system", "brand", "support", "warehouse", "distribution_center"] as const;
export type ReporterRole = (typeof REPORTER_ROLES)[number];

export const SPECIAL_HANDLING = ["none", "urgent", "vip", "replacement"] as const;
export type SpecialHandling = (typeof SPECIAL_HANDLING)[number];

export const SHIPPING_HANDLED_BY = ["CUSTOMER", "BRAND", "TURUQ"] as const;
export type ShippingHandledBy = (typeof SHIPPING_HANDLED_BY)[number];

export const PAYMENT_METHODS = ["CASH", "INSTAPAY", "VISA", "FLASH"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["PAID", "UNPAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CURRENT_LOCATIONS = [
  "warehouse",
  "brand_storage",
  "distribution_center",
  "with_courier",
  "with_carrier",
  "returns_team",
] as const;
export type CurrentLocation = (typeof CURRENT_LOCATIONS)[number];

export const ORDER_TYPES = ["NORMAL", "PROMOTIONAL", "REFUND", "EXCHANGE"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PROVIDERS = ["SHOPIFY", "WOOCOMMERCE", "OPENAPI"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const SERVICE_SCHEMES = ["WAREHOUSE", "PICKUP"] as const;
export type ServiceScheme = (typeof SERVICE_SCHEMES)[number];

export const CANCELLATION_REVIEW_STATUSES = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;
export type CancellationReviewStatus = (typeof CANCELLATION_REVIEW_STATUSES)[number];

export const CANCELLED_BY = ["SUPPORT", "BRAND", "COURIER", "SYSTEM"] as const;
export type CancelledBy = (typeof CANCELLED_BY)[number];

export const ALERT_TYPES = ["NEW_FLAG", "STATUS_UPDATED"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const DROPOFF_DESTINATION_TYPES = ["BRAND", "WAREHOUSE"] as const;
export type DropoffDestinationType = (typeof DROPOFF_DESTINATION_TYPES)[number];

export const BATCH_STATUSES = ["OPEN", "CLOSED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

// Location defaults by status (5.17)
export const DEFAULT_LOCATION_BY_STATUS: Record<string, CurrentLocation | null> = {
  pending: null, // set by service scheme
  processing: "distribution_center",
  pickedUp: "with_courier",
  outForDelivery: "with_courier",
  postponed: "distribution_center",
  outOfStock: null, // same as pending
  RTW: "warehouse",
  RTO: "brand_storage",
  returned: "returns_team",
  delivered: null,
  collected: null,
  cancelled: null, // keeps previous
};

export const STALE_HOURS_OPTIONS = [24, 48, 72] as const;

export const GOVERNORATE_DEFAULT_SHIPPING: Record<string, number> = {
  CAIRO: 60,
  GIZA: 60,
  HELWAN: 60,
  "6TH OF OCTOBER": 60,
  ALEXANDRIA: 70,
};

export function defaultShippingFee(governorate: string): number {
  const key = (governorate || "").toUpperCase();
  return GOVERNORATE_DEFAULT_SHIPPING[key] ?? 90;
}
