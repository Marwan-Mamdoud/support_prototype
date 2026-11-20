const STREET_WORDS = [
  "street",
  "st",
  "road",
  "rd",
  "building",
  "tower",
  "near",
  "شارع",
  "ش",
  "طريق",
  "عمارة",
  "برج",
  "بجوار",
  "امام",
];

export function isAddressValid(raw: string): boolean {
  const a = (raw || "").trim();
  if (a.length < 15) return false;
  const words = a.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const lower = a.toLowerCase();
  const hasDigit = /\d/.test(a);
  const hasStreetWord = STREET_WORDS.some((w) => lower.includes(w.toLowerCase()));
  if (!hasDigit && !hasStreetWord) return false;
  return true;
}
