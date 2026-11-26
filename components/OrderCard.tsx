"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useBrandPreview } from "@/lib/brandPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { timeAgo, formatDate, humanize, humanizeUpper } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";
import { canEditData, canEditStatus, allowedNextStatuses } from "@/lib/rules/editRules";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { Calendar, Clock, Pencil, Flag, Package, Truck, User, MapPin, X, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function OrderCard({ order, model, onClose }: any) {
  const router = useRouter();
  const { brandPreview } = useBrandPreview();
  const { t } = useLanguage();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await fetch("/api/me")).json() });
  const courier = order.courier;
  const carrier = detectCarrier(courier?.name);
  const trackingUrl = carrierTrackingUrl(carrier, order.trackingNumber);
  const sortedFlags = [...(order.issueFlags || [])].sort((a: any, b: any) => (a.state === "open" ? -1 : 1) || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  const openFlag = sortedFlags.find((f: any) => f.state === "open");

  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [reasons, setReasons] = useState<any[]>([]);

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

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );

  const Row = ({ label, value, mono = false }: any) => (
    <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 pt-0.5">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 text-right break-words ${mono ? "mono-num" : ""}`}>{value}</span>
    </div>
  );

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">{t("orderCard.orderDetails")}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(order.oid); }}
                className="text-2xl font-bold tracking-tight text-slate-900 hover:text-primary transition-colors"
              >
                {order.oid}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {!brandPreview && canEditData(order.status) && (
              <button
                onClick={() => router.push(`/create-order?from=${model}/${order.id}&mode=edit`)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {t("orderCard.updateOrder")}
              </button>
            )}
            {!brandPreview && canEditStatus(order.status) && (
              <button
                onClick={openStatusDialog}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Flag className="w-3 h-3" />
                {t("orderCard.updateStatus")}
              </button>
            )}
            <button
              onClick={() => onClose()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 border border-rose-600 transition-colors shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              {t("orderCard.close")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-200">
            {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-200">
            {model === "turuq" ? String(order.type || "NORMAL").toUpperCase() : String(order.provider || "").toUpperCase()}
          </span>
          <StatusBadge status={order.status} />
          {order.status === "cancelled" && order.cancellationReason && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
              {humanizeUpper(order.cancellationReason)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-[11px]">
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Last Change
            </span>
            <span className="font-semibold text-slate-900 mono-num">{formatDate(order.lastStatusChangedAt).toUpperCase()}</span>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Created
            </span>
            <span className="font-semibold text-slate-900 mono-num">{formatDate(order.createdAt).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2 bg-white">
        <button
          onClick={() => window.open(`/orders/${model}/${order.id}`, "_blank")}
          className="flex-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          Open Details
        </button>
        <button
          onClick={() => window.open(`/create-order?from=${model}/${order.id}&mode=same`, "_blank")}
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-900 text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          Create New Order
        </button>
      </div>

      {/* Flags */}
      {!brandPreview && (
        <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 ${openFlag ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${openFlag ? "bg-rose-600 text-white" : "bg-slate-600 text-white"}`}>
                {openFlag ? "!" : "+"}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${openFlag ? "text-rose-900" : "text-slate-900"}`}>{t("orderCard.flags")}</span>
            </div>
            {openFlag ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-600 text-white">Action Required</span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-600 text-white">No Open Flag</span>
            )}
          </div>
          {sortedFlags.length > 0 && (
            <div className="mt-3 space-y-2">
              {sortedFlags.map((f: any) => (
                <div key={f._id} className={`p-2.5 rounded-lg border ${f.state === "open" ? "bg-rose-50/60 border-rose-200" : "bg-slate-50/60 border-slate-200"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${f.state === "open" ? "text-rose-950" : "text-slate-500 line-through"}`}>
                    {f.state === "open" ? humanizeUpper(f.type) : humanize(f.type)}
                  </div>
                  {f.note && <div className={`text-[11px] font-medium mt-0.5 ${f.state === "open" ? "text-rose-800" : "text-slate-500 line-through"}`}>{f.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Customer */}
        <Section title={t("orderCard.customerDetails")} icon={User}>
          <Row label="Name" value={model === "turuq" ? order.customerName : `${order.customerFirstName} ${order.customerLastName}`} />
          <Row
            label="Phone"
            value={
              <button
                onClick={() => window.open(`/customer-lookup?phone=${encodeURIComponent(order.customerPhone)}`, "_blank")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-900 font-semibold text-sm border border-slate-200 transition-colors"
              >
                {order.customerPhone}
              </button>
            }
          />
          <Row label="Address" value={`${order.customerAddress}, ${order.customerGovernorate}`} />
        </Section>

        {/* Consignment */}
        <Section title="Consignment Specifications" icon={Package}>
          <Row label="Brand" value={order.client?.companyName} />
          <Row label="Source" value={model.toUpperCase()} />
          <Row label="Type" value={model === "turuq" ? order.type : order.provider} />
          <Row label="Can Open Package" value={String(order.canOpenPackage).toUpperCase()} />
          {!brandPreview && <Row label="Location" value={humanize(order.currentLocation)} />}
        </Section>

        {/* Shipping */}
        {!brandPreview && (
          <Section title={t("orderCard.shippingDispatch")} icon={Truck}>
            <Row label="Ships Via" value={carrier === "Turuq" ? (courier ? courier.name : t("common.noCourierAssigned")) : carrier} />
            {courier && carrier === "Turuq" && <Row label="Courier Phone" value={courier.phone} />}
            <Row label="Shipped By" value={carrier === "Turuq" ? "Turuq Courier" : carrier} />
            <Row label="Tracking" value={order.trackingNumber || "—"} />
            {trackingUrl && (
              <div className="pt-1">
                <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                  Open on carrier →
                </a>
              </div>
            )}
            {order.deliveryAttempts > 0 && <Row label="Delivery Attempts" value={order.deliveryAttempts} />}
            {order.courierAssignedAt && <Row label="Courier Assigned At" value={formatDate(order.courierAssignedAt).toUpperCase()} />}
            <Row label="Handler" value={String(order.shippingHandledBy || "").toUpperCase()} />
          </Section>
        )}

        {/* Products & money */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-10 bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="products" className="text-xs font-semibold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg">
              Products &amp; Money
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs font-semibold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4 mt-4">
            {(order.products || []).length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">{t("orderCard.productsOrdered")}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">{order.products.length} Items</span>
                </div>
                {(order.products || []).map((p: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-900 flex items-center justify-center font-bold text-xs">
                        {String(p.name || "").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold uppercase tracking-wide text-slate-900 block">{String(p.name || "").toUpperCase()}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {p.variant && <span className="px-2 py-0.5 bg-white rounded border border-slate-200 text-[10px] font-semibold uppercase text-slate-700">{p.variant}</span>}
                          <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] font-semibold uppercase text-slate-900">QTY ×{p.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-bold text-slate-900 block">{p.price * p.quantity}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Price</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">{t("orderCard.financialBreakdown")}</span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-slate-700 border border-slate-200">
                  {String(order.paymentMethod || "").toUpperCase()} · {String(order.paymentStatus || "").toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wider">Subtotal</span>
                  <span className="text-base font-bold text-slate-900">{order.subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider">{t("orderCard.shipping")}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">Handler: {String(order.shippingHandledBy || "").toUpperCase()}</span>
                  </div>
                  <span className="text-base font-bold text-slate-900">{order.shippingFees}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Amount</span>
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">{order.total}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Timeline</span>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {Object.entries(order.statusHistory || {})
                    .sort((a: any, b: any) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
                    .map(([s, d]: any) => {
                      const showCourier = ["pickedUp", "outForDelivery", "RTW", "RTO"].includes(s) && order.courier;
                      const courierName = showCourier ? String(order.courier.name).toUpperCase() : null;
                      return (
                        <li key={s} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 gap-3">
                          <div>
                            <div className="font-semibold text-sm text-slate-900 uppercase">{humanize(s)}</div>
                            {courierName && <div className="text-xs text-slate-500 uppercase">{courierName}</div>}
                          </div>
                          <span className="text-xs text-slate-500 mono-num whitespace-nowrap">{formatDate(d)}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="font-semibold uppercase tracking-wider text-slate-700 mono-num">Consignment {order.oid}</span>
        </div>
      </div>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold uppercase tracking-wider">
              {t("orderCard.updateStatus")} {order.oid}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedNextStatuses(order.status, (order as any).type || "NORMAL", (me as any)?.role === "SUPER").map((s) => (
                    <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus === "cancelled" && (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Cancellation Reason</Label>
                <Select value={statusReason} onValueChange={(v) => setStatusReason(v ?? "")}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((r: any) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={updateStatus}
              disabled={!newStatus || (newStatus === "cancelled" && !statusReason)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold uppercase tracking-wider"
            >
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
