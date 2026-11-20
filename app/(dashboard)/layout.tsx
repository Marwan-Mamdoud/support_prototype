"use client";
import { ReactNode, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrandPreview } from "@/lib/brandPreview";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/stale-orders", label: "Stale Orders" },
  { href: "/quick-lookup", label: "Quick Lookup" },
  { href: "/customer-lookup", label: "Customer Lookup" },
  { href: "/clients", label: "Clients" },
  { href: "/create-order", label: "Create Order" },
  { href: "/cancellation-review", label: "Cancellation Review" },
  { href: "/dropoff-batches", label: "Dropoff Batches" },
  { href: "/alerts", label: "Alerts" },
  { href: "/notes", label: "My Notes" },
  { href: "/simulator", label: "Prototype Simulator" },
  { href: "/my-account", label: "My Account" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { brandPreview, setBrandPreview } = useBrandPreview();
  const [quickQ, setQuickQ] = useState("");
  const [user, setUser] = useState<any>(null);
  const quickRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setUser).catch(() => {});
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

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-primary text-white">
          <div className="font-bold text-lg">Turuq</div>
          <div className="text-xs text-white/70">Support</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`block px-3 py-2 rounded-md text-sm ${pathname === it.href ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4">
          <form onSubmit={quickSearch} className="flex-1 max-w-md">
            <Input
              ref={quickRef}
              placeholder="Quick order lookup (/)"
              value={quickQ}
              onChange={(e) => setQuickQ(e.target.value)}
              className="h-9"
            />
          </form>
          <div className="flex items-center gap-2">
            <Label htmlFor="bp" className="text-xs">Brand preview</Label>
            <Switch id="bp" checked={brandPreview} onCheckedChange={setBrandPreview} />
          </div>
          <div className="text-sm text-slate-600">{user?.name}</div>
          <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 min-h-0">{children}</main>
      </div>
    </div>
  );
}
