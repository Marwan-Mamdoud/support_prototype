"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { timeAgo, formatDate, humanize, humanizeUpper } from "@/lib/time";
import { detectCarrier } from "@/lib/rules/carrier";
import { ISSUE_FLAG_TYPES } from "@/lib/rules/constants";
import { useBrandPreview } from "@/lib/brandPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { OrderCard } from "@/components/OrderCard";
import { StaleOrdersPanel } from "@/components/StaleOrdersPanel";

const STATUSES = ["pending","processing","packed","QC","pickedUp","droppedOff","outForDelivery","postponed","outOfStock","delivered","collected","returned","RTW","RTO","cancelled"];

function OrdersPageContent() {
  const { brandPreview } = useBrandPreview();
  const { t } = useLanguage();
  const sp = useSearchParams();
  const router = useRouter();
  const [model, setModel] = useState<"turuq" | "integration">("turuq");
  const [filters, setFilters] = useState<any>({});
  const [cardFilter, setCardFilter] = useState<string>("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [custAddr, setCustAddr] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [primaryView, setPrimaryView] = useState<"all" | "stale">(sp.get("view") === "stale" ? "stale" : "all");

  // Stale orders state
  const [staleModel, setStaleModel] = useState<"turuq" | "integration">("turuq");
  const [staleHours, setStaleHours] = useState(24);
  const [staleBrand, setStaleBrand] = useState("");
  const [staleStatus, setStaleStatus] = useState("");
  const [staleCarrier, setStaleCarrier] = useState("");

  useEffect(() => {
    const saved = sp.get("saved");
    if (saved) setFilters((f: any) => ({ ...f, saved }));
    const card = sp.get("card");
    if (card) setCardFilter(card);
  }, [sp]);

  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: async () => (await fetch("/api/clients")).json() });
  const clients = clientsData?.items || [];

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("model", model);
    p.set("limit", "12");
    p.set("page", String(page));
    if (filters.status) p.set("status", filters.status);
    if (filters.brand) p.set("brand", filters.brand);
    if (filters.carrier) p.set("carrier", filters.carrier);
    if (filters.issueFlag) p.set("issueFlag", filters.issueFlag);
    if (filters.serviceScheme) p.set("serviceScheme", filters.serviceScheme);
    if (filters.governorate) p.set("governorate", filters.governorate);
    if (filters.customerPhone) p.set("customerPhone", filters.customerPhone);
    if (filters.customerName) p.set("customerName", filters.customerName);
    if (filters.customerAddress) p.set("customerAddress", filters.customerAddress);
    if (filters.q) p.set("q", filters.q);
    if (filters.saved) p.set("saved", filters.saved);
    if (cardFilter) p.set("card", cardFilter);
    return p.toString();
  }, [model, filters, cardFilter, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", queryString],
    queryFn: async () => (await fetch(`/api/orders?${queryString}`)).json(),
  });

  const staleQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("model", staleModel);
    p.set("hours", String(staleHours));
    if (staleBrand) p.set("brand", staleBrand);
    if (staleStatus) p.set("status", staleStatus);
    if (staleCarrier) p.set("carrier", staleCarrier);
    return p.toString();
  }, [staleModel, staleHours, staleBrand, staleStatus, staleCarrier]);

  const { data: staleData, isLoading: staleLoading } = useQuery({
    queryKey: ["stale", staleQs],
    queryFn: async () => (await fetch(`/api/orders/stale?${staleQs}`)).json(),
  });
  const staleItems = staleData?.items || [];
  const staleTotal = staleData?.total ?? 0;

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const { data: turuqTotal } = useQuery({ queryKey: ["orders", "total", "turuq"], queryFn: async () => (await fetch("/api/orders?model=turuq&limit=1")).json() });
  const { data: intTotal } = useQuery({ queryKey: ["orders", "total", "integration"], queryFn: async () => (await fetch("/api/orders?model=integration&limit=1")).json() });
  const turuqCount = turuqTotal?.total ?? 0;
  const intCount = intTotal?.total ?? 0;

  const { data: countsData } = useQuery({
    queryKey: ["orders", "counts", model],
    queryFn: async () => {
      const keys = ["waiting_decision", "open_issues", "out_of_stock_with_stock", "pending_over_36h", "processing_over_2d", "cancelled_over_2d", "returned_over_2d", "out_for_delivery_over_2d", "status_pending", "status_processing", "status_out_for_delivery", "status_cancelled", "status_returned", "status_postponed", "status_QC", "status_RTW", "status_RTO", "cancelled_received", "cancelled_not_received"];
      const results = await Promise.all(keys.map((k) => fetch(`/api/orders?model=${model}&card=${k}&limit=1`).then((r) => r.json())));
      return keys.reduce((acc: any, k, i) => { acc[k] = results[i]?.total ?? 0; return acc; }, {});
    },
  });
  const openIssuesCount = countsData?.open_issues ?? 0;
  const waitingCount = countsData?.waiting_decision ?? 0;
  const outOfStockWithStockCount = countsData?.out_of_stock_with_stock ?? 0;
  const pendingOver36hCount = countsData?.pending_over_36h ?? 0;
  const processingOver2dCount = countsData?.processing_over_2d ?? 0;
  const cancelledOver2dCount = countsData?.cancelled_over_2d ?? 0;
  const returnedOver2dCount = countsData?.returned_over_2d ?? 0;
  const outForDeliveryOver2dCount = countsData?.out_for_delivery_over_2d ?? 0;
  const statusPendingCount = countsData?.status_pending ?? 0;
  const statusProcessingCount = countsData?.status_processing ?? 0;
  const statusOutForDeliveryCount = countsData?.status_out_for_delivery ?? 0;
  const statusCancelledCount = countsData?.status_cancelled ?? 0;
  const statusReturnedCount = countsData?.status_returned ?? 0;
  const statusPostponedCount = countsData?.status_postponed ?? 0;
  const statusQCCount = countsData?.status_QC ?? 0;
  const statusRTWCount = countsData?.status_RTW ?? 0;
  const statusRTOCount = countsData?.status_RTO ?? 0;
  const cancelledReceivedCount = countsData?.cancelled_received ?? 0;
  const cancelledNotReceivedCount = countsData?.cancelled_not_received ?? 0;

  return (
    <div className="flex flex-col flex-1 bg-slate-50">
      <div className="p-8 space-y-6 flex-1">
        {waitingCount > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 flex items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center flex-shrink-0 shadow font-black text-xl">!</div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-900">{t("ordersPage.waitingDecision")}</span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase bg-slate-100 text-slate-900 border border-slate-200 shadow-sm mono-num">{waitingCount} {t("ordersPage.orders")}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mt-1">
                  {t("ordersPage.waitingAction").replace("{n}", String(waitingCount))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button onClick={() => setCardFilter("")} className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 transition-colors">{t("ordersPage.dismiss")}</button>
              <button onClick={() => setCardFilter("waiting_decision")} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider hover:bg-primary/90 shadow-md transition-colors">{t("ordersPage.reviewOrders").replace("{n}", String(waitingCount))}</button>
            </div>
          </div>
        )}

        {/* Part 1: Issue / overdue cards */}
        <div className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">Issue &amp; Overdue</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { key: "open_issues", label: t("ordersPage.openIssuesUnsolved"), value: openIssuesCount, color: "rose", tooltip: t("ordersPage.tooltipOpenIssues") },
            { key: "out_of_stock_with_stock", label: t("ordersPage.outOfStockWithStock"), value: outOfStockWithStockCount, color: "amber", tooltip: t("ordersPage.tooltipOutOfStockWithStock") },
            { key: "pending_over_36h", label: t("ordersPage.pendingOver36h"), value: pendingOver36hCount, color: "amber", tooltip: t("ordersPage.tooltipPendingOver36h") },
            { key: "processing_over_2d", label: t("ordersPage.processingOver2d"), value: processingOver2dCount, color: "blue", tooltip: t("ordersPage.tooltipProcessingOver2d") },
            { key: "cancelled_over_2d", label: t("ordersPage.cancelledOver2d"), value: cancelledOver2dCount, color: "rose", tooltip: t("ordersPage.tooltipCancelledOver2d") },
            { key: "returned_over_2d", label: t("ordersPage.returnedOver2d"), value: returnedOver2dCount, color: "purple", tooltip: t("ordersPage.tooltipReturnedOver2d") },
            { key: "out_for_delivery_over_2d", label: t("ordersPage.outForDeliveryOver2d"), value: outForDeliveryOver2dCount, color: "blue", tooltip: t("ordersPage.tooltipOutForDeliveryOver2d") },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCardFilter(cardFilter === c.key ? "" : c.key)}
              className={`bg-white p-3 rounded-xl border shadow-sm text-left transition flex flex-col ${cardFilter === c.key ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}
            >
              <div className="flex items-start justify-between gap-1 h-9 overflow-hidden">
                <span className={`text-[9px] font-black uppercase tracking-widest block text-${c.color}-600 leading-tight line-clamp-2`}>{c.label}</span>
                <span className="text-[9px] font-black text-slate-400 cursor-help relative group shrink-0" title={c.tooltip}>?
                  <span className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-1 w-48 p-2 bg-slate-900 text-white text-[10px] font-medium rounded-lg shadow-lg normal-case">{c.tooltip}</span>
                </span>
              </div>
              <span className={`text-xl font-black mt-1 block text-${c.color}-600`}>{c.value}</span>
            </button>
          ))}
        </div>

        {/* Part 2: Total count by status */}
        <div className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1 mt-2">Totals by Status</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: "status_pending", label: t("ordersPage.statusPending"), value: statusPendingCount, color: "text-amber-600" },
            { key: "status_processing", label: t("ordersPage.statusProcessing"), value: statusProcessingCount, color: "text-blue-600" },
            { key: "status_out_for_delivery", label: t("ordersPage.statusOutForDelivery"), value: statusOutForDeliveryCount, color: "text-blue-600" },
            { key: "status_postponed", label: t("ordersPage.statusPostponed"), value: statusPostponedCount, color: "text-amber-600" },
            { key: "status_QC", label: t("ordersPage.statusQC"), value: statusQCCount, color: "text-indigo-600" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCardFilter(cardFilter === c.key ? "" : c.key)}
              className={`bg-white p-3 rounded-xl border shadow-sm text-left transition ${cardFilter === c.key ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}
            >
              <div className="h-9 overflow-hidden">
                <span className={`text-[9px] font-black uppercase tracking-widest block text-${c.color}-600 leading-tight line-clamp-2`}>{c.label}</span>
              </div>
              <span className={`text-xl font-black mt-1 block text-${c.color}-600`}>{c.value}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: "status_cancelled", label: t("ordersPage.statusCancelled"), value: statusCancelledCount, color: "text-rose-600" },
            { key: "cancelled_received", label: t("ordersPage.cancelledReceived"), value: cancelledReceivedCount, color: "text-rose-600" },
            { key: "cancelled_not_received", label: t("ordersPage.cancelledNotReceived"), value: cancelledNotReceivedCount, color: "text-rose-600" },
            { key: "status_returned", label: t("ordersPage.statusReturned"), value: statusReturnedCount, color: "text-purple-600" },
            { key: "status_RTW", label: t("ordersPage.statusRTW"), value: statusRTWCount, color: "text-purple-600" },
            { key: "status_RTO", label: t("ordersPage.statusRTO"), value: statusRTOCount, color: "text-rose-600" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCardFilter(cardFilter === c.key ? "" : c.key)}
              className={`bg-white p-3 rounded-xl border shadow-sm text-left transition ${cardFilter === c.key ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-primary/40"}`}
            >
              <div className="h-9 overflow-hidden"><span className={`text-[9px] font-black uppercase tracking-widest block text-${c.color}-600 leading-tight line-clamp-2`}>{c.label}</span></div>
              <span className={`text-xl font-black mt-1 block text-${c.color}-600`}>{c.value}</span>
            </button>
          ))}
        </div>

        <div className={selected ? "grid grid-cols-1 xl:grid-cols-[1fr_560px] gap-6" : ""}>
          {/* Primary view switcher */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xl">
          <div className="bg-slate-100 text-slate-900 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setPrimaryView("all")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${primaryView === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <span>{t("ordersPage.consignmentMaster")}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-900 text-[10px] mono-num">{total}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrimaryView("stale")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${primaryView === "stale" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <span>STALE ORDERS</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] mono-num">{staleTotal}</span>
                </button>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-200 text-[10px] font-black uppercase text-slate-700 mono-num border border-slate-300">
                SHOWING: {primaryView === "all" ? `${items.length} OF ${total}` : `${staleItems.length} OF ${staleTotal}`}
              </span>
            </div>

            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => { setModel("turuq"); setStaleModel("turuq"); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${model === "turuq" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                <span>TURUQ</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] mono-num ${model === "turuq" ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-700"}`}>{turuqCount}</span>
              </button>
              <button
                onClick={() => { setModel("integration"); setStaleModel("integration"); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${model === "integration" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                <span>INTEGRATION</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] mono-num ${model === "integration" ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-700"}`}>{intCount}</span>
              </button>
            </div>
          </div>

          {primaryView === "all" ? (
            <>
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("ordersPage.searchPlaceholder")}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-400 text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  value={filters.q || ""}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[140px]"
                value={filters.status || ""}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">{t("ordersPage.statusAll")}</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase().replace(/_/g, " ")}</option>)}
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[140px]"
                value={filters.carrier || ""}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
              >
                <option value="">{t("ordersPage.couriersAll")}</option>
                <option value="turuq">Turuq courier</option>
                <option value="bosta">Bosta</option>
                <option value="shipblu">ShipBlu</option>
              </select>
              <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                <PopoverTrigger className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[160px] text-left">
                  {filters.brand ? filters.brand : t("ordersPage.brandAll")}
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64">
                  <Command>
                    <CommandInput placeholder="Search brand..." />
                    <CommandList>
                      <CommandEmpty>No brand found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setFilters({ ...filters, brand: "" }); setBrandOpen(false); }}>All brands</CommandItem>
                        {clients.map((c: any) => (
                          <CommandItem key={c.id} onSelect={() => { setFilters({ ...filters, brand: c.companyName }); setBrandOpen(false); }}>
                            {filters.brand === c.companyName && <Check className="mr-2 h-4 w-4" />}
                            {c.companyName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[140px]"
                value={filters.issueFlag || ""}
                onChange={(e) => setFilters({ ...filters, issueFlag: e.target.value })}
              >
                <option value="">{t("ordersPage.flagsAll")}</option>
                <option value="open">Any open</option>
                {ISSUE_FLAG_TYPES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase().replace(/_/g, " ")}</option>
                ))}
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[140px]"
                value={filters.serviceScheme || ""}
                onChange={(e) => setFilters({ ...filters, serviceScheme: e.target.value })}
              >
                <option value="">{t("ordersPage.schemeAll")}</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="PICKUP">Pickup</option>
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer min-w-[140px]"
                value={filters.governorate || ""}
                onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
              >
                <option value="">{t("ordersPage.governorateAll")}</option>
                {['Cairo','Giza','Helwan','6th of October','Alexandria','Suez','Ismailia','Fayed','Port Said','Dakahlia','Qalyubia','Menoufia','Sharkeya','Gharbeya','Beheira','Kafr El Sheikh','Damietta','Beni Suef','Minya','Fayoum','Asyut','Sohag','Qena','Luxor','Aswan','Red Sea','South Sinai','North Sinai','New Valley','Matrouh'].map((g) => (
                  <option key={g} value={g.toUpperCase()}>{g.toUpperCase()}</option>
                ))}
              </select>
              <Popover open={custOpen} onOpenChange={setCustOpen}>
                <PopoverTrigger className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-primary transition-colors flex items-center gap-1">
                  {t("ordersPage.customerData")}
                </PopoverTrigger>
                <PopoverContent className="p-4 w-80 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-primary">Filter by customer</div>
                  <input placeholder="Phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <input placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <input placeholder="Address" value={custAddr} onChange={(e) => setCustAddr(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 text-xs font-bold uppercase hover:bg-primary/90" onClick={() => {
                      setFilters({ ...filters, customerPhone: custPhone, customerName: custName, customerAddress: custAddr });
                      setCustOpen(false);
                    }}>Apply</button>
                    <button className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold uppercase hover:bg-slate-50" onClick={() => {
                      setCustPhone(""); setCustName(""); setCustAddr("");
                      setFilters({ ...filters, customerPhone: "", customerName: "", customerAddress: "" });
                      setCustOpen(false);
                    }}>Clear</button>
                  </div>
                </PopoverContent>
              </Popover>
              <button
                className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary hover:bg-white transition-colors flex items-center gap-1 border border-transparent hover:border-slate-200"
                onClick={() => { setFilters({}); setCardFilter(""); setCustPhone(""); setCustName(""); setCustAddr(""); }}
              >
                {t("ordersPage.reset")}
              </button>
            </div>

            <div className="overflow-x-auto min-h-[400px] flex flex-col">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">{t("ordersPage.brand")}</th>
                    <th className="py-3.5 px-3">{t("ordersPage.orderNo")}</th>
                    <th className="py-3.5 px-3">{t("ordersPage.status")}</th>
                    <th className="py-3.5 px-4">{t("ordersPage.customerContact")}</th>
                    <th className="py-3.5 px-3">{t("ordersPage.created")}</th>
                    <th className="py-3.5 px-3">{t("ordersPage.lastChange")}</th>
                    <th className="py-3.5 px-4">{t("ordersPage.shipsVia")}</th>
                    <th className="py-3.5 px-3">{t("ordersPage.location")}</th>
                    <th className="py-3.5 px-4 text-right">{t("ordersPage.flags")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {isLoading && (
                    <tr><td colSpan={9} className="py-8 text-center text-slate-500">Loading...</td></tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-slate-500">No orders found</td></tr>
                  )}
                  {items.map((o: any) => {
                    const carrier = detectCarrier(o.courier?.name);
                    const openFlag = (o.issueFlags || []).find((f: any) => f.state === "open");
                    const goodFinished = ["delivered", "collected"].includes(o.status);
                    const badFinished = ["returned", "RTW", "RTO", "cancelled"].includes(o.status);
                    const rowClass = goodFinished
                      ? "bg-white hover:bg-slate-50 border-l-2 border-l-slate-300 cursor-pointer"
                      : badFinished
                      ? "bg-white hover:bg-slate-50 border-l-2 border-l-slate-300 cursor-pointer"
                      : "hover:bg-slate-50 cursor-pointer";
                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className={`transition-colors ${rowClass}`}
                      >
                        <td className="py-3 px-4 font-bold uppercase text-slate-900 whitespace-nowrap">{o.client?.companyName}</td>
                        <td className="py-3 px-3 font-bold mono-num text-primary whitespace-nowrap">{o.oid}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={o.status} />
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{timeAgo(o.lastStatusChangedAt)}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 uppercase">{model === "turuq" ? o.customerName : `${o.customerFirstName} ${o.customerLastName}`}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mono-num mt-0.5">{o.customerPhone} · {o.customerGovernorate}</div>
                        </td>
                        <td className="py-3 px-3 font-bold uppercase mono-num text-slate-600 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                        <td className="py-3 px-3 font-bold uppercase mono-num text-slate-600 whitespace-nowrap">{formatDate(o.lastStatusChangedAt)}</td>
                        <td className="py-3 px-4 uppercase text-slate-700 font-bold whitespace-nowrap">
                          {carrier === "Turuq" ? (o.courier ? `${o.courier.name}` : t("common.noCourierAssigned")) : carrier}
                        </td>
                        <td className="py-3 px-3 uppercase text-slate-600 font-bold whitespace-nowrap">{humanize(o.currentLocation)}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {openFlag ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">{humanizeUpper(openFlag.type)}</span>
                          ) : (
                            <span className="text-slate-400 font-bold uppercase">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="font-bold uppercase tracking-wider text-slate-700">{t("ordersPage.showing")} {items.length} {t("ordersPage.of")} {total} {t("ordersPage.entries")}</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-900 font-black text-xs mono-num">{page}</span>
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
            </>
          ) : (
            <StaleOrdersPanel
              model={staleModel}
              setModel={setStaleModel}
              hours={staleHours}
              setHours={setStaleHours}
              brand={staleBrand}
              setBrand={setStaleBrand}
              status={staleStatus}
              setStatus={setStaleStatus}
              carrier={staleCarrier}
              setCarrier={setStaleCarrier}
              onSelect={setSelected}
            />
          )}

          {/* Master card footer */}
          <div className="bg-surface-50 px-6 py-3.5 border-t border-surface-200 flex items-center justify-between text-xs font-bold uppercase text-primary-950/85">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-thumbnail"></span>
              <span className="mono-num">
                {primaryView === "all"
                  ? `SHOWING ${items.length} OF ${total} ENTRIES · TOTAL STALE: ${staleTotal}`
                  : `TOTAL STALE: ${staleTotal} · NO ACTION TAKEN: ${staleItems.filter((o: any) => !o.hasOpenIssue).length}`}
              </span>
            </div>
            <div className="mono-num text-[11px] font-extrabold text-primary">
              {t("ordersPage.supportDispatch")}
            </div>
          </div>
        </div>

        {selected && (
          <div className="sticky top-20 self-start bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[calc(100vh-60px)] overflow-y-auto">
            <OrderCard order={selected} model={primaryView === "all" ? model : staleModel} onClose={() => setSelected(null)} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
