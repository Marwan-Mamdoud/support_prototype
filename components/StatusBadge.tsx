import { cn } from "@/lib/utils";
import { humanize } from "@/lib/time";

const colors: Record<string, string> = {
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  collected: "bg-emerald-100 text-emerald-700 border-emerald-200",
  outForDelivery: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  pickedUp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  postponed: "bg-amber-100 text-amber-700 border-amber-200",
  outOfStock: "bg-purple-100 text-purple-700 border-purple-200",
  returned: "bg-rose-100 text-rose-700 border-rose-200",
  RTW: "bg-rose-100 text-rose-700 border-rose-200",
  RTO: "bg-rose-100 text-rose-700 border-rose-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  packed: "bg-slate-100 text-slate-700 border-slate-200",
  QC: "bg-slate-100 text-slate-700 border-slate-200",
  droppedOff: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase shadow-md", colors[status] || "bg-slate-100 text-slate-700 border-slate-200")}>
      {humanize(status)}
    </span>
  );
}
