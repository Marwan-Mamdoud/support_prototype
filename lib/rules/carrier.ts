export type Carrier = "Bosta" | "ShipBlu" | "Turuq";

export function detectCarrier(courierName?: string | null): Carrier {
  if (!courierName) return "Turuq";
  const n = courierName.trim().toLowerCase();
  if (n === "bosta") return "Bosta";
  if (n === "shipblu") return "ShipBlu";
  return "Turuq";
}

export function carrierTrackingUrl(carrier: Carrier, trackingNumber?: string | null): string | null {
  if (!trackingNumber) return null;
  if (carrier === "Bosta") return `https://business.bosta.co/orders/${trackingNumber}`;
  if (carrier === "ShipBlu") return `https://app.shipblu.com/order/${trackingNumber}`;
  return null;
}
