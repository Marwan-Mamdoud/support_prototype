"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo, formatDate } from "@/lib/time";

export default function DropoffBatchesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dropoff-batches"], queryFn: async () => (await fetch("/api/dropoff-batches")).json() });
  const items = data?.items || [];
  const [createOpen, setCreateOpen] = useState(false);
  const [courierId, setCourierId] = useState("");
  const [dest, setDest] = useState("BRAND");
  const [bid, setBid] = useState("");
  const [otp, setOtp] = useState("");
  const [closeOpen, setCloseOpen] = useState<any>(null);
  const [closeOtp, setCloseOtp] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dropoff-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid, courierId, destinationType: dest, otp }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dropoff-batches"] }); setCreateOpen(false); },
  });

  const close = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dropoff-batches/${closeOpen.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: closeOtp }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dropoff-batches"] }); setCloseOpen(null); setCloseOtp(""); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Dropoff Batches</h1>
        <Button onClick={() => setCreateOpen(true)}>Create batch</Button>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>BID</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Old open (2d+)</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>{b.bid}</TableCell>
                <TableCell>{b.courier?.name}</TableCell>
                <TableCell>{b.destinationType}</TableCell>
                <TableCell>{formatDate(b.startDate)}</TableCell>
                <TableCell>{b.status}</TableCell>
                <TableCell>{b.oldOpenCount}</TableCell>
                <TableCell>
                  {b.status === "OPEN" && <Button size="sm" onClick={() => setCloseOpen(b)}>Close</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create dropoff batch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="BID" value={bid} onChange={(e) => setBid(e.target.value)} />
            <Input placeholder="Courier ID" value={courierId} onChange={(e) => setCourierId(e.target.value)} />
            <Select value={dest} onValueChange={(v) => setDest(v ?? "BRAND")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRAND">BRAND</SelectItem>
                <SelectItem value="WAREHOUSE">WAREHOUSE</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="OTP (6 digits)" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <Button onClick={() => create.mutate()}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeOpen} onOpenChange={(o) => !o && setCloseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close {closeOpen?.bid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Enter OTP" value={closeOtp} onChange={(e) => setCloseOtp(e.target.value)} />
            <Button onClick={() => close.mutate()}>Close batch</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
