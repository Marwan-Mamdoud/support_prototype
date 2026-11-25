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
  return STATUS_EDITABLE_STATUSES.has(status) && allowedNextStatuses(status).length > 0;
}

export function editableFieldsForStatus(status: string, type: string): Set<string> {
  const set = new Set<string>();
  // Phone
  if (["pending", "packed", "pickedUp", "processing", "outOfStock", "outForDelivery", "postponed"].includes(status)) {
    set.add("customerPhone");
  }
  // Address & governorate: only Packed, Picked up, Processing, Out for delivery, Postponed
  if (["packed", "pickedUp", "processing", "outForDelivery", "postponed"].includes(status)) {
    set.add("customerAddress");
    set.add("customerGovernorate");
  }
  // Customer name always allowed
  set.add("customerName");
  set.add("customerFirstName");
  set.add("customerLastName");
  // Other fields
  if (["pending", "processing", "postponed", "outOfStock"].includes(status)) {
    set.add("notes");
    set.add("specialHandling");
  }
  return set;
}

export function allowedNextStatuses(currentStatus: string, type?: string): string[] {
  const isRefund = type === "REFUND";
  if (isRefund && currentStatus === "processing") {
    return ["outForDelivery", "delivered", "QC", "postponed", "droppedOff", "RTW", "RTO"];
  }
  if (isRefund && currentStatus === "outForDelivery") {
    return ["delivered", "QC", "postponed", "droppedOff", "RTW", "RTO"];
  }
  switch (currentStatus) {
    case "pending":
      return ["processing", "packed", "QC", "pickedUp", "droppedOff", "outForDelivery", "postponed", "outOfStock", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"];
    case "outOfStock":
      return ["pending"];
    case "packed":
      return ["processing", "QC", "pickedUp", "droppedOff", "outForDelivery", "postponed", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"];
    case "pickedUp":
      return ["processing", "QC", "droppedOff", "outForDelivery", "postponed", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"];
    case "processing":
      return ["QC", "droppedOff", "outForDelivery", "postponed", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"];
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

export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.has(status as any);
}
