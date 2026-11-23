"use client";
import { ReactNode, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrandPreview } from "@/lib/brandPreview";
import { Search, UserSearch, Plus, Truck } from "lucide-react";

const navGroups = [
  {
    label: "Core Operations",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/orders", label: "Orders", icon: "local_shipping", badge: "orders" },
      { href: "/clients", label: "Clients", icon: "corporate_fare" },
    ],
  },
  // {
  //   label: "Fulfillment & Tasks",
  //   items: [
  //     { href: "/cancellation-review", label: "Cancellation Review", icon: "cancel_presentation" },
  //     { href: "/dropoff-batches", label: "Dropoff Batches", icon: "layers" },
  //     { href: "/alerts", label: "Alerts", icon: "notifications_active", alert: true },
  //   ],
  // },
  {
    label: "System & Utilities",
    items: [
      { href: "/notes", label: "My Notes", icon: "sticky_note_2" },
      { href: "/simulator", label: "Prototype Simulator", icon: "science" },
      { href: "/staff-management", label: "Staff Management", icon: "admin_panel_settings" },
      { href: "/my-account", label: "My Account", icon: "account_circle" },
      { label: "TICKETS", icon: "confirmation_number", disabled: true },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { brandPreview, setBrandPreview } = useBrandPreview();
  const [quickQ, setQuickQ] = useState("");
  const [user, setUser] = useState<any>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        quickRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function quickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!quickQ.trim()) return;
    router.push(`/quick-lookup?q=${encodeURIComponent(quickQ.trim())}`);
  }

  const [orderLookup, setOrderLookup] = useState("");
  const [customerLookup, setCustomerLookup] = useState("");

  function runOrderLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!orderLookup.trim()) return;
    router.push(`/quick-lookup?q=${encodeURIComponent(orderLookup.trim())}`);
    setOrderLookup("");
  }

  function runCustomerLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!customerLookup.trim()) return;
    router.push(`/customer-lookup?phone=${encodeURIComponent(customerLookup.trim())}`);
    setCustomerLookup("");
  }

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    "/": { title: "DASHBOARD", subtitle: "OPERATIONAL OVERVIEW" },
    "/orders": { title: "ORDERS DISPATCH HUB", subtitle: "CONSIGNMENT MASTER & STALE ORDERS" },
    "/stale-orders": { title: "ORDERS DISPATCH HUB", subtitle: "CONSIGNMENT MASTER & STALE ORDERS" },
    "/quick-lookup": { title: "QUICK LOOKUP", subtitle: "ORDER & CUSTOMER SEARCH" },
    "/customer-lookup": { title: "CUSTOMER LOOKUP", subtitle: "PHONE-BASED CUSTOMER HISTORY" },
    "/clients": { title: "CLIENTS", subtitle: "BRAND DIRECTORY & PERFORMANCE" },
    "/create-order": { title: "CREATE ORDER", subtitle: "NEW CONSIGNMENT" },
    "/notes": { title: "MY NOTES", subtitle: "PRIVATE SUPPORT NOTES" },
    "/simulator": { title: "PROTOTYPE SIMULATOR", subtitle: "DEMO & TEST TOOLS" },
    "/my-account": { title: "MY ACCOUNT", subtitle: "PROFILE & PERMISSIONS" },
  };
  const pageInfo = pageTitles[pathname] || { title: "TURUQ SUPPORT", subtitle: "LOGISTICS OS" };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white h-screen sticky top-0 flex flex-col border-r border-secondary-950 flex-shrink-0 select-none overflow-y-auto">
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/15 bg-primary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-primary flex items-center justify-center font-black tracking-tight shadow-md">
              <span className="text-base tracking-tighter">TQ</span>
            </div>
            <div>
              <span className="text-base font-black tracking-wider uppercase text-white block leading-none">Turuq</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary_accent mt-1 block">Logistics OS</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-thumbnail text-primary-950">LIVE</span>
        </div>

        {/* Nav groups */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-secondary_accent">{group.label}</div>
              <nav className="space-y-1">
                {group.items.map((item, idx) => {
                  if ((item as any).disabled) {
                    return (
                      <div
                        key={`disabled-${idx}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white/80 cursor-not-allowed select-none"
                        aria-disabled="true"
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    );
                  }
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={(item as any).href}
                      className={`flex items-center ${(item as any).badge ? "justify-between" : "gap-3"} px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        active ? "text-white bg-primary shadow-sm border border-secondary_accent/40" : "text-white/85 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {(item as any).badge === "orders" && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-secondary_accent text-primary-950 mono-num">—</span>}
                      {(item as any).badge === "stale" && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/15 text-white mono-num">—</span>}
                      {(item as any).alert && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User card footer */}
        <div className="p-3.5 border-t border-white/15 bg-secondary-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs uppercase border border-secondary_accent/40">
                {user?.name?.slice(0, 2).toUpperCase() || "TS"}
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">{user?.name || "Turuq Support"}</div>
                <div className="text-[10px] font-semibold text-thumbnail uppercase tracking-widest">Dispatch Active</div>
              </div>
            </div>
            <button onClick={logout} className="text-white/80 hover:text-white transition-colors text-xs">Logout</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col bg-surface-50 h-screen overflow-y-auto">
        {/* Global Header */}
        <header className="h-16 px-6 border-b-2 border-primary bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Truck className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-primary whitespace-nowrap leading-none">
                {pageInfo.title}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-950/75 mono-num block mt-0.5">
                {pageInfo.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Order Quick Lookup */}
            <form onSubmit={runOrderLookup} className="flex items-center bg-surface-50 border border-surface-200 rounded-xl p-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="w-4 h-4 text-primary ml-2 mr-1" />
              <Input
                type="text"
                placeholder="ORDER QUICK LOOKUP (TQ-...)"
                value={orderLookup}
                onChange={(e) => setOrderLookup(e.target.value)}
                className="w-44 bg-transparent border-0 text-[11px] font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-primary-950/70 text-primary-950 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 h-auto"
              />
              <button type="submit" className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-950 text-white text-[10px] font-black uppercase tracking-wider transition-colors">
                GO
              </button>
            </form>

            {/* Customer Quick Lookup */}
            <form onSubmit={runCustomerLookup} className="flex items-center bg-surface-50 border border-surface-200 rounded-xl p-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <UserSearch className="w-4 h-4 text-primary-950 ml-2 mr-1" />
              <Input
                type="text"
                placeholder="CUSTOMER PHONE / NAME"
                value={customerLookup}
                onChange={(e) => setCustomerLookup(e.target.value)}
                className="w-40 bg-transparent border-0 text-[11px] font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-primary-950/70 text-primary-950 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 h-auto"
              />
              <button type="submit" className="px-2.5 py-1 rounded-lg bg-primary-950 hover:bg-primary text-white text-[10px] font-black uppercase tracking-wider transition-colors">
                FIND
              </button>
            </form>

            {/* Create Order */}
            <Button
              onClick={() => router.push("/create-order")}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-950 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-secondary_accent" />
              <span>CREATE ORDER</span>
            </Button>

          

            <div className="text-sm font-bold text-slate-600 ml-2">{user?.name}</div>
          </div>
        </header>
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
