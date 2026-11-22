"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Plus, ArrowRight, Building2 } from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scheme, setScheme] = useState("");
  const [active, setActive] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients", q, scheme, active],
    queryFn: async () => (await fetch(`/api/clients?q=${encodeURIComponent(q)}&scheme=${scheme}&active=${active}`)).json(),
  });
  const items = data?.items || [];

  const reset = () => { setQ(""); setScheme(""); setActive(""); };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="h-16 px-8 border-b-2 border-primary bg-white flex items-center justify-between -mx-4 -mt-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-primary" />
            <span>Clients</span>
          </h1>
          <span className="px-2.5 py-1 rounded-lg bg-surface-100 border border-surface-200 text-primary text-[11px] font-black uppercase tracking-wider mono-num">
            {items.length} BRANDS
          </span>
        </div>
        <Button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 text-secondary" />
          <span>Add Client</span>
        </Button>
      </header>

      {/* Filter strip */}
      <div className="bg-white border-2 border-primary rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
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
            className="appearance-none bg-surface-50 border border-surface-200 rounded-xl text-xs font-extrabold uppercase pl-3.5 pr-9 py-2.5 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary cursor-pointer hover:border-primary/60 transition-colors h-10"
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
            className="appearance-none bg-surface-50 border border-surface-200 rounded-xl text-xs font-extrabold uppercase pl-3.5 pr-9 py-2.5 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary cursor-pointer hover:border-primary/60 transition-colors h-10"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((c: any) => (
          <div
            key={c.id}
            className="client-card border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
          >
            <div className="bg-primary text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center font-black text-sm tracking-wider shadow-sm">
                  {initials(c.companyName || c.name)}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">{c.companyName}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{c.serviceScheme} SCHEME</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-thumbnail text-primary-950 text-[10px] font-black uppercase tracking-wider">
                {c.active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="p-5 space-y-3 flex-1">
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/75">PHONE</span>
                <span className="text-xs font-black uppercase text-primary mono-num">{c.phone}</span>
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/75">EMAIL</span>
                <span className="text-[11px] font-black uppercase text-primary truncate">{c.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">ORDERS TODAY</span>
                  <span className="text-lg font-black mono-num text-primary mt-0.5 block">{c.stats?.todayOrders ?? 0}</span>
                </div>
                <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">TOTAL ORDERS</span>
                  <span className="text-lg font-black mono-num text-primary-950 mt-0.5 block">{c.stats?.totalOrders ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary/75">
                TURUQ: {c.stats?.turuq?.today ?? 0} · INT: {c.stats?.integration?.today ?? 0}
              </span>
              <Button
                onClick={() => router.push(`/clients/${c.id}`)}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <span>VIEW DETAILS</span>
                <ArrowRight className="w-3.5 h-3.5 text-secondary" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
