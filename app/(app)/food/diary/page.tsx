"use client";

import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Textarea, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { MOODS, today } from "@/lib/utils";
import type { FoodLog } from "@/types";
import DBTMealCheckIn from "@/components/features/DBTMealCheckIn";

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const MEAL_COLORS: Record<string, string> = {
  breakfast: "#F0E4CC",
  lunch: "#D8E4D6",
  dinner: "#F2C4CE",
  snack: "#EDE5F5",
};

const HUNGER_LABELS: Record<number, string> = {
  1: "Not hungry at all", 2: "Barely hungry", 3: "Slightly hungry",
  4: "Moderately hungry", 5: "Noticeably hungry", 6: "Comfortably hungry",
  7: "Quite hungry", 8: "Very hungry", 9: "Extremely hungry", 10: "Ravenous",
};

export default function FoodDiaryPage() {
  const supabase = createClient();
  const [selectedDate, setSelectedDate] = useState(today());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    meal_type: "breakfast",
    description: "",
    hunger_before: 5,
    hunger_after: 5,
    mood: "",
    notes: "",
    dbt_prompt: "",
    dbt_reflection: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, [selectedDate]);

  async function loadLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", selectedDate).order("created_at");
    setLogs(data ?? []);
    setLoading(false);
  }

  async function addLog() {
    if (!form.description.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("food_logs").insert({ user_id: user.id, date: selectedDate, ...form, description: form.description.trim() }).select().single();
    if (data) { setLogs((p) => [...p, data]); setForm({ meal_type: "breakfast", description: "", hunger_before: 5, hunger_after: 5, mood: "", notes: "", dbt_prompt: "", dbt_reflection: "" }); setAdding(false); }
  }

  async function deleteLog(id: string) {
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((p) => p.filter((l) => l.id !== id));
  }

  function changeDate(dir: -1 | 1) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isToday = selectedDate === today();

  const byMealType = MEAL_TYPES.map((mt) => ({
    ...mt,
    entries: logs.filter((l) => l.meal_type === mt.value),
  }));

  return (
    <div className="page-padding" style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Nourishment</p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>Food <em>Diary</em></h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Simple, intuitive. No counting — just noticing.
        </p>
      </div>

      {/* Date nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={() => changeDate(-1)} style={{ border: "1px solid #F0EBE3", borderRadius: "10px", padding: "8px", background: "white", cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={16} color="#6B5E5E" />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "20px", fontWeight: 400, color: "#3D3535" }}>{displayDate}</p>
          {isToday && <span style={{ fontSize: "11px", color: "#C0607A", fontWeight: 500, letterSpacing: "0.05em" }}>TODAY</span>}
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} style={{ border: "1px solid #F0EBE3", borderRadius: "10px", padding: "8px", background: "white", cursor: isToday ? "not-allowed" : "pointer", display: "flex", opacity: isToday ? 0.4 : 1 }}>
          <ChevronRight size={16} color="#6B5E5E" />
        </button>
      </div>

      {/* Meals */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {byMealType.map(({ value, label, entries }) => (
          <div key={value}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", padding: "3px 12px", borderRadius: "99px", background: MEAL_COLORS[value], color: "#3D3535" }}>
                {label}
              </span>
              <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
            </div>
            {entries.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#B5A8A8", paddingLeft: "4px", paddingBottom: "4px" }}>Not logged yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {entries.map((entry) => (
                  <div key={entry.id} style={{ padding: "14px 16px", borderRadius: "14px", background: "white", border: "1px solid #EDE5E5", boxShadow: "0 2px 8px rgba(180,150,140,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontSize: "14px", color: "#3D3535", flex: 1, lineHeight: 1.5 }}>{entry.description}</p>
                      <button onClick={() => deleteLog(entry.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "0 0 0 8px" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {(entry.hunger_before || entry.mood) && (
                      <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                        {entry.hunger_before && (
                          <span style={{ fontSize: "12px", color: "#9B8E8E" }}>
                            Hunger before: <strong style={{ color: "#6B5E5E" }}>{entry.hunger_before}/10</strong>
                          </span>
                        )}
                        {entry.hunger_after && (
                          <span style={{ fontSize: "12px", color: "#9B8E8E" }}>
                            After: <strong style={{ color: "#6B5E5E" }}>{entry.hunger_after}/10</strong>
                          </span>
                        )}
                        {entry.mood && (
                          <span style={{ fontSize: "12px", color: "#9B8E8E" }}>
                            Mood: <strong style={{ color: "#6B5E5E", textTransform: "capitalize" }}>{entry.mood}</strong>
                          </span>
                        )}
                      </div>
                    )}
                    {entry.notes && <p style={{ fontSize: "13px", color: "#9B8E8E", marginTop: "6px", fontStyle: "italic" }}>{entry.notes}</p>}
                    {entry.dbt_reflection && (
                      <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "10px", background: "#FAF5FF", border: "1px solid #E9D8FD" }}>
                        {entry.dbt_prompt && (
                          <p style={{ fontSize: "11px", color: "#9B8E8E", marginBottom: "4px", fontStyle: "italic" }}>🌸 &ldquo;{entry.dbt_prompt}&rdquo;</p>
                        )}
                        <p style={{ fontSize: "13px", color: "#553C9A", lineHeight: 1.55 }}>{entry.dbt_reflection}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add entry */}
      {adding && (
        <Card style={{ marginTop: "24px" }}>
          <CardTitle style={{ marginBottom: "16px" }}>Log a meal</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Select label="Meal type" options={MEAL_TYPES} value={form.meal_type} onChange={(v) => setForm((p) => ({ ...p, meal_type: v }))} />
            <Textarea label="What did you eat?" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe what you ate, in your own words…" rows={3} autoFocus />

            <div className="grid-2-col" style={{ gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6B5E5E", display: "block", marginBottom: "8px" }}>
                  Hunger before ({form.hunger_before}/10)
                </label>
                <input type="range" min={1} max={10} value={form.hunger_before}
                  onChange={(e) => setForm((p) => ({ ...p, hunger_before: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#F2C4CE" }} />
                <p style={{ fontSize: "11px", color: "#9B8E8E", marginTop: "4px" }}>{HUNGER_LABELS[form.hunger_before]}</p>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6B5E5E", display: "block", marginBottom: "8px" }}>
                  Hunger after ({form.hunger_after}/10)
                </label>
                <input type="range" min={1} max={10} value={form.hunger_after}
                  onChange={(e) => setForm((p) => ({ ...p, hunger_after: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#F2C4CE" }} />
              </div>
            </div>

            <Select label="How did you feel?" options={[{ value: "", label: "Select mood (optional)" }, ...MOODS.map((m) => ({ value: m.value, label: m.label }))]} value={form.mood} onChange={(v) => setForm((p) => ({ ...p, mood: v }))} />
            <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any thoughts, cravings, or observations…" rows={2} />

            <DBTMealCheckIn
              prompt={form.dbt_prompt}
              reflection={form.dbt_reflection}
              onPromptChange={(v) => setForm((p) => ({ ...p, dbt_prompt: v }))}
              onReflectionChange={(v) => setForm((p) => ({ ...p, dbt_reflection: v }))}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={addLog} disabled={!form.description.trim()}><Plus size={14} /> Save entry</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: "20px", display: "flex", alignItems: "center", gap: "8px",
            padding: "12px 16px", borderRadius: "12px", border: "1.5px dashed #E0D8D8",
            background: "transparent", cursor: "pointer", color: "#9B8E8E", fontSize: "13px",
            transition: "all 0.15s", width: "100%", justifyContent: "center",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#9B8E8E"; }}
        >
          <Plus size={14} /> Log a meal
        </button>
      )}
    </div>
  );
}
