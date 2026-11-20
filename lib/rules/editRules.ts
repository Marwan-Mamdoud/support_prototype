import { FINAL_STATUSES } from "./constants";

export type EditableScope = "all" | "address_subtotal_total" | "address_only" | "none";

export function editableScope(status: string, statusHistoryKeys: string[]): EditableScope {
  if (status === "pending") return "all";
  if (status === "processing") return "address_subtotal_total";
  if (status === "outOfStock") {
    const allowed = new Set(["pending", "outOfStock"]);
    const ok = statusHistoryKeys.every((k) => allowed.has(k));
    return ok ? "address_only" : "none";
  }
  return "none";
}

export function canEditField(scope: EditableScope, field: string): boolean {
  const ALL_FIELDS = new Set([
    "customerName",
    "customerFirstName",
    "customerLastName",
    "customerPhone",
    "customerAddress",
    "customerGovernorate",
    "products",
    "subtotal",
    "total",
    "shippingFees",
    "shippingHandledBy",
    "paymentMethod",
    "paymentStatus",
    "canOpenPackage",
    "notes",
    "courierId",
    "courierNotes",
    "deliveryAttempts",
    "trackingNumber",
    "currentLocation",
    "specialHandling",
  ]);
  if (scope === "none") return false;
  if (scope === "all") return ALL_FIELDS.has(field);
  if (scope === "address_subtotal_total") return ["customerAddress", "subtotal", "total"].includes(field);
  if (scope === "address_only") return field === "customerAddress";
  return false;
}

export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.has(status as any);
}
