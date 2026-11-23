"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";

export default function StaffManagementPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await fetch("/api/me")).json() });
  const isSuper = me?.role === "SUPER";

  const { data, isLoading } = useQuery({
    queryKey: ["staff-management"],
    queryFn: async () => (await fetch("/api/staff")).json(),
    enabled: isSuper,
  });

  const update = useMutation({
    mutationFn: async ({ id, assignedBrandIds, active }: any) => {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedBrandIds, active }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-management"] }); setEditing(null); },
  });

  if (!isSuper) {
    return (
      <div className="p-8">
        <div className="border-2 border-rose-200 bg-rose-50 rounded-2xl p-6 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-rose-800">Access Denied</div>
          <p className="text-xs font-bold uppercase text-rose-600 mt-2">Only super accounts can manage staff assignments.</p>
        </div>
      </div>
    );
  }

  const staff = data?.staff || [];
  const brands = data?.brands || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-wider text-primary">Staff & Brand Assignments</h1>
        <Button onClick={() => router.push("/")} variant="outline" className="text-xs font-black uppercase">Back</Button>
      </div>

      <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-primary text-white px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest">Support Accounts</span>
          <span className="text-[10px] font-black uppercase bg-white text-primary px-2 py-1 rounded">Assign brands to control data access</span>
        </div>
        <div className="divide-y divide-slate-200">
          {isLoading && <div className="p-6 text-center text-slate-500">Loading...</div>}
          {staff.map((s: any) => (
            <div key={s.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div>
                  <div className="font-black uppercase text-slate-900">{s.name}</div>
                  <div className="text-[11px] font-bold uppercase text-slate-500 mono-num">{s.username} · {s.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${s.role === "SUPER" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"}`}>{s.role}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-500">Active</span>
                    <Switch checked={s.active} onCheckedChange={(v) => update.mutate({ id: s.id, active: v })} disabled={s.role === "SUPER"} />
                  </div>
                </div>
              </div>

              {s.role === "SUPPORT" && (
                <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                  {editing === s.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {brands.map((b: any) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBrands((prev) => prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id])}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-colors ${selectedBrands.includes(b.id) ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-200 hover:border-primary"}`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => update.mutate({ id: s.id, assignedBrandIds: selectedBrands })} className="bg-primary text-white text-xs font-black uppercase">
                          <Check className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="text-xs font-black uppercase">
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {s.assignedBrandIds.length === 0 && <span className="text-[10px] font-bold uppercase text-slate-400">No brands assigned</span>}
                        {s.assignedBrandIds.map((id: string) => {
                          const b = brands.find((x: any) => x.id === id);
                          return b ? <span key={id} className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-700">{b.name}</span> : null;
                        })}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(s.id); setSelectedBrands(s.assignedBrandIds); }} className="text-xs font-black uppercase">Edit Brands</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
