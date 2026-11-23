"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/time";
import { detectCarrier } from "@/lib/rules/carrier";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["pending", "processing", "pickedUp", "outForDelivery", "postponed", "outOfStock"];

interface Props {
  model: "turuq" | "integration";
  setModel: (m: "turuq" | "integration") => void;
  hours: number;
  setHours: (h: number) => void;
  noAction: boolean;
  setNoAction: (v: boolean) => void;
  brand: string;
  setBrand: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  carrier: string;
  setCarrier: (v: string) => void;
  onSelect?: (o: any) => void;
}

export function StaleOrdersPanel({ model, setModel, hours, setHours, noAction, setNoAction, brand, setBrand, status, setStatus, carrier, setCarrier, onSelect }: Props) {
  const qc = useQueryClient();
  const [customHours, setCustomHours] = useState("");
  const [hoursMode, setHoursMode] = useState<"preset" | "custom">("preset");
  const [page, setPage] = useState(1);
  const [actionOrder, setActionOrder] = useState<any>(null);
  const [flagType, setFlagType] = useState("delayed_shipment");
  const [flagNote, setFlagNote] = useState("");

  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: async () => (await fetch("/api/clients")).json() });
  const clients = clientsData?.items || [];

  // reset page when filters change
  useEffect(() => { setPage(1); }, [model, hours, noAction, brand, carrier, status, customHours, hoursMode]);

  const h = hoursMode === "custom" ? (parseInt(customHours) || 24) : hours;

  // reset page on filter change
  // (handled via key)

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("model", model);
    p.set("hours", String(h));
    p.set("limit", "12");
    p.set("page", String(page));
    if (noAction) p.set("noAction", "true");
    if (brand) p.set("brand", brand);
    if (carrier) p.set("carrier", carrier);
    if (status) p.set("status", status);
    return p.toString();
  }, [model, h, noAction, brand, carrier, status, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["stale", qs],
    queryFn: async () => (await fetch(`/api/orders/stale?${qs}`)).json(),
  });

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const takeAction = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, orderId: actionOrder.id, reporterRole: "support", type: flagType, note: flagNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stale"] }); setActionOrder(null); setFlagNote(""); },
  });

  function setPreset(val: number) { setHours(val); setHoursMode("preset"); }
  function toggleNoAction() { setNoAction(!noAction); }
  function reset() {
    setHours(24); setHoursMode("preset"); setCustomHours(""); setNoAction(true);
    setBrand(""); setCarrier(""); setStatus(""); setModel("turuq");
  }

  return (
    <>
      <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
              {[24, 48, 72].map((hr) => (
                <button key={hr} type="button" onClick={() => setPreset(hr)} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider mono-num transition-colors ${hoursMode === "preset" && hours === hr ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"}`}>{hr}H</button>
              ))}
              <button type="button" onClick={() => setHoursMode("custom")} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${hoursMode === "custom" ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"}`}>Custom</button>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">Min hours</label>
              <input type="number" min={0} value={hoursMode === "custom" ? customHours : hours} onChange={(e) => { setCustomHours(e.target.value); setHoursMode("custom"); }} className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black uppercase mono-num text-primary focus:outline-none focus:ring-2 focus:ring-primary text-center" />
            </div>
            <button type="button" onClick={toggleNoAction} className={`px-3.5 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all ${noAction ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700"}`}>
              <span>No action taken</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black mono-num ${noAction ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"}`}>{items.filter((o: any) => !o.hasOpenIssue).length}</span>
            </button>
          </div>
          <button type="button" onClick={reset} className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-primary bg-white border border-slate-200 hover:border-primary/40 transition-colors flex items-center gap-1.5 shadow-sm">Reset</button>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1">
          <select className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Brand: All</option>
            {clients.map((c: any) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
          </select>
          <select className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status: All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase().replace(/_/g, " ")}</option>)}
          </select>
          <select className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
            <option value="">Courier: All</option>
            <option value="turuq">Turuq courier</option>
            <option value="bosta">Bosta</option>
            <option value="shipblu">ShipBlu</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-white uppercase text-[10px] font-black tracking-wider">
              <th className="py-3.5 px-4">Brand</th>
              <th className="py-3.5 px-3">Order #</th>
              <th className="py-3.5 px-3">Status</th>
              <th className="py-3.5 px-3">Last Update</th>
              <th className="py-3.5 px-3">Hours Stale</th>
              <th className="py-3.5 px-3">Ships Via</th>
              <th className="py-3.5 px-3">Flag</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {isLoading && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Loading...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-500">No stale orders found</td></tr>}
            {items.map((o: any) => {
              const cname = detectCarrier(o.courier?.name);
              const hs = o.hoursStale ?? 0;
              return (
                <tr key={o.id} onClick={() => onSelect && onSelect(o)} className={`hover:bg-slate-50 transition-colors cursor-pointer ${!o.hasOpenIssue ? "bg-rose-50/30" : ""}`}>
                  <td className="py-3.5 px-4 font-black uppercase text-slate-900 whitespace-nowrap">{String(o.client?.companyName || "").toUpperCase()}</td>
                  <td className="py-3.5 px-3 font-bold mono-num text-primary whitespace-nowrap">{o.oid}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap"><StatusBadge status={o.status} /></td>
                  <td className="py-3.5 px-3 font-bold uppercase mono-num text-slate-600 whitespace-nowrap">{formatDate(o.lastStatusChangedAt).toUpperCase()}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black mono-num ${hs >= 72 ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>{hs} HRS</span>
                  </td>
                  <td className="py-3.5 px-3 font-bold uppercase text-slate-700 whitespace-nowrap">{cname === "Turuq" ? (o.courier ? o.courier.name : "NO COURIER ASSIGNED") : cname}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {o.hasOpenIssue ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/30">ACTION TAKEN</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-200">NO ACTION</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button onClick={(e) => { e.stopPropagation(); setActionOrder(o); }} className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors">Take action</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && items.length === 0 && (
          <div className="py-14 px-6 text-center">
            <div className="text-sm font-black uppercase tracking-wider text-slate-900">No stale orders match current filters</div>
            <p className="text-xs font-bold uppercase text-slate-500 mt-1">Adjust the hours threshold or clear filters to view consignments</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold uppercase text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span className="mono-num">Total stale: {total} · No action taken: {items.filter((o:any) => !o.hasOpenIssue).length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="px-3 py-1 rounded-lg bg-primary text-white font-black text-xs mono-num">{page} / {pages}</span>
          <button className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
        </div>
        <div className="mono-num text-[11px] font-extrabold text-primary">TURUQ SUPPORT DISPATCH</div>
      </div>

      <Dialog open={!!actionOrder} onOpenChange={(o) => !o && setActionOrder(null)}>
        <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase tracking-wider">Take Action on {actionOrder?.oid}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Issue Type</label>
              <Select value={flagType} onValueChange={(v) => setFlagType(v ?? "delayed_shipment")}>
                <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_FLAG_TYPES.map((t) => <SelectItem key={t} value={t}>{t.toUpperCase().replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Note</label>
              <Textarea placeholder="Note" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} className="border-slate-300" />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => takeAction.mutate()}>Save Action</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
