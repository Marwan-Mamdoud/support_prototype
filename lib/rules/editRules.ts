import { FINAL_STATUSES, ORDER_STATUSES } from "./constants";

export const DATA_EDITABLE_STATUSES = new Set(["pending", "processing", "postponed", "outOfStock"]);
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
]);

export function canEditData(status: string): boolean {
  return DATA_EDITABLE_STATUSES.has(status);
}

export function canEditStatus(status: string): boolean {
  return STATUS_EDITABLE_STATUSES.has(status);
}

export function allowedNextStatuses(currentStatus: string): string[] {
  const all = ORDER_STATUSES.filter((s) => s !== currentStatus);
  if (currentStatus === "cancelled") return ["returned"];
  return all;
}

export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.has(status as any);
}
