"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ClientDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: clientData } = useQuery({ queryKey: ["client", id], queryFn: async () => (await fetch(`/api/clients?id=${id}`)).json() });
  const client = clientData?.client;

  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState("day");

  const { data: today } = useQuery({ queryKey: ["client-today", id], queryFn: async () => (await fetch(`/api/clients/${id}/stats/today`)).json() });
  const { data: perf, refetch } = useQuery({ queryKey: ["client-perf", id, from, to, groupBy], queryFn: async () => (await fetch(`/api/clients/${id}/stats/performance?from=${from}&to=${to}&groupBy=${groupBy}`)).json() });

  const COLORS = ["#032486", "#38cbfc", "#42c7b8", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary">{client?.companyName || "Client"}</h1>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="today">Today snapshot</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="space-y-2 text-sm">
          <div>Name: {client?.name}</div>
          <div>Company: {client?.companyName}</div>
          <div>Phone: {client?.phone}</div>
          <div>Email: {client?.email}</div>
          <div>Service scheme: {client?.serviceScheme}</div>
          <div>Active: {String(client?.active)}</div>
        </TabsContent>
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Orders today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{today?.today ?? "—"}</div><div className="text-xs text-slate-500">vs yesterday: {today?.diff ?? 0}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">By source</CardTitle></CardHeader><CardContent><div>Turuq: {today?.bySource?.turuq ?? 0}</div><div>Integration: {today?.bySource?.integration ?? 0}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">By status</CardTitle></CardHeader><CardContent>
              {Object.entries(today?.byStatus || {}).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}
            </CardContent></Card>
          </div>
          <Button size="sm" variant="outline" onClick={() => { /* refetch today by re-query */ window.location.reload(); }}>Refresh</Button>
        </TabsContent>
        <TabsContent value="performance" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v ?? "day")}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => refetch()}>Apply</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Orders over time by source</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perf?.overTime || []}>
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="turuq" stroke="#032486" />
                  <Line type="monotone" dataKey="integration" stroke="#38cbfc" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status distribution</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perf?.statusDistribution || []}>
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#032486" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Delivered vs Returned vs Cancelled</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: "outcome", delivered: perf?.outcome?.delivered || 0, returned: perf?.outcome?.returned || 0, cancelled: perf?.outcome?.cancelled || 0 }]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivered" fill="#032486" />
                  <Bar dataKey="returned" fill="#f59e0b" />
                  <Bar dataKey="cancelled" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
