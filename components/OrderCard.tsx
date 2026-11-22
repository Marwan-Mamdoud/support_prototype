"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandPreview } from "@/lib/brandPreview";
import { timeAgo, formatDate, humanize, humanizeUpper } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";
import { canEditData, canEditStatus, allowedNextStatuses } from "@/lib/rules/editRules";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { Calendar, Clock, Pencil, Flag, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function OrderCard({ order, model, onClose }: any) {
  const router = useRouter();
  const { brandPreview } = useBrandPreview();
  const courier = order.courier;
  const carrier = detectCarrier(courier?.name);
  const trackingUrl = carrierTrackingUrl(carrier, order.trackingNumber);
  const openFlag = (order.issueFlags || []).find((f: any) => f.state === "open");

  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [reasons, setReasons] = useState<any[]>([]);

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagType, setFlagType] = useState("ticket");
  const [flagNote, setFlagNote] = useState("");

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");

  async function openStatusDialog() {
    setNewStatus("");
    setStatusReason("");
    try {
      const res = await fetch("/api/cancellation-reasons");
      const data = await res.json();
      setReasons(data.items || []);
    } catch {}
    setStatusOpen(true);
  }

  async function updateStatus() {
    const res = await fetch(`/api/orders/${model}/${order.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, reason: statusReason }),
    });
    if (res.ok) {
      setStatusOpen(false);
      window.location.reload();
    }
  }

  async function addFlag() {
    const res = await fetch(`/api/orders/${model}/${order.id}/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: flagType, note: flagNote }),
    });
    if (res.ok) {
      setFlagOpen(false);
      setFlagType("ticket");
      setFlagNote("");
      window.location.reload();
    }
  }

  async function resolveFlag() {
    if (!openFlag) return;
    const res = await fetch(`/api/orders/${model}/${order.id}/flags/${openFlag._id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: resolveNote }),
    });
    if (res.ok) {
      setResolveOpen(false);
      setResolveNote("");
      window.location.reload();
    }
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden">
      <div className="bg-primary text-white px-5 py-4 border-b border-primary/80">
        <div className="flex items-center justify-between pb-3 border-b border-primary/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></span>
            <span className="text-xs font-black uppercase tracking-widest text-white/80">Order Details</span>
          </div>
          <div className="flex items-center gap-2">
            {!brandPreview && canEditData(order.status) && (
              <button
                onClick={() => router.push(`/create-order?from=${model}/${order.id}&mode=edit`)}
                className="inline-flex items-center gap-1 px-1.5 py-2 rounded-lg text-xs font-black text-white bg-secondary hover:bg-secondary/90 transition-colors uppercase tracking-wider"
              >
                <Pencil className="w-3.5 h-3.5 text-primary-950" />
                <span className="text-primary-950">Update Order</span>
              </button>
            )}
            {!brandPreview && canEditStatus(order.status) && (
              <button
                onClick={openStatusDialog}
                className="inline-flex items-center gap-1 px-1.5 py-2 rounded-lg text-xs font-black text-white bg-thumbnail hover:bg-thumbnail/90 transition-colors uppercase tracking-wider"
              >
                <Flag className="w-3.5 h-3.5 text-primary-950" />
                <span className="text-primary-950">Update Status</span>
              </button>
            )}
            <button onClick={() => onClose()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase tracking-wider border border-white/20">
              <span>Close</span>
              <span className="text-sm">X</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/60 block mb-0.5">Tracking Reference</span>
            <button className="text-2xl font-black tracking-tight text-white hover:underline cursor-pointer" onClick={() => { navigator.clipboard.writeText(order.oid); }}>{order.oid}</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase bg-amber-400 text-slate-900 shadow-md">
              {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase shadow-md ${
              (model === "turuq" ? order.type : "") === "EXCHANGE" ? "bg-purple-500 text-white" :
              (model === "turuq" ? order.type : "") === "REFUND" ? "bg-rose-500 text-white" :
              (model === "turuq" ? order.type : "") === "PROMOTIONAL" ? "bg-cyan-500 text-white" :
              "bg-slate-700 text-white"
            }`}>
              {model === "turuq" ? String(order.type || "NORMAL").toUpperCase() : String(order.provider || "").toUpperCase()}
            </span>
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px]">
          <div className="bg-slate-100 rounded-lg px-3.5 py-2.5 border-2 border-slate-400 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-600" />
              Last Change
            </span>
            <span className="font-bold text-slate-900 mono-num text-xs">{formatDate(order.lastStatusChangedAt).toUpperCase()}</span>
          </div>
          <div className="bg-slate-100 rounded-lg px-3.5 py-2.5 border-2 border-slate-400 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-600" />
              Created
            </span>
            <span className="font-bold text-slate-900 mono-num text-xs">{formatDate(order.createdAt).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Action buttons at top */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
        <button onClick={() => window.open(`/orders/${model}/${order.id}`, "_blank")} className="flex-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider shadow-md transition-colors">
          Open Details
        </button>
        <button onClick={() => window.open(`/create-order?from=${model}/${order.id}&mode=same`, "_blank")} className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider transition-colors">
          Create New Order
        </button>
      </div>

      {!brandPreview && (
        <div className={`border-b px-5 py-3 flex items-start gap-3 ${openFlag ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${openFlag ? "bg-rose-600 text-white" : "bg-slate-600 text-white"}`}>{openFlag ? "!" : "+"}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`text-xs font-black uppercase tracking-wider ${openFlag ? "text-rose-900" : "text-slate-900"}`}>Flags &amp; Special Issue</span>
              {openFlag ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">Action Required</span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-600 text-white">No Open Flag</span>
              )}
            </div>
            {openFlag ? (
              <>
                <div className="mt-1 text-sm font-bold uppercase tracking-wide text-rose-950">Open flag: {humanizeUpper(openFlag.type)}</div>
                {openFlag.note && <div className="text-xs font-medium text-rose-800 mt-1">{openFlag.note}</div>}
                <button
                  onClick={() => setResolveOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-thumbnail hover:bg-thumbnail/90 text-primary-950 text-[10px] font-black uppercase tracking-wider"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Resolve Flag</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setFlagOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Add Flag</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"><span className="text-white/70">●</span> Customer Details</span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white text-primary">Receiver</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Name</span>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-900">{model === "turuq" ? order.customerName : `${order.customerFirstName} ${order.customerLastName}`}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Phone</span>
              <button onClick={() => window.open(`/customer-lookup?phone=${encodeURIComponent(order.customerPhone)}`, "_blank")} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm border border-slate-300 transition-colors">
                {order.customerPhone}
              </button>
            </div>
            <div className="flex items-start justify-between pt-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 pt-0.5">Address</span>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-900 text-right bg-amber-50 px-2 py-1 rounded border border-amber-200 text-amber-900 max-w-[60%]">
                {order.customerAddress}, {order.customerGovernorate}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-sm text-primary">ℹ</span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Consignment Specifications</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Brand</span>
              <span className="text-sm font-bold uppercase text-slate-900 mt-1 block">{order.client?.companyName}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Source</span>
              <span className="text-sm font-bold uppercase text-slate-900 mt-1 block">{model.toUpperCase()}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Type</span>
              <span className="text-sm font-bold uppercase text-slate-900 mt-1 block">{model === "turuq" ? order.type : order.provider}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Can Open Package</span>
              <span className="text-sm font-bold uppercase text-slate-900 mt-1 block">{String(order.canOpenPackage).toUpperCase()}</span>
            </div>
            {!brandPreview && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Special Handling</span>
                <span className="text-sm font-bold uppercase text-slate-900 mt-1 block">{humanize(order.specialHandling)}</span>
              </div>
            )}
            {!brandPreview && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Location</span>
                <span className="text-sm font-bold uppercase text-slate-400 mt-1 block">{humanize(order.currentLocation)}</span>
              </div>
            )}
          </div>
        </div>

        {!brandPreview && (
          <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm">
            <div className="bg-primary text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2"><span className="text-white/70">Truck</span> Shipping &amp; Dispatch</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/80 text-amber-200 border border-primary/70">Handler: {String(order.shippingHandledBy || "").toUpperCase()}</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Ships Via</span>
                <span className="text-sm font-bold uppercase text-slate-900">{carrier === "Turuq" ? (courier ? courier.name : "No courier assigned") : carrier}</span>
              </div>
              {courier && carrier === "Turuq" && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Courier Phone</span>
                  <span className="text-sm font-bold text-slate-900">{courier.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Shipped By</span>
                <span className="text-sm font-extrabold uppercase text-slate-900">{carrier === "Turuq" ? "Turuq Courier" : carrier}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tracking</span>
                <span className="text-sm font-bold uppercase text-slate-400">{order.trackingNumber || "—"}</span>
              </div>
              {trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="inline-block text-primary underline text-sm">Open on carrier →</a>}
              {order.deliveryAttempts > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Delivery Attempts</span>
                  <span className="text-sm font-bold text-slate-900">{order.deliveryAttempts}</span>
                </div>
              )}
              {order.courierAssignedAt && (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Courier Assigned At</span>
                  <span className="text-sm font-bold text-slate-900">{formatDate(order.courierAssignedAt).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-10 bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="products" className="text-xs font-black uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">Products &amp; Money</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs font-black uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4 mt-4">
            {(order.products || []).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-800">🛍</span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Products Ordered</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-900">{order.products.length} Items</span>
                </div>
                <div className="space-y-2.5">
                  {(order.products || []).map((p: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs shadow">
                          {String(p.name || "").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-900 block">{String(p.name || "").toUpperCase()}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {p.variant && <span className="px-2 py-0.5 bg-white rounded border border-slate-200 text-[10px] font-bold uppercase text-slate-700">{p.variant}</span>}
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold uppercase text-white">QTY ×{p.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-black text-slate-900 block">{p.price * p.quantity}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Price</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-primary text-white rounded-2xl p-5 shadow-xl border border-primary/80">
              <div className="flex items-center justify-between pb-3 border-b border-primary/70 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-white/70 flex items-center gap-2">Financial Breakdown</span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-primary/80 text-amber-200">
                  {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-white/70">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Subtotal</span>
                  <span className="text-base font-bold text-white">{order.subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Shipping</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/80 text-white/70 border border-primary/70">Handler: {String(order.shippingHandledBy || "").toUpperCase()}</span>
                  </div>
                  <span className="text-base font-bold text-white">{order.shippingFees}</span>
                </div>
                <div className="pt-3 border-t border-primary/70 flex justify-between items-end">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/60 block">Total Amount</span>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {order.total}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-4 py-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider">Timeline</span>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {Object.entries(order.statusHistory || {}).sort((a: any, b: any) => new Date(a[1]).getTime() - new Date(b[1]).getTime()).map(([s, d]: any) => {
                    // Show courier name (uppercased) ONLY for pickedUp, outForDelivery, RTW, RTO
                    const showCourier = ["pickedUp", "outForDelivery", "RTW", "RTO"].includes(s) && order.courier;
                    const courierName = showCourier ? String(order.courier.name).toUpperCase() : null;
                    return (
                      <li key={s} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                        <div>
                          <div className="font-medium text-sm">{humanize(s)}</div>
                          {courierName && <div className="text-xs text-slate-500">{courierName}</div>}
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(d)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>

      <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span className="font-extrabold uppercase tracking-wider text-slate-700">Consignment {order.oid}</span>
        </div>
      </div>

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
          <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Add Flag {order.oid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">Flag Type</Label>
              <Select value={flagType} onValueChange={(v) => setFlagType(v ?? "ticket")}>
                <SelectTrigger className="bg-surface-50 border-surface-200"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_FLAG_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">Note</Label>
              <Textarea
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Add flag note..."
                className="bg-surface-50 border-surface-200 rounded-xl text-xs font-semibold text-primary"
              />
            </div>
            <Button onClick={addFlag} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider">Add Flag</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
          <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Resolve Flag {order.oid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {openFlag && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="text-xs font-black uppercase text-rose-900">{humanizeUpper(openFlag.type)}</div>
                {openFlag.note && <div className="text-[11px] font-medium text-rose-800 mt-1">{openFlag.note}</div>}
              </div>
            )}
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">Resolve Note</Label>
              <Textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Optional resolution note..."
                className="bg-surface-50 border-surface-200 rounded-xl text-xs font-semibold text-primary"
              />
            </div>
            <Button onClick={resolveFlag} className="w-full bg-thumbnail hover:bg-thumbnail/90 text-primary-950 font-black uppercase tracking-wider">Resolve Flag</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
          <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Update Status {order.oid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
                <SelectTrigger className="bg-surface-50 border-surface-200"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {allowedNextStatuses(order.status).map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newStatus === "cancelled" && (
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">Cancellation Reason</Label>
                <Select value={statusReason} onValueChange={(v) => setStatusReason(v ?? "")}>
                  <SelectTrigger className="bg-surface-50 border-surface-200"><SelectValue placeholder="Reason" /></SelectTrigger>
                  <SelectContent>
                    {reasons.map((r: any) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={updateStatus}
              disabled={!newStatus || (newStatus === "cancelled" && !statusReason)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider"
            >
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
