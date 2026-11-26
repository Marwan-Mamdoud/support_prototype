"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/time";
import { StickyNote, Search, Plus, Check, Pencil, Trash2 } from "lucide-react";

export default function NotesPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");
  const [accountFilter, setAccountFilter] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editNote, setEditNote] = useState<any>(null);
  const [editText, setEditText] = useState("");

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/me")).json(),
  });
  const userName = userData?.name || "SUPPORT DISPATCH";
  const isSuper = userData?.role === "SUPER";

  useEffect(() => {
    if (isSuper && userData?.staffId) {
      setAccountFilter(userData.staffId);
    }
  }, [isSuper, userData?.staffId]);

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

  const accountOptions = Array.from(new Map([
    ...(isSuper && userData?.staffId ? [[userData.staffId, userData.name || "SUPER"]] : []),
    ...items.map((n: any) => [String(n.staffId), n.staffName || "Unknown"]),
  ])) as [string, string][];

  const filteredItems = items.filter((n: any) => {
    const matchStatus = statusFilter === "all" || (statusFilter === "done" && n.done) || (statusFilter === "active" && !n.done);
    const matchAccount = !isSuper || !accountFilter || String(n.staffId) === accountFilter;
    return matchStatus && matchAccount;
  });

  const openEdit = (n: any) => {
    setEditNote(n);
    setEditText(n.text);
    setEditOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Composer */}
      <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-slate-900" />
            {t("notes.addNewNote")}
          </span>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder={t("notes.searchNotes")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
              className="pl-9 pr-3 py-1.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-slate-400 text-slate-900 focus-visible:ring-primary focus:border-slate-200 h-9"
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <Textarea
            placeholder={t("notes.writeNote")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1 px-4 py-2.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-slate-400 text-slate-900 focus-visible:ring-primary focus:border-slate-200 resize-y min-h-[72px]"
          />
          <Button
            onClick={() => add.mutate()}
            disabled={!text.trim()}
            className="px-5 py-3 h-auto rounded-xl bg-slate-100 hover:bg-primary/90 text-slate-900 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-secondary" />
            <span>{t("notes.saveNote")}</span>
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xl">
        <div className="bg-slate-100 text-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <StickyNote className="w-5 h-5 text-secondary" />
            <span className="text-sm font-black uppercase tracking-wider">{t("notes.myNotes")}</span>
            <span className="px-2.5 py-0.5 rounded bg-white text-[10px] font-black uppercase text-slate-900 mono-num">
              {t("notes.showing")}: {filteredItems.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuper && (
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-8 py-1.5 text-slate-900 focus:outline-none focus:border-primary h-9"
              >
                <option value="">ALL ACCOUNTS</option>
                {accountOptions.map(([id, name]) => (
                  <option key={id} value={id}>{String(name).toUpperCase()}</option>
                ))}
              </select>
            )}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-secondary/30 shadow-inner">
            {(["all", "active", "done"] as const).map((f) => (
              <button
                key={f === "all" ? t("notes.all") : f === "active" ? t("notes.active") : t("notes.done")}
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all ${
                  statusFilter === f
                    ? "font-black bg-secondary text-slate-900 shadow-sm"
                    : "font-bold text-slate-600 hover:text-slate-900"
                }`}
              >
                {f === "all" ? t("notes.all") : f === "active" ? t("notes.active") : t("notes.done")}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="divide-y divide-surface-200">
          {isLoading && <div className="p-5 text-xs font-black uppercase text-slate-500">{t("notes.loading")}</div>}
          {!isLoading && filteredItems.length === 0 && (
            <div className="p-8 text-center text-xs font-black uppercase text-slate-500">{t("notes.noNotes")}</div>
          )}
          {filteredItems.map((n: any, i: number) => {
            const noteNum = items.length - items.findIndex((x: any) => x.id === n.id);
            return (
              <div
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${n.done ? "bg-surface-50" : "hover:bg-surface-50"} ${String(n.staffId) === userData?.staffId ? "cursor-pointer" : ""}`}
                onClick={() => { if (String(n.staffId) === userData?.staffId) toggle.mutate(n); }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (String(n.staffId) === userData?.staffId) toggle.mutate(n); }}
                    className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      n.done ? "border-thumbnail bg-thumbnail text-slate-900" : "border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-sm font-black uppercase ${n.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                        {t("notes.note")} {noteNum}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${n.done ? "bg-thumbnail text-slate-900" : "bg-surface-100 border border-surface-200 text-slate-900"}`}>
                        {n.done ? t("notes.doneStatus") : t("notes.pendingStatus")}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500 mono-num">
                        {formatDate(n.createdAt)} · {n.staffName || userName}
                      </span>
                    </div>
                    <p className={`text-xs font-bold leading-relaxed mt-2 ${n.done ? "text-slate-500 line-through" : "text-slate-600"}`}>
                      {n.text}
                    </p>
                  </div>
                </div>
                {String(n.staffId) === userData?.staffId && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); openEdit(n); }}
                    className="px-3 py-1.5 rounded-lg border-surface-200 bg-white hover:border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-wider transition-colors"
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
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-wider">Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="px-4 py-2.5 bg-surface-50 border-surface-200 rounded-xl text-xs font-bold placeholder:text-slate-400 text-slate-900 focus-visible:ring-primary focus:border-slate-200 resize-y"
            />
            <Button
              onClick={() => updateText.mutate()}
              disabled={!editText.trim()}
              className="w-full bg-slate-100 hover:bg-primary/90 text-slate-900 font-black uppercase tracking-wider"
            >
              SAVE CHANGES
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
