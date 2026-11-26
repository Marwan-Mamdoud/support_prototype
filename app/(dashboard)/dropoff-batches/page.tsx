"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo, formatDate } from "@/lib/time";

export default function DropoffBatchesPage() {
  const { t } = useLanguage();
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
        <h1 className="text-2xl font-bold text-primary">{t("dropoffBatches.title")}</h1>
        <Button onClick={() => setCreateOpen(true)}>{t("dropoffBatches.createBatch")}</Button>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("dropoffBatches.bid")}</TableHead>
              <TableHead>{t("dropoffBatches.courier")}</TableHead>
              <TableHead>{t("dropoffBatches.destination")}</TableHead>
              <TableHead>{t("dropoffBatches.start")}</TableHead>
              <TableHead>{t("dropoffBatches.status")}</TableHead>
              <TableHead>{t("dropoffBatches.oldOpen")}</TableHead>
              <TableHead>{t("dropoffBatches.action")}</TableHead>
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
                  {b.status === "OPEN" && <Button size="sm" onClick={() => setCloseOpen(b)}>{t("dropoffBatches.close")}</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dropoffBatches.createDropoffBatch")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("dropoffBatches.bid")} value={bid} onChange={(e) => setBid(e.target.value)} />
            <Input placeholder={t("dropoffBatches.courierId")} value={courierId} onChange={(e) => setCourierId(e.target.value)} />
            <Select value={dest} onValueChange={(v) => setDest(v ?? "BRAND")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRAND">{t("dropoffBatches.brand")}</SelectItem>
                <SelectItem value="WAREHOUSE">{t("dropoffBatches.warehouse")}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("dropoffBatches.otp")} value={otp} onChange={(e) => setOtp(e.target.value)} />
            <Button onClick={() => create.mutate()}>{t("dropoffBatches.createBatch")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeOpen} onOpenChange={(o) => !o && setCloseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dropoffBatches.close")} {closeOpen?.bid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("dropoffBatches.enterOtp")} value={closeOtp} onChange={(e) => setCloseOtp(e.target.value)} />
            <Button onClick={() => close.mutate()}>{t("dropoffBatches.closeBatch")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
