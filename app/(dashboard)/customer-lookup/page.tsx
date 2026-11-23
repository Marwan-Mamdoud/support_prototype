"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { timeAgo, formatDate, humanize, humanizeUpper } from "@/lib/time";
import { StatusBadge } from "@/components/StatusBadge";
import {
  User,
  MapPin,
  Percent,
  FileText,
  Phone,
  Calendar,
  Package,
  Building2,
  ArrowRight,
  Search,
} from "lucide-react";

const goodFinished = ["delivered", "collected"];
const badFinished = ["returned", "RTW", "RTO", "cancelled"];

function CustomerLookupContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [phone, setPhone] = useState(sp.get("phone") || "");
  const [searchPhone, setSearchPhone] = useState(sp.get("phone") || "");
  const { data, isLoading } = useQuery({
    queryKey: ["customer", searchPhone],
    queryFn: async () => (await fetch(`/api/lookup/customer?phone=${encodeURIComponent(searchPhone)}`)).json(),
    enabled: searchPhone.length > 0,
  });

  const Tile = ({ label, value, color = "text-primary" }: any) => (
    <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{label}</span>
      <span className={`text-xs font-black uppercase mt-1 block ${color}`}>{value}</span>
    </div>
  );

  const orders = (data?.orders || []).slice().sort((a: any, b: any) => {
    const aDone = goodFinished.includes(a.status) || badFinished.includes(a.status) ? 0 : 1;
    const bDone = goodFinished.includes(b.status) || badFinished.includes(b.status) ? 0 : 1;
    return aDone - bDone || new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="p-8 space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
          <Input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchPhone(phone)}
            className="pl-10 h-12 bg-white border-surface-200 text-base"
          />
        </div>
        <Button
          onClick={() => setSearchPhone(phone)}
          className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md"
        >
          <Search className="w-4 h-4 text-secondary" />
          <span>Search</span>
        </Button>
      </div>

      {isLoading && <div className="text-slate-500">Loading...</div>}

      {data && (
        <>
          {/* Customer info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Names */}
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                <User className="w-5 h-5 text-secondary" />
                <h3 className="text-xs font-black uppercase tracking-widest">Names</h3>
              </div>
              <div className="p-5 space-y-3">
                {(data.names || []).length === 0 && <Tile label="Names" value="—" />}
                {(data.names || []).map((n: string, i: number) => (
                  <Tile key={i} label={`Name ${i + 1}`} value={n} />
                ))}
              </div>
            </div>

            {/* Addresses */}
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                <h3 className="text-xs font-black uppercase tracking-widest">Addresses</h3>
              </div>
              <div className="p-5 space-y-3">
                {(data.addresses || []).length === 0 && <Tile label="Addresses" value="—" />}
                {(data.addresses || []).map((a: string, i: number) => (
                  <Tile key={i} label={`Address ${i + 1}`} value={a} />
                ))}
              </div>
            </div>

            {/* Success rate */}
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                <Percent className="w-5 h-5 text-secondary" />
                <h3 className="text-xs font-black uppercase tracking-widest">Success Rate</h3>
              </div>
              <div className="p-5 space-y-3.5">
                {data.successRate?.rate != null ? (
                  <>
                    <Tile label="Rate" value={`${data.successRate.rate.toFixed(0)}%`} color={data.successRate.rate >= 70 ? "text-emerald-700" : data.successRate.rate >= 40 ? "text-secondary-950" : "text-rose-800"} />
                    <Tile label="Successful" value={data.successRate.success} color="text-emerald-700" />
                    <Tile label="Total finished" value={data.successRate.total} color="text-primary" />
                  </>
                ) : (
                  <Tile label="Rate" value="No finished orders" color="text-primary/70" />
                )}
              </div>
            </div>
          </div>

          {/* Orders table */}
          <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-secondary" />
                <h3 className="text-xs font-black uppercase tracking-widest">Orders History</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">
                {orders.length} orders
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-50 text-primary uppercase text-[10px] font-black tracking-wider border-b border-surface-200">
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-3">Source</th>
                    <th className="py-3.5 px-3">Brand</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Total</th>
                    <th className="py-3.5 px-4 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 font-medium">
                  {orders.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">No orders found</td></tr>
                  )}
                  {orders.map((o: any) => {
                    const isGood = goodFinished.includes(o.status);
                    const isBad = badFinished.includes(o.status);
                    const rowClass = isGood
                      ? "bg-emerald-50/60 hover:bg-emerald-50 border-l-4 border-l-emerald-500 cursor-pointer"
                      : isBad
                      ? "bg-rose-50/60 hover:bg-rose-50 border-l-4 border-l-rose-500 cursor-pointer"
                      : "hover:bg-surface-50 cursor-pointer";
                    return (
                      <tr key={o.id} className={`transition-colors ${rowClass}`}>
                        <td className="py-3 px-4 font-bold mono-num text-primary whitespace-nowrap">{o.oid}</td>
                        <td className="py-3 px-3 uppercase font-bold text-primary/80 whitespace-nowrap">{o.source}</td>
                        <td className="py-3 px-3 font-bold uppercase text-primary whitespace-nowrap">{o.brand}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={o.status} />
                          <div className="text-[10px] text-primary/60 font-bold uppercase mt-0.5">{timeAgo(o.date)}</div>
                        </td>
                        <td className="py-3 px-3 font-bold uppercase mono-num text-primary/80 whitespace-nowrap">{formatDate(o.date)}</td>
                        <td className="py-3 px-3 font-black uppercase mono-num text-primary whitespace-nowrap">{o.total}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/orders/${o.source}/${o.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomerLookupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerLookupContent />
    </Suspense>
  );
}
