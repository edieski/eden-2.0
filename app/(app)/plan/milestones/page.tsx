"use client";

import { useState, useEffect } from "react";
import { Plus, Target, Trash2, CheckCircle2 } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getPillarColor, getPillarLabel, LIFE_PILLARS } from "@/lib/utils";
import type { Milestone } from "@/types";

const PILLAR_OPTIONS = LIFE_PILLARS.map((p) => ({ value: p.value, label: p.label }));
const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const BALLET_MILESTONES: Omit<Milestone, "id" | "user_id" | "created_at">[] = [
  { title: "Phase 1 — Foundation", description: "Build posture, core activation, and gentle ballet intro. 15–20 min sessions + 5 min stretch.", pillar: "health", phase: 1, target_date: null, status: "in_progress" },
  { title: "Phase 2 — Build Stability", description: "Add tendus back and dégagés. 20–25 min sessions. Kathryn Morgan's 25 Min Beginner Ballet Class.", pillar: "health", phase: 2, target_date: null, status: "not_started" },
  { title: "Phase 3 — Increase Endurance", description: "Full barre sections, 25–30 min sessions, 15 min slow walks. Stamina building.", pillar: "health", phase: 3, target_date: null, status: "not_started" },
  { title: "Phase 4 — Add Light Flow", description: "Smooth transitions, 30 min sessions. Full beginner stretching routines.", pillar: "health", phase: 4, target_date: null, status: "not_started" },
  { title: "Phase 5 — Refinement", description: "30–35 min sessions with music-only sequences. Sustained gentle effort.", pillar: "health", phase: 5, target_date: null, status: "not_started" },
  { title: "Phase 6 — Integration & Peak", description: "30–40 min full sessions. Mix favourites. Celebrate posture, flexibility, and balance gains.", pillar: "health", phase: 6, target_date: null, status: "not_started" },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  not_started: { bg: "#F0EBE3", color: "#9B8E8E", label: "Not started" },
  in_progress: { bg: "#FAE8EC", color: "#C0607A", label: "In progress" },
  completed: { bg: "#D8E4D6", color: "#4A6847", label: "Completed" },
};

export default function MilestonesPage() {
  const supabase = createClient();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", pillar: "health", phase: "1", target_date: "", status: "not_started" });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { loadMilestones(); }, []);

  async function loadMilestones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("milestones").select("*").eq("user_id", user.id).order("phase").order("created_at");
    if (!data?.length) {
      // Seed ballet milestones
      const inserts = BALLET_MILESTONES.map((m) => ({ ...m, user_id: user.id }));
      const { data: seeded } = await supabase.from("milestones").insert(inserts).select();
      setMilestones(seeded ?? []);
    } else {
      setMilestones(data ?? []);
    }
    setLoading(false);
  }

  async function addMilestone() {
    if (!form.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("milestones").insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description || null,
      pillar: form.pillar,
      phase: Number(form.phase),
      target_date: form.target_date || null,
      status: form.status,
    }).select().single();
    if (data) { setMilestones((p) => [...p, data]); setAdding(false); setForm({ title: "", description: "", pillar: "health", phase: "1", target_date: "", status: "not_started" }); }
  }

  async function updateStatus(id: string, status: string) {
    const { data } = await supabase.from("milestones").update({ status }).eq("id", id).select().single();
    if (data) setMilestones((p) => p.map((m) => m.id === id ? data : m));
  }

  async function deleteMilestone(id: string) {
    await supabase.from("milestones").delete().eq("id", id);
    setMilestones((p) => p.filter((m) => m.id !== id));
  }

  const filtered = filter === "all" ? milestones : milestones.filter((m) => m.pillar === filter);
  const phases = [...new Set(filtered.map((m) => m.phase))].sort();

  return (
    <div className="page-padding" style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Transformation Plan</p>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
            Life <em>Milestones</em>
          </h1>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={14} /> Add milestone</Button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
        {[{ value: "all", label: "All pillars" }, ...LIFE_PILLARS].map((p) => (
          <button
            key={p.value}
            onClick={() => setFilter(p.value)}
            style={{
              padding: "6px 16px", borderRadius: "99px", border: "1px solid",
              borderColor: filter === p.value ? "#F2C4CE" : "#F0EBE3",
              background: filter === p.value ? "#FAE8EC" : "transparent",
              color: filter === p.value ? "#C0607A" : "#9B8E8E",
              fontSize: "12px", fontWeight: filter === p.value ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: "#9B8E8E" }}>Overall progress</span>
            <span style={{ fontSize: "12px", color: "#6B5E5E", fontWeight: 500 }}>
              {milestones.filter((m) => m.status === "completed").length}/{milestones.length} complete
            </span>
          </div>
          <div style={{ height: "6px", background: "#F0EBE3", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((milestones.filter((m) => m.status === "completed").length / milestones.length) * 100)}%`, background: "linear-gradient(90deg, #F2C4CE, #B5C4B1)", borderRadius: "99px", transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {/* Milestones by phase */}
      {loading ? <p style={{ color: "#9B8E8E" }}>Loading…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {phases.map((phase) => (
            <div key={phase}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "18px", color: "#3D3535" }}>
                  Phase {phase}
                </span>
                <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
                {filtered.filter((m) => m.phase === phase).map((m) => {
                  const statusStyle = STATUS_STYLES[m.status];
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: "18px 20px", borderRadius: "16px", background: "white",
                        border: "1px solid #EDE5E5", boxShadow: "0 2px 12px rgba(180,150,140,0.07)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "18px", fontWeight: 400, color: "#3D3535", lineHeight: 1.3 }}>
                            {m.title}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "6px", marginLeft: "12px", flexShrink: 0 }}>
                          {m.status !== "completed" && (
                            <button
                              onClick={() => updateStatus(m.id, m.status === "not_started" ? "in_progress" : "completed")}
                              style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
                              title={m.status === "not_started" ? "Start" : "Complete"}
                            >
                              {m.status === "in_progress"
                                ? <CheckCircle2 size={17} color="#8FAB8A" />
                                : <Target size={17} color="#9B8E8E" />}
                            </button>
                          )}
                          <button
                            onClick={() => deleteMilestone(m.id)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#9B8E8E")}
                          >
                            <Trash2 size={15} color="#C4B8B8" />
                          </button>
                        </div>
                      </div>
                      {m.description && <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.6, marginBottom: "12px" }}>{m.description}</p>}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "99px" }} className={getPillarColor(m.pillar)}>
                          {getPillarLabel(m.pillar).split(" ")[0]}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "99px", background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
                        </span>
                        {m.target_date && (
                          <span style={{ fontSize: "11px", color: "#9B8E8E", marginLeft: "auto" }}>
                            {new Date(m.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <Card style={{ marginTop: "24px" }}>
          <CardTitle style={{ marginBottom: "16px" }}>New Milestone</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Run my first 5K" autoFocus />
            <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What does achieving this look like?" rows={3} />
            <div className="grid-2-col" style={{ gap: "12px" }}>
              <Select label="Life pillar" options={PILLAR_OPTIONS} value={form.pillar} onChange={(v) => setForm((p) => ({ ...p, pillar: v }))} />
              <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
              <Input label="Phase" type="number" min={1} value={form.phase} onChange={(e) => setForm((p) => ({ ...p, phase: e.target.value }))} />
              <Input label="Target date" type="date" value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={addMilestone} disabled={!form.title.trim()}><Plus size={14} /> Add milestone</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
