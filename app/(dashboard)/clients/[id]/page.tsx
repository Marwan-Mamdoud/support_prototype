"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Building2,
  BarChart3,
  PieChart,
  Trophy,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  Truck,
} from "lucide-react";
import { formatDate } from "@/lib/time";
import { ORDER_STATUSES } from "@/lib/rules/constants";

interface ClientProfile {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  serviceScheme: string;
  active: boolean;
  createdAt?: string;
}

interface BrandCounts {
  statusCounts: Record<string, number>;
  deliveredCount: number;
  pendingCount: number;
  processingCount: number;
  backlogCount: number;
  backlogDays: number;
  usualDailyOrders: number;
  openShipments: number;
  deliveryRate30d: number;
  deliveryTrend: number;
  returnRate30d: number;
  returnTrend: number;
  openTickets: number;
  outOfStockOrders: number;
  cancelledAfterShipment30d: number;
  avgDeliveryTimeHours: number;
  companyAvgDeliveryTimeHours: number;
  volume30d: number;
  volumePrev30d: number;
  volumeTrend: number;
  todayVolume: number;
  yesterdayVolume: number;
  todayTrend: number;
  turuqCount: number;
  integrationCount: number;
  courierDistribution: { turuq: number; bosta: number; shipblu: number; other: number };
  companyDeliveredCount: number;
  deliveredSharePct: number;
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await fetch(`/api/clients?id=${id}`)).json(),
  });
  const client = (clientData?.client ?? null) as ClientProfile | null;

  const { data: brand } = useQuery<BrandCounts>({
    queryKey: ["client-brand", id],
    queryFn: async () => (await fetch(`/api/clients/${id}/stats/brand`)).json(),
  });

  const { data: today } = useQuery({
    queryKey: ["client-today", id],
    queryFn: async () => (await fetch(`/api/clients/${id}/stats/today`)).json(),
  });

  const [from, setFrom] = useState(() => new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: perf, refetch } = useQuery({
    queryKey: ["client-perf", id, from, to],
    queryFn: async () => (await fetch(`/api/clients/${id}/stats/performance?from=${from}&to=${to}&groupBy=day`)).json(),
  });

  const [statusTab, setStatusTab] = useState<"total" | "daily">("total");
  const [mainTab, setMainTab] = useState<"orders" | "performance">("orders");

  if (isLoading) return <div className="py-8 text-center text-slate-500 font-medium uppercase">Loading...</div>;
  if (!client) return <div className="py-8 text-center text-slate-500 font-medium uppercase">Client not found</div>;

  const initials = (client.companyName || client.name)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dailyStatus = (today?.byStatus || {}) as Record<string, number>;
  const statusCounts = ORDER_STATUSES.map((s) => ({
    label: s.replace(/([A-Z])/g, " $1").trim(),
    value: statusTab === "total" ? brand?.statusCounts?.[s] ?? 0 : dailyStatus[s] ?? 0,
  }));

  const brandData = [
    { label: "Name", value: client.name },
    { label: "Company", value: client.companyName },
    { label: "Phone", value: client.phone },
    { label: "Email", value: client.email },
    { label: "Service Scheme", value: client.serviceScheme },
    { label: "Active", value: client.active ? "Yes" : "No" },
    { label: "Created", value: client.createdAt ? formatDate(client.createdAt) : "—" },
  ];

  // Performance helpers
  const overTime = perf?.overTime || [];
  const maxOverTime = Math.max(1, ...overTime.map((d: any) => (d.turuq || 0) + (d.integration || 0)));
  const outcome = perf?.outcome || { delivered: 0, returned: 0, cancelled: 0 };
  const maxOutcome = Math.max(1, outcome.delivered, outcome.returned, outcome.cancelled);
  const todayVol = brand?.todayVolume ?? today?.today ?? 0;
  const yesterdayVol = brand?.yesterdayVolume ?? today?.yesterday ?? 0;
  const turuqToday = brand?.turuqCount ?? today?.bySource?.turuq ?? 0;
  const intToday = brand?.integrationCount ?? today?.bySource?.integration ?? 0;
  const totalSource = turuqToday + intToday;
  const courierTotal =
    (brand?.courierDistribution.turuq ?? 0) +
    (brand?.courierDistribution.bosta ?? 0) +
    (brand?.courierDistribution.shipblu ?? 0) +
    (brand?.courierDistribution.other ?? 0);

  const Tile = ({ label, value, color = "text-slate-900" }: any) => (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );

  const ProgressBar = ({ label, value, total, color = "bg-primary" }: any) => {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium uppercase">
          <span className="text-slate-700">{label}</span>
          <span className="text-slate-900 mono-num">{value} ({pct}%)</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <header className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <Button
          onClick={() => router.push("/clients")}
          variant="outline"
          className="px-3 py-2 rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium uppercase tracking-wider text-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Clients</span>
        </Button>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-sm tracking-wider">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{client.companyName}</h1>
            <div className="text-[11px] text-slate-500 mt-0.5">{client.email} · {client.phone}</div>
          </div>
        </div>
      </header>

      {/* Brand data + status counts */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Brand Data</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandData.map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="text-sm font-semibold text-slate-900 mt-1 break-words">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Order Status Counts</h2>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setStatusTab("total")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                statusTab === "total" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("daily")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                statusTab === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Daily
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statusCounts.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="text-2xl font-semibold text-slate-900 mono-num mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setMainTab("orders")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            mainTab === "orders" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PieChart className="w-4 h-4" />
          Orders
        </button>
        <button
          type="button"
          onClick={() => setMainTab("performance")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            mainTab === "performance" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Performance
        </button>
      </div>

      {/* Orders tab */}
      {mainTab === "orders" && (
        <div className="space-y-6">
          {/* Orders over time */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Orders Over Time (by source)</h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Turuq</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-secondary-500" /> Integration</span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-end gap-3 h-40 border-b border-slate-100 pb-2">
                {overTime.length === 0 && (
                  <div className="w-full text-center text-xs font-medium text-slate-400">No data for selected range</div>
                )}
                {overTime.map((d: any) => {
                  const tH = maxOverTime ? (d.turuq / maxOverTime) * 100 : 0;
                  const iH = maxOverTime ? (d.integration / maxOverTime) * 100 : 0;
                  return (
                    <div key={d.bucket} className="flex-1 flex flex-col items-center gap-2 justify-end h-full">
                      <div className="flex items-end gap-1 h-32">
                        <div className="w-3 bg-primary rounded-t" style={{ height: `${Math.max(3, tH)}%` }} />
                        <div className="w-3 bg-secondary-500 rounded-t" style={{ height: `${Math.max(3, iH)}%` }} />
                      </div>
                      <span className="text-[9px] font-medium text-slate-500 mono-num">{formatDate(d.bucket)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 h-9 bg-slate-50 border-slate-200 text-xs font-medium text-slate-700" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36 h-9 bg-slate-50 border-slate-200 text-xs font-medium text-slate-700" />
                <Button onClick={() => refetch()} className="h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium">
                  Apply
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outcome */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Delivered vs Returned vs Cancelled</h2>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Delivered", value: outcome.delivered, color: "bg-emerald-500" },
                  { label: "Returned", value: outcome.returned, color: "bg-amber-500" },
                  { label: "Cancelled", value: outcome.cancelled, color: "bg-rose-500" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-20 text-[11px] font-medium uppercase text-slate-700">{row.label}</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-md overflow-hidden">
                      <div className={`h-full ${row.color} rounded-md`} style={{ width: `${Math.max(3, (row.value / maxOutcome) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold mono-num text-slate-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today vs yesterday + source split */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <Package className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Today Snapshot</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="Today" value={todayVol} />
                  <Tile label="Yesterday" value={yesterdayVol} />
                </div>
                <ProgressBar label="Turuq" value={turuqToday} total={totalSource || 1} color="bg-primary" />
                <ProgressBar label="Integration" value={intToday} total={totalSource || 1} color="bg-secondary-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance tab */}
      {mainTab === "performance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Delivery Rate (30d)" value={`${brand?.deliveryRate30d ?? 0}%`} color="text-emerald-600" />
            <Tile label="Return Rate (30d)" value={`${brand?.returnRate30d ?? 0}%`} color="text-amber-600" />
            <Tile label="Open Tickets" value={brand?.openTickets ?? 0} color="text-rose-600" />
            <Tile label="Out of Stock Orders" value={brand?.outOfStockOrders ?? 0} color="text-rose-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Avg delivery time */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Average Delivery Time</h2>
              </div>
              <div className="p-6 space-y-4">
                <ProgressBar label="Brand" value={brand?.avgDeliveryTimeHours ?? 0} total={Math.max(1, (brand?.companyAvgDeliveryTimeHours ?? 0))} color="bg-primary" />
                <ProgressBar label="Company" value={brand?.companyAvgDeliveryTimeHours ?? 0} total={Math.max(1, (brand?.companyAvgDeliveryTimeHours ?? 0))} color="bg-slate-400" />
                <div className="text-xs font-medium text-slate-500">
                  Brand: {brand?.avgDeliveryTimeHours ?? 0}h · Company: {brand?.companyAvgDeliveryTimeHours ?? 0}h
                </div>
              </div>
            </div>

            {/* 30-day volume */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">30-Day Volume</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="Current 30d" value={brand?.volume30d ?? 0} />
                  <Tile label="Previous 30d" value={brand?.volumePrev30d ?? 0} />
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Trend: <span className="font-semibold text-slate-900">{brand?.volumeTrend ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backlog */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Backlog</h2>
              </div>
              <div className="p-6 space-y-3">
                <Tile label="Pending + Processing" value={brand?.backlogCount ?? 0} />
                <Tile label="Usual Daily Orders" value={brand?.usualDailyOrders ?? 0} />
                <Tile label="Backlog Days" value={brand?.backlogDays ?? 0} />
              </div>
            </div>

            {/* Courier distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Courier Distribution</h2>
              </div>
              <div className="p-6 space-y-3">
                <ProgressBar label="Turuq" value={brand?.courierDistribution.turuq ?? 0} total={courierTotal || 1} color="bg-primary" />
                <ProgressBar label="Bosta" value={brand?.courierDistribution.bosta ?? 0} total={courierTotal || 1} color="bg-secondary-500" />
                <ProgressBar label="Shipblu" value={brand?.courierDistribution.shipblu ?? 0} total={courierTotal || 1} color="bg-emerald-500" />
                <ProgressBar label="Other" value={brand?.courierDistribution.other ?? 0} total={courierTotal || 1} color="bg-slate-400" />
              </div>
            </div>
          </div>

          {/* Delivered share vs company */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-slate-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Delivered Share vs Company</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Tile label="Brand Delivered" value={brand?.deliveredCount ?? 0} />
              <Tile label="Company Delivered" value={brand?.companyDeliveredCount ?? 0} />
              <Tile label="Share" value={`${brand?.deliveredSharePct ?? 0}%`} color="text-emerald-600" />
            </div>
            <div className="px-6 pb-6">
              <ProgressBar label="Brand share of company deliveries" value={brand?.deliveredCount ?? 0} total={brand?.companyDeliveredCount ?? 1} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}