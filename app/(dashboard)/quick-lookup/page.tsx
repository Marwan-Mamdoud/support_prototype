"use client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo, formatDate, humanize, humanizeUpper, formatAuditValue } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";
import { getCancellationReason } from "@/lib/rules/cancellationReasons";
import {
  ArrowRight,
  FileText,
  Truck,
  Clock,
  History,
  Info,
  User,
  Package,
  MapPin,
  CreditCard,
  Building2,
  Phone,
} from "lucide-react";

function QuickLookupContent() {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(val: string) {
    if (!val.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/lookup/order?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sp.get("q")) search(sp.get("q")!);
  }, []);

  const Tile = ({ label, value, color = "text-primary" }: any) => (
    <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{label}</span>
      <span className={`text-xs font-black uppercase mt-1 block ${color}`}>{value}</span>
    </div>
  );

  const statusDotColor = (status: string) => {
    if (["delivered", "collected"].includes(status)) return "bg-thumbnail";
    if (["RTW", "RTO"].includes(status)) return "bg-purple-700";
    if (["outForDelivery", "pickedUp"].includes(status)) return "bg-secondary-500";
    return "bg-primary";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="Type or scan order number..."
          value={q}
          onChange={(e) => { setQ(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") search(q); }}
          className="h-12 text-lg bg-white border-surface-200 flex-1"
        />
        <Button className="h-12 px-6 bg-primary text-white font-black uppercase tracking-wider" onClick={() => search(q)}>Search</Button>
      </div>
      {loading && <div className="text-slate-500">Loading...</div>}
      {!loading && results.length === 0 && q && <div className="text-slate-500">No results</div>}

      {results.map((order) => {
        const carrier = detectCarrier(order.courier?.name);
        const trackingUrl = carrierTrackingUrl(carrier, order.trackingNumber);
        const model = order.source;
        const audit = order.audit || [];
        const timelineStatuses = Object.entries(order.statusHistory || {}).sort((a: any, b: any) => new Date(a[1]).getTime() - new Date(b[1]).getTime());

        return (
          <div key={order.id} className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-2 border-primary rounded-2xl bg-white shadow-sm">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-primary mono-num">{order.oid}</h2>
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
              <Button
                onClick={() => router.push(`/orders/${model}/${order.id}`)}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md"
              >
                <span>Open Details</span>
                <ArrowRight className="w-4 h-4 text-secondary" />
              </Button>
            </div>

            {/* Main sections: Courier, Brand, Customer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Courier */}
              <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-secondary" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Courier</h3>
                </div>
                <div className="p-5 space-y-3.5">
                  <Tile label={t("quickLookup.tiles.carrier")} value={carrier === "Turuq" ? "Turuq courier" : carrier} />
                  <Tile label={t("quickLookup.tiles.courier")} value={order.courier ? `${order.courier.name} ${order.courier.phone}` : "No courier assigned"} color="text-primary" />
                  <Tile label={t("quickLookup.tiles.tracking")} value={order.trackingNumber || "—"} color="text-secondary-950" />
                  {trackingUrl && (
                    <a href={trackingUrl} target="_blank" rel="noreferrer" className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors">
                      <span>Open on carrier</span>
                      <ArrowRight className="w-4 h-4 text-secondary" />
                    </a>
                  )}
                </div>
              </div>

              {/* Brand */}
              <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Brand</h3>
                </div>
                <div className="p-5 space-y-3.5">
                  <Tile label={t("quickLookup.tiles.brand")} value={order.client?.companyName} />
                  <Tile label={t("quickLookup.tiles.source")} value={model.toUpperCase()} />
                  {model === "turuq" && <Tile label={t("quickLookup.tiles.type")} value={order.type} />}
                  {model === "integration" && <Tile label={t("quickLookup.tiles.external_id")} value={order.externalId} color="text-primary" />}
                  <Tile label={t("quickLookup.tiles.location")} value={humanize(order.currentLocation)} color="text-secondary-950" />
                </div>
              </div>

              {/* Customer */}
              <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                  <User className="w-5 h-5 text-secondary" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Customer</h3>
                </div>
                <div className="p-5 space-y-3.5">
                  <Tile label={t("quickLookup.tiles.name")} value={model === "turuq" ? order.customerName : `${order.customerFirstName} ${order.customerLastName}`} />
                  <Tile label={t("quickLookup.tiles.phone")} value={order.customerPhone} color="text-primary" />
                  <Tile label={t("quickLookup.tiles.address")} value={order.customerAddress} color="text-primary" />
                  <Tile label={t("quickLookup.tiles.governorate")} value={order.customerGovernorate} color="text-primary" />
                </div>
              </div>
            </div>

            {/* Tabs with rest of data */}
            <Tabs defaultValue="details" className="h-full">
              <TabsList className="bg-primary p-1.5 h-fit! rounded-2xl inline-flex flex-wrap items-center gap-1.5 shadow-md border border-primary-950">
                <TabsTrigger value="details" className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
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
                <TabsTrigger value="audit" className="flex-initial px-5 py-2.5 h-[50px]! w-[150px]! cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wider text-white/90 hover:text-white hover:bg-white/10 data-[active]:bg-secondary data-[active]:text-primary-950 data-[active]:font-black data-[active]:shadow-sm flex items-center gap-2 transition-all">
                  <History className="w-4 h-4" />
                  <span>Audit Log</span>
                </TabsTrigger>
              </TabsList>

              {/* Details tab */}
              <TabsContent value="details" className="mt-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-7 space-y-6">
                    <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="w-5 h-5 text-secondary" />
                          <h3 className="text-xs font-black uppercase tracking-widest">Header</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-secondary-950 text-secondary text-[10px] font-black uppercase tracking-wider border border-secondary/30">
                          {model === "turuq" ? order.type : order.provider}
                        </span>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-4">
                        <Tile label={t("quickLookup.tiles.status")} value={humanize(order.status)} />
                        <Tile label={t("quickLookup.tiles.payment")} value={`${String(order.paymentMethod || "").toUpperCase()} · ${String(order.paymentStatus || "").toUpperCase()}`} color={order.paymentStatus === "PAID" ? "text-emerald-700" : "text-rose-800"} />
                        <Tile label={t("quickLookup.tiles.brand")} value={order.client?.companyName} color="text-primary" />
                        <Tile label={t("quickLookup.tiles.source")} value={model.toUpperCase()} color="text-primary" />
                        {model === "turuq" && <Tile label={t("quickLookup.tiles.type")} value={order.type} />}
                        {model === "integration" && <Tile label={t("quickLookup.tiles.external_id")} value={order.externalId} color="text-primary" />}
                        <Tile label={t("quickLookup.tiles.location")} value={humanize(order.currentLocation)} color="text-secondary-950" />
                        <Tile label={t("quickLookup.tiles.created")} value={formatDate(order.createdAt)} color="text-primary" />
                        <Tile label={t("quickLookup.tiles.last_change")} value={formatDate(order.lastStatusChangedAt)} color="text-primary" />
                        <Tile label={t("quickLookup.tiles.can_open_package")} value={String(order.canOpenPackage).toUpperCase()} color={order.canOpenPackage ? "text-primary" : "text-rose-800"} />

                        {order.notes && <Tile label={t("quickLookup.tiles.notes")} value={order.notes} color="text-primary" />}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-5 space-y-6">
                    <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-secondary" />
                          <h3 className="text-xs font-black uppercase tracking-widest">Products &amp; Financials</h3>
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
                  </div>
                </div>
              </TabsContent>

              {/* Shipping tab */}
              <TabsContent value="shipping" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                    <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-secondary" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Shipping</h3>
                    </div>
                    <div className="p-5 space-y-3.5">
                      <Tile label={t("quickLookup.tiles.carrier")} value={carrier === "Turuq" ? "Turuq courier" : carrier} />
                      <Tile label={t("quickLookup.tiles.courier")} value={order.courier ? `${order.courier.name} ${order.courier.phone}` : "No courier assigned"} color="text-primary" />
                      {order.courierNotes && <Tile label={t("quickLookup.tiles.courier_notes")} value={order.courierNotes} color="text-primary" />}
                      <Tile label={t("quickLookup.tiles.tracking")} value={order.trackingNumber || "—"} color="text-secondary-950" />
                      {order.deliveryAttempts > 0 && <Tile label={t("quickLookup.tiles.delivery_attempts")} value={order.deliveryAttempts} color="text-primary" />}
                      {order.courierAssignedAt && <Tile label={t("quickLookup.tiles.courier_assigned_at")} value={formatDate(order.courierAssignedAt)} color="text-primary" />}
                      {trackingUrl && (
                        <a href={trackingUrl} target="_blank" rel="noreferrer" className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors">
                          <span>Open on carrier</span>
                          <ArrowRight className="w-4 h-4 text-secondary" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                    <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-secondary" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Current location</h3>
                    </div>
                    <div className="p-5 space-y-3.5">
                      <Tile label={t("quickLookup.tiles.location")} value={humanize(order.currentLocation)} />

                      <Tile label={t("quickLookup.tiles.issue_flags")} value={order.hasOpenIssue ? "Open flag" : "No flags"} color={order.hasOpenIssue ? "text-rose-800" : "text-primary"} />
                    </div>
                  </div>

                  <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                    <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-secondary" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Cancellation &amp; Payout</h3>
                    </div>
                    <div className="p-5 space-y-3.5">
                      <Tile label={t("quickLookup.tiles.cancellation_reason")} value={order.cancellationReason ? (getCancellationReason(order.cancellationReason)?.label || order.cancellationReason) : "—"} color="text-primary/70" />
                      <Tile label={t("quickLookup.tiles.cancelled_by")} value={order.cancelledBy || "—"} color="text-primary/70" />
                      <Tile label={t("quickLookup.tiles.review")} value={order.cancellationReviewStatus || "None"} color="text-primary" />
                      <Tile label={t("quickLookup.tiles.courier_payment")} value={(order.statusHistory?.outForDelivery && getCancellationReason(order.cancellationReason)?.courierPayableIfShipped) ? "Eligible" : "Not eligible"} color="text-rose-800" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Timeline tab */}
              <TabsContent value="timeline" className="mt-6">
                <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-secondary" />
                      <h3 className="text-sm font-black uppercase tracking-wider">Timeline</h3>
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
                      <h3 className="text-sm font-black uppercase tracking-wider">Audit log</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">
                      {audit.length} entries
                    </span>
                  </div>
                  <div className="divide-y divide-surface-200">
                    {audit.length === 0 && (
                      <div className="p-5 text-xs font-black uppercase text-primary/70">No audit entries</div>
                    )}
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
          </div>
        );
      })}
    </div>
  );
}

export default function QuickLookupPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuickLookupContent />
    </Suspense>
  );
}
