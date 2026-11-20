"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ClientsPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["clients", q], queryFn: async () => (await fetch(`/api/clients?q=${encodeURIComponent(q)}`)).json() });
  const items = data?.items || [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary">Clients</h1>
      <Input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c: any) => (
          <Link key={c.id} href={`/clients/${c.id}`}>
            <Card className="hover:shadow-md cursor-pointer">
              <CardHeader><CardTitle className="text-base">{c.companyName}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>{c.name}</div>
                <div className="text-slate-500">{c.serviceScheme}</div>
                <div className="text-slate-500">{c.email}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
