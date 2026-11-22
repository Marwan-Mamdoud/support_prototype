"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Building2, BadgeCheck, Calendar, BarChart3, PieChart, Trophy, Package, Phone, Mail, CheckCircle2, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/time";

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await fetch(`/api/clients?id=${id}`)).json(),
  });
  const client = clientData?.client;

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

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const Tile = ({ label, value, color = "text-primary", badge }: any) => (
    <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{label}</span>
      {badge ? (
        <span className={`inline-block mt-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${badge}`}>{value}</span>
      ) : (
        <span className={`text-sm font-black uppercase mt-1.5 block ${color}`}>{value}</span>
      )}
    </div>
  );

  const todayTotal = today?.today ?? 0;
  const turuqToday = today?.bySource?.turuq ?? 0;
  const intToday = today?.bySource?.integration ?? 0;
  const turuqPct = todayTotal ? Math.round((turuqToday / todayTotal) * 100) : 0;
  const intPct = todayTotal ? Math.round((intToday / todayTotal) * 100) : 0;

  const statusColors: Record<string, string> = {
    delivered: "bg-thumbnail text-primary-950",
    collected: "bg-thumbnail text-primary-950",
    outForDelivery: "bg-secondary/25 text-secondary-950 border border-secondary-500/40",
    pickedUp: "bg-secondary/25 text-secondary-950 border border-secondary-500/40",
    processing: "bg-primary text-white",
    pending: "bg-amber-100 text-amber-900 border border-amber-300",
    rtw: "bg-rose-100 text-rose-800 border border-rose-200",
    rto: "bg-rose-100 text-rose-800 border border-rose-200",
    returned: "bg-rose-100 text-rose-800 border border-rose-200",
    cancelled: "bg-rose-100 text-rose-800 border border-rose-200",
  };

  // Performance chart data: last 7 days
  const overTime = perf?.overTime || [];
  const maxVal = Math.max(1, ...overTime.map((d: any) => (d.turuq || 0) + (d.integration || 0)));

  const statusDist = perf?.statusDistribution || [];
  const totalStatus = statusDist.reduce((sum: number, s: any) => sum + (s.count || 0), 0);

  const outcome = perf?.outcome || { delivered: 0, returned: 0, cancelled: 0 };
  const maxOutcome = Math.max(1, outcome.delivered, outcome.returned, outcome.cancelled);

  if (clientLoading) return <div className="py-8 text-center text-primary/70 font-bold uppercase">Loading...</div>;
  if (!client) return <div className="py-8 text-center text-primary/70 font-bold uppercase">Client not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="h-16 px-8 border-b-2 border-primary bg-white flex flex-wrap items-center justify-between gap-4 -mx-4 -mt-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/clients")}
            variant="outline"
            className="px-3 py-2 rounded-xl border-surface-200 bg-surface-50 hover:bg-surface-100 text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Clients</span>
          </Button>
          <div className="h-8 w-px bg-surface-200" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm border border-secondary/40">
              {initials(client.companyName || client.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black uppercase tracking-wider text-primary">{client.companyName}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-thumbnail text-primary-950 text-[10px] font-black uppercase tracking-wider">
                  ACTIVE: {String(client.active).toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-secondary/25 text-secondary-950 border border-secondary-500/40 text-[10px] font-black uppercase tracking-wider">
                  {client.serviceScheme}
                </span>
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary/75 mt-0.5 mono-num">
                {client.email} · {client.phone}
              </div>
            </div>
          </div>
        </div>
        <Button className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md">
          <span>Edit Client</span>
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="bg-primary p-1.5 rounded-2xl inline-flex h-fit! flex-wrap items-center gap-1.5 shadow-md border border-primary-950">
          <TabsTrigger
            value="info"
            className="flex-initial px-5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all"
          >
            <BadgeCheck className="w-4 h-4" />
            <span>Info</span>
          </TabsTrigger>
          <TabsTrigger
            value="today"
            className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Today Snapshot</span>
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="mt-6">
          <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-secondary" />
                <h2 className="text-sm font-black uppercase tracking-wider">CLIENT PROFILE & CONFIGURATION</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-thumbnail text-primary-950 text-[10px] font-black uppercase tracking-wider">
                ACTIVE: {String(client.active).toUpperCase()}
              </span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Tile label="NAME" value={client.name} />
              <Tile label="COMPANY" value={client.companyName} color="text-primary-950" />
              <Tile label="PHONE" value={client.phone} color="text-primary" />
              <Tile label="EMAIL" value={client.email} color="text-primary-950" />
              <Tile label="SERVICE SCHEME" value={client.serviceScheme} badge="bg-primary text-white" />
              <Tile label="ACTIVE" value={String(client.active).toUpperCase()} badge={client.active ? "bg-thumbnail text-primary-950" : "bg-rose-100 text-rose-800 border border-rose-200"} />
            </div>
          </div>
        </TabsContent>

        {/* Today Snapshot tab */}
        <TabsContent value="today" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-primary rounded-2xl bg-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">ORDERS TODAY</span>
                <span className="text-3xl font-black mono-num text-primary mt-1 block">{todayTotal}</span>
                <span className="text-[11px] font-extrabold uppercase text-secondary-950 mt-1 block mono-num">VS YESTERDAY: {today?.yesterday ?? 0}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary text-secondary flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <div className="border border-surface-200 rounded-2xl bg-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">TURUQ SOURCE</span>
                <span className="text-3xl font-black mono-num text-primary mt-1 block">{turuqToday}</span>
                <span className="text-[11px] font-extrabold uppercase text-primary mt-1 block mono-num">{turuqPct}% OF TODAY</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-100 text-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="border border-surface-200 rounded-2xl bg-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">INTEGRATION SOURCE</span>
                <span className="text-3xl font-black mono-num text-secondary-950 mt-1 block">{intToday}</span>
                <span className="text-[11px] font-extrabold uppercase text-secondary-950 mt-1 block mono-num">{intPct}% OF TODAY</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary/25 text-secondary-950 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  <h2 className="text-xs font-black uppercase tracking-widest">BY SOURCE</h2>
                </div>
                <span className="text-[10px] font-black uppercase mono-num text-secondary">TOTAL: {todayTotal}</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-primary">TURUQ</span>
                    <span className="text-primary mono-num">{turuqToday}</span>
                  </div>
                  <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${turuqPct}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-primary">INTEGRATION</span>
                    <span className="text-secondary-950 mono-num">{intToday}</span>
                  </div>
                  <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary-500 rounded-full" style={{ width: `${intPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-secondary" />
                  <h2 className="text-xs font-black uppercase tracking-widest">BY STATUS</h2>
                </div>
                <span className="text-[10px] font-black uppercase mono-num text-secondary">TODAY</span>
              </div>
              <div className="p-5 space-y-2.5">
                {Object.entries(today?.byStatus || {}).length === 0 && (
                  <div className="text-xs font-black uppercase text-primary/70">No orders today</div>
                )}
                {Object.entries(today?.byStatus || {}).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200">
                    <span className="text-xs font-black uppercase text-secondary-950">{status}</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-black mono-num ${statusColors[status] || "bg-surface-100 text-primary"}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Performance tab */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3 bg-white border-2 border-primary rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-10 bg-surface-50 border-surface-200 text-xs font-black uppercase text-primary" />
            </div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-10 bg-surface-50 border-surface-200 text-xs font-black uppercase text-primary" />
            <Button onClick={() => refetch()} className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider shadow-sm">
              Apply
            </Button>
          </div>

          <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <h2 className="text-sm font-black uppercase tracking-wider">ORDERS OVER TIME BY SOURCE</h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                  INTEGRATION
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white" />
                  TURUQ
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-4 items-end h-44 pt-4 border-b border-surface-200 pb-3">
                {overTime.length === 0 && (
                  <div className="col-span-7 text-center text-xs font-black uppercase text-primary/70">No data for selected range</div>
                )}
                {overTime.map((d: any, i: number) => {
                  const tH = maxVal ? (d.turuq / maxVal) * 100 : 0;
                  const iH = maxVal ? (d.integration / maxVal) * 100 : 0;
                  const isLast = i === overTime.length - 1;
                  return (
                    <div key={d.bucket} className="flex flex-col items-center gap-2 h-full justify-end">
                      <div className="flex items-end gap-1.5 h-32">
                        <div className="w-4 bg-primary rounded-t" style={{ height: `${Math.max(4, tH)}%` }} />
                        <div className="w-4 bg-secondary-500 rounded-t" style={{ height: `${Math.max(4, iH)}%` }} />
                      </div>
                      <span className={`text-[10px] font-black uppercase text-primary/75 mono-num ${isLast ? "text-primary" : ""}`}>
                        {formatDate(d.bucket)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-secondary" />
                <h2 className="text-xs font-black uppercase tracking-widest">STATUS DISTRIBUTION</h2>
              </div>
              <div className="p-5 space-y-4">
                {statusDist.length === 0 && <div className="text-xs font-black uppercase text-primary/70">No data</div>}
                {statusDist.map((s: any) => {
                  const pct = totalStatus ? Math.round((s.count / totalStatus) * 100) : 0;
                  let barColor = "bg-primary";
                  if (["delivered", "collected"].includes(s.status)) barColor = "bg-thumbnail";
                  else if (["returned", "RTW", "RTO"].includes(s.status)) barColor = "bg-amber-500";
                  else if (s.status === "cancelled") barColor = "bg-rose-600";
                  return (
                    <div key={s.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black uppercase">
                        <span className="text-secondary-950">{s.status}</span>
                        <span className="mono-num text-secondary-950">{pct}% ({s.count})</span>
                      </div>
                      <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  <h2 className="text-xs font-black uppercase tracking-widest">DELIVERED VS RETURNED VS CANCELLED</h2>
                </div>
                <span className="text-[10px] font-black uppercase text-secondary">OUTCOME</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[11px] font-black uppercase text-secondary-950">DELIVERED</span>
                    <div className="flex-1 h-5 bg-surface-100 rounded-md overflow-hidden">
                      <div className="h-full bg-thumbnail rounded-md" style={{ width: `${Math.max(4, (outcome.delivered / maxOutcome) * 100)}%` }} />
                    </div>
                    <span className="w-6 text-right text-xs font-black mono-num text-secondary-950">{outcome.delivered}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[11px] font-black uppercase text-amber-900">RETURNED</span>
                    <div className="flex-1 h-5 bg-surface-100 rounded-md overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-md" style={{ width: `${Math.max(4, (outcome.returned / maxOutcome) * 100)}%` }} />
                    </div>
                    <span className="w-6 text-right text-xs font-black mono-num text-amber-900">{outcome.returned}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[11px] font-black uppercase text-rose-800">CANCELLED</span>
                    <div className="flex-1 h-5 bg-surface-100 rounded-md overflow-hidden">
                      <div className="h-full bg-rose-600 rounded-md" style={{ width: `${Math.max(4, (outcome.cancelled / maxOutcome) * 100)}%` }} />
                    </div>
                    <span className="w-6 text-right text-xs font-black mono-num text-rose-800">{outcome.cancelled}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-surface-200">
                  <span className="w-24 text-[10px] font-black uppercase text-primary/75">OUTCOME</span>
                  <div className="flex-1 flex justify-between text-[10px] font-black mono-num text-primary/75">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                  </div>
                  <span className="w-6" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
