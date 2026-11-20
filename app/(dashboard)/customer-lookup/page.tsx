"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { timeAgo, formatDate } from "@/lib/time";

function CustomerLookupContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [phone, setPhone] = useState(sp.get("phone") || "");
  const [searchPhone, setSearchPhone] = useState(sp.get("phone") || "");
  const { data } = useQuery({
    queryKey: ["customer", searchPhone],
    queryFn: async () => (await fetch(`/api/lookup/customer?phone=${encodeURIComponent(searchPhone)}`)).json(),
    enabled: searchPhone.length > 0,
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Customer Lookup</h1>
      <div className="flex gap-2">
        <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button onClick={() => setSearchPhone(phone)}>Search</Button>
      </div>
      {data && (
        <>
          <Card>
            <CardHeader><CardTitle>Names</CardTitle></CardHeader>
            <CardContent>{(data.names || []).join(", ") || "—"}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm">
                {(data.addresses || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Success rate</CardTitle></CardHeader>
            <CardContent>
              {data.successRate?.rate != null
                ? `${data.successRate.rate.toFixed(0)}%, ${data.successRate.success} of ${data.successRate.total} finished orders`
                : "No finished orders"}
            </CardContent>
          </Card>
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.orders || []).map((o: any) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => router.push(`/orders/${o.source}/${o.id}`)}>
                    <TableCell>{o.oid}</TableCell>
                    <TableCell>{o.source}</TableCell>
                    <TableCell>{o.brand}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell>{formatDate(o.date)}</TableCell>
                    <TableCell>{o.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}


export default function CustomerLookupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerLookupContent />
    </Suspense>
  );
}
