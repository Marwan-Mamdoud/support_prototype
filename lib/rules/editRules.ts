import { FINAL_STATUSES, ORDER_STATUSES } from "./constants";

// Statuses where at least one data field can be edited
export const DATA_EDITABLE_STATUSES = new Set([
  "pending",
  "processing",
  "packed",
  "pickedUp",
  "outOfStock",
  "outForDelivery",
  "postponed",
]);
export const STATUS_EDITABLE_STATUSES = new Set([
  "pending",
  "processing",
  "packed",
  "QC",
  "pickedUp",
  "droppedOff",
  "outForDelivery",
  "postponed",
  "outOfStock",
  "cancelled",
  "delivered",
  "returned",
]);

export function canEditData(status: string): boolean {
  return DATA_EDITABLE_STATUSES.has(status);
}

export function canEditStatus(status: string): boolean {
  return allowedNextStatuses(status).length > 0;
}

const ALL = ORDER_STATUSES.filter((s) => s !== undefined);

function normalTransitions(s: string): string[] {
  switch (s) {
    case "pending":
      return ORDER_STATUSES.filter((x) => x !== "pending");
    case "outOfStock":
      return ["pending"];
    case "packed":
      return ORDER_STATUSES.filter((x) => x !== "packed" && x !== "pending" && x !== "outOfStock");
    case "pickedUp":
      return ORDER_STATUSES.filter((x) => x !== "pickedUp" && x !== "pending" && x !== "packed" && x !== "outOfStock");
    case "processing":
      return ORDER_STATUSES.filter((x) => x !== "processing" && x !== "pending" && x !== "packed" && x !== "pickedUp" && x !== "outOfStock");
    case "outForDelivery":
      return ["delivered", "cancelled", "postponed"];
    case "delivered":
      return ["collected"];
    case "cancelled":
      return ["returned", "QC", "droppedOff", "RTO", "RTW"];
    case "QC":
      return ["droppedOff", "RTO", "RTW"];
    case "postponed":
      return ["processing", "outForDelivery"];
    case "returned":
      return ["processing", "QC", "RTO", "RTW"];
    case "droppedOff":
      return ["RTW", "RTO"];
    case "collected":
    case "RTW":
    case "RTO":
      return [];
    default:
      return [];
  }
}

export function allowedNextStatuses(currentStatus: string, type?: string): string[] {
  const isRefund = type === "REFUND";
  if (isRefund && currentStatus === "processing") {
    return ["outForDelivery", "delivered", "QC", "postponed", "droppedOff", "RTW", "RTO"];
  }
  if (isRefund && currentStatus === "outForDelivery") {
    return ["delivered", "QC", "postponed", "droppedOff", "RTW", "RTO"];
  }
  return normalTransitions(currentStatus);
}

export function editableFieldsForStatus(status: string, type: string): Set<string> {
  const isRefund = type === "REFUND";
  const set = new Set<string>();
  if (["pending", "processing", "packed", "pickedUp", "outOfStock", "outForDelivery", "postponed"].includes(status)) {
    set.add("subtotal");
    set.add("total");
    set.add("shippingFees");
    set.add("shippingHandledBy");
    set.add("paymentMethod");
    set.add("paymentStatus");
    set.add("refundAmount");
    set.add("exchangeAmount");
  }
  if (["pending", "outOfStock"].includes(status)) {
    set.add("products");
  }
  if (isRefund && ["processing", "outForDelivery", "postponed"].includes(status)) {
    set.add("products");
  }
  if (["pending", "packed", "pickedUp", "processing", "outOfStock", "outForDelivery", "postponed"].includes(status)) {
    set.add("customerPhone");
  }
  if (["pending", "packed", "pickedUp", "processing", "outForDelivery", "postponed", "outOfStock"].includes(status)) {
    set.add("customerAddress");
    set.add("customerGovernorate");
  }
  set.add("customerName");
  set.add("customerFirstName");
  set.add("customerLastName");
  if (["pending", "processing", "postponed", "outOfStock"].includes(status)) {
    set.add("notes");
    set.add("specialHandling");
  }
  return set;
}

export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.has(status as any);
}
