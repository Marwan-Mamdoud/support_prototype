"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function NotesPage() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["notes", search], queryFn: async () => (await fetch(`/api/notes?q=${encodeURIComponent(search)}`)).json() });
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

  const del = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">My Notes</h1>
      <div className="flex gap-2">
        <Input placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => setSearch(q)}>Search</Button>
      </div>
      <div className="flex gap-2">
        <Textarea placeholder="New note" value={text} onChange={(e) => setText(e.target.value)} />
        <Button onClick={() => add.mutate()} disabled={!text.trim()}>Add</Button>
      </div>
      <div className="space-y-2">
        {items.map((n: any) => (
          <Card key={n.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <Checkbox checked={n.done} onCheckedChange={() => toggle.mutate(n)} />
              <div className={`flex-1 text-sm ${n.done ? "line-through text-slate-400" : ""}`}>{n.text}</div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(n.id)}>Delete</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
