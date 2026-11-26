"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Package, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Product = {
  id: string;
  uid: string;
  itemDescription: string;
  primaryClientId: string;
  client?: { companyName?: string; serviceScheme?: string } | null;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
};

export default function ProductsPage() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [brandOpen, setBrandOpen] = useState(false);

  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: async () => (await fetch("/api/clients")).json() });
  const clients = clientsData?.items || [];

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "12");
    p.set("page", String(page));
    if (q) p.set("q", q);
    if (brand) p.set("brand", brand);
    if (stock) p.set("stock", stock);
    return p.toString();
  }, [q, brand, stock, page]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", queryString],
    queryFn: async () => (await fetch(`/api/products?${queryString}`)).json(),
  });

  const items: Product[] = data?.items || [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // metrics (separate queries for counts)
  const { data: allData } = useQuery({ queryKey: ["products", "all"], queryFn: async () => (await fetch("/api/products?limit=1000")).json() });
  const allItems: Product[] = allData?.items || [];
  const totalCount = allData?.total ?? allItems.length;
  const inStock = allItems.filter((p) => p.quantity > 0).length;
  const lowStock = allItems.filter((p) => p.quantity > 0 && p.quantity <= 20).length;
  const outStock = allItems.filter((p) => p.quantity <= 0).length;
  const totalValue = allItems.reduce((s, p) => s + (p.unitPrice || 0) * (p.quantity || 0), 0);

  const reset = () => { setQ(""); setBrand(""); setStock(""); setPage(1); };

  const stockBadge = (qty: number) => {
    if (qty <= 0) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">Out of Stock</span>;
    if (qty <= 5) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">Low Stock</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">In Stock</span>;
  };

  return (
    <div className="flex flex-col flex-1 bg-slate-50">
      <div className="p-8 space-y-6 flex-1">
        {/* Metrics ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { key: "all", label: t("products.totalProducts"), value: totalCount, icon: Package, color: "text-slate-900" },
            { key: "in", label: t("products.inStock"), value: inStock, icon: CheckCircle2, color: "text-emerald-700" },
            { key: "low", label: t("products.lowStock"), value: lowStock, icon: AlertTriangle, color: "text-amber-700" },
            { key: "out", label: t("products.outOfStock"), value: outStock, icon: AlertTriangle, color: "text-rose-700" },
            { key: "value", label: t("products.totalValue"), value: totalValue, icon: DollarSign, color: "text-slate-900" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => { if (m.key !== "all" && m.key !== "value") { setStock(m.key === "in" ? "in" : m.key === "low" ? "low" : "out"); setPage(1); } else if (m.key === "all") { setStock(""); setPage(1); } }}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</span>
              </div>
              <div className={`text-2xl font-black mono-num ${m.color}`}>{m.value.toLocaleString()}</div>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder={t("products.search")}
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold uppercase placeholder:text-slate-400 text-slate-900 focus-visible:ring-primary focus:border-primary h-10"
            />
          </div>
          <div className="relative">
            <select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1); }}
              className="appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/60 transition-colors h-11"
            >
              <option value="">BRAND: ALL</option>
              {clients.map((c: any) => <option key={c.id || c._id} value={c.companyName}>{c.companyName}</option>)}
            </select>
          </div>
          <div className="relative">
            <select
              value={stock}
              onChange={(e) => { setStock(e.target.value); setPage(1); }}
              className="appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:border-primary/60 transition-colors h-11"
            >
              <option value="">STOCK: ALL</option>
              <option value="in">IN STOCK</option>
              <option value="low">LOW STOCK (≤5)</option>
              <option value="out">OUT OF STOCK</option>
            </select>
          </div>
          <Button
            onClick={reset}
            variant="outline"
            className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-900/85 hover:text-slate-900 bg-surface-50 border-surface-200 hover:border-primary/40 transition-colors flex items-center gap-1.5 h-10"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
        </div>

        {/* Loading / Empty */}
        {isLoading && <div className="py-8 text-center text-slate-500 font-bold uppercase">Loading...</div>}
        {!isLoading && items.length === 0 && (
          <div className="py-14 px-6 text-center bg-white border border-slate-200 rounded-2xl">
            <Package className="w-12 h-12 text-slate-900/40 mx-auto mb-3" />
            <div className="text-sm font-black uppercase tracking-wider text-slate-900">{t("products.noProducts")}</div>
          </div>
        )}

        {/* Table */}
        {!isLoading && items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3 px-3">{t("products.uid")}</th>
                    <th className="py-3 px-3">{t("products.description")}</th>
                    <th className="py-3 px-3">{t("products.brand")}</th>
                    <th className="py-3 px-3">{t("products.sizeColor")}</th>
                    <th className="py-3 px-3 text-right">{t("products.qty")}</th>
                    <th className="py-3 px-3 text-right">{t("products.unitPrice")}</th>
                    <th className="py-3 px-3 text-right">{t("products.value")}</th>
                    <th className="py-3 px-3">{t("products.stock")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold uppercase text-slate-900">{p.uid}</td>
                      <td className="py-3 px-3 uppercase text-slate-700">{p.itemDescription}</td>
                      <td className="py-3 px-3 uppercase text-slate-600">{p.client?.companyName || "—"}</td>
                      <td className="py-3 px-3 uppercase text-slate-600">{p.size} / {p.color}</td>
                      <td className="py-3 px-3 text-right mono-num font-bold">{p.quantity}</td>
                      <td className="py-3 px-3 text-right mono-num">{Number(p.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right mono-num font-bold">{(p.unitPrice * p.quantity).toFixed(2)}</td>
                      <td className="py-3 px-3">{stockBadge(p.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600">
            <span>Page {page} of {pages} · {total} products</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-900 font-black text-xs mono-num">{page} / {pages}</span>
              <button className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
