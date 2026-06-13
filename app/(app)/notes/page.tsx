"use client";

import { useState, useEffect } from "react";
import { Plus, Pin, Trash2, Search, X, ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getPillarColor, LIFE_PILLARS } from "@/lib/utils";
import type { Note } from "@/types";

const PILLAR_OPTIONS = [
  { value: "", label: "No pillar" },
  ...LIFE_PILLARS.map((p) => ({ value: p.value, label: p.label })),
];

export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", pillar: "", tags: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notes").select("*").eq("user_id", user.id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes(data ?? []);
  }

  async function saveNote() {
    if (!form.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { data } = await supabase.from("notes").insert({
      user_id: user.id,
      title: form.title.trim(),
      content: form.content,
      pillar: form.pillar || null,
      tags,
    }).select().single();
    if (data) {
      setNotes((p) => [data, ...p]);
      setSelected(data);
      setAdding(false);
      setForm({ title: "", content: "", pillar: "", tags: "" });
    }
    setSaving(false);
  }

  async function updateNote(id: string, updates: Partial<Note>) {
    const { data } = await supabase.from("notes").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (data) {
      setNotes((p) => p.map((n) => n.id === id ? data : n));
      if (selected?.id === id) setSelected(data);
    }
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((p) => p.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function togglePin(note: Note) {
    await updateNote(note.id, { is_pinned: !note.is_pinned });
  }

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-padding" style={{ maxWidth: "1100px" }}>
      <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Journal & Notes</p>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>Your <em>Notes</em></h1>
        </div>
        <Button onClick={() => { setAdding(true); setSelected(null); }}><Plus size={14} /> New note</Button>
      </div>

      <div className="grid-notes" style={{ gap: "20px", alignItems: "start" }}>
        {/* Notes list — hidden on mobile when a note is open */}
        <div className={selected || adding ? "notes-mobile-list-hidden" : ""} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9B8E8E" }} />
            <input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px 10px 34px", borderRadius: "10px",
                border: "1.5px solid #EDE5E5", background: "white", fontSize: "13px",
                color: "#3D3535", outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {filtered.length === 0 && <p style={{ fontSize: "13px", color: "#9B8E8E", padding: "8px" }}>No notes yet.</p>}
            {filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => { setSelected(note); setAdding(false); }}
                style={{
                  padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
                  background: selected?.id === note.id ? "#FAE8EC" : "white",
                  border: `1px solid ${selected?.id === note.id ? "#F2C4CE" : "#F0EBE3"}`,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note.title}
                    </p>
                    <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note.content.slice(0, 40) || "No content"}
                    </p>
                    {note.pillar && (
                      <span style={{ fontSize: "10px", fontWeight: 500, marginTop: "6px", display: "inline-block", padding: "2px 8px", borderRadius: "99px" }} className={getPillarColor(note.pillar)}>
                        {note.pillar}
                      </span>
                    )}
                  </div>
                  {note.is_pinned && <Pin size={12} color="#C9A96E" style={{ flexShrink: 0, marginTop: "2px" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div>
          {adding && (
            <Card>
              <button
                onClick={() => setAdding(false)}
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9B8E8E",
                  fontSize: "13px",
                  padding: "0 0 14px 0",
                  fontFamily: "inherit",
                }}
                className="mobile-back-btn"
              >
                <ArrowLeft size={14} /> Back to notes
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Note title…" autoFocus />
                <Textarea label="Content" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Write anything…" rows={10} />
                <div className="grid-2-col" style={{ gap: "12px" }}>
                  <Select label="Life pillar" options={PILLAR_OPTIONS} value={form.pillar} onChange={(v) => setForm((p) => ({ ...p, pillar: v }))} />
                  <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="growth, ideas…" />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button onClick={saveNote} disabled={!form.title.trim() || saving}>
                    {saving ? "Saving…" : "Save note"}
                  </Button>
                  <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {selected && !adding && (
            <Card>
              {/* Back to list — mobile only */}
              <button
                onClick={() => setSelected(null)}
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9B8E8E",
                  fontSize: "13px",
                  padding: "0 0 14px 0",
                  fontFamily: "inherit",
                }}
                className="mobile-back-btn"
              >
                <ArrowLeft size={14} /> Back to notes
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={selected.title}
                    onChange={(e) => setSelected((p) => p ? { ...p, title: e.target.value } : p)}
                    onBlur={() => updateNote(selected.id, { title: selected.title })}
                    style={{
                      fontFamily: "var(--font-cormorant), Georgia, serif",
                      fontSize: "28px", fontWeight: 400, color: "#3D3535",
                      border: "none", outline: "none", background: "transparent", width: "100%",
                    }}
                  />
                  <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "4px" }}>
                    {new Date(selected.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={() => togglePin(selected)} style={{ border: "1px solid #F0EBE3", borderRadius: "8px", padding: "6px 10px", background: selected.is_pinned ? "#F0E4CC" : "white", cursor: "pointer", display: "flex" }}>
                    <Pin size={14} color={selected.is_pinned ? "#C9A96E" : "#9B8E8E"} />
                  </button>
                  <button onClick={() => deleteNote(selected.id)} style={{ border: "1px solid #F0EBE3", borderRadius: "8px", padding: "6px 10px", background: "white", cursor: "pointer", display: "flex" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F2C4CE")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#F0EBE3")}>
                    <Trash2 size={14} color="#9B8E8E" />
                  </button>
                </div>
              </div>
              <textarea
                value={selected.content}
                onChange={(e) => setSelected((p) => p ? { ...p, content: e.target.value } : p)}
                onBlur={() => updateNote(selected.id, { content: selected.content })}
                placeholder="Write your thoughts…"
                style={{
                  width: "100%", minHeight: "400px", border: "none", outline: "none",
                  background: "transparent", fontSize: "15px", color: "#3D3535",
                  lineHeight: 1.8, resize: "none", fontFamily: "inherit",
                }}
              />
              {selected.tags?.length > 0 && (
                <div style={{ display: "flex", gap: "6px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #F0EBE3" }}>
                  {selected.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "#F0EBE3", color: "#6B5E5E", fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {!selected && !adding && (
            <Card variant="cream" padding="lg">
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "24px", color: "#3D3535", marginBottom: "8px" }}>Select a note or create one</p>
                <p style={{ color: "#9B8E8E", fontSize: "14px" }}>Your thoughts, intentions, and reflections live here.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
