"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Plus, ArrowRight, Building2, ArrowUp, ArrowDown, Minus } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  serviceScheme: string;
  active: boolean;
  pendingCount: number;
  processingCount: number;
  backlogCount: number;
  backlogDays: number;
  usualDailyOrders: number;
  onHoldCount: number;
  openShipments: number;
  oldestShipmentAgeHours: number;
  deliveryRate30d: number;
  deliveryTrend: number;
  returnRate30d: number;
  returnTrend: number;
  openTickets: number;
  oldestOpenIssueAgeHours: number;
  unprocessedDropoffs: number;
  restricted: boolean;
};

export default function ClientsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scheme, setScheme] = useState("");
  const [active, setActive] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients", "metrics", q, scheme, active],
    queryFn: async () =>
      (await (
        await fetch(`/api/clients/metrics?q=${encodeURIComponent(q)}&scheme=${scheme}&active=${active}`)
      ).json()) as {
        brands: Brand[];
      },
  });
  const items = data?.brands || [];

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await fetch("/api/me")).json() });
  const isSuper = me?.role === "SUPER";

  const reset = () => {
    setQ("");
    setScheme("");
    setActive("");
  };

  const Trend = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />;
    if (value < 0) return <ArrowDown className="w-3.5 h-3.5 text-rose-600" />;
    return <Minus className="w-3.5 h-3.5 text-primary/40" />;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Filter strip */}
      <div className="bg-white border-2 border-primary rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {isSuper && (
          <Button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all ml-auto">
            <Plus className="w-4 h-4 text-secondary" />
            <span>Add Client</span>
          </Button>
        )}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
          <Input
            placeholder="SEARCH BRAND, PHONE, EMAIL..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="pl-9 pr-3 py-2 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold uppercase placeholder:text-primary/50 text-primary focus-visible:ring-primary focus:border-primary h-10"
          />
        </div>
        <div className="relative">
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/60 transition-colors h-11"
          >
            <option value="">SCHEME: ALL</option>
            <option value="PICKUP">PICKUP</option>
            <option value="DROPOFF">DROPOFF</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/60 transition-colors h-11"
          >
            <option value="">STATUS: ALL</option>
            <option value="true">ACTIVE: TRUE</option>
            <option value="false">ACTIVE: FALSE</option>
          </select>
        </div>
        <Button
          onClick={reset}
          variant="outline"
          className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-primary/85 hover:text-primary bg-surface-50 border-surface-200 hover:border-primary/40 transition-colors flex items-center gap-1.5 h-10"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Loading / Empty */}
      {isLoading && <div className="py-8 text-center text-primary/70 font-bold uppercase">Loading...</div>}
      {!isLoading && items.length === 0 && (
        <div className="py-14 px-6 text-center bg-white border-2 border-primary rounded-2xl">
          <Building2 className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <div className="text-sm font-black uppercase tracking-wider text-primary">NO CLIENTS MATCH CURRENT FILTERS</div>
          <p className="text-xs font-bold uppercase text-primary/75 mt-1">CLEAR SEARCH OR FILTERS TO VIEW ALL REGISTERED BRANDS</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((c) => {
          const backlogTotal = c.pendingCount + c.processingCount;
          const trackPct = Math.min(100, Math.max(0, (c.backlogDays / 3) * 100));
          const tickPct = Math.min(100, (1 / 3) * 100);
          const isBacklogHigh = c.backlogDays > 1;
          const issueAgeDays = Math.floor(c.oldestOpenIssueAgeHours / 24);

          return (
            <div
              key={c.id}
              className="client-card border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
            >
              <div className="p-5 flex-1">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      c.active ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <h2 className="text-sm font-black uppercase tracking-wider text-primary truncate">{c.name}</h2>
                </div>

                {/* Big pending + processing */}
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-3xl font-black mono-num text-primary">{backlogTotal}</span>
                  <span className="text-xs font-bold uppercase text-primary/60">
                    Pending {c.pendingCount} + Processing {c.processingCount}
                  </span>
                </div>

                {/* Track bar */}
                <div className="relative h-2 bg-surface-100 rounded-full mt-3 mb-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBacklogHigh ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${trackPct}%` }}
                  />
                  <div
                    className="absolute top-[-2px] w-px h-3 bg-primary/60"
                    style={{ left: `${tickPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-primary/50 mb-4">
                  <span>0</span>
                  <span>usual day ({c.usualDailyOrders})</span>
                  <span>3x</span>
                </div>

                {/* Backlog days */}
                <div className="flex justify-between items-center text-xs mb-4">
                  <span className="font-bold uppercase text-primary/75">Backlog vs usual</span>
                  <span className={`font-black mono-num ${isBacklogHigh ? "text-rose-600" : "text-emerald-600"}`}>
                    {c.backlogDays} days of work
                  </span>
                </div>

                <div className="border-t border-surface-200 my-3" />

                {/* Metrics rows */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase text-primary/60">Stuck orders</span>
                    <span className="font-black mono-num text-primary">{c.openShipments}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase text-primary/60">Open issues</span>
                    <span className="font-black mono-num text-primary">
                      {c.openTickets}
                      {c.openTickets > 0 && <span className="text-primary/50 font-bold ml-1">(oldest {issueAgeDays}d)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase text-primary/60">Delivery rate 30d</span>
                    <span className="font-black mono-num text-primary flex items-center gap-1">
                      {c.deliveryRate30d}%
                      <Trend value={c.deliveryTrend} />
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase text-primary/60">Returned rate 30d</span>
                    <span className="font-black mono-num text-primary flex items-center gap-1">
                      {c.returnRate30d}%
                      <Trend value={c.returnTrend} />
                    </span>
                  </div>
                </div>

                {c.restricted && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center mt-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">RESTRICTED</span>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/50">{c.serviceScheme} SCHEME</span>
                <Button
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
