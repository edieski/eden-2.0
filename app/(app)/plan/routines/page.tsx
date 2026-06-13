"use client";

import { useState, useEffect } from "react";
import {
  Plus, CheckCircle2, Circle, Trash2,
  Sun, Moon, Flame, X, ChevronLeft, Play,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { today, calculateStreak } from "@/lib/utils";
import type { Routine, RoutineLog } from "@/types";

// ─── constants ──────────────────────────────────────────────────────────────

const MORNING_QUOTES = [
  "Every sunrise is an invitation to rise above yesterday.",
  "Your morning ritual sets the tone for your entire day.",
  "Rise with intention. Shine with purpose.",
  "A sacred morning creates a beautiful day.",
];
const EVENING_QUOTES = [
  "How you end your day shapes how you begin tomorrow.",
  "Rest is not idleness — it is medicine.",
  "Wind down, reflect, restore.",
  "Peace begins the moment you choose to let go.",
];

const DEFAULT_MORNING: Omit<Routine, "id" | "user_id" | "created_at"> = {
  name: "Morning Ritual",
  type: "morning",
  is_active: true,
  items: [
    { id: "1", title: "Wake up & drink water", duration_minutes: 2 },
    { id: "2", title: "Morning stretch or barre warm-up", duration_minutes: 10 },
    { id: "3", title: "Skincare routine", duration_minutes: 10 },
    { id: "4", title: "Nourishing breakfast", duration_minutes: 15 },
    { id: "5", title: "Set 3 intentions for the day", duration_minutes: 5 },
  ],
};

const DEFAULT_EVENING: Omit<Routine, "id" | "user_id" | "created_at"> = {
  name: "Evening Wind-down",
  type: "evening",
  is_active: true,
  items: [
    { id: "1", title: "Tidy bedroom surfaces", duration_minutes: 10 },
    { id: "2", title: "Skincare routine", duration_minutes: 10 },
    { id: "3", title: "No screens — read or journal", duration_minutes: 20 },
    { id: "4", title: "Reflect on 3 good things", duration_minutes: 5 },
    { id: "5", title: "Lay out tomorrow's outfit", duration_minutes: 5 },
  ],
};

// ─── FloatingSparkles ───────────────────────────────────────────────────────

interface SparklePos {
  top: string;
  left?: string;
  right?: string;
  delay: string;
  size: number;
}

function FloatingSparkles({ accent }: { accent: string }) {
  const sparkles: SparklePos[] = [
    { top: "10%", left: "10%",  delay: "0s",    size: 22 },
    { top: "16%", right: "9%",  delay: "0.4s",  size: 18 },
    { top: "52%", left: "5%",   delay: "0.7s",  size: 26 },
    { top: "66%", right: "11%", delay: "0.2s",  size: 16 },
    { top: "36%", left: "3%",   delay: "0.9s",  size: 14 },
    { top: "28%", right: "5%",  delay: "0.5s",  size: 20 },
    { top: "78%", left: "20%",  delay: "0.1s",  size: 18 },
    { top: "13%", right: "26%", delay: "0.6s",  size: 14 },
    { top: "70%", right: "26%", delay: "0.3s",  size: 16 },
    { top: "44%", right: "3%",  delay: "0.8s",  size: 12 },
  ];
  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(14px) rotate(0deg) scale(0.5); }
          25%  { opacity: 1; }
          75%  { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(-54px) rotate(190deg) scale(1.1); }
        }
      `}</style>
      {sparkles.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            right: s.right,
            fontSize: s.size,
            color: accent,
            animation: `floatUp 2.8s ease-in-out ${s.delay} infinite`,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

// ─── TimerRing ──────────────────────────────────────────────────────────────

function TimerRing({
  seconds,
  total,
  accent,
}: {
  seconds: number;
  total: number;
  accent: string;
}) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? seconds / total : 0;
  const offset = circ * (1 - progress);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ position: "relative", width: 100, height: 100 }}>
      <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={50} cy={50} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.07)"
          strokeWidth={7}
        />
        <circle
          cx={50} cy={50} r={r}
          fill="none"
          stroke={accent}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "19px", fontWeight: 600, color: accent, letterSpacing: "0.02em",
          }}
        >
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
}

// ─── GuidedMode ─────────────────────────────────────────────────────────────

interface GuidedModeProps {
  routine: Routine;
  completedItems: string[];
  onToggle: (routine: Routine, itemId: string) => Promise<void>;
  onClose: () => void;
}

function GuidedMode({ routine, completedItems, onToggle, onClose }: GuidedModeProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [donePhrase, setDonePhrase] = useState<string | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [stepPhase, setStepPhase] = useState<"active" | "completing">("active");

  const isMorning = routine.type === "morning";
  const accent = isMorning ? "#C9A96E" : "#9B7BC4";
  const bg = isMorning
    ? "linear-gradient(155deg, #FFFCF4 0%, #FFF4DC 45%, #FAE9C0 100%)"
    : "linear-gradient(155deg, #F8F3FF 0%, #EDE0FA 45%, #E0D0F5 100%)";

  const item = routine.items[stepIdx];

  useEffect(() => {
    const secs = (item?.duration_minutes ?? 1) * 60;
    setTotalTime(secs);
    setTimeLeft(secs);
    setAnimKey((k) => k + 1);
    setStepPhase("active");
    fetchGuidance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  async function fetchGuidance() {
    if (!item) return;
    setGuidance(null);
    setDonePhrase(null);
    setLoadingGuidance(true);
    try {
      const res = await fetch("/api/routines/step-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepTitle: item.title,
          stepIndex: stepIdx,
          totalSteps: routine.items.length,
          routineType: routine.type,
          routineName: routine.name,
          durationMinutes: item.duration_minutes,
        }),
      });
      const { guidance: g, done: d } = await res.json();
      setGuidance(g || null);
      setDonePhrase(d || null);
    } finally {
      setLoadingGuidance(false);
    }
  }

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  async function handleDone() {
    if (!completedItems.includes(item.id)) {
      await onToggle(routine, item.id);
    }
    setStepPhase("completing");
    setTimeout(() => {
      if (stepIdx < routine.items.length - 1) {
        setStepIdx((i) => i + 1);
      } else {
        setShowComplete(true);
      }
    }, 1600);
  }

  function handleSkip() {
    setStepPhase("completing");
    setTimeout(() => {
      if (stepIdx < routine.items.length - 1) {
        setStepIdx((i) => i + 1);
      } else {
        setShowComplete(true);
      }
    }, 800);
  }

  const completeMsgs = isMorning
    ? [
        "You're radiant — go shine! ✨",
        "Morning ritual complete. The day is yours. 🌅",
        "Your morning self is glowing. 🌸",
      ]
    : [
        "Sweet dreams. You earned this rest. 🌙",
        "Evening wind-down complete. Rest well. 💜",
        "Peace and rest. You showed up. ✨",
      ];
  const completeMsg = completeMsgs[Math.floor(Date.now() / 86400000) % completeMsgs.length];

  if (showComplete) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <FloatingSparkles accent={accent} />
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>
            {isMorning ? "☀️" : "🌙"}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "38px", fontWeight: 400, color: "#3D3535",
              marginBottom: "10px",
            }}
          >
            {routine.name} <em>complete</em>
          </h2>
          <p
            style={{
              fontSize: "16px", color: "#7A6A6A",
              lineHeight: 1.7, maxWidth: "300px",
              margin: "0 auto 40px",
            }}
          >
            {completeMsg}
          </p>
          <Button onClick={onClose} variant="primary" size="lg">
            Back to Rituals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: bg,
        display: "flex", flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes guidanceFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes guidancePulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>

      {/* Top bar */}
      <div
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "22px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isMorning ? <Sun size={18} color={accent} /> : <Moon size={18} color={accent} />}
          <span
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "20px", color: "#3D3535", fontWeight: 500,
            }}
          >
            {routine.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(0,0,0,0.07)", border: "none", borderRadius: "50%",
            width: "36px", height: "36px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#7A6A6A",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "0 24px 20px" }}>
        {routine.items.map((it, i) => (
          <div
            key={it.id}
            style={{
              height: "6px",
              width: completedItems.includes(it.id) || i === stepIdx ? "28px" : "8px",
              borderRadius: "99px",
              background: completedItems.includes(it.id)
                ? accent
                : i === stepIdx
                  ? `${accent}AA`
                  : "rgba(0,0,0,0.10)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Step label */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <span
          style={{
            fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: `${accent}BB`,
          }}
        >
          Step {stepIdx + 1} of {routine.items.length}
        </span>
      </div>

      {/* Animated step content */}
      <div
        key={animKey}
        style={{
          flex: 1,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 48px", textAlign: "center",
          animation: "stepIn 0.35s ease forwards",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(26px, 4.5vw, 42px)",
            fontWeight: 400, color: "#3D3535",
            lineHeight: 1.35, maxWidth: "480px",
            marginBottom: "24px",
          }}
        >
          {item?.title}
        </h2>

        {/* Eden's per-step coaching */}
        <div style={{ minHeight: "72px", maxWidth: "440px", width: "100%", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {loadingGuidance && stepPhase === "active" ? (
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: accent, opacity: 0.5,
                    animation: `guidancePulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : stepPhase === "completing" && donePhrase ? (
            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                background: `${accent}18`,
                border: `1.5px solid ${accent}40`,
                borderRadius: "16px",
                padding: "14px 20px",
                width: "100%",
                animation: "guidanceFadeIn 0.3s ease forwards",
              }}
            >
              <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>✓</span>
              <p style={{ fontSize: "15px", color: "#3D3535", lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
                {donePhrase}
              </p>
            </div>
          ) : stepPhase === "active" && guidance ? (
            <p
              key={`guidance-${stepIdx}`}
              style={{
                fontSize: "15px", color: "#6A5A5A", lineHeight: 1.7,
                textAlign: "center", fontStyle: "italic",
                background: `${accent}0E`,
                border: `1px solid ${accent}22`,
                borderRadius: "16px",
                padding: "14px 20px",
                margin: 0,
                animation: "guidanceFadeIn 0.5s ease forwards",
              }}
            >
              {guidance}
            </p>
          ) : null}
        </div>

        <TimerRing seconds={timeLeft} total={totalTime} accent={accent} />

        {item?.duration_minutes && (
          <p style={{ marginTop: "14px", fontSize: "12px", color: "#B5A8A8" }}>
            {item.duration_minutes} min suggested
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: "20px 48px 44px",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "420px" }}>
          {stepIdx > 0 && stepPhase === "active" && (
            <button
              onClick={() => setStepIdx((i) => i - 1)}
              style={{
                flex: 1, padding: "13px 18px",
                borderRadius: "14px",
                border: "1.5px solid rgba(0,0,0,0.10)",
                background: "transparent", cursor: "pointer",
                fontSize: "14px", color: "#7A6A6A",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}
          <button
            onClick={handleDone}
            disabled={stepPhase === "completing"}
            style={{
              flex: stepIdx > 0 && stepPhase === "active" ? 2 : 1,
              padding: "15px 24px",
              borderRadius: "14px",
              border: "none",
              background: stepPhase === "completing" ? `${accent}80` : accent,
              cursor: stepPhase === "completing" ? "default" : "pointer",
              fontSize: "16px", fontWeight: 700, color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              boxShadow: stepPhase === "completing" ? "none" : `0 4px 24px ${accent}60`,
              transition: "all 0.3s ease",
              letterSpacing: "0.01em",
            }}
          >
            <CheckCircle2 size={18} />
            {stepPhase === "completing"
              ? "Moving on…"
              : stepIdx < routine.items.length - 1
                ? "Done — next step"
                : "Complete Ritual"}
          </button>
        </div>
        {stepPhase === "active" && (
          <button
            onClick={handleSkip}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: "12px", color: "#B5A8A8", padding: "4px 12px",
            }}
          >
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── RoutinesPage ───────────────────────────────────────────────────────────

export default function RoutinesPage() {
  const supabase = createClient();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [allLogs, setAllLogs] = useState<RoutineLog[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [guidedRoutine, setGuidedRoutine] = useState<Routine | null>(null);
  const todayStr = today();

  const hour = new Date().getHours();
  const activeType: "morning" | "evening" | null =
    hour >= 5 && hour < 14 ? "morning" : hour >= 18 || hour < 4 ? "evening" : null;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ago = new Date();
    ago.setDate(ago.getDate() - 30);
    const agoStr = ago.toISOString().split("T")[0];

    const [{ data: r }, { data: l }, { data: al }] = await Promise.all([
      supabase.from("routines").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("routine_logs").select("*").eq("user_id", user.id).eq("date", todayStr),
      supabase.from("routine_logs").select("*").eq("user_id", user.id).gte("date", agoStr),
    ]);

    if (!r?.length) {
      const { data: seeded } = await supabase
        .from("routines")
        .insert([
          { ...DEFAULT_MORNING, user_id: user.id },
          { ...DEFAULT_EVENING, user_id: user.id },
        ])
        .select();
      setRoutines(seeded ?? []);
    } else {
      setRoutines(r ?? []);
    }
    setLogs(l ?? []);
    setAllLogs(al ?? []);
  }

  function getStreak(routineId: string): number {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine || !routine.items.length) return 0;
    const dates = allLogs
      .filter(
        (l) =>
          l.routine_id === routineId &&
          l.completed_items.length >= routine.items.length
      )
      .map((l) => l.date);
    return calculateStreak(dates);
  }

  async function toggleItem(routine: Routine, itemId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = logs.find((l) => l.routine_id === routine.id);
    const prev = existing?.completed_items ?? [];
    const next = prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId];
    if (existing) {
      const { data } = await supabase
        .from("routine_logs")
        .update({ completed_items: next })
        .eq("id", existing.id)
        .select()
        .single();
      if (data) setLogs((p) => p.map((l) => (l.id === data.id ? data : l)));
    } else {
      const { data } = await supabase
        .from("routine_logs")
        .insert({ routine_id: routine.id, user_id: user.id, date: todayStr, completed_items: next })
        .select()
        .single();
      if (data) setLogs((p) => [...p, data]);
    }
  }

  async function addItem(routineId: string) {
    if (!newItem.trim()) return;
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const items = [
      ...routine.items,
      { id: crypto.randomUUID(), title: newItem.trim(), duration_minutes: null },
    ];
    const { data } = await supabase
      .from("routines")
      .update({ items })
      .eq("id", routineId)
      .select()
      .single();
    if (data) setRoutines((p) => p.map((r) => (r.id === routineId ? data : r)));
    setNewItem("");
    setAddingTo(null);
  }

  async function removeItem(routine: Routine, itemId: string) {
    const items = routine.items.filter((i) => i.id !== itemId);
    const { data } = await supabase
      .from("routines")
      .update({ items })
      .eq("id", routine.id)
      .select()
      .single();
    if (data) setRoutines((p) => p.map((r) => (r.id === routine.id ? data : r)));
  }

  const guidedLog = guidedRoutine
    ? (logs.find((l) => l.routine_id === guidedRoutine.id)?.completed_items ?? [])
    : [];

  return (
    <div className="page-padding" style={{ maxWidth: "860px" }}>
      {guidedRoutine && (
        <GuidedMode
          routine={guidedRoutine}
          completedItems={guidedLog}
          onToggle={toggleItem}
          onClose={() => setGuidedRoutine(null)}
        />
      )}

      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px",
          }}
        >
          Daily Routines
        </p>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "40px", fontWeight: 400, color: "#3D3535",
          }}
        >
          Morning & <em>Evening</em>
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Your rituals shape your identity. Check off as you go, or begin a guided session.
        </p>
      </div>

      <div className="grid-2-col" style={{ gap: "24px" }}>
        {routines.map((routine) => {
          const log = logs.find((l) => l.routine_id === routine.id);
          const completed = log?.completed_items ?? [];
          const total = routine.items.length;
          const done = completed.length;
          const allDone = done === total && total > 0;
          const streak = getStreak(routine.id);
          const isMorning = routine.type === "morning";
          const isActive = activeType === routine.type;
          const accent = isMorning ? "#C9A96E" : "#9B7BC4";
          const Icon = isMorning ? Sun : Moon;
          const quotes = isMorning ? MORNING_QUOTES : EVENING_QUOTES;
          const quote = quotes[Math.floor(Date.now() / 86400000) % quotes.length];

          return (
            <Card
              key={routine.id}
              style={{
                position: "relative",
                ...(isActive
                  ? { boxShadow: `0 0 0 2px ${accent}50, 0 4px 24px ${accent}20` }
                  : {}),
              }}
            >
              {/* "Now" badge */}
              {isActive && (
                <div
                  style={{
                    position: "absolute", top: "14px", right: "14px",
                    fontSize: "10px", fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: accent, background: `${accent}18`,
                    padding: "2px 8px", borderRadius: "99px",
                  }}
                >
                  Now
                </div>
              )}

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <Icon size={15} color={accent} />
                <span
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontSize: "18px", fontWeight: 500, color: "#3D3535",
                  }}
                >
                  {routine.name}
                </span>
              </div>

              {/* Daily quote */}
              <p
                style={{
                  fontSize: "11px", color: "#C0B0B0",
                  fontStyle: "italic", marginBottom: "14px", lineHeight: 1.5,
                }}
              >
                &ldquo;{quote}&rdquo;
              </p>

              {/* Streak + counter */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                {streak > 0 && (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      background: "#FFF3E0", borderRadius: "99px", padding: "3px 10px",
                    }}
                  >
                    <Flame size={11} color="#F4A030" />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#E07820" }}>
                      {streak}d
                    </span>
                    <span style={{ fontSize: "10px", color: "#F4A030" }}>streak</span>
                  </div>
                )}
                <span style={{ marginLeft: "auto", fontSize: "12px", color: "#9B8E8E" }}>
                  {done}/{total}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: "4px", background: "#F0EBE3",
                  borderRadius: "99px", overflow: "hidden", marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: total ? `${(done / total) * 100}%` : "0%",
                    background: accent,
                    borderRadius: "99px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Completion banner */}
              {allDone && (
                <div
                  style={{
                    background: `${accent}14`,
                    border: `1px solid ${accent}30`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "14px",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "15px" }}>{isMorning ? "🌅" : "🌙"}</span>
                  <span style={{ fontSize: "12px", color: accent, fontWeight: 500 }}>
                    {isMorning
                      ? "Morning ritual complete! Have a beautiful day."
                      : "Wind-down complete. Rest well tonight."}
                  </span>
                </div>
              )}

              {/* Checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {routine.items.map((item) => {
                  const isDone = completed.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 10px", borderRadius: "10px", cursor: "pointer",
                        background: isDone ? "#F6FBF5" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onClick={() => toggleItem(routine, item.id)}
                    >
                      {isDone
                        ? <CheckCircle2 size={16} color="#8FAB8A" strokeWidth={2} />
                        : <Circle size={16} color="#D8D0D0" strokeWidth={1.5} />}
                      <span
                        style={{
                          flex: 1, fontSize: "13px",
                          color: isDone ? "#8FAB8A" : "#3D3535",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.duration_minutes && (
                        <span style={{ fontSize: "11px", color: "#B5A8A8" }}>
                          {item.duration_minutes}m
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(routine, item.id); }}
                        style={{
                          border: "none", background: "transparent",
                          cursor: "pointer", color: "#C4B8B8",
                          padding: "2px", opacity: 0, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                          (e.currentTarget as HTMLButtonElement).style.color = "#C0607A";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = "0";
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add step */}
              {addingTo === routine.id ? (
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem(routine.id)}
                    placeholder="New step…"
                    autoFocus
                  />
                  <Button onClick={() => addItem(routine.id)} size="sm" disabled={!newItem.trim()}>
                    Add
                  </Button>
                  <Button
                    onClick={() => { setAddingTo(null); setNewItem(""); }}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(routine.id)}
                  style={{
                    marginTop: "10px",
                    display: "flex", alignItems: "center", gap: "6px",
                    fontSize: "12px", color: "#9B8E8E",
                    background: "transparent", border: "none",
                    cursor: "pointer", padding: "4px 0",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9B8E8E")}
                >
                  <Plus size={12} /> Add step
                </button>
              )}

              {/* Begin Guided Ritual button */}
              {!allDone && total > 0 && (
                <button
                  onClick={() => setGuidedRoutine(routine)}
                  style={{
                    marginTop: "16px", width: "100%",
                    padding: "10px 16px", borderRadius: "12px",
                    border: `1.5px solid ${accent}55`,
                    background: `${accent}0C`,
                    cursor: "pointer",
                    fontSize: "13px", fontWeight: 500, color: accent,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = `${accent}1C`;
                    btn.style.borderColor = accent;
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = `${accent}0C`;
                    btn.style.borderColor = `${accent}55`;
                  }}
                >
                  <Play size={13} />
                  Begin Guided Ritual
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
