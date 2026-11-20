"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo, formatDate } from "@/lib/time";

const STATUSES = ["pending","processing","packed","QC","pickedUp","droppedOff","outForDelivery","postponed","outOfStock","delivered","collected","returned","RTW","RTO","cancelled"];

export default function SimulatorPage() {
  const qc = useQueryClient();
  // status change
  const [model, setModel] = useState("turuq");
  const [orderInput, setOrderInput] = useState("");
  const [orderId, setOrderId] = useState("");
  const [newStatus, setNewStatus] = useState("delivered");

  async function resolveOrder() {
    if (!orderInput.trim()) return;
    if (/^[a-f0-9]{24}$/i.test(orderInput.trim())) { setOrderId(orderInput.trim()); return; }
    const res = await fetch(`/api/lookup/order?q=${encodeURIComponent(orderInput.trim())}`);
    const data = await res.json();
    const match = (data.results || []).find((r: any) => r.source === model) || (data.results || [])[0];
    if (match) setOrderId(match.id);
    else alert("Order not found");
  }
  // report flag
  const [fModel, setFModel] = useState("turuq");
  const [fOrderInput, setFOrderInput] = useState("");
  const [fOrderId, setFOrderId] = useState("");
  const [fReporter, setFReporter] = useState("brand");

  async function resolveFlagOrder() {
    if (!fOrderInput.trim()) return;
    if (/^[a-f0-9]{24}$/i.test(fOrderInput.trim())) { setFOrderId(fOrderInput.trim()); return; }
    const res = await fetch(`/api/lookup/order?q=${encodeURIComponent(fOrderInput.trim())}`);
    const data = await res.json();
    const match = (data.results || []).find((r: any) => r.source === fModel) || (data.results || [])[0];
    if (match) setFOrderId(match.id);
    else alert("Order not found");
  }
  const [fType, setFType] = useState("ticket");
  const [fNote, setFNote] = useState("");

  const { data: outbox } = useQuery({
    queryKey: ["outbox"],
    queryFn: async () => (await fetch("/api/outbox")).json().catch(() => ({ items: [] })),
  });

  const changeStatus = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/demo/orders/${model}/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => alert("Status changed"),
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
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Prototype Simulator</h1>
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Change status</TabsTrigger>
          <TabsTrigger value="flag">Report flag</TabsTrigger>
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
        </TabsList>
        <TabsContent value="status" className="space-y-3">
          <Select value={model} onValueChange={(v) => setModel(v ?? '')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="turuq">Turuq</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="Order number or ID" value={orderInput} onChange={(e) => setOrderInput(e.target.value)} />
            <Button variant="outline" onClick={resolveOrder}>Find</Button>
          </div>
          {orderId && <div className="text-xs text-slate-500">Resolved ID: {orderId}</div>}
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? '')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => changeStatus.mutate()}>Change status</Button>
        </TabsContent>
        <TabsContent value="flag" className="space-y-3">
          <Select value={fModel} onValueChange={(v) => setFModel(v ?? '')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="turuq">Turuq</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="Order number or ID" value={fOrderInput} onChange={(e) => setFOrderInput(e.target.value)} />
            <Button variant="outline" onClick={resolveFlagOrder}>Find</Button>
          </div>
          {fOrderId && <div className="text-xs text-slate-500">Resolved ID: {fOrderId}</div>}
          <Select value={fReporter} onValueChange={(v) => setFReporter(v ?? '')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["brand","warehouse","distribution_center"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fType} onValueChange={(v) => setFType(v ?? '')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["ticket","return_missing_items","return_wrong_items","invalid_address","invalid_phone_number","delayed_shipment","defective_items","other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Note" value={fNote} onChange={(e) => setFNote(e.target.value)} />
          <Button onClick={() => reportFlag.mutate()}>Report flag</Button>
        </TabsContent>
        <TabsContent value="outbox">
          <div className="space-y-2">
            {(outbox?.items || []).map((o: any) => (
              <div key={o.id} className="border rounded p-2 text-sm">
                <div className="font-medium">{o.subject}</div>
                <div className="text-slate-500">{o.client?.companyName} · {formatDate(o.createdAt)}</div>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{o.body}</pre>
              </div>
            ))}
            {(outbox?.items || []).length === 0 && <div className="text-slate-500">No outbox emails</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
