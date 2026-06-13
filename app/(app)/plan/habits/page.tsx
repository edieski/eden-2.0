"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Flame } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getPillarColor, getPillarLabel, LIFE_PILLARS, today } from "@/lib/utils";
import type { Habit, HabitLog } from "@/types";

const PILLAR_OPTIONS = LIFE_PILLARS.map((p) => ({ value: p.value, label: p.label }));
const FREQ_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekends", label: "Weekends only" },
];

export default function HabitsPage() {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", pillar: "health", frequency: "daily" });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const todayStr = today();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).order("order_index"),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("date", todayStr),
    ]);
    setHabits(h ?? []);
    setLogs(l ?? []);
    setLoading(false);
  }

  async function addHabit() {
    if (!form.title.trim() || !userId) return;
    const { data } = await supabase.from("habits").insert({
      user_id: userId, title: form.title.trim(),
      pillar: form.pillar, frequency: form.frequency, order_index: habits.length,
    }).select().single();
    if (data) { setHabits((p) => [...p, data]); setForm({ title: "", pillar: "health", frequency: "daily" }); setAdding(false); }
  }

  async function toggleHabit(habit: Habit) {
    if (!userId) return;
    const existing = logs.find((l) => l.habit_id === habit.id);

    // Optimistic update — flip the UI immediately
    if (existing) {
      setLogs((p) => p.map((l) => l.id === existing.id ? { ...l, completed: !l.completed } : l));
      supabase.from("habit_logs").update({ completed: !existing.completed }).eq("id", existing.id)
        .select().single().then(({ data }) => {
          if (data) setLogs((p) => p.map((l) => l.id === data.id ? data : l));
        });
    } else {
      const tempId = "temp-" + Date.now();
      setLogs((p) => [...p, { id: tempId, habit_id: habit.id, user_id: userId, date: todayStr, completed: true } as HabitLog]);
      supabase.from("habit_logs").insert({ habit_id: habit.id, user_id: userId, date: todayStr, completed: true })
        .select().single().then(({ data }) => {
          if (data) setLogs((p) => p.map((l) => l.id === tempId ? data : l));
        });
    }
  }

  async function deleteHabit(id: string) {
    setHabits((p) => p.filter((h) => h.id !== id));
    supabase.from("habits").delete().eq("id", id);
  }

  const completedCount = logs.filter((l) => l.completed).length;
  const pillarGroups = LIFE_PILLARS.filter((p) => habits.some((h) => h.pillar === p.value));

  return (
    <div className="page-padding" style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Daily Habits</p>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
            Habit <em>Tracker</em>
          </h1>
        </div>
        {habits.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "12px", background: "#FAE8EC" }}>
            <Flame size={16} color="#C0607A" />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#C0607A" }}>{completedCount}/{habits.length}</span>
            <span style={{ fontSize: "12px", color: "#9B8E8E" }}>today</span>
          </div>
        )}
      </div>

      {habits.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ height: "6px", background: "#F0EBE3", borderRadius: "99px", overflow: "hidden", marginBottom: "6px" }}>
            <div style={{ height: "100%", width: `${Math.round((completedCount / habits.length) * 100)}%`, background: "linear-gradient(90deg, #F2C4CE, #C8B8D8)", borderRadius: "99px", transition: "width 0.4s ease" }} />
          </div>
          <p style={{ fontSize: "12px", color: "#9B8E8E" }}>{Math.round((completedCount / habits.length) * 100)}% complete</p>
        </div>
      )}

      {/* Habits by pillar */}
      {loading ? (
        <p style={{ color: "#9B8E8E" }}>Loading…</p>
      ) : habits.length === 0 && !adding ? (
        <Card variant="cream" padding="lg">
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", color: "#3D3535", marginBottom: "8px" }}>Start with one habit</p>
            <p style={{ color: "#9B8E8E", fontSize: "14px", marginBottom: "24px" }}>Small, consistent actions compound into transformation.</p>
            <Button onClick={() => setAdding(true)}><Plus size={14} /> Add your first habit</Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {pillarGroups.map((pillar) => (
            <div key={pillar.value}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }} className={getPillarColor(pillar.value)}>
                  {pillar.label}
                </span>
                <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {habits.filter((h) => h.pillar === pillar.value).map((habit) => {
                  const log = logs.find((l) => l.habit_id === habit.id);
                  const done = log?.completed ?? false;
                  return (
                    <div
                      key={habit.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 16px", borderRadius: "14px",
                        background: done ? "#F6FBF5" : "white",
                        border: `1px solid ${done ? "#D8E4D6" : "#EDE5E5"}`,
                        boxShadow: "0 2px 8px rgba(180,150,140,0.05)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onClick={() => toggleHabit(habit)}
                    >
                      {done
                        ? <CheckCircle2 size={20} color="#8FAB8A" strokeWidth={2} />
                        : <Circle size={20} color="#D8D0D0" strokeWidth={1.5} />}
                      <span style={{ flex: 1, fontSize: "14px", color: done ? "#8FAB8A" : "#3D3535", textDecoration: done ? "line-through" : "none" }}>
                        {habit.title}
                      </span>
                      <span style={{ fontSize: "11px", color: "#B5A8A8", textTransform: "capitalize" }}>{habit.frequency}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "4px", borderRadius: "6px" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                      >
                        <Trash2 size={13} />
                      </button>
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
        <Card style={{ marginTop: "20px" }}>
          <CardTitle style={{ marginBottom: "16px" }}>New Habit</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Input label="Habit name" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addHabit()} placeholder="e.g. Morning ballet barre" autoFocus />
            <div className="grid-2-col" style={{ gap: "12px" }}>
              <Select label="Life pillar" options={PILLAR_OPTIONS} value={form.pillar} onChange={(v) => setForm((p) => ({ ...p, pillar: v }))} />
              <Select label="Frequency" options={FREQ_OPTIONS} value={form.frequency} onChange={(v) => setForm((p) => ({ ...p, frequency: v }))} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <Button onClick={addHabit} disabled={!form.title.trim()}><Plus size={14} /> Add habit</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: "16px", display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px", borderRadius: "12px", border: "1.5px dashed #E0D8D8",
            background: "transparent", cursor: "pointer", color: "#9B8E8E", fontSize: "13px",
            transition: "all 0.15s", width: "100%", justifyContent: "center",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#9B8E8E"; }}
        >
          <Plus size={14} /> Add habit
        </button>
      )}
    </div>
  );
}
