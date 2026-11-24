"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo, formatDate, humanize, humanizeUpper, formatAuditValue } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";
import { getCancellationReason } from "@/lib/rules/cancellationReasons";
import { canEditData, canEditStatus, allowedNextStatuses } from "@/lib/rules/editRules";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { useBrandPreview } from "@/lib/brandPreview";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Truck,
  Clock,
  History,
  Info,
  User,
  Package,
  CreditCard,
  ArrowRight,
  Flag,
} from "lucide-react";

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
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveFlagId, setResolveFlagId] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [sh, setSh] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelImages, setCancelImages] = useState<string[]>([]);

  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");

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

  const updateStatus = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${model}/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: statusReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["order", model, id] }); setUpdateStatusOpen(false); setNewStatus(""); setStatusReason(""); },
  });

  function openUpdateStatus() {
    if (!order) return;
    setNewStatus("");
    setStatusReason("");
    setUpdateStatusOpen(true);
  }

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!order) return <div className="p-8 text-center text-slate-500">Not found</div>;

  const courier = order.courier;
  const carrier = detectCarrier(courier?.name);
  const trackingUrl = carrierTrackingUrl(carrier, order.trackingNumber);
  const sortedFlags = [...(order.issueFlags || [])].sort((a: any, b: any) => (a.state === "open" ? -1 : 1) || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  const openFlag = sortedFlags.find((f: any) => f.state === "open");

  const Tile = ({ label, value, color = "text-primary" }: any) => (
    <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{label}</span>
      <span className={`text-xs font-black uppercase mt-1 block ${color}`}>{value}</span>
    </div>
  );

  const timelineStatuses = Object.entries(order.statusHistory || {})
    .sort((a: any, b: any) => new Date(a[1]).getTime() - new Date(b[1]).getTime());

  const statusDotColor = (status: string) => {
    if (["delivered", "collected"].includes(status)) return "bg-[#42c7b8]";
    if (["RTW", "RTO"].includes(status)) return "bg-purple-700";
    if (["outForDelivery", "pickedUp"].includes(status)) return "bg-secondary-500";
    return "bg-primary";
  };

  return (
    <div className="p-8 space-y-6 bg-surface-50 min-h-full">
      {/* Order summary card */}
      <div className="px-6 py-4 border-2 border-primary bg-white rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/orders")} className="px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Orders</span>
          </button>
          <div className="h-8 w-px bg-surface-200"></div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl font-black uppercase tracking-tight text-primary mono-num">{order.oid}</span>
              <span className="px-3 py-1 rounded-lg bg-secondary/25 text-primary border border-secondary-500/40 text-[11px] font-black uppercase tracking-wider">
                {humanize(order.status)}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${order.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
              </span>
            </div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-primary/75 mt-1 mono-num">
              {timeAgo(order.lastStatusChangedAt)} · {order.client?.companyName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {!brandPreview && canEditData(order.status) && (
            <Button
              onClick={() => router.push(`/create-order?from=${model}/${id}&mode=edit`)}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
            >
              <Pencil className="w-4 h-4 text-secondary" />
              <span>Update Order</span>
            </Button>
          )}
          {!brandPreview && canEditStatus(order.status) && (
            <Button
              onClick={openUpdateStatus}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-primary-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
            >
              <Pencil className="w-4 h-4 text-primary" />
              <span>Update Status</span>
            </Button>
          )}
        </div>
      </div>

      <div className="h-fit w-full">
        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-primary p-1.5 rounded-2xl inline-flex h-fit! flex-wrap items-center gap-1.5 shadow-md border border-primary-950">
            <TabsTrigger value="details" className="flex-initial px-5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
              <FileText className="w-4 h-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
              <Truck className="w-4 h-4" />
              <span>Shipping</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
              <Clock className="w-4 h-4" />
              <span>Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer  rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
              <History className="w-4 h-4" />
              <span>Audit Log</span>
            </TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-7 space-y-6">
                {/* Header card */}
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-secondary" />
                      <h2 className="text-xs font-black uppercase tracking-widest">Header</h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-secondary-950 text-secondary text-[10px] font-black uppercase tracking-wider border border-secondary/30">
                      {model === "turuq" ? order.type : order.provider}
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-4">
                    <Tile label="Status" value={humanize(order.status)} />
                    <Tile label="Payment" value={`${String(order.paymentMethod || "").toUpperCase()} · ${String(order.paymentStatus || "").toUpperCase()}`} color={order.paymentStatus === "PAID" ? "text-emerald-700" : "text-rose-800"} />
                    <Tile label="Brand" value={order.client?.companyName} color="text-primary" />
                    <Tile label="Source" value={model.toUpperCase()} color="text-primary" />
                    {model === "turuq" && <Tile label="Type" value={order.type} />}
                    {model === "integration" && <Tile label="External ID" value={order.externalId} color="text-primary" />}
                    <Tile label="Location" value={humanize(order.currentLocation)} color="text-secondary-950" />
                    <Tile label="Created" value={formatDate(order.createdAt)} color="text-primary" />
                    <Tile label="Last change" value={formatDate(order.lastStatusChangedAt)} color="text-primary" />
                    <Tile label="Can open package" value={String(order.canOpenPackage).toUpperCase()} color={order.canOpenPackage ? "text-primary" : "text-rose-800"} />
                    <Tile label="Special handling" value={humanize(order.specialHandling)} color="text-primary" />
                    {order.notes && <Tile label="Notes" value={order.notes} color="text-primary" />}
                  </div>
                </div>

                {/* Customer card */}
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                    <User className="w-5 h-5 text-secondary" />
                    <h2 className="text-xs font-black uppercase tracking-widest">Customer</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Tile label="Name" value={model === "turuq" ? order.customerName : `${order.customerFirstName} ${order.customerLastName}`} color="text-primary" />
                      <Tile label="Phone" value={order.customerPhone} color="text-primary" />
                      <Tile label="Address" value={order.customerAddress} color="text-primary" />
                      <Tile label="Governorate" value={order.customerGovernorate} color="text-primary" />
                    </div>
                    {(custLookup?.addresses || []).length > 0 && (
                      <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block mb-2">Previous addresses</span>
                        <div className="space-y-1.5">
                          {(custLookup.addresses || []).map((a: string, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs font-bold uppercase text-primary">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                <span>{a}</span>
                              </div>
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/orders/${model}/${id}/apply-address`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: a }) });
                                  if (res.ok) qc.invalidateQueries({ queryKey: ["order", model, id] });
                                }}
                                className="px-2 py-1 rounded-md bg-primary text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 space-y-6">
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-secondary" />
                      <h2 className="text-xs font-black uppercase tracking-widest">Products &amp; Financials</h2>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">{(order.products || []).length} items</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-3 border-b border-surface-200 pb-5">
                      {(order.products || []).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200">
                          <div>
                            <div className="text-xs font-black uppercase text-primary">{p.name}</div>
                            <div className="text-[11px] font-extrabold uppercase text-primary/75 mt-0.5 mono-num">{p.variant} / {p.size || "-"} × {p.quantity}</div>
                          </div>
                          <div className="text-sm font-black uppercase text-primary mono-num">{p.price * p.quantity}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase text-primary/85">
                        <span>Subtotal</span>
                        <span className="font-black mono-num text-primary">{order.subtotal}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase text-primary/85">
                        <span>Shipping</span>
                        <span className="font-black mono-num text-primary">{order.shippingFees} ({order.shippingHandledBy})</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase text-primary/85">
                        <span>Payment</span>
                        <span className={`px-2 py-0.5 rounded font-black ${order.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                          {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
                        </span>
                      </div>
                      <div className="pt-3 border-t-2 border-primary flex items-center justify-between">
                        <span className="text-sm font-black uppercase tracking-wider text-primary">Total</span>
                        <span className="text-xl font-black mono-num text-primary">{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flags & Special Handling */}
                {!brandPreview && (
                  <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                    <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-5 h-5 text-secondary" />
                        <h2 className="text-xs font-black uppercase tracking-widest">Flags &amp; Special Handling</h2>
                      </div>
                      {["RTW", "RTO", "collected", "delivered"].includes(order.status) ? (
                        <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider cursor-not-allowed">
                          Finalized
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setFlagOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-primary-950 text-[10px] font-black uppercase tracking-wider"
                        >
                          Add Flag
                        </Button>
                      )}
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/75 block mb-2">Special handling</label>
                        <div className="flex gap-2">
                          <Select value={sh || order.specialHandling} onValueChange={(v) => setSh(v ?? "none")}>
                            <SelectTrigger className="flex-1 bg-white border-surface-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["none", "urgent", "vip", "replacement"].map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => updateSh.mutate()} className="bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase">Set</Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary/75 block mb-2">Issue flags</label>
                        {sortedFlags.length === 0 && <Tile label="Status" value="No flags" color="text-primary" />}
                        <div className="space-y-2">
                          {sortedFlags.map((f: any) => (
                            <div key={f._id} className={`p-3.5 rounded-xl border ${f.state === "open" ? "bg-surface-50 border-surface-200" : "bg-surface-50/50 border-surface-200/60"}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className={`text-xs font-black uppercase ${f.state === "open" ? "text-secondary-950" : "text-primary/60 line-through"}`}>{humanizeUpper(f.type)}</div>
                                  <div className={`text-[11px] font-bold uppercase mt-0.5 ${f.state === "open" ? "text-primary/75" : "text-primary/50 line-through"}`}>{f.note || "—"}</div>
                                  <div className="text-[10px] font-extrabold uppercase text-primary/60 mt-1 mono-num">{formatDate(f.reportedAt)} · {f.reportedByUser}</div>
                                </div>
                                {f.state === "open" && (
                                  <Button
                                    size="sm"
                                    onClick={() => { setResolveFlagId(String(f._id)); setResolveOpen(true); }}
                                    className="px-3 py-1.5 rounded-lg bg-thumbnail hover:bg-thumbnail/90 text-primary-950 text-[10px] font-black uppercase tracking-wider"
                                  >
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Shipping tab */}
          <TabsContent value="shipping" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-secondary" />
                  <h2 className="text-xs font-black uppercase tracking-widest">Shipping</h2>
                </div>
                <div className="p-5 space-y-3.5">
                  <Tile label="Carrier" value={carrier === "Turuq" ? "Turuq courier" : carrier} />
                  <Tile label="Courier" value={courier ? `${courier.name} ${courier.phone}` : "No courier assigned"} color="text-primary" />
                  {order.courierNotes && <Tile label="Courier notes" value={order.courierNotes} color="text-primary" />}
                  <Tile label="Tracking" value={order.trackingNumber || "—"} color="text-secondary-950" />
                  {order.deliveryAttempts > 0 && <Tile label="Delivery attempts" value={order.deliveryAttempts} color="text-primary" />}
                  {order.courierAssignedAt && <Tile label="Courier assigned at" value={formatDate(order.courierAssignedAt)} color="text-primary" />}
                  {trackingUrl ? (
                    <a href={trackingUrl} target="_blank" rel="noreferrer" className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors">
                      <span>Open on carrier</span>
                      <ArrowRight className="w-4 h-4 text-secondary" />
                    </a>
                  ) : carrier !== "Turuq" && (
                    <div className="text-primary/70 text-xs font-bold uppercase">Tracking number not available yet</div>
                  )}
                </div>
              </div>


              {!brandPreview && (
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-secondary" />
                    <h2 className="text-xs font-black uppercase tracking-widest">Cancellation &amp; Payout</h2>
                  </div>
                  <div className="p-5 space-y-3.5">
                    <Tile label="Cancellation reason" value={order.cancellationReason ? (getCancellationReason(order.cancellationReason)?.label || order.cancellationReason) : "—"} color="text-primary/70" />
                    <Tile label="Cancelled by" value={order.cancelledBy || "—"} color="text-primary/70" />
                    <Tile label="Review" value={order.cancellationReviewStatus || "None"} color="text-primary" />
                    <Tile label="Courier payment" value={(order.statusHistory?.outForDelivery && getCancellationReason(order.cancellationReason)?.courierPayableIfShipped) ? "Eligible" : "Not eligible"} color="text-rose-800" />
                    {order.cancellationImages?.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {order.cancellationImages.map((u: string, i: number) => (
                          <img key={i} src={u} alt="evidence" className="w-20 h-20 object-cover rounded-lg border" />
                        ))}
                      </div>
                    )}
                    {!brandPreview && !["delivered", "collected", "cancelled", "returned", "RTW", "RTO"].includes(order.status) && (
                      <Button size="sm" variant="destructive" className="mt-2" onClick={() => setCancelOpen(true)}>Cancel order</Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Timeline tab */}
          <TabsContent value="timeline" className="mt-6">
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-secondary" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Timeline</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">
                  {timelineStatuses.length} events
                </span>
              </div>
              <div className="p-6">
                <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200">
                  {timelineStatuses.map(([s, d]: any) => {
                    const courierName = ["pickedUp", "outForDelivery", "RTW", "RTO"].includes(s) && order.courier
                      ? String(order.courier.name).toUpperCase()
                      : null;
                    return (
                      <div key={s} className="relative flex items-center justify-between bg-surface-50 p-4 rounded-xl border border-surface-200">
                        <span className={`absolute -left-7 w-4 h-4 rounded-full border-2 border-white shadow ${statusDotColor(s)}`}></span>
                        <div>
                          <div className="text-xs font-black uppercase text-primary">{humanize(s)}</div>
                          {courierName && <div className="text-[11px] font-extrabold uppercase text-secondary-950 mt-0.5">{courierName}</div>}
                        </div>
                        <div className="text-xs font-black uppercase mono-num text-primary">{formatDate(d)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Audit tab */}
          <TabsContent value="audit" className="mt-6">
            <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-secondary" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Audit log</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">
                  {audit.length} entries
                </span>
              </div>
              <div className="divide-y divide-surface-200">
                {audit.map((a: any) => (
                  <div key={a._id} className="p-5 flex items-center justify-between gap-4 hover:bg-surface-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded bg-primary text-white text-[10px] font-black uppercase tracking-wider">{a.action}</span>
                        {a.field && <span className="text-xs font-black uppercase text-primary">{humanize(a.field)}: {formatAuditValue(a.oldValue)} → {formatAuditValue(a.newValue)}</span>}
                      </div>
                      <div className="text-[11px] font-extrabold uppercase text-secondary-950">Actor: {String(a.userName || a.userId || "").toUpperCase()}</div>
                    </div>
                    <div className="text-xs font-black uppercase mono-num text-primary/80 whitespace-nowrap">{formatDate(a.at)}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
          <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
            <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Add issue flag</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={flagType} onValueChange={(v) => setFlagType(v ?? "ticket")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_FLAG_TYPES.map((t) => <SelectItem key={t} value={t}>{humanizeUpper(t)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Note" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} />
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => addFlag.mutate()}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
            <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Resolve flag</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Textarea placeholder="Resolve note" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider" onClick={() => { resolveFlag.mutate({ flagId: resolveFlagId, note: resolveNote }); setResolveOpen(false); setResolveNote(""); }}>Resolve</Button>
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

        <Dialog open={updateStatusOpen} onOpenChange={setUpdateStatusOpen}>
          <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
            <DialogHeader><DialogTitle className="text-primary font-black uppercase tracking-wider">Update Status {order.oid}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/80">New Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
                  <SelectTrigger className="bg-surface-50 border-surface-200"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {allowedNextStatuses(order.status, (order as any).type || "NORMAL").map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
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
                onClick={() => updateStatus.mutate()}
                disabled={!newStatus || (newStatus === "cancelled" && !statusReason)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider"
              >
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
