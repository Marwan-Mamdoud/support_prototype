"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { timeAgo, formatDate, humanize, humanizeUpper } from "@/lib/time";
import { detectCarrier } from "@/lib/rules/carrier";
import { useBrandPreview } from "@/lib/brandPreview";
import { StatusBadge } from "@/components/StatusBadge";
import { Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { OrderCard } from "@/components/OrderCard";

const STATUSES = ["pending","processing","packed","QC","pickedUp","droppedOff","outForDelivery","postponed","outOfStock","delivered","collected","returned","RTW","RTO","cancelled"];

function OrdersPageContent() {
  const { brandPreview } = useBrandPreview();
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

  useEffect(() => {
    const saved = sp.get("saved");
    if (saved) setFilters((f: any) => ({ ...f, saved }));
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
    if (filters.specialHandling) p.set("specialHandling", filters.specialHandling);
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
      const keys = ["waiting_decision", "successful", "in_progress", "new"];
      const results = await Promise.all(keys.map((k) => fetch(`/api/orders?model=${model}&card=${k}&limit=1`).then((r) => r.json())));
      return keys.reduce((acc: any, k, i) => { acc[k] = results[i]?.total ?? 0; return acc; }, {});
    },
  });
  const waitingCount = countsData?.waiting_decision ?? 0;
  const successCount = countsData?.successful ?? 0;
  const inProgressCount = countsData?.in_progress ?? 0;
  const newCount = countsData?.new ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="h-16 px-8 border-b-2 border-primary bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2.5">
            <span>ORDERS DISPATCH HUB</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold uppercase text-slate-600 mono-num">{total} TOTAL SHIPMENTS</span>
          <button onClick={() => router.push("/create-order")} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
            <span>+</span>
            <span>CREATE ORDER</span>
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 flex-1">
        {waitingCount > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 flex items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center flex-shrink-0 shadow font-black text-xl">!</div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-900">Waiting for your decision</span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase bg-amber-400 text-slate-900 shadow-sm mono-num">{waitingCount} orders</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mt-1">
                  You have {waitingCount} orders waiting for your immediate action (address fixes, out of stock or cancellations)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button onClick={() => setCardFilter("")} className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 transition-colors">Dismiss</button>
              <button onClick={() => setCardFilter("waiting_decision")} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90 shadow-md transition-colors">Review {waitingCount} orders</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setCardFilter("successful")} className={`bg-white p-4 rounded-xl border shadow-sm text-left transition ${cardFilter === "successful" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-400"}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Delivered</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{successCount}</span>
          </button>
          <button onClick={() => setCardFilter("in_progress")} className={`bg-white p-4 rounded-xl border shadow-sm text-left transition ${cardFilter === "in_progress" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-blue-400"}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">In Dispatch / Transit</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{inProgressCount}</span>
          </button>
          <button onClick={() => setCardFilter("new")} className={`bg-white p-4 rounded-xl border shadow-sm text-left transition ${cardFilter === "new" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200 hover:border-amber-400"}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Pending / New</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{newCount}</span>
          </button>
          <button onClick={() => setCardFilter("waiting_decision")} className={`bg-white p-4 rounded-xl border shadow-sm text-left transition ${cardFilter === "waiting_decision" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 hover:border-rose-400"}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 block">Issues / Cancelled</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{waitingCount}</span>
          </button>
        </div>

        <div className={selected ? "grid grid-cols-1 xl:grid-cols-[1fr_560px] gap-6" : ""}>
          <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-xl">
            <div className="bg-primary text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-primary/80">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black uppercase tracking-wider">Consignment Master Register</span>
                <span className="px-2.5 py-0.5 rounded bg-white text-[10px] font-black uppercase text-primary shadow-sm mono-num">Total: {total}</span>
              </div>
              <div className="inline-flex bg-primary/80 p-1 rounded-xl border border-white/20 shadow-inner">
                <button
                  onClick={() => { setModel("turuq"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${model === "turuq" ? "bg-white text-primary shadow-md" : "text-white/80 hover:text-white"}`}
                >
                  Turuq Orders <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[10px] mono-num">{turuqCount}</span>
                </button>
                <button
                  onClick={() => { setModel("integration"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${model === "integration" ? "bg-white text-primary shadow-md" : "text-white/80 hover:text-white"}`}
                >
                  Integration Orders <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[10px] mono-num">{intCount}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search order #, customer, phone..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-400 text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  value={filters.q || ""}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.status || ""}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Status: All</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase().replace(/_/g, " ")}</option>)}
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.carrier || ""}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
              >
                <option value="">Couriers: All</option>
                <option value="turuq">Turuq courier</option>
                <option value="bosta">Bosta</option>
                <option value="shipblu">ShipBlu</option>
              </select>
              <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                <PopoverTrigger className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer min-w-[120px] text-left">
                  {filters.brand ? filters.brand : "Brand: All"}
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
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.issueFlag || ""}
                onChange={(e) => setFilters({ ...filters, issueFlag: e.target.value })}
              >
                <option value="">Flags: All</option>
                <option value="open">Any open</option>
                {["ticket","return_missing_items","return_wrong_items","invalid_address","invalid_phone_number","delayed_shipment","defective_items","other"].map((t) => (
                  <option key={t} value={t}>{t.toUpperCase().replace(/_/g, " ")}</option>
                ))}
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.specialHandling || ""}
                onChange={(e) => setFilters({ ...filters, specialHandling: e.target.value })}
              >
                <option value="">Special: All</option>
                <option value="urgent">Urgent</option>
                <option value="vip">VIP</option>
                <option value="replacement">Replacement</option>
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.serviceScheme || ""}
                onChange={(e) => setFilters({ ...filters, serviceScheme: e.target.value })}
              >
                <option value="">Scheme: All</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="PICKUP">Pickup</option>
              </select>
              <select
                className="appearance-none bg-white border border-slate-200 rounded-xl text-xs font-extrabold uppercase pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-primary shadow-sm cursor-pointer"
                value={filters.governorate || ""}
                onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
              >
                <option value="">Governorate: All</option>
                {['Cairo','Giza','Helwan','6th of October','Alexandria','Suez','Ismailia','Fayed','Port Said','Dakahlia','Qalyubia','Menoufia','Sharkeya','Gharbeya','Beheira','Kafr El Sheikh','Damietta','Beni Suef','Minya','Fayoum','Asyut','Sohag','Qena','Luxor','Aswan','Red Sea','South Sinai','North Sinai','New Valley','Matrouh'].map((g) => (
                  <option key={g} value={g.toUpperCase()}>{g.toUpperCase()}</option>
                ))}
              </select>
              <Popover open={custOpen} onOpenChange={setCustOpen}>
                <PopoverTrigger className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-primary transition-colors flex items-center gap-1">
                  Customer data
                </PopoverTrigger>
                <PopoverContent className="p-4 w-80 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-primary">Filter by customer</div>
                  <input placeholder="Phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <input placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <input placeholder="Address" value={custAddr} onChange={(e) => setCustAddr(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold uppercase hover:bg-primary/90" onClick={() => {
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
                Reset
              </button>
            </div>

            <div className="overflow-x-auto min-h-[400px] flex flex-col">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-primary text-white uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Brand</th>
                    <th className="py-3.5 px-3">Order #</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4">Customer &amp; Contact</th>
                    <th className="py-3.5 px-3">Created</th>
                    <th className="py-3.5 px-3">Last Change</th>
                    <th className="py-3.5 px-4">Ships Via</th>
                    <th className="py-3.5 px-3">Location</th>
                    <th className="py-3.5 px-4 text-right">Flags</th>
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
                      ? "bg-emerald-50/60 hover:bg-emerald-50 border-l-4 border-l-emerald-500 cursor-pointer"
                      : badFinished
                      ? "bg-rose-50/60 hover:bg-rose-50 border-l-4 border-l-rose-500 cursor-pointer"
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
                          {carrier === "Turuq" ? (o.courier ? `${o.courier.name}` : "No courier assigned") : carrier}
                        </td>
                        <td className="py-3 px-3 uppercase text-slate-600 font-bold whitespace-nowrap">{humanize(o.currentLocation)}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {openFlag ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">{humanizeUpper(openFlag.type)}</span>
                          ) : o.specialHandling && o.specialHandling !== "none" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">{humanizeUpper(o.specialHandling)}</span>
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
              <div className="font-bold uppercase tracking-wider text-slate-700">Showing {items.length} of {total} entries</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="px-3 py-1 rounded-lg bg-primary text-white font-black text-xs mono-num">{page}</span>
                <button
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold uppercase text-[11px] hover:bg-white transition-colors disabled:opacity-50"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {selected && (
            <div className="sticky top-20 self-start bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden max-h-[calc(100vh-60px)] overflow-y-auto">
              <OrderCard order={selected} model={model} onClose={() => setSelected(null)} />
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
