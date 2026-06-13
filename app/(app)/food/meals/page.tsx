"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { MealPlan } from "@/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];
const MEAL_COLORS: Record<string, string> = {
  breakfast: "#F0E4CC", lunch: "#D8E4D6", dinner: "#F2C4CE", snack: "#EDE5F5",
};

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function MealPlanPage() {
  const supabase = createClient();
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [adding, setAdding] = useState<{ day: number; type: string } | null>(null);
  const [form, setForm] = useState({ title: "", description: "", recipe_url: "" });
  const weekStart = getWeekStart();

  useEffect(() => { loadMeals(); }, []);

  async function loadMeals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("meal_plans").select("*").eq("user_id", user.id).eq("week_start", weekStart).order("day_of_week");
    setMeals(data ?? []);
  }

  async function addMeal() {
    if (!form.title.trim() || !adding) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("meal_plans").insert({
      user_id: user.id, week_start: weekStart,
      day_of_week: adding.day, meal_type: adding.type,
      title: form.title.trim(), description: form.description || null,
      recipe_url: form.recipe_url || null,
    }).select().single();
    if (data) { setMeals((p) => [...p, data]); setForm({ title: "", description: "", recipe_url: "" }); setAdding(null); }
  }

  async function deleteMeal(id: string) {
    await supabase.from("meal_plans").delete().eq("id", id);
    setMeals((p) => p.filter((m) => m.id !== id));
  }

  const weekLabel = new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="page-padding" style={{ maxWidth: "1200px" }}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Nourishment Planning</p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>Meal <em>Planner</em></h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>Week of {weekLabel}</p>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)`, gap: "2px", minWidth: "900px" }}>
          {/* Header */}
          <div />
          {DAYS.map((day) => (
            <div key={day} style={{ padding: "10px 12px", textAlign: "center" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9B8E8E" }}>{day.slice(0, 3)}</p>
            </div>
          ))}

          {/* Rows */}
          {MEAL_TYPES.map((mt) => (
            <>
              <div key={`label-${mt.value}`} style={{ display: "flex", alignItems: "center", padding: "8px 0" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "99px", background: MEAL_COLORS[mt.value], color: "#3D3535" }}>
                  {mt.label}
                </span>
              </div>
              {DAYS.map((_, dayIdx) => {
                const dayMeals = meals.filter((m) => m.day_of_week === dayIdx && m.meal_type === mt.value);
                return (
                  <div key={`${mt.value}-${dayIdx}`} style={{ padding: "4px", minHeight: "80px" }}>
                    {dayMeals.map((meal) => (
                      <div key={meal.id} style={{ padding: "8px 10px", borderRadius: "10px", background: MEAL_COLORS[mt.value], marginBottom: "4px", position: "relative", group: "true" as unknown as undefined }}>
                        <p style={{ fontSize: "12px", fontWeight: 500, color: "#3D3535", lineHeight: 1.4 }}>{meal.title}</p>
                        {meal.description && <p style={{ fontSize: "11px", color: "#9B8E8E", marginTop: "2px" }}>{meal.description}</p>}
                        <button
                          onClick={() => deleteMeal(meal.id)}
                          style={{ position: "absolute", top: "4px", right: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "2px", borderRadius: "4px" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAdding({ day: dayIdx, type: mt.value })}
                      style={{ width: "100%", padding: "6px 0", borderRadius: "8px", border: "1px dashed #E0D8D8", background: "transparent", cursor: "pointer", color: "#C4B8B8", fontSize: "18px", lineHeight: 1, transition: "all 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#C4B8B8"; }}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Add modal */}
      {adding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(61,53,53,0.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "32px", width: "480px", boxShadow: "0 24px 64px rgba(61,53,53,0.2)" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "24px", color: "#3D3535", marginBottom: "4px" }}>Add meal</h2>
            <p style={{ fontSize: "13px", color: "#9B8E8E", marginBottom: "20px" }}>
              {DAYS[adding.day]} — {MEAL_TYPES.find((m) => m.value === adding.type)?.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Input label="Meal name" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Avocado toast with eggs" autoFocus />
              <Textarea label="Notes (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Recipe notes, prep time…" rows={2} />
              <Input label="Recipe URL (optional)" value={form.recipe_url} onChange={(e) => setForm((p) => ({ ...p, recipe_url: e.target.value }))} placeholder="https://…" />
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <Button onClick={addMeal} disabled={!form.title.trim()}>Save meal</Button>
                <Button variant="ghost" onClick={() => { setAdding(null); setForm({ title: "", description: "", recipe_url: "" }); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
