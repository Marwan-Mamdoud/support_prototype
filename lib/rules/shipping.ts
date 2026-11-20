import { defaultShippingFee } from "./constants";

export function computeTotal(subtotal: number, shippingFees: number, handler: string): number {
  if (handler === "TURUQ") return subtotal + 0;
  if (handler === "CUSTOMER") return subtotal + shippingFees;
  // BRAND: fee charged to brand, not added to total
  return subtotal;
}

export function applyShippingHandler(
  handler: string,
  governorate: string,
  subtotal: number,
  currentShipping: number
): { shippingFees: number; total: number } {
  let shippingFees = currentShipping;
  if (handler === "TURUQ") shippingFees = 0;
  else if (shippingFees == null || Number.isNaN(shippingFees)) {
    shippingFees = defaultShippingFee(governorate);
  }
  const total = computeTotal(subtotal, shippingFees, handler);
  return { shippingFees, total };
}
