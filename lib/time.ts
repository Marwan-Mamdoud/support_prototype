const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function timeAgo(input: any): string {
  if (!input) return "";
  const d = new Date(input);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(d);
}

export function formatDate(input: any): string {
  if (!input) return "";
  const d = new Date(input);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${hours}:${minutes} ${ampm}`;
}

export function humanize(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  // Title Case, but preserve all-caps acronyms (RTO, RTW, QC, etc.)
  return s.split(" ").map((w) => {
    if (/^[A-Z0-9]+$/.test(w) && w.length <= 4) return w; // keep acronym uppercase
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

export function humanizeUpper(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  return humanize(v).toUpperCase();
}

export function formatAuditValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return humanize(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
