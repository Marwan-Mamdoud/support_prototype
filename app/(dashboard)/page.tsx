"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Package, Flag, Trophy, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const HEATMAP_STATUSES = ["pending", "processing", "outOfStock", "outForDelivery", "returned"];
const AGE_BUCKETS = ["0-1 day", "2-3 days", "4-7 days", "+7 days"];
const HEATMAP_COLORS = [
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-orange-100 text-orange-900",
  "bg-rose-100 text-rose-900",
];

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => (await fetch("/api/dashboard/metrics")).json(),
  });

  if (isLoading) return <div className="p-8 text-center text-primary/70 font-bold uppercase">Loading dashboard...</div>;

  const lateNoFlag = data?.lateNoFlagCount ?? 0;
  const oldFlags = data?.openFlagsOver24hCount ?? 0;
  const heatmap = data?.heatmap || {};
  const todayByBrand = data?.todayByBrand || {};
  const flagsByBrand = data?.flagsByBrand || {};
  const specialByBrand = data?.specialHandlingByBrand || {};

  const maxHeatmap = Math.max(1, ...HEATMAP_STATUSES.flatMap((s) => AGE_BUCKETS.map((b) => Number(heatmap[s]?.[b] || 0))));
  const maxToday = Math.max(1, ...Object.values(todayByBrand).map((v) => Number(v)));
  const maxFlags = Math.max(1, ...Object.values(flagsByBrand).map((v) => Number(v)));
  const maxSpecial = Math.max(1, ...Object.values(specialByBrand).map((v) => Number(v)));

  const StatCard = ({ icon: Icon, label, value, color, onClick }: any) => (
    <div
      onClick={onClick}
      className={`border-2 rounded-2xl bg-white p-5 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow ${color.border}`}
    >
      <div>
        <span className={`text-[10px] font-black uppercase tracking-widest block ${color.label}`}>{label}</span>
        <span className="text-3xl font-black mono-num text-primary mt-1 block">{value}</span>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.bg}`}>
        <Icon className={`w-6 h-6 ${color.icon}`} />
      </div>
    </div>
  );

  const BarChart = ({ title, data, max, color }: any) => (
    <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
      <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-secondary" />
        <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-5 space-y-3">
        {Object.keys(data).length === 0 && <div className="text-xs font-black uppercase text-primary/70">No data</div>}
        {Object.entries(data)
          .sort((a: any, b: any) => b[1] - a[1])
          .map(([brand, count]: [string, any]) => {
            const pct = max ? Math.round((count / max) * 100) : 0;
            return (
              <div key={brand} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-black uppercase">
                  <span className="text-secondary-950 truncate flex-1">{brand}</span>
                  <span className="mono-num text-secondary-950 ml-2">{count}</span>
                </div>
                <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6 min-h-screen bg-surface-50">
      <header className="h-16 px-8 border-b-2 border-primary bg-white flex items-center justify-between -mx-8 -mt-8 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-primary" />
            <span>Dashboard</span>
          </h1>
        </div>
        <Button
          onClick={() => router.push("/create-order")}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md"
        >
          <span>+</span>
          <span>Create Order</span>
        </Button>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Late Orders (No Flag)"
          value={lateNoFlag}
          color={{ border: "border-amber-400", label: "text-amber-700", bg: "bg-amber-100", icon: "text-amber-700" }}
          onClick={() => router.push("/stale-orders")}
        />
        <StatCard
          icon={Flag}
          label="Open Flags > 24h"
          value={oldFlags}
          color={{ border: "border-rose-500", label: "text-rose-700", bg: "bg-rose-100", icon: "text-rose-700" }}
          onClick={() => router.push("/alerts")}
        />
        <StatCard
          icon={Package}
          label="Total Orders Today"
          value={Object.values(todayByBrand).reduce((a: any, b: any) => a + b, 0)}
          color={{ border: "border-primary", label: "text-primary/75", bg: "bg-primary/10", icon: "text-primary" }}
          onClick={() => router.push("/orders")}
        />
        <StatCard
          icon={AlertTriangle}
          label="Special Handling Active"
          value={Object.values(specialByBrand).reduce((a: any, b: any) => a + b, 0)}
          color={{ border: "border-purple-500", label: "text-purple-700", bg: "bg-purple-100", icon: "text-purple-700" }}
          onClick={() => router.push("/orders")}
        />
      </div>

      {/* Heatmap */}
      <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-secondary" />
            <h2 className="text-xs font-black uppercase tracking-widest">Status Age Heatmap</h2>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-secondary">By last status change</span>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 pr-4">Status</th>
                {AGE_BUCKETS.map((b) => (
                  <th key={b} className="text-center text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 px-2">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEATMAP_STATUSES.map((status) => (
                <tr key={status} className="border-t border-surface-200">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-black uppercase text-secondary-950">{status}</span>
                  </td>
                  {AGE_BUCKETS.map((bucket, idx) => {
                    const count = heatmap[status]?.[bucket] || 0;
                    const intensity = maxHeatmap ? count / maxHeatmap : 0;
                    return (
                      <td key={bucket} className="py-2 px-2">
                        <div
                          className={`rounded-xl h-12 flex items-center justify-center text-xs font-black mono-num ${
                            count === 0 ? "bg-surface-50 text-surface-400" : HEATMAP_COLORS[idx]
                          }`}
                          style={{ opacity: count === 0 ? 1 : 0.4 + intensity * 0.6 }}
                        >
                          {count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BarChart title="Orders Created Today by Brand" data={todayByBrand} max={maxToday} color="bg-primary" />
        <BarChart title="Orders With Open Flags by Brand" data={flagsByBrand} max={maxFlags} color="bg-rose-600" />
        <BarChart title="Special Handling Orders by Brand" data={specialByBrand} max={maxSpecial} color="bg-purple-600" />
      </div>
    </div>
  );
}
