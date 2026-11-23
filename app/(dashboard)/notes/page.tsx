"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/time";
import { StickyNote, Search, Plus, Check, Pencil, Trash2 } from "lucide-react";

export default function NotesPage() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editNote, setEditNote] = useState<any>(null);
  const [editText, setEditText] = useState("");

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/me")).json(),
  });
  const userName = userData?.name || "SUPPORT DISPATCH";

  const { data, isLoading } = useQuery({
    queryKey: ["notes", search],
    queryFn: async () => (await fetch(`/api/notes?q=${encodeURIComponent(search)}`)).json(),
  });
  const items = data?.items || [];

  const add = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setText(""); },
  });

  const toggle = useMutation({
    mutationFn: async (n: any) => {
      await fetch("/api/notes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id, done: !n.done }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const updateText = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editNote.id, text: editText }) });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setEditOpen(false); setEditNote(null); setEditText(""); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const filteredItems = items.filter((n: any) => {
    const matchStatus = statusFilter === "all" || (statusFilter === "done" && n.done) || (statusFilter === "active" && !n.done);
    return matchStatus;
  });

  const openEdit = (n: any) => {
    setEditNote(n);
    setEditText(n.text);
    setEditOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Composer */}
      <div className="border-2 border-primary rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Add New Note
          </span>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
            <Input
              placeholder="Search notes..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
              className="pl-9 pr-3 py-1.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-primary/50 text-primary focus-visible:ring-primary focus:border-primary h-9"
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Textarea
            placeholder="Write a detailed operational note..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1 px-4 py-2.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-primary/50 text-primary focus-visible:ring-primary focus:border-primary resize-y min-h-[72px]"
          />
          <Button
            onClick={() => add.mutate()}
            disabled={!text.trim()}
            className="px-5 py-3 h-auto rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-secondary" />
            <span>SAVE NOTE</span>
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-xl">
        <div className="bg-primary text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-primary-950">
          <div className="flex items-center gap-2.5">
            <StickyNote className="w-5 h-5 text-secondary" />
            <span className="text-sm font-black uppercase tracking-wider">MY NOTES</span>
            <span className="px-2.5 py-0.5 rounded bg-white text-[10px] font-black uppercase text-primary mono-num">
              SHOWING: {filteredItems.length}
            </span>
          </div>

          <div className="inline-flex bg-primary-950 p-1 rounded-xl border border-secondary/30 shadow-inner">
            {(["all", "active", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all ${
                  statusFilter === f
                    ? "font-black bg-secondary text-primary-950 shadow-sm"
                    : "font-bold text-white/90 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-surface-200">
          {isLoading && <div className="p-5 text-xs font-black uppercase text-primary/70">Loading...</div>}
          {!isLoading && filteredItems.length === 0 && (
            <div className="p-8 text-center text-xs font-black uppercase text-primary/70">NO NOTES FOUND</div>
          )}
          {filteredItems.map((n: any, i: number) => {
            const noteNum = items.length - items.findIndex((x: any) => x.id === n.id);
            return (
              <div
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${n.done ? "bg-surface-50" : "hover:bg-surface-50 cursor-pointer"}`}
                onClick={() => toggle.mutate(n)}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggle.mutate(n); }}
                    className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      n.done ? "border-thumbnail bg-thumbnail text-primary-950" : "border-primary bg-white text-transparent"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-sm font-black uppercase ${n.done ? "text-primary/60 line-through" : "text-primary-950"}`}>
                        NOTE {noteNum}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${n.done ? "bg-thumbnail text-primary-950" : "bg-surface-100 border border-surface-200 text-primary"}`}>
                        {n.done ? "DONE" : "PENDING"}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-primary/70 mono-num">
                        {formatDate(n.createdAt)} · {userName}
                      </span>
                    </div>
                    <p className={`text-xs font-bold leading-relaxed mt-2 ${n.done ? "text-primary/60 line-through" : "text-primary/85"}`}>
                      {n.text}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); openEdit(n); }}
                    className="px-3 py-1.5 rounded-lg border-surface-200 bg-white hover:border-primary text-primary text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    EDIT
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}
                    className="px-3 py-1.5 rounded-lg border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    DELETE
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white rounded-2xl border-2 border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase tracking-wider">Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="px-4 py-2.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-primary/50 text-primary focus-visible:ring-primary focus:border-primary resize-y"
            />
            <Button
              onClick={() => updateText.mutate()}
              disabled={!editText.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider"
            >
              SAVE CHANGES
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
