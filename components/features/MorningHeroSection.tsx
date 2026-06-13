"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Circle, ArrowRight, Mail, Check, Loader } from "lucide-react";
import Link from "next/link";
import ChibiCharacter from "@/components/features/ChibiCharacter";

interface RoutineItem {
  id: string;
  title: string;
  duration_minutes: number | null;
  completed: boolean;
}

interface MorningBrief {
  greeting: string;
  nextStep: string;
  gentleNote: string;
  morningRoutine: {
    id: string;
    name: string;
    items: RoutineItem[];
  } | null;
  balletDay: string;
  habitsCompleted: number;
  habitsTotal: number;
}

interface Props {
  chibiName?: string;
  chibiOutfit?: "default" | "ballet" | "cozy" | "study" | "clean";
}

const BALLET_DAYS: Record<string, { type: "barre" | "core" | "rest"; label: string; sub: string }> = {
  Monday:    { type: "barre", label: "barre day 🩰",      sub: "pliés, tendus, relevés — even just 15 mins counts" },
  Tuesday:   { type: "core",  label: "core day 💪",       sub: "slow and intentional — ballerina core in progress" },
  Wednesday: { type: "barre", label: "barre day 🩰",      sub: "mid-week barre! you're literally building something" },
  Thursday:  { type: "core",  label: "core day 💪",       sub: "almost at the weekend, keep going" },
  Friday:    { type: "barre", label: "barre day 🩰",      sub: "end the week with movement, you'll feel so good" },
  Saturday:  { type: "rest",  label: "rest day 🌿",       sub: "gentle stretch only — rest is literally training" },
  Sunday:    { type: "rest",  label: "rest & reset 🛁",   sub: "restore yourself, tomorrow starts fresh" },
};

// Natural typewriter — variable speed, pauses on punctuation
function useTypewriter(text: string, enabled: boolean, baseSpeed = 26) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !text) return;
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    function typeNext() {
      const i = indexRef.current;
      if (i >= text.length) { setDone(true); return; }
      const ch = text[i];
      setDisplayed(text.slice(0, i + 1));
      indexRef.current = i + 1;

      let delay = baseSpeed + Math.random() * 14 - 7;
      if (ch === "." || ch === "!" || ch === "?") delay = 260 + Math.random() * 100;
      else if (ch === ",") delay = 100 + Math.random() * 50;
      else if (ch === " ") delay = baseSpeed * 0.55;
      else if (ch === "\n") delay = 160;

      timerRef.current = setTimeout(typeNext, delay);
    }

    timerRef.current = setTimeout(typeNext, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, enabled, baseSpeed]);

  return { displayed, done };
}

function Cursor({ visible }: { visible: boolean }) {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setBlink((b) => !b), 520);
    return () => clearInterval(id);
  }, [visible]);
  if (!visible) return null;
  return (
    <span style={{
      display: "inline-block", width: "2px", height: "1em",
      background: blink ? "#C0607A" : "transparent",
      marginLeft: "1px", verticalAlign: "text-bottom",
      borderRadius: "1px", transition: "background 0.08s",
    }} />
  );
}

// Tiny timestamp like "8:34 AM"
function NowTime() {
  const [t, setT] = useState("");
  useEffect(() => {
    setT(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  }, []);
  return <span>{t}</span>;
}

export default function MorningHeroSection({ chibiName = "Eden", chibiOutfit = "ballet" }: Props) {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showRead, setShowRead] = useState(false);

  const [phase, setPhase] = useState<"idle" | "greeting" | "gentleNote" | "nextStep" | "done">("idle");

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const ballet = BALLET_DAYS[dayName] ?? { type: "rest", label: "rest day 🌿", sub: "take it easy today" };
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const greeting  = useTypewriter(brief?.greeting ?? "",   phase === "greeting");
  const gentleNote = useTypewriter(brief?.gentleNote ?? "", phase === "gentleNote", 22);
  const nextStep  = useTypewriter(brief?.nextStep ?? "",   phase === "nextStep",   24);

  useEffect(() => { if (brief && !loading) setPhase("greeting"); }, [brief, loading]);
  useEffect(() => {
    if (phase === "greeting" && greeting.done)
      setTimeout(() => setPhase(brief?.gentleNote ? "gentleNote" : "nextStep"), 280);
  }, [greeting.done, phase, brief]);
  useEffect(() => {
    if (phase === "gentleNote" && gentleNote.done) setTimeout(() => setPhase("nextStep"), 220);
  }, [gentleNote.done, phase]);
  useEffect(() => {
    if (phase === "nextStep" && nextStep.done) {
      setTimeout(() => { setPhase("done"); setShowRead(true); }, 180);
    }
  }, [nextStep.done, phase]);

  useEffect(() => {
    fetch("/api/dashboard/morning-brief")
      .then((r) => r.json())
      .then((data: MorningBrief) => {
        setBrief(data);
        setRoutineItems(data.morningRoutine?.items ?? []);
      })
      .catch(() => setBrief({
        greeting: `hey! okay it's morning, you showed up — that already counts.`,
        nextStep: "just start your morning routine, literally the first step only.",
        gentleNote: "",
        morningRoutine: null,
        balletDay: dayName,
        habitsCompleted: 0,
        habitsTotal: 0,
      }))
      .finally(() => setLoading(false));
  }, [dayName]);

  const toggleRoutineItem = useCallback(async (itemId: string) => {
    if (!brief?.morningRoutine || checkingItem) return;
    setCheckingItem(itemId);
    const nowCompleted = !routineItems.find((i) => i.id === itemId)?.completed;
    setRoutineItems((prev) => prev.map((i) => i.id === itemId ? { ...i, completed: nowCompleted } : i));
    try {
      const completedIds = routineItems
        .map((i) => ({ ...i, completed: i.id === itemId ? nowCompleted : i.completed }))
        .filter((i) => i.completed).map((i) => i.id);
      await fetch("/api/routines/log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId: brief.morningRoutine.id, completedItems: completedIds }),
      });
    } catch {
      setRoutineItems((prev) => prev.map((i) => i.id === itemId ? { ...i, completed: !nowCompleted } : i));
    } finally { setCheckingItem(null); }
  }, [brief, routineItems, checkingItem]);

  const sendMorningEmail = useCallback(async () => {
    if (emailState !== "idle") return;
    setEmailState("sending");
    try {
      const res = await fetch("/api/email/morning", { method: "POST" });
      if (!res.ok) throw new Error();
      setEmailState("sent");
      setTimeout(() => setEmailState("idle"), 4000);
    } catch {
      setEmailState("error");
      setTimeout(() => setEmailState("idle"), 3000);
    }
  }, [emailState]);

  const completedCount = routineItems.filter((i) => i.completed).length;
  const totalCount = routineItems.length;

  return (
    <div style={{ marginBottom: "48px" }}>

      {/* ── Message card ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>

        {/* Sender row */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px",
        }}>
          {/* Avatar */}
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "linear-gradient(135deg, #FAE8EC, #EDE5F5)",
            border: "1px solid rgba(242,196,206,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
          }}>
            <ChibiCharacter mood="happy" outfit={chibiOutfit} size={34} animate={false} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#3D3535" }}>
              {chibiName}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#B0A09A" }}>
              {todayLabel}
            </p>
          </div>

          {/* Email button — top right */}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={sendMorningEmail}
              disabled={emailState === "sending"}
              title="Send morning briefing to your email"
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", borderRadius: "99px",
                background: emailState === "sent" ? "#F0F8F0"
                           : emailState === "error" ? "#FEF0F0"
                           : "#F5F0EE",
                border: `1px solid ${emailState === "sent" ? "#C8DEC8" : emailState === "error" ? "#F2C4CE" : "#E8E0DC"}`,
                cursor: emailState === "sending" ? "wait" : "pointer",
                fontSize: "12px", fontWeight: 500,
                color: emailState === "sent" ? "#6A8A68"
                      : emailState === "error" ? "#C0607A"
                      : "#9B8E8E",
                transition: "all 0.2s",
              }}
            >
              {emailState === "sending" ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> sending…</>
               : emailState === "sent"    ? <><Check size={12} /> sent ✓</>
               : emailState === "error"   ? <>try again</>
               : <><Mail size={12} /> email my brief</>}
            </button>
          </div>
        </div>

        {/* Message bubble */}
        <div style={{
          background: "white",
          borderRadius: "4px 18px 18px 18px",
          border: "1px solid #EDE8E4",
          padding: "22px 26px 20px",
          boxShadow: "0 1px 8px rgba(61,53,53,0.05)",
          position: "relative",
        }}>

          {loading ? (
            /* Skeleton */
            <div>
              {[88, 72, 48].map((w, i) => (
                <div key={i} style={{
                  height: "17px", borderRadius: "6px", marginBottom: "10px",
                  background: "linear-gradient(90deg,#F5F0EE 25%,#FAF7F5 50%,#F5F0EE 75%)",
                  backgroundSize: "200% 100%",
                  animation: `shimmer 1.5s infinite ${i * 0.12}s`,
                  width: `${w}%`,
                }} />
              ))}
            </div>
          ) : (
            <div>
              {/* Main greeting */}
              <p style={{
                margin: "0 0 0 0",
                fontSize: "15px",
                color: "#2A2020",
                lineHeight: 1.65,
                letterSpacing: "-0.01em",
              }}>
                {greeting.displayed}
                <Cursor visible={phase === "greeting"} />
              </p>

              {/* Gentle note */}
              {(phase === "gentleNote" || phase === "nextStep" || phase === "done") && brief?.gentleNote && (
                <p style={{
                  margin: "14px 0 0",
                  fontSize: "14px",
                  color: "#6A5A5A",
                  lineHeight: 1.65,
                  fontStyle: "italic",
                  animation: "fadeUp 0.35s ease",
                }}>
                  {gentleNote.displayed}
                  <Cursor visible={phase === "gentleNote"} />
                </p>
              )}

              {/* Next step — pill */}
              {(phase === "nextStep" || phase === "done") && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  marginTop: "16px",
                  padding: "9px 16px",
                  borderRadius: "12px",
                  background: "#FAF0F2",
                  border: "1px solid #F2C4CE",
                  animation: "fadeUp 0.3s ease",
                }}>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "#C0607A",
                  }}>
                    one thing →
                  </span>
                  <span style={{ fontSize: "13px", color: "#3D3535" }}>
                    {nextStep.displayed}
                    <Cursor visible={phase === "nextStep"} />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Read receipt */}
          {showRead && (
            <p style={{
              margin: "12px 0 0", fontSize: "11px", color: "#C8BEB8",
              textAlign: "right", animation: "fadeUp 0.4s ease",
            }}>
              read · <NowTime />
            </p>
          )}
        </div>

        {/* Habits mini counter below bubble */}
        {!loading && brief && brief.habitsTotal > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            marginTop: "8px", paddingLeft: "4px",
            animation: "fadeUp 0.4s ease 0.3s both",
          }}>
            <div style={{
              height: "4px", flex: 1, background: "#F0EBE3",
              borderRadius: "99px", overflow: "hidden", maxWidth: "120px",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.round((brief.habitsCompleted / brief.habitsTotal) * 100)}%`,
                background: brief.habitsCompleted === brief.habitsTotal
                  ? "linear-gradient(90deg,#8FAB8A,#B5C9B1)"
                  : "linear-gradient(90deg,#F2C4CE,#C8B8D8)",
                borderRadius: "99px", transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{ fontSize: "11px", color: "#B0A09A" }}>
              {brief.habitsCompleted === brief.habitsTotal && brief.habitsTotal > 0
                ? `all ${brief.habitsTotal} habits done 🎉`
                : `${brief.habitsCompleted}/${brief.habitsTotal} habits`}
            </span>
            <Link href="/plan/habits" style={{ fontSize: "11px", color: "#C0607A", textDecoration: "none", marginLeft: "2px" }}>
              <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Bottom row: Routine + Ballet ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

        {/* Morning Ritual */}
        <div style={{
          borderRadius: "16px", background: "white",
          border: "1px solid #EDE8E4", padding: "22px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "14px",
          }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#3D3535" }}>
                morning ritual
              </p>
              {totalCount > 0 && (
                <p style={{ margin: 0, fontSize: "11px", color: "#B0A09A" }}>
                  {completedCount === totalCount && totalCount > 0
                    ? "done!! 🎉"
                    : `${completedCount}/${totalCount} done`}
                </p>
              )}
            </div>
            <Link href="/plan/routines" style={{ color: "#C0B0A8", textDecoration: "none", lineHeight: 1 }}>
              <ArrowRight size={14} />
            </Link>
          </div>

          {totalCount > 0 && (
            <div style={{
              height: "3px", background: "#F0EBE3", borderRadius: "99px",
              marginBottom: "14px", overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.round((completedCount / totalCount) * 100)}%`,
                background: completedCount === totalCount
                  ? "linear-gradient(90deg,#8FAB8A,#B5C9B1)"
                  : "linear-gradient(90deg,#F2C4CE,#C8B8D8)",
                borderRadius: "99px", transition: "width 0.5s ease",
              }} />
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  height: "36px", borderRadius: "8px",
                  background: `linear-gradient(90deg,#F5F0EE 25%,#FAF7F5 50%,#F5F0EE 75%)`,
                  backgroundSize: "200% 100%",
                  animation: `shimmer 1.5s infinite ${i * 0.1}s`,
                }} />
              ))}
            </div>
          ) : routineItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <p style={{ fontSize: "13px", color: "#B0A09A", marginBottom: "8px" }}>
                no morning ritual yet
              </p>
              <Link href="/plan/routines" style={{
                fontSize: "12px", color: "#C0607A", textDecoration: "none",
                fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px",
              }}>
                set one up <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {routineItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleRoutineItem(item.id)}
                  disabled={checkingItem === item.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 10px", borderRadius: "9px",
                    background: item.completed ? "#F6FBF5" : "#FAFAF9",
                    border: `1px solid ${item.completed ? "#C8DEC4" : "#EDE8E4"}`,
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "all 0.12s", opacity: checkingItem === item.id ? 0.5 : 1,
                  }}
                >
                  {item.completed
                    ? <CheckCircle2 size={15} color="#8FAB8A" strokeWidth={2} />
                    : <Circle size={15} color="#CCC4BC" strokeWidth={1.5} />}
                  <span style={{
                    fontSize: "13px", flex: 1,
                    color: item.completed ? "#8FAB8A" : "#3D3535",
                    textDecoration: item.completed ? "line-through" : "none",
                  }}>
                    {item.title}
                  </span>
                  {item.duration_minutes && (
                    <span style={{ fontSize: "11px", color: "#C0B0A8" }}>
                      {item.duration_minutes}m
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ballet today */}
        <div style={{
          borderRadius: "16px", background: "white",
          border: "1px solid #EDE8E4", padding: "22px",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "14px",
          }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#3D3535" }}>
              ballet plan
            </p>
            <Link href="/plan/ballet" style={{ color: "#C0B0A8", textDecoration: "none", lineHeight: 1 }}>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{
            padding: "14px 16px", borderRadius: "12px", marginBottom: "12px",
            background: ballet.type === "barre"
              ? "#FFF0F3" : ballet.type === "core"
              ? "#F0F8F0" : "#FBF7F2",
            border: `1px solid ${ballet.type === "barre" ? "#F2C4CE" : ballet.type === "core" ? "#C8DEC4" : "#E4D8CC"}`,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#3D3535" }}>
              {ballet.label}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6A5A5A", lineHeight: 1.5 }}>
              {ballet.sub}
            </p>
          </div>

          <p style={{
            margin: "0 0 16px", fontSize: "12px", color: "#B0A09A",
            lineHeight: 1.6, fontStyle: "italic",
          }}>
            {ballet.type === "rest"
              ? "rest is literally part of the training. your body needs this."
              : "even if it's just 10 minutes. movement counts."}
          </p>

          <div style={{ marginTop: "auto" }}>
            <Link href="/plan/ballet" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: "10px",
              background: "#FAF5F2", border: "1px solid #EDE8E4",
              textDecoration: "none",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#3D3535" }}>open full plan</span>
              <ArrowRight size={13} color="#C0607A" />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
