"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/time";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { Beaker, RefreshCw, Flag, Mail } from "lucide-react";

const STATUSES = ["pending","processing","packed","QC","pickedUp","droppedOff","outForDelivery","postponed","outOfStock","delivered","collected","returned","RTW","RTO","cancelled"];

export default function SimulatorPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("status");
  const [model, setModel] = useState("turuq");
  const [orderInput, setOrderInput] = useState("");
  const [orderId, setOrderId] = useState("");
  const [newStatus, setNewStatus] = useState("delivered");
  const [cancelReason, setCancelReason] = useState("");

  async function resolveOrder() {
    if (!orderInput.trim()) return;
    if (/^[a-f0-9]{24}$/i.test(orderInput.trim())) { setOrderId(orderInput.trim()); return; }
    const res = await fetch(`/api/lookup/order?q=${encodeURIComponent(orderInput.trim())}`);
    const data = await res.json();
    const match = (data.results || []).find((r: any) => r.source === model) || (data.results || [])[0];
    if (match) setOrderId(match.id);
    else alert("Order not found");
  }

  const [fModel, setFModel] = useState("turuq");
  const [fOrderInput, setFOrderInput] = useState("");
  const [fOrderId, setFOrderId] = useState("");
  const [fReporter, setFReporter] = useState("brand");
  const [fType, setFType] = useState("ticket");
  const [fNote, setFNote] = useState("");

  async function resolveFlagOrder() {
    if (!fOrderInput.trim()) return;
    if (/^[a-f0-9]{24}$/i.test(fOrderInput.trim())) { setFOrderId(fOrderInput.trim()); return; }
    const res = await fetch(`/api/lookup/order?q=${encodeURIComponent(fOrderInput.trim())}`);
    const data = await res.json();
    const match = (data.results || []).find((r: any) => r.source === fModel) || (data.results || [])[0];
    if (match) setFOrderId(match.id);
    else alert("Order not found");
  }

  const { data: outbox } = useQuery({
    queryKey: ["outbox"],
    queryFn: async () => (await fetch("/api/outbox")).json().catch(() => ({ items: [] })),
  });

  const { data: cancelReasonsData } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: async () => (await fetch("/api/cancellation-reasons")).json().catch(() => ({ items: [] })),
  });
  const cancelReasons = cancelReasonsData?.items || [];

  const changeStatus = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Resolve an order first");
      if (newStatus === "cancelled" && !cancelReason) throw new Error("Cancellation reason is required");
      const res = await fetch(`/api/demo/orders/${model}/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: cancelReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { alert("Status changed"); setCancelReason(""); },
  });

  const reportFlag = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: fModel, orderId: fOrderId, reporterRole: fReporter, type: fType, note: fNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { alert("Flag reported"); setFNote(""); },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-secondary" />
          <h2 className="text-xs font-black uppercase tracking-widest">Demo Controls</h2>
        </div>
        <div className="p-5">
          <div className="bg-primary p-1.5 rounded-2xl inline-flex flex-wrap items-center gap-1.5 shadow-md border border-primary/80 mb-4">
            <button type="button" onClick={() => setTab("status")} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${tab === "status" ? "font-black bg-cyan-200 text-nowrap shadow-sm" : "text-white/90 hover:text-white hover:bg-white/10"}`}>
              <RefreshCw className="w-4 h-4" /> Change Status
            </button>
            <button type="button" onClick={() => setTab("flag")} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${tab === "flag" ? "font-black bg-cyan-200 text-nowrap shadow-sm" : "text-white/90 hover:text-white hover:bg-white/10"}`}>
              <Flag className="w-4 h-4" /> Report Flag
            </button>
            <button type="button" onClick={() => setTab("outbox")} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${tab === "outbox" ? "font-black bg-cyan-200 text-nowrap shadow-sm" : "text-white/90 hover:text-white hover:bg-white/10"}`}>
              <Mail className="w-4 h-4" /> Outbox
            </button>
          </div>

          {tab === "status" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Model</label>
                  <Select value={model} onValueChange={(v) => setModel(v ?? "turuq")}>
                    <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turuq">Turuq</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">New Status</label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "delivered")}>
                    <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newStatus === "cancelled" && (
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Cancellation Reason (required)</label>
                  <Select value={cancelReason} onValueChange={(v) => setCancelReason(v ?? "")}>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      {cancelReasons.map((r: any) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Order Number or ID</label>
                <div className="flex gap-2">
                  <Input placeholder="Order number or ID" value={orderInput} onChange={(e) => setOrderInput(e.target.value)} className="bg-white border-slate-300" />
                  <Button variant="outline" onClick={resolveOrder}>Find</Button>
                </div>
                {orderId && <div className="text-xs text-slate-500 mono-num">Resolved ID: {orderId}</div>}
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" disabled={!orderId} onClick={() => changeStatus.mutate()}>Change Status</Button>
            </div>
          )}

{tab === "flag" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Model</label>
                  <Select value={fModel} onValueChange={(v) => setFModel(v ?? "turuq")}>
                    <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turuq">Turuq</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Reporter Role</label>
                  <Select value={fReporter} onValueChange={(v) => setFReporter(v ?? "brand")}>
                    <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["brand","warehouse","distribution_center"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Order Number or ID</label>
                <div className="flex gap-2">
                  <Input placeholder="Order number or ID" value={fOrderInput} onChange={(e) => setFOrderInput(e.target.value)} className="bg-white border-slate-300" />
                  <Button variant="outline" onClick={resolveFlagOrder}>Find</Button>
                </div>
                {fOrderId && <div className="text-xs text-slate-500 mono-num">Resolved ID: {fOrderId}</div>}
              </div>
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Flag Type</label>
                <Select value={fType} onValueChange={(v) => setFType(v ?? "ticket")}>
                  <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ISSUE_FLAG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-surface-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Note</label>
                <Textarea placeholder="Note" value={fNote} onChange={(e) => setFNote(e.target.value)} className="border-slate-300" />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => reportFlag.mutate()}>Report Flag</Button>
            </div>
          )}

{tab === "outbox" && (
            <div className="space-y-2">
                {(outbox?.items || []).map((o: any) => (
                  <div key={o.id} className="border border-slate-200 rounded-xl p-3 text-sm bg-slate-50">
                    <div className="font-bold text-primary">{o.subject}</div>
                    <div className="text-slate-500 text-xs">{o.client?.companyName} · {formatDate(o.createdAt)}</div>
                    <pre className="text-xs mt-1 whitespace-pre-wrap text-slate-700">{o.body}</pre>
                  </div>
                ))}
                {(outbox?.items || []).length === 0 && <div className="text-slate-500 text-xs font-bold uppercase">No outbox emails</div>}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
