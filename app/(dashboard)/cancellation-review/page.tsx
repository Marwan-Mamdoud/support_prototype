"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { timeAgo, humanize } from "@/lib/time";
import { getCancellationReason } from "@/lib/rules/cancellationReasons";

export default function CancellationReviewPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["cancellation-review"], queryFn: async () => (await fetch("/api/cancellation-review")).json() });
  const items = data?.items || [];
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const act = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cancellation-review/${selected.source}/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cancellation-review"] }); setSelected(null); setNote(""); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary">Cancellation Review</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((o: any) => (
          <Card key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
            <CardHeader><CardTitle>{o.oid} · {o.source}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Reason: {o.cancellationReason ? (getCancellationReason(o.cancellationReason)?.label || o.cancellationReason) : "—"}</div>
              <div>Review: {o.cancellationReviewStatus}</div>
              <div className="flex gap-2 flex-wrap mt-2">
                {(o.cancellationImages || []).map((u: string, i: number) => (
                  <img key={i} src={u} alt="evidence" className="w-20 h-20 object-cover rounded border" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-slate-500">No pending reviews</div>}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review {selected?.oid}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>Reason: {selected?.cancellationReason}</div>
            <div className="flex gap-2 flex-wrap">
              {(selected?.cancellationImages || []).map((u: string, i: number) => (
                <img key={i} src={u} alt="evidence" className="w-32 h-32 object-cover rounded border" />
              ))}
            </div>
            <Select value={decision} onValueChange={(v) => setDecision((v ?? "APPROVED") as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approve</SelectItem>
                <SelectItem value="REJECTED">Reject</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => act.mutate()}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
