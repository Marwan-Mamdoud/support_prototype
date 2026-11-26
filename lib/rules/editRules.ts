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
  return allowedNextStatuses(status, undefined, false).length > 0;
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
  }
  return set;
}

export function allowedNextStatuses(currentStatus: string, type?: string, isSuper: boolean = false): string[] {
  // End statuses: no outgoing transitions
  if (currentStatus === "collected" || currentStatus === "RTW" || currentStatus === "RTO") return [];

  const out: string[] = [];
  // Rule 1: super can move any non-final order to pending
  if (isSuper) out.push("pending");
  // Rule 2: all accounts can cancel any non-final order
  out.push("cancelled");

  // dedup
  return [...new Set(out)];
}

export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.has(status as any);
}
