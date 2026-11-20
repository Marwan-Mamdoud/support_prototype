"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyAccountPage() {
  const { data } = useQuery({ queryKey: ["me"], queryFn: async () => (await fetch("/api/me")).json() });
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">My Account</h1>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Name: {data?.name}</div>
          <div>Username: {data?.username}</div>
          <div>Email: {data?.email}</div>
          <div>Phone: {data?.phone}</div>
          <div>Role: {data?.role}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>What this account can do</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><b>Can:</b> search and view orders from both sources; use quick order lookup; see carrier, courier and tracking details; open carrier tracking links; view the stale-orders page and take action; add and resolve issue flags; set special handling; create orders and create replacement/exchange orders; edit orders within the edit rules; cancel orders with a reason and evidence; review cancellation evidence; look up customers by phone; view client performance graphs; view dropoff batches; keep private notes.</div>
          <div><b>Cannot:</b> delete orders; edit orders outside the edit rules; change an order's status freely; manage staff; see the brand-side OTP screen except through the prototype simulator; see products management (there is no products page for Support).</div>
        </CardContent>
      </Card>
    </div>
  );
}
