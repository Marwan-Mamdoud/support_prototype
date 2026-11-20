"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo, formatDate, humanize, humanizeUpper, formatAuditValue } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";
import { getCancellationReason } from "@/lib/rules/cancellationReasons";
import { useBrandPreview } from "@/lib/brandPreview";
import { StatusBadge } from "@/components/StatusBadge";

export default function OrderDetailsPage() {
  const params = useParams();
  const model = params.model as string;
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const { brandPreview } = useBrandPreview();

  const { data, isLoading } = useQuery({
    queryKey: ["order", model, id],
    queryFn: async () => (await fetch(`/api/orders/${model}/${id}`)).json(),
  });

  const order = data?.order;
  const audit = data?.audit || [];

  const { data: custLookup } = useQuery({
    queryKey: ["custlookup-details", order?.customerPhone],
    queryFn: async () => (await fetch(`/api/lookup/customer?phone=${encodeURIComponent(order.customerPhone)}`)).json(),
    enabled: !!order?.customerPhone,
  });

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagType, setFlagType] = useState("ticket");
  const [flagNote, setFlagNote] = useState("");
  const [sh, setSh] = useState("");
  const [moveLoc, setMoveLoc] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelImages, setCancelImages] = useState<string[]>([]);

  const { data: reasonsData } = useQuery({ queryKey: ["cancellation-reasons"], queryFn: async () => (await fetch("/api/cancellation-reasons")).json() });
  const reasons = reasonsData?.items || [];

  const addFlag = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${model}/${id}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: flagType, note: flagNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["order", model, id] }); setFlagOpen(false); setFlagNote(""); },
  });

  const resolveFlag = useMutation({
    mutationFn: async ({ flagId, note }: any) => {
      const res = await fetch(`/api/orders/${model}/${id}/flags/${flagId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", model, id] }),
  });

  const updateSh = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${model}/${id}/special-handling`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialHandling: sh }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", model, id] }),
  });

  const moveLocation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${model}/${id}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: moveLoc }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", model, id] }),
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${model}/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, images: cancelImages }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["order", model, id] }); setCancelOpen(false); setCancelReason(""); setCancelImages([]); },
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!order) return <div className="p-8 text-center text-slate-500">Not found</div>;

  const courier = order.courier;
  const carrier = detectCarrier(courier?.name);
  const trackingUrl = carrierTrackingUrl(carrier, order.trackingNumber);
  const sortedFlags = [...(order.issueFlags || [])].sort((a: any, b: any) => (a.state === "open" ? -1 : 1) || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  return (
    <div className="flex flex-col min-h-screen bg-surface-50">
      {/* Contextual header */}
      <header className="px-8 py-4 border-b-2 border-primary bg-white flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/orders")} className="px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 transition-colors">
            ← Orders
          </button>
          <div className="h-8 w-px bg-surface-200"></div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black uppercase tracking-tight text-primary mono-num">{order.oid}</h1>
              <span className="px-3 py-1 rounded-lg bg-secondary_accent/25 text-secondary-950 border border-secondary-500/40 text-[11px] font-black uppercase tracking-wider">
                {humanize(order.status)}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${order.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
              </span>
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mt-1 mono-num">
              {timeAgo(order.lastStatusChangedAt)} · {order.client?.companyName}
            </div>
          </div>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all">
          Update Status
        </button>
      </header>

      <div className="p-8 space-y-6 flex-1 overflow-x-hidden">
        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-primary p-1.5 rounded-2xl inline-flex flex-wrap items-center gap-1.5 shadow-md border border-primary/80">
            <TabsTrigger value="details" className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[state=active]:bg-secondary_accent data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex items-center gap-2 transition-all">
              Details
            </TabsTrigger>
            <TabsTrigger value="shipping" className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[state=active]:bg-secondary_accent data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex items-center gap-2 transition-all">
              Shipping
            </TabsTrigger>
            <TabsTrigger value="timeline" className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[state=active]:bg-secondary_accent data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex items-center gap-2 transition-all">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="audit" className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[state=active]:bg-secondary_accent data-[state=active]:text-slate-900 data-[state=active]:shadow-sm flex items-center gap-2 transition-all">
              Audit log
            </TabsTrigger>
          </TabsList>

          {/* Details panel */}
          <TabsContent value="details" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-widest">Header</h2>
                    <span className="px-2.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                      {model === "turuq" ? order.type : order.provider}
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    <Tile label="Status" value={humanize(order.status)} />
                    <Tile label="Payment" value={`${String(order.paymentMethod || "").toUpperCase()} · ${String(order.paymentStatus || "").toUpperCase()}`} />
                    <Tile label="Brand" value={order.client?.companyName} />
                    <Tile label="Source" value={model.toUpperCase()} />
                    {model === "turuq" && <Tile label="Type" value={order.type} />}
                    {model === "integration" && <Tile label="External ID" value={order.externalId} />}
                    <Tile label="Created" value={formatDate(order.createdAt)} />
                    <Tile label="Last change" value={formatDate(order.lastStatusChangedAt)} />
                    <Tile label="Can open package" value={String(order.canOpenPackage).toUpperCase()} />
                    <Tile label="Special handling" value={humanize(order.specialHandling)} />
                    {!brandPreview && <Tile label="Location" value={humanize(order.currentLocation)} />}
                    {order.notes && <Tile label="Notes" value={order.notes} />}
                  </div>
                </div>

                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5">
                    <h2 className="text-xs font-black uppercase tracking-widest">Customer</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Tile label="Name" value={model === "turuq" ? order.customerName : `${order.customerFirstName} ${order.customerLastName}`} />
                      <Tile label="Phone" value={order.customerPhone} />
                      <Tile label="Address" value={order.customerAddress} />
                      <Tile label="Governorate" value={order.customerGovernorate} />
                    </div>
                    {(custLookup?.addresses || []).length > 0 && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Previous addresses</span>
                        <div className="space-y-1.5">
                          {(custLookup.addresses || []).map((a: string, i: number) => (
                            <div key={i} className="flex items-center justify-between border rounded-lg p-2 bg-white">
                              <span className="text-xs">{a}</span>
                              <Button size="sm" variant="outline" onClick={async () => {
                                const res = await fetch(`/api/orders/${model}/${id}/apply-address`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: a }) });
                                if (res.ok) qc.invalidateQueries({ queryKey: ["order", model, id] });
                              }}>Apply</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-widest">Products &amp; Financials</h2>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-black uppercase mono-num border border-white/20">{(order.products || []).length} items</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-2">
                      {(order.products || []).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div>
                            <div className="text-xs font-black uppercase text-slate-900">{p.name}</div>
                            <div className="text-[11px] font-extrabold uppercase text-slate-500 mt-0.5 mono-num">{p.variant} × {p.quantity}</div>
                          </div>
                          <div className="text-sm font-black text-primary mono-num">{p.price * p.quantity}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 pt-3 border-t border-slate-200">
                      <div className="flex justify-between text-xs font-bold uppercase text-slate-600"><span>Subtotal</span><span className="mono-num">{order.subtotal}</span></div>
                      <div className="flex justify-between text-xs font-bold uppercase text-slate-600"><span>Shipping</span><span className="mono-num">{order.shippingFees} ({order.shippingHandledBy})</span></div>
                      <div className="flex justify-between text-xs font-bold uppercase text-slate-600"><span>Payment</span><span>{String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}</span></div>
                      <div className="pt-2 border-t-2 border-primary flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-wider text-primary">Total</span>
                        <span className="text-xl font-black text-primary mono-num">{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-primary rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="bg-primary text-white px-5 py-3.5">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Shipping</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <Tile label="Carrier" value={carrier === "Turuq" ? "Turuq courier" : carrier} />
                  <Tile label="Courier" value={courier ? `${courier.name} ${courier.phone}` : "No courier assigned"} />
                  {order.courierNotes && <Tile label="Courier notes" value={order.courierNotes} />}
                  <Tile label="Tracking" value={order.trackingNumber || "—"} />
                  {trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Open on carrier →</a>}
                  {!trackingUrl && carrier !== "Turuq" && <div className="text-slate-500 text-xs">Tracking number not available yet</div>}
                  {order.deliveryAttempts > 0 && <Tile label="Delivery attempts" value={order.deliveryAttempts} />}
                  {order.courierAssignedAt && <Tile label="Courier assigned at" value={formatDate(order.courierAssignedAt)} />}
                  {order.dropoffBatchId && <Tile label="Dropoff batch" value={order.dropoffBatchId} />}
                  {order.tripBatchId && <Tile label="Trip batch" value={order.tripBatchId} />}
                  {!brandPreview && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Move to</label>
                        <div className="flex gap-2">
                          <Select value={moveLoc || order.currentLocation || ""} onValueChange={(v) => setMoveLoc(v ?? "")}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Move to..." /></SelectTrigger>
                            <SelectContent>
                              {["warehouse", "brand_storage", "distribution_center", "with_courier", "with_carrier", "returns_team"].map((l) => <SelectItem key={l} value={l}>{humanize(l)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => moveLocation.mutate()}>Move</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {!brandPreview && (
                <Card className="border-2 border-primary rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="bg-primary text-white px-5 py-3.5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Current location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Tile label="Location" value={humanize(order.currentLocation)} />
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Special handling</label>
                      <Select value={sh || order.specialHandling} onValueChange={(v) => setSh(v ?? "none")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["none", "urgent", "vip", "replacement"].map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="mt-2" onClick={() => updateSh.mutate()}>Set</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!brandPreview && (
                <Card className="border-2 border-primary rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="bg-primary text-white px-5 py-3.5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Cancellation &amp; Payout</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Tile label="Reason" value={order.cancellationReason ? (getCancellationReason(order.cancellationReason)?.label || order.cancellationReason) : "—"} />
                    <Tile label="Cancelled by" value={order.cancelledBy || "—"} />
                    <Tile label="Review" value={order.cancellationReviewStatus} />
                    <Tile label="Courier payment" value={(order.statusHistory?.outForDelivery && getCancellationReason(order.cancellationReason)?.courierPayableIfShipped) ? "Eligible" : "Not eligible"} />
                    {order.cancellationImages?.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {order.cancellationImages.map((u: string, i: number) => (
                          <img key={i} src={u} alt="evidence" className="w-20 h-20 object-cover rounded-lg border" />
                        ))}
                      </div>
                    )}
                    {!["delivered", "collected", "cancelled", "returned", "RTW", "RTO"].includes(order.status) && (
                      <Button size="sm" variant="destructive" className="mt-2" onClick={() => setCancelOpen(true)}>Cancel order</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Timeline tab */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="border-2 border-primary rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-primary text-white px-5 py-3.5">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {Object.entries(order.statusHistory || {}).sort((a: any, b: any) => new Date(a[1]).getTime() - new Date(b[1]).getTime()).map(([s, d]: any) => {
                    const courierName = ["pickedUp", "outForDelivery", "RTW", "RTO"].includes(s) && order.courier
                      ? String(order.courier.name).toUpperCase()
                      : null;
                    return (
                      <div key={s} className="relative flex items-center justify-between bg-surface-50 p-4 rounded-xl border border-surface-200">
                        <span className="absolute -left-5 w-3 h-3 rounded-full bg-primary border-2 border-white shadow"></span>
                        <div>
                          <div className="text-xs font-black uppercase text-primary">{humanize(s)}</div>
                          {courierName && <div className="text-[11px] font-extrabold uppercase text-slate-600 mt-0.5">{courierName}</div>}
                        </div>
                        <div className="text-xs font-black uppercase mono-num text-slate-600">{formatDate(d)}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit tab */}
          <TabsContent value="audit" className="mt-6">
            <Card className="border-2 border-primary rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-primary text-white px-5 py-3.5">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Audit log</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="divide-y divide-slate-200">
                  {audit.map((a: any) => (
                    <div key={a._id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded bg-primary text-white text-[10px] font-black uppercase tracking-wider">{a.action}</span>
                          {a.field && <span className="text-xs font-black uppercase text-slate-900">{humanize(a.field)}: {formatAuditValue(a.oldValue)} → {formatAuditValue(a.newValue)}</span>}
                        </div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-600">Actor: {String(a.userName || a.userId || "").toUpperCase()}</div>
                      </div>
                      <div className="text-xs font-black uppercase mono-num text-slate-500 whitespace-nowrap">{formatDate(a.at)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
          <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
            <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Add issue flag</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={flagType} onValueChange={(v) => setFlagType(v ?? "ticket")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ticket", "return_missing_items", "return_wrong_items", "invalid_address", "invalid_phone_number", "delayed_shipment", "defective_items", "other"].map((t) => <SelectItem key={t} value={t}>{humanizeUpper(t)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Note" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} />
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => addFlag.mutate()}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
            <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Cancel {order.oid}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={cancelReason} onValueChange={(v) => setCancelReason(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Reason" /></SelectTrigger>
                <SelectContent>
                  {reasons.map((r: any) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs font-bold">Evidence images (URLs)</Label>
                <Input placeholder="Paste image URL" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setCancelImages((prev) => [...prev, v]); (e.target as HTMLInputElement).value = ""; } } }} />
                <div className="flex gap-2 flex-wrap mt-2">
                  {cancelImages.map((u, i) => <img key={i} src={u} alt="ev" className="w-16 h-16 object-cover rounded border" />)}
                </div>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => cancelOrder.mutate()} disabled={!cancelReason}>Confirm cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Tile({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">{label}</span>
      <span className="text-xs font-black uppercase text-slate-900 mt-1 block">{value}</span>
    </div>
  );
}
