"use client";
import { ReactNode, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrandPreview } from "@/lib/brandPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Search, UserSearch, Plus, Truck, Languages } from "lucide-react";

const navGroups = [
  {
    label: "coreOperations",
    items: [
      { href: "/", label: "dashboard", icon: "dashboard" },
      { href: "/orders", label: "orders", icon: "local_shipping", badge: "orders" },
      { href: "/clients", label: "clients", icon: "corporate_fare" },
      { href: "/products", label: "products", icon: "inventory_2" },
    ],
  },
  {
    label: "systemUtilities",
    items: [
      { href: "/notes", label: "myNotes", icon: "sticky_note_2" },
      { href: "/simulator", label: "simulator", icon: "science" },
      { href: "/staff-management", label: "staffManagement", icon: "admin_panel_settings" },
      { href: "/my-account", label: "myAccount", icon: "account_circle" },
      { label: "tickets", icon: "confirmation_number", disabled: true },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { brandPreview, setBrandPreview } = useBrandPreview();
  const { t, lang, setLang } = useLanguage();
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

  const pageTitles: Record<string, { title: string; titleKey?: string; subtitle: string }> = {
    "/": { title: "DASHBOARD", titleKey: "dashboard", subtitle: "OPERATIONAL OVERVIEW" },
    "/orders": { title: "ORDERS DISPATCH HUB", titleKey: "orders", subtitle: "CONSIGNMENT MASTER & STALE ORDERS" },
    "/stale-orders": { title: "ORDERS DISPATCH HUB", titleKey: "orders", subtitle: "CONSIGNMENT MASTER & STALE ORDERS" },
    "/quick-lookup": { title: "QUICK LOOKUP", titleKey: "quickLookup", subtitle: "ORDER & CUSTOMER SEARCH" },
    "/customer-lookup": { title: "CUSTOMER LOOKUP", titleKey: "customerLookup", subtitle: "PHONE-BASED CUSTOMER HISTORY" },
    "/clients": { title: "CLIENTS", titleKey: "clients", subtitle: "BRAND DIRECTORY & PERFORMANCE" },
    "/products": { title: "PRODUCTS", titleKey: "products", subtitle: "INVENTORY" },
    "/staff-management": { title: "STAFF MANAGEMENT", titleKey: "staffManagement", subtitle: "ACCOUNTS & PERMISSIONS" },
    "/create-order": { title: "CREATE ORDER", titleKey: "createOrder", subtitle: "NEW CONSIGNMENT" },
    "/notes": { title: "MY NOTES", titleKey: "notes", subtitle: "PRIVATE SUPPORT NOTES" },
    "/simulator": { title: "PROTOTYPE SIMULATOR", titleKey: "simulator", subtitle: "DEMO & TEST TOOLS" },
    "/my-account": { title: "MY ACCOUNT", titleKey: "myAccount", subtitle: "PROFILE & PERMISSIONS" },
  };
  const pageInfo = pageTitles[pathname] || { title: "TURUQ SUPPORT", subtitle: "LOGISTICS OS" };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-900 h-screen sticky top-0 flex flex-col border-r border-slate-200 flex-shrink-0 select-none overflow-y-auto">
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/15 bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-slate-900 flex items-center justify-center font-black tracking-tight shadow-md">
              <span className="text-base tracking-tighter">TQ</span>
            </div>
            <div>
              <span className="text-base font-black tracking-wider uppercase text-slate-900 block leading-none">Turuq</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mt-1 block">Logistics OS</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-900">LIVE</span>
        </div>

        {/* Nav groups */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-600">{t(`nav.${group.label}`)}</div>
              <nav className="space-y-1">
                {group.items.map((item, idx) => {
                  if ((item as any).disabled) {
                    return (
                      <div
                        key={`disabled-${idx}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 cursor-not-allowed select-none"
                        aria-disabled="true"
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <span>{t(`nav.${item.label}`)}</span>
                      </div>
                    );
                  }
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={(item as any).href}
                      className={`flex items-center ${(item as any).badge ? "justify-between" : "gap-3"} px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        active ? "text-slate-900 bg-slate-100 shadow-sm border border-slate-300" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        <span>{t(`nav.${item.label}`)}</span>
                      </div>
                      {(item as any).badge === "orders" && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-secondary_accent text-slate-900 mono-num">—</span>}
                      {(item as any).badge === "stale" && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 mono-num">—</span>}
                      {(item as any).alert && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User card footer */}
        <div className="p-3.5 border-t border-white/15 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-900 flex items-center justify-center font-bold text-xs uppercase border border-slate-300">
                {user?.name?.slice(0, 2).toUpperCase() || "TS"}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">{user?.name || "Turuq Support"}</div>
                <div className="text-[10px] font-semibold text-thumbnail uppercase tracking-widest">Dispatch Active</div>
              </div>
            </div>
            <button onClick={logout} className="text-slate-600 hover:text-slate-900 transition-colors text-xs uppercase">Logout</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col bg-surface-50 h-screen overflow-y-auto">
        {/* Global Header */}
        <header className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Truck className="w-6 h-6 text-slate-900" />
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-slate-900 whitespace-nowrap leading-none">
                {pageInfo.titleKey ? (t(`pageTitles.${pageInfo.titleKey}`) || pageInfo.title) : pageInfo.title}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mono-num block mt-0.5">
                {pageInfo.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Order Quick Lookup */}
            <form onSubmit={runOrderLookup} className="flex items-center bg-surface-50 border border-surface-200 rounded-xl p-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="w-4 h-4 text-slate-900 ml-2 mr-1" />
              <Input
                type="text"
                placeholder={t("topbar.orderLookup")}
                value={orderLookup}
                onChange={(e) => setOrderLookup(e.target.value)}
                className="w-44 bg-transparent border-0 text-[11px] font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-500 text-slate-900 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 h-auto"
              />
              <button type="submit" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-wider transition-colors">
                GO
              </button>
            </form>

            {/* Customer Quick Lookup */}
            <form onSubmit={runCustomerLookup} className="flex items-center bg-surface-50 border border-surface-200 rounded-xl p-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <UserSearch className="w-4 h-4 text-slate-900 ml-2 mr-1" />
              <Input
                type="text"
                placeholder={t("topbar.customerLookup")}
                value={customerLookup}
                onChange={(e) => setCustomerLookup(e.target.value)}
                className="w-40 bg-transparent border-0 text-[11px] font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-500 text-slate-900 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-1 h-auto"
              />
              <button type="submit" className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-wider transition-colors">
                FIND
              </button>
            </form>

            {/* Create Order */}
            <Button
              onClick={() => router.push("/create-order")}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>CREATE ORDER</span>
            </Button>

          

            <div className="text-sm font-bold text-slate-900 uppercase ml-2">{user?.name}</div>
          </div>
        </header>
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
