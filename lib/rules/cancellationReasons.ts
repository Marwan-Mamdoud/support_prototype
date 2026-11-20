export interface CancellationReason {
  code: string;
  label: string;
  group: "COURIER_SIDE" | "OTHER";
  requiresAttachment: boolean;
  courierPayableIfShipped: boolean;
  legacy: boolean;
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  { code: "WRONG_PHONE_NUMBER", label: "Wrong Phone Number", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "INCORRECT_OR_INCOMPLETE_ADDRESS", label: "Incorrect or Incomplete Address", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "MAX_DELIVERY_ATTEMPTS", label: "Delivery Attempts Exhausted", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "CUSTOMER_REFUSED", label: "Customer Refused Delivery", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "POSTPONEMENT_PERIOD_EXCEEDED", label: "Postponement Period Exceeded", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "CUSTOMER_UNREACHABLE", label: "Customer Unreachable", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "WRONG_ORDER", label: "Wrong Order", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "BAD_SIZE", label: "Bad Size", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "PROBLEM_WITH_PRODUCT", label: "Problem With Product", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "SENDER_CANCELLED", label: "Sender Cancelled", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "OTHER", label: "Other", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "PRODUCT_ISSUE", label: "Product Issue", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
  { code: "SHOPIFY", label: "Cancelled from Shopify", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
  { code: "WHATSAPP", label: "Cancelled via WhatsApp", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
];

export function getCancellationReason(code: string | null | undefined): CancellationReason | undefined {
  if (!code) return undefined;
  return CANCELLATION_REASONS.find((r) => r.code === code);
}

export function activeCancellationReasons(): CancellationReason[] {
  return CANCELLATION_REASONS.filter((r) => !r.legacy);
}
