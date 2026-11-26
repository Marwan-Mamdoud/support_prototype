"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => (await fetch("/api/dashboard/metrics")).json(),
  });

  const d = data || {};

  const part1 = [
    { key: "open_issues", label: t("ordersPage.openIssuesUnsolved"), value: d.open_issues ?? 0, color: "rose", tooltip: t("ordersPage.tooltipOpenIssues") },
    { key: "out_of_stock_with_stock", label: t("ordersPage.outOfStockWithStock"), value: d.out_of_stock_with_stock ?? 0, color: "amber", tooltip: t("ordersPage.tooltipOutOfStockWithStock") },
    { key: "pending_over_36h", label: t("ordersPage.pendingOver36h"), value: d.pending_over_36h ?? 0, color: "amber", tooltip: t("ordersPage.tooltipPendingOver36h") },
    { key: "processing_over_2d", label: t("ordersPage.processingOver2d"), value: d.processing_over_2d ?? 0, color: "blue", tooltip: t("ordersPage.tooltipProcessingOver2d") },
    { key: "cancelled_over_2d", label: t("ordersPage.cancelledOver2d"), value: d.cancelled_over_2d ?? 0, color: "rose", tooltip: t("ordersPage.tooltipCancelledOver2d") },
    { key: "returned_over_2d", label: t("ordersPage.returnedOver2d"), value: d.returned_over_2d ?? 0, color: "purple", tooltip: t("ordersPage.tooltipReturnedOver2d") },
    { key: "out_for_delivery_over_2d", label: t("ordersPage.outForDeliveryOver2d"), value: d.out_for_delivery_over_2d ?? 0, color: "blue", tooltip: t("ordersPage.tooltipOutForDeliveryOver2d") },
  ];

  const part2 = [
    { key: "status_pending", label: t("ordersPage.statusPending"), value: d.status_pending ?? 0, color: "amber" },
    { key: "status_processing", label: t("ordersPage.statusProcessing"), value: d.status_processing ?? 0, color: "blue" },
    { key: "status_out_for_delivery", label: t("ordersPage.statusOutForDelivery"), value: d.status_out_for_delivery ?? 0, color: "blue" },
    { key: "status_cancelled", label: t("ordersPage.statusCancelled"), value: d.status_cancelled ?? 0, color: "rose" },
    { key: "cancelled_received", label: t("ordersPage.cancelledReceived"), value: d.cancelled_received ?? 0, color: "rose" },
    { key: "cancelled_not_received", label: t("ordersPage.cancelledNotReceived"), value: d.cancelled_not_received ?? 0, color: "rose" },
    { key: "status_returned", label: t("ordersPage.statusReturned"), value: d.status_returned ?? 0, color: "purple" },
    { key: "status_postponed", label: t("ordersPage.statusPostponed"), value: d.status_postponed ?? 0, color: "amber" },
    { key: "status_QC", label: t("ordersPage.statusQC"), value: d.status_QC ?? 0, color: "indigo" },
    { key: "status_RTW", label: t("ordersPage.statusRTW"), value: d.status_RTW ?? 0, color: "purple" },
    { key: "status_RTO", label: t("ordersPage.statusRTO"), value: d.status_RTO ?? 0, color: "rose" },
    { key: "status_outOfStock", label: t("ordersPage.statusOutOfStock"), value: d.status_outOfStock ?? 0, color: "amber" },
    { key: "status_delivered", label: t("ordersPage.statusDelivered"), value: d.status_delivered ?? 0, color: "emerald" },
    { key: "status_collected", label: t("ordersPage.statusCollected"), value: d.status_collected ?? 0, color: "emerald" },
    { key: "status_pickedUp", label: t("ordersPage.statusPickedUp"), value: d.status_pickedUp ?? 0, color: "blue" },
    { key: "status_packed", label: t("ordersPage.statusPacked"), value: d.status_packed ?? 0, color: "indigo" },
    { key: "status_droppedOff", label: t("ordersPage.statusDroppedOff"), value: d.status_droppedOff ?? 0, color: "teal" },
  ];

  const part3 = [
    { key: "total_products", label: t("dashboard.totalProducts"), value: d.total_products ?? 0, color: "primary", tooltip: t("dashboard.tooltipTotalProducts") },
    { key: "in_stock_products", label: t("dashboard.inStockProducts"), value: d.in_stock_products ?? 0, color: "emerald", tooltip: t("dashboard.tooltipInStockProducts") },
    { key: "low_stock_products", label: t("dashboard.lowStockProducts"), value: d.low_stock_products ?? 0, color: "amber", tooltip: t("dashboard.tooltipLowStockProducts") },
    { key: "out_stock_products", label: t("dashboard.outStockProducts"), value: d.out_stock_products ?? 0, color: "rose", tooltip: t("dashboard.tooltipOutStockProducts") },
    { key: "total_product_value", label: t("dashboard.totalProductValue"), value: d.total_product_value ?? 0, color: "primary", tooltip: t("dashboard.tooltipTotalProductValue") },
  ];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-primary/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Issue &amp; Overdue</div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {part1.map((c) => (
          <button
            key={c.key}
            onClick={() => (window.location.href = `/orders?card=${c.key}`)}
            className="bg-white p-3 rounded-xl border shadow-sm text-left transition flex flex-col border-slate-200 hover:border-primary/40"
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

      <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1 mt-2">Totals by Status</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {part2.map((c) => (
          <button
            key={c.key}
            onClick={() => (window.location.href = `/orders?card=${c.key}`)}
            className="bg-white p-3 rounded-xl border shadow-sm text-left transition flex flex-col border-slate-200 hover:border-primary/40"
          >
            <div className="h-9 overflow-hidden flex items-start">
              <span className={`text-[9px] font-black uppercase tracking-widest block text-${c.color}-600 leading-tight line-clamp-2`}>{c.label}</span>
            </div>
            <span className={`text-xl font-black mt-1 block text-${c.color}-600`}>{c.value}</span>
          </button>
        ))}
      </div>

      <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1 mt-2">Products</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {part3.map((c) => (
          <button
            key={c.key}
            onClick={() => (window.location.href = `/products`)}
            className="bg-white p-3 rounded-xl border shadow-sm text-left transition flex flex-col border-slate-200 hover:border-primary/40"
          >
            <div className="h-9 overflow-hidden flex items-start justify-between gap-1">
              <span className={`text-[9px] font-black uppercase tracking-widest block text-${c.color}-600 leading-tight line-clamp-2`}>{c.label}</span>
              <span className="text-[9px] font-black text-slate-400 cursor-help relative group shrink-0" title={c.tooltip}>?
                <span className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-1 w-48 p-2 bg-slate-900 text-white text-[10px] font-medium rounded-lg shadow-lg normal-case">{c.tooltip}</span>
              </span>
            </div>
            <span className={`text-xl font-black mt-1 block text-${c.color}-600`}>{c.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
