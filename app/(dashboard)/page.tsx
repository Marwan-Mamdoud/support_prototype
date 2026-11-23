"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Package,
  Flag,
  ArrowRight,
  Building2,
  User,
  Bell,
  CalendarCheck,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMetrics } from "@/lib/brandMetrics";

const HEATMAP_STATUSES = ["pending", "processing", "outOfStock", "outForDelivery", "returned"];
const HEATMAP_COLORS = [
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-orange-100 text-orange-900",
  "bg-rose-100 text-rose-900",
];

interface OpenIssueByType {
  type: string;
  count: number;
  oldestAgeHours: number;
}

interface ProblematicOrder {
  id: string;
  model: "turuq" | "integration";
  oid: string;
  brandName: string;
  status: string;
  daysInStatus: number;
  issueType: string;
  assignedTo: string;
}

interface Summary {
  ticketsAwaitingResponse: { count: number; oldestAgeHours: number };
  myAssignments: number;
  remindersDueToday: number;
  todaySummary: { processed: number; delivered: number; returned: number };
  lastUpdated: string;
}

interface DashboardData {
  problematicPending: {
    totalPending: number;
    pendingWithoutFlag: number;
    openIssuesByType: OpenIssueByType[];
    outOfStockOver7Days: number;
    overdueReturns: number;
    urgentVIPNotMoved: number;
  };
  actionRequired: {
    missingFlag: number;
    outOfStockOver7Days: number;
    validAddressPhoneNoFlag: number;
    cancelledBeforeHub: number;
    twoPlusFailedAttempts: number;
    overdueReturns: number;
  };
  heatmap: Record<string, Record<string, number>>;
  ageBucketLabels: string[];
  openIssuesByTypeAge: Record<string, Record<string, number>>;
  oldestProblematicOrders: ProblematicOrder[];
  problematicBrands: BrandMetrics[];
  summary: Summary;
}

const ACTION_CARDS: {
  key: keyof DashboardData["actionRequired"];
  label: string;
  button: string;
  href: string;
  tone: "amber" | "rose" | "primary" | "purple" | "teal";
}[] = [
  { key: "missingFlag", label: "Pending Missing Flag", button: "Add Flag", href: "/orders", tone: "amber" },
  { key: "outOfStockOver7Days", label: "Out of Stock >7 Days", button: "Review", href: "/orders", tone: "rose" },
  { key: "validAddressPhoneNoFlag", label: "Valid Address/Phone, No Flag", button: "Review", href: "/orders", tone: "primary" },
  { key: "cancelledBeforeHub", label: "Cancelled Before Hub", button: "Review", href: "/orders", tone: "purple" },
  { key: "twoPlusFailedAttempts", label: "2+ Failed Attempts", button: "Review", href: "/alerts", tone: "teal" },
  { key: "overdueReturns", label: "Overdue Returns", button: "Review", href: "/alerts", tone: "rose" },
];

const TONE_STYLES: Record<string, { border: string; label: string; bg: string; badge: string; button: string }> = {
  amber: {
    border: "border-amber-400",
    label: "text-amber-700",
    bg: "bg-amber-100",
    badge: "bg-amber-100 text-amber-800",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  rose: {
    border: "border-rose-500",
    label: "text-rose-700",
    bg: "bg-rose-100",
    badge: "bg-rose-100 text-rose-800",
    button: "bg-rose-600 hover:bg-rose-700",
  },
  primary: {
    border: "border-primary",
    label: "text-primary",
    bg: "bg-primary/10",
    badge: "bg-primary/10 text-primary",
    button: "bg-primary hover:bg-primary/90",
  },
  purple: {
    border: "border-purple-500",
    label: "text-purple-700",
    bg: "bg-purple-100",
    badge: "bg-purple-100 text-purple-800",
    button: "bg-purple-600 hover:bg-purple-700",
  },
  teal: {
    border: "border-teal-500",
    label: "text-teal-700",
    bg: "bg-teal-100",
    badge: "bg-teal-100 text-teal-800",
    button: "bg-teal-600 hover:bg-teal-700",
  },
};

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function formatLastUpdated(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => (await fetch("/api/dashboard/metrics")).json(),
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-6 flex-1 bg-surface-50 min-h-screen">
        <div className="h-8 w-48 bg-primary/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-2 border-surface-200 rounded-2xl bg-white p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border-2 border-surface-200 rounded-2xl bg-white h-80 animate-pulse" />
          <div className="border-2 border-surface-200 rounded-2xl bg-white h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  const { problematicPending, actionRequired, heatmap, ageBucketLabels, openIssuesByTypeAge, oldestProblematicOrders, problematicBrands, summary } = data;

  const maxHeatmap = Math.max(
    1,
    ...HEATMAP_STATUSES.flatMap((s) => ageBucketLabels.map((b) => Number(heatmap[s]?.[b] || 0)))
  );

  const issueTypes = Object.keys(openIssuesByTypeAge).filter((type) =>
    ageBucketLabels.some((b) => Number(openIssuesByTypeAge[type]?.[b] || 0) > 0)
  );

  return (
    <div className="p-8 space-y-8 flex-1 bg-surface-50 min-h-screen">
      {/* Section 1: Problematic Pending Orders */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-primary">Problematic Pending Orders</h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/60">Orders requiring immediate attention</p>
          </div>
        </div>

        {/* Key metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="border-2 border-primary rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Total Pending</span>
            <span className="text-3xl font-black mono-num text-primary mt-1 block">{problematicPending.totalPending}</span>
          </div>
          <div className="border-2 border-amber-400 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">Pending Without Flag</span>
            <span className="text-3xl font-black mono-num text-amber-700 mt-1 block">{problematicPending.pendingWithoutFlag}</span>
          </div>
          <div className="border-2 border-rose-500 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 block">Out of Stock &gt;7 Days</span>
            <span className="text-3xl font-black mono-num text-rose-700 mt-1 block">{problematicPending.outOfStockOver7Days}</span>
          </div>
          <div className="border-2 border-purple-500 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 block">Overdue Returns</span>
            <span className="text-3xl font-black mono-num text-purple-700 mt-1 block">{problematicPending.overdueReturns}</span>
          </div>
          <div className="border-2 border-teal-500 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 block">Urgent / VIP Not Moved</span>
            <span className="text-3xl font-black mono-num text-teal-700 mt-1 block">{problematicPending.urgentVIPNotMoved}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Open issues by type */}
          <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
              <Flag className="w-5 h-5 text-secondary" />
              <h2 className="text-xs font-black uppercase tracking-widest">Open Issues by Type</h2>
            </div>
            <div className="p-5 space-y-3">
              {problematicPending.openIssuesByType.length === 0 && (
                <div className="text-xs font-black uppercase text-primary/70">No open issues</div>
              )}
              {problematicPending.openIssuesByType.map((issue) => (
                <div
                  key={issue.type}
                  className="flex items-center justify-between bg-surface-50 border border-surface-200 rounded-xl p-3"
                >
                  <div>
                    <span className="text-xs font-black uppercase text-secondary-950 block">{issue.type}</span>
                    <span className="text-[10px] font-bold uppercase text-primary/60">Oldest {formatHours(issue.oldestAgeHours)}</span>
                  </div>
                  <span className="text-xl font-black mono-num text-primary">{issue.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Required */}
          <div className="xl:col-span-2 border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              <h2 className="text-xs font-black uppercase tracking-widest">Action Required</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ACTION_CARDS.map((action) => {
                const tone = TONE_STYLES[action.tone];
                return (
                  <div
                    key={action.key}
                    className={`border-2 ${tone.border} rounded-2xl bg-white p-4 shadow-sm flex flex-col gap-3`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${tone.label}`}>{action.label}</span>
                      <span className={`text-2xl font-black mono-num ${tone.label}`}>{Number(actionRequired[action.key] || 0)}</span>
                    </div>
                    <Button
                      onClick={() => router.push(action.href)}
                      className={`w-full rounded-xl text-xs font-black uppercase tracking-wider text-white ${tone.button}`}
                    >
                      {action.button}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-secondary" />
              <h2 className="text-xs font-black uppercase tracking-widest">Status vs Age Heatmap</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">By last status change</span>
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 pr-4">Status</th>
                  {ageBucketLabels.map((b) => (
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
                    {ageBucketLabels.map((bucket, idx) => {
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

        {/* Open issues by type + age */}
        <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            <h2 className="text-xs font-black uppercase tracking-widest">Open Issues by Type &amp; Age</h2>
          </div>
          <div className="p-5 overflow-x-auto">
            {issueTypes.length === 0 ? (
              <div className="text-xs font-black uppercase text-primary/70">No data</div>
            ) : (
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 pr-4">Issue Type</th>
                    {ageBucketLabels.map((b) => (
                      <th key={b} className="text-center text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 px-2">{b}</th>
                    ))}
                    <th className="text-center text-[10px] font-black uppercase tracking-widest text-primary/75 py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {issueTypes.map((type) => {
                    const total = ageBucketLabels.reduce((sum, b) => sum + Number(openIssuesByTypeAge[type]?.[b] || 0), 0);
                    return (
                      <tr key={type} className="border-t border-surface-200">
                        <td className="py-3 pr-4">
                          <span className="text-xs font-black uppercase text-secondary-950">{type}</span>
                        </td>
                        {ageBucketLabels.map((bucket) => {
                          const count = openIssuesByTypeAge[type]?.[bucket] || 0;
                          return (
                            <td key={bucket} className="py-2 px-2 text-center">
                              <span className={`text-xs font-black mono-num ${count > 0 ? "text-primary" : "text-surface-400"}`}>{count}</span>
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center">
                          <span className="text-xs font-black mono-num text-primary">{total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Oldest problematic orders table */}
        <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-secondary" />
              <h2 className="text-xs font-black uppercase tracking-widest">10 Oldest Problematic Orders</h2>
            </div>
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 pr-4">Order ID</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 px-4">Brand</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 px-4">Status</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 px-4">Days in Status</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 px-4">Issue Type</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-primary/75 py-3 pl-4">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {oldestProblematicOrders.map((order) => (
                  <tr key={order.id} className="border-t border-surface-200 hover:bg-surface-50">
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => router.push(`/orders/${order.model}/${order.id}`)}
                        className="text-xs font-black uppercase text-primary hover:underline mono-num"
                      >
                        {order.oid || order.id}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-black uppercase text-secondary-950">{order.brandName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-black uppercase text-primary">{order.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-black mono-num text-secondary-950">{order.daysInStatus}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-black uppercase text-primary">{order.issueType || "—"}</span>
                    </td>
                    <td className="py-3 pl-4">
                      <span className="text-xs font-black uppercase text-primary/75">{order.assignedTo || "—"}</span>
                    </td>
                  </tr>
                ))}
                {oldestProblematicOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-black uppercase text-primary/70">
                      No problematic orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Problematic Brands */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-primary">Problematic Brands</h2>
              <p className="text-[11px] font-black uppercase tracking-widest text-primary/60">Top brands by pending &amp; open issues</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/clients")}
            variant="outline"
            className="rounded-xl text-xs font-black uppercase tracking-wider text-primary border-primary hover:bg-primary hover:text-white transition-colors"
          >
            All Brands
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {problematicBrands.slice(0, 8).map((brand) => (
            <div
              key={brand.id}
              className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
            >
              <div className="bg-primary text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center font-black text-sm tracking-wider shadow-sm">
                    {initials(brand.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">{brand.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{brand.serviceScheme} SCHEME</span>
                  </div>
                </div>
                {brand.restricted && (
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Restricted
                  </span>
                )}
              </div>

              <div className="p-5 space-y-3 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Pending</span>
                    <span className="text-xl font-black mono-num text-primary mt-0.5 block">{brand.pendingCount}</span>
                  </div>
                  <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Old Issues</span>
                    <span className="text-xl font-black mono-num text-rose-600 mt-0.5 block">{brand.openTickets}</span>
                  </div>
                </div>
                <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/75">Workload</span>
                  <span className="text-lg font-black mono-num text-primary">{brand.pendingCount + brand.openTickets + brand.unprocessedDropoffs}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Delivery</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-sm font-black mono-num text-primary">{brand.deliveryRate30d}%</span>
                      {brand.deliveryTrend > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      ) : brand.deliveryTrend < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-primary/50" />
                      )}
                    </div>
                  </div>
                  <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Return</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-sm font-black mono-num text-primary">{brand.returnRate30d}%</span>
                      {brand.returnTrend > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                      ) : brand.returnTrend < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-primary/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-surface-50 border-t border-surface-200">
                <Button
                  onClick={() => router.push(`/clients/${brand.id}`)}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Summary / Overview */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-primary">Summary / Overview</h2>
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/60">Personal dashboard &amp; today&apos;s activity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border-2 border-primary rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/75">Tickets Awaiting Response</span>
              <Bell className="w-5 h-5 text-primary/60" />
            </div>
            <span className="text-3xl font-black mono-num text-primary block">{summary.ticketsAwaitingResponse.count}</span>
            <span className="text-[10px] font-bold uppercase text-primary/60">Oldest {formatHours(summary.ticketsAwaitingResponse.oldestAgeHours)}</span>
          </div>

          <div className="border-2 border-secondary rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/75">My Assignments</span>
              <User className="w-5 h-5 text-primary/60" />
            </div>
            <span className="text-3xl font-black mono-num text-primary block">{summary.myAssignments}</span>
            <span className="text-[10px] font-bold uppercase text-primary/60">Active orders / cases</span>
          </div>

          <div className="border-2 border-amber-400 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Reminders Due Today</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-3xl font-black mono-num text-amber-700 block">{summary.remindersDueToday}</span>
            <span className="text-[10px] font-bold uppercase text-amber-700/60">Follow-ups scheduled</span>
          </div>

          <div className="border-2 border-teal-500 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">Last Updated</span>
              <RefreshCw className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-lg font-black mono-num text-teal-700 block">{formatLastUpdated(summary.lastUpdated)}</span>
            <span className="text-[10px] font-bold uppercase text-teal-700/60">Dashboard refresh</span>
          </div>
        </div>

        <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-secondary" />
            <h2 className="text-xs font-black uppercase tracking-widest">Today&apos;s Summary</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Processed</span>
              <span className="text-3xl font-black mono-num text-primary mt-1 block">{summary.todaySummary.processed}</span>
            </div>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Delivered</span>
              <span className="text-3xl font-black mono-num text-emerald-600 mt-1 block">{summary.todaySummary.delivered}</span>
            </div>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">Returned</span>
              <span className="text-3xl font-black mono-num text-rose-600 mt-1 block">{summary.todaySummary.returned}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
