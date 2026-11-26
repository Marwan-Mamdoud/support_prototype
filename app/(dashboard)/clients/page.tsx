"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Search, RefreshCw, Plus, ArrowRight, Building2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/rules/constants";

type Brand = {
  id: string;
  name: string;
  serviceScheme: string;
  active: boolean;
  statusCounts: Record<string, number>;
  pendingCount: number;
  processingCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
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
  const { t } = useLanguage();
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
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Filter strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {isSuper && (
          <Button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-sm hover:shadow transition-all ml-auto">
            <Plus className="w-4 h-4 text-secondary" />
            <span>Add Client</span>
          </Button>
        )}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("clients.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="pl-9 pr-3 py-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium uppercase placeholder:text-slate-400 text-slate-900 focus-visible:ring-primary focus:border-primary h-10"
          />
        </div>
        <div className="relative">
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="appearance-none bg-white border border-slate-300 rounded-xl text-xs font-medium uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/40 transition-colors h-11"
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
            className="appearance-none bg-white border border-slate-300 rounded-xl text-xs font-medium uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/40 transition-colors h-11"
          >
            <option value="">STATUS: ALL</option>
            <option value="true">ACTIVE: TRUE</option>
            <option value="false">ACTIVE: FALSE</option>
          </select>
        </div>
        <Button
          onClick={reset}
          variant="outline"
          className="px-3.5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-slate-700 hover:text-primary bg-slate-50 border-slate-200 hover:border-primary/40 transition-colors flex items-center gap-1.5 h-10"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Loading / Empty */}
      {isLoading && <div className="py-8 text-center text-slate-500 font-medium uppercase">Loading...</div>}
      {!isLoading && items.length === 0 && (
        <div className="py-14 px-6 text-center bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-900">{t("clients.noClients")}</div>
          <p className="text-xs font-medium uppercase text-slate-500 mt-1">CLEAR SEARCH OR FILTERS TO VIEW ALL REGISTERED BRANDS</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((c) => {
          return (
            <div
              key={c.id}
              className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="p-5 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900 truncate">{c.name}</h2>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            c.active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {c.active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="uppercase tracking-wide">{c.serviceScheme}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
                    {c.deliveryRate30d}% delivered
                  </span>
                </div>

                {/* Status counts (all possible statuses) */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <div key={s} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 truncate">
                        {s.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-lg font-semibold text-slate-900 mono-num mt-0.5">{c.statusCounts?.[s] ?? 0}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly delivery rate */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium uppercase tracking-wide">Delivery rate (30d)</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1">
                    {c.deliveryRate30d}%
                    <Trend value={c.deliveryTrend} />
                  </span>
                </div>

                {c.restricted && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center mt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Restricted</span>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{c.serviceScheme} scheme</span>
                <Button
                  onClick={() => router.push(`/clients/${c.id}`)}
                  variant="outline"
                  className="px-3 py-1.5 rounded-lg text-slate-700 border-slate-200 hover:border-primary/40 hover:text-primary text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  <span>View details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}