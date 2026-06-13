"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Plus } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getPillarColor, getPillarLabel, LIFE_PILLARS } from "@/lib/utils";
import type { DisciplineReview } from "@/types";

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function DisciplinePage() {
  const supabase = createClient();
  const [review, setReview] = useState<DisciplineReview | null>(null);
  const [form, setForm] = useState({ wins: "", struggles: "", intentions: "", pillar_ratings: {} as Record<string, number>, overall_mood: 3 });
  const [saving, setSaving] = useState(false);
  const weekStart = getWeekStart();
  const weekLabel = new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });

  useEffect(() => { loadReview(); }, []);

  async function loadReview() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("discipline_reviews").select("*").eq("user_id", user.id).eq("week_start", weekStart).single();
    if (data) {
      setReview(data);
      setForm({ wins: data.wins, struggles: data.struggles, intentions: data.intentions, pillar_ratings: data.pillar_ratings ?? {}, overall_mood: data.overall_mood ?? 3 });
    }
  }

  async function saveReview() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, week_start: weekStart, ...form };
    const { data } = review
      ? await supabase.from("discipline_reviews").update(payload).eq("id", review.id).select().single()
      : await supabase.from("discipline_reviews").insert(payload).select().single();
    if (data) setReview(data);
    setSaving(false);
  }

  const MOOD_LABELS = ["", "Really hard", "Tough week", "Getting there", "Good week", "Thriving"];

  return (
    <div className="page-padding" style={{ maxWidth: "860px" }}>
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Systems & Discipline</p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
          Weekly <em>Review</em>
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Week of {weekLabel} — reflect, recalibrate, recommit.
        </p>
      </div>

      {/* Life pillars overview */}
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", color: "#3D3535", marginBottom: "16px" }}>
          Life Pillars
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {LIFE_PILLARS.map((pillar) => {
            const rating = form.pillar_ratings[pillar.value] ?? 0;
            return (
              <div key={pillar.value} style={{ padding: "16px", borderRadius: "14px", background: "white", border: "1px solid #F0EBE3", boxShadow: "0 2px 8px rgba(180,150,140,0.06)" }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535", marginBottom: "10px" }}>{pillar.label}</p>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm((p) => ({ ...p, pillar_ratings: { ...p.pillar_ratings, [pillar.value]: n } }))}
                      style={{
                        width: "24px", height: "24px", borderRadius: "6px", border: "none",
                        background: n <= rating ? getPillarAccentColor(pillar.value) : "#F0EBE3",
                        cursor: "pointer", transition: "all 0.1s",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#9B8E8E", marginTop: "6px" }}>
                  {rating > 0 ? `${rating}/5` : "Not rated"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflection questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", color: "#3D3535" }}>
          Reflection
        </h2>

        <Card padding="md">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A6847", display: "block", marginBottom: "8px" }}>
                Wins this week
              </label>
              <Textarea
                value={form.wins}
                onChange={(e) => setForm((p) => ({ ...p, wins: e.target.value }))}
                placeholder="What went well? What are you proud of — even small things?"
                rows={4}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C0607A", display: "block", marginBottom: "8px" }}>
                Struggles & patterns
              </label>
              <Textarea
                value={form.struggles}
                onChange={(e) => setForm((p) => ({ ...p, struggles: e.target.value }))}
                placeholder="What was hard? Any patterns you noticed? No judgment here."
                rows={4}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B4F8A", display: "block", marginBottom: "8px" }}>
                Intentions for next week
              </label>
              <Textarea
                value={form.intentions}
                onChange={(e) => setForm((p) => ({ ...p, intentions: e.target.value }))}
                placeholder="What do you want to focus on or commit to this coming week?"
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Overall mood */}
        <Card variant="cream" padding="md">
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535", marginBottom: "12px" }}>Overall, how was this week?</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setForm((p) => ({ ...p, overall_mood: n }))}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: "12px", border: `2px solid ${form.overall_mood === n ? "#F2C4CE" : "#F0EBE3"}`,
                  background: form.overall_mood === n ? "#FAE8EC" : "white", cursor: "pointer",
                  fontSize: "13px", fontWeight: form.overall_mood === n ? 600 : 400,
                  color: form.overall_mood === n ? "#C0607A" : "#9B8E8E", transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "8px", textAlign: "center" }}>
            {MOOD_LABELS[form.overall_mood]}
          </p>
        </Card>
      </div>

      <Button onClick={saveReview} disabled={saving} size="lg">
        <TrendingUp size={15} />
        {saving ? "Saving…" : review ? "Update review" : "Save weekly review"}
      </Button>

      {review && (
        <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "12px" }}>
          Last saved {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

function getPillarAccentColor(pillar: string): string {
  const map: Record<string, string> = {
    health: "#B5C4B1",
    mind: "#C8B8D8",
    finances: "#C9A96E",
    purpose: "#F5C9A8",
    relationships: "#F2C4CE",
    spirituality: "#D4C8EC",
    home: "#B8CCB8",
  };
  return map[pillar] ?? "#F2C4CE";
}
