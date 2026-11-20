export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0020")) return "0" + digits.slice(4);
  if (digits.startsWith("20")) return "0" + digits.slice(2);
  return digits;
}

export function isValidPhone(normalized: string): boolean {
  return /^01[0125][0-9]{8}$/.test(normalized);
}
