"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo, humanize } from "@/lib/time";
import { detectCarrier, carrierTrackingUrl } from "@/lib/rules/carrier";

function QuickLookupContent() {
  const sp = useSearchParams();
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

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Quick Order Lookup</h1>
      <Input
        autoFocus
        placeholder="Type or scan order number..."
        value={q}
        onChange={(e) => { setQ(e.target.value); }}
        onKeyDown={(e) => { if (e.key === "Enter") search(q); }}
        className="h-12 text-lg"
      />
      {loading && <div>Loading...</div>}
      {results.map((r) => {
        const carrier = detectCarrier(r.courier?.name);
        const url = carrierTrackingUrl(carrier, r.trackingNumber);
        return (
          <Card key={r.id}>
            <CardHeader><CardTitle>{r.oid} · {r.source}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Status: {humanize(r.status)} · {timeAgo(r.lastStatusChangedAt)}</div>
              <div>Courier: {r.courier ? `${r.courier.name} ${r.courier.phone}` : "No courier assigned"}</div>
              <div>Location: {humanize(r.currentLocation)}</div>
              {r.hasOpenIssue && <div className="text-red-500">Has open issue flag</div>}
              <details className="mt-2">
                <summary className="cursor-pointer text-primary">More details</summary>
                <div>Brand: {r.client?.companyName}</div>
                <div>Customer: {r.source === "turuq" ? r.customerName : `${r.customerFirstName} ${r.customerLastName}`} · {r.customerPhone}</div>
                <div>Tracking: {r.trackingNumber || "—"}</div>
                <div>Shipping handler: {r.shippingHandledBy}</div>
                {url && <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">Open on carrier</a>}
              </details>
            </CardContent>
          </Card>
        );
      })}
      {!loading && results.length === 0 && q && <div className="text-slate-500">No results</div>}
    </div>
  );
}

export default function QuickLookupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuickLookupContent />
    </Suspense>
  );
}
