import { defaultShippingFee } from "./constants";

export function computeSubtotal(
  type: string,
  products: number,
  shippingFees: number,
  handler: string,
  paymentStatus: string
): number {
  const P = products;
  const S = shippingFees;
  const isRefund = type === "REFUND";
  const isPaid = paymentStatus === "PAID";
  if (isPaid) return -shippingFees;
  if (isRefund) {
    if (handler === "BRAND") return -P - S;
    return -P;
  }
  if (handler === "BRAND") return P - S;
  return P;
}

export function computeTotal(
  type: string,
  products: number,
  shippingFees: number,
  handler: string,
  paymentStatus: string
): number {
  const P = products;
  const S = shippingFees;
  const isRefund = type === "REFUND";
  const isPaid = paymentStatus === "PAID";
  if (isPaid) return 0;
  if (isRefund) {
    if (handler === "CUSTOMER") return S - P;
    return -P;
  }
  const customerShipping = (type === "PROMOTIONAL" || handler !== "CUSTOMER") ? 0 : S;
  return P + customerShipping;
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
  const total = computeTotal("NORMAL", subtotal, shippingFees, handler, "UNPAID");
  return { shippingFees, total };
}
