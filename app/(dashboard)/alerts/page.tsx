"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo } from "@/lib/time";

export default function AlertsPage() {
  const [handled, setHandled] = useState("false");
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["alerts", handled],
    queryFn: async () => (await fetch(`/api/alerts?handled=${handled}`)).json(),
  });
  const items = data?.items || [];

  const mark = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}/handled`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-primary">Alerts</h1>
      <Select value={handled} onValueChange={(v) => setHandled(v ?? '')}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="false">Unhandled</SelectItem>
          <SelectItem value="true">Handled</SelectItem>
        </SelectContent>
      </Select>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={4}>No alerts</TableCell></TableRow>}
            {items.map((a: any) => (
              <TableRow key={a._id}>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.orderModel}/{String(a.orderId)}</TableCell>
                <TableCell>{timeAgo(a.createdAt)}</TableCell>
                <TableCell>
                  {!a.handled && <Button size="sm" onClick={() => mark.mutate(a._id)}>Handled</Button>}
                  {a.handled && <span className="text-xs text-slate-500">by {a.handledBy}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
