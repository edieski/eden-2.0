"use client";

import Link from "next/link";
import {
  CheckCircle2, Circle, ArrowRight, Plus,
  MessageCircle, Timer, Frame, Home, Shuffle,
  BookOpen, Pin, Flame, ClipboardList, Sparkles as SparklesIcon,
} from "lucide-react";
import ChibiCharacter from "@/components/features/ChibiCharacter";
import Card, { CardTitle } from "@/components/ui/Card";
import Sparkles, { LeafAccent, SparkleInline } from "@/components/ui/Sparkles";
import { getChibiMood, getGreeting, getPillarColor, getPillarLabel, LIFE_PILLARS } from "@/lib/utils";
import type { Habit, HabitLog, Milestone, FoodLog } from "@/types";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: string | null;
}

interface Props {
  profile: { name: string; chibi_name: string; chibi_outfit: string; chibi_level: number; chibi_xp: number } | null;
  habits: Habit[];
  habitLogs: HabitLog[];
  milestones: Milestone[];
  foodLogs: FoodLog[];
  pinnedNotes: { id: string; title: string; updated_at: string }[];
  todos: Todo[];
}

const QUICK_LINKS = [
  { label: "Talk It Through", href: "/motivate", icon: SparklesIcon, bg: "#FEF0F3", color: "#C0607A", note: "talk → plan" },
  { label: "Chat with Eden", href: "/chat", icon: MessageCircle, bg: "#F0E4F8", color: "#8040A8", note: "talk it out" },
  { label: "Spin the Wheel", href: "/todos", icon: Shuffle, bg: "#FAE0EC", color: "#C04878", note: "let fate decide" },
  { label: "Focus Timer", href: "/focus", icon: Timer, bg: "#E0F0E8", color: "#407858", note: "lock in" },
  { label: "Vision Board", href: "/vision-board", icon: Frame, bg: "#FFF0D8", color: "#A06020", note: "dream it" },
  { label: "Home & Cleaning", href: "/home", icon: Home, bg: "#E8F4E8", color: "#406040", note: "reset the space" },
];

const AFFIRMATIONS = [
  "you are becoming exactly who you're meant to be",
  "small steps every day. that's all it takes.",
  "you deserve the beautiful life you're building",
  "your consistency today is your confidence tomorrow",
  "every version of you has gotten you here",
  "rest is part of the work too",
  "you don't have to be perfect to be worthy",
];

// Slight natural tilts — like cards placed by hand on a corkboard
const PILLAR_TILTS = [-1.4, 0.6, -0.9, 1.8, -0.4, 1.1, -1.6];

const HW = "var(--font-caveat), 'Caveat', cursive"; // shorthand for handwriting font

export default function DashboardClient({ profile, habits, habitLogs, milestones, foodLogs, pinnedNotes, todos }: Props) {
  const completedToday = habitLogs.filter((l) => l.completed).length;
  const chibiMood = getChibiMood(completedToday, habits.length, 0);
  const greeting = getGreeting();
  const firstName = (profile?.name ?? "you").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const pct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack"];
  const loggedMealTypes = new Set(foodLogs.map((f) => f.meal_type));

  const dayIndex = new Date().getDay();
  const affirmation = AFFIRMATIONS[dayIndex % AFFIRMATIONS.length];

  return (
    <div className="page-padding" style={{ maxWidth: "1240px" }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        className="hero-responsive"
        style={{
          position: "relative",
          marginBottom: "28px",
          padding: "32px 36px 36px",
          borderRadius: "24px",
          background: "linear-gradient(135deg, #F8C8DC 0%, #EEC8F0 35%, #C8DEF8 70%, #C4F0E4 100%)",
          border: "1px solid rgba(220,140,180,0.35)",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          boxShadow: "0 4px 8px rgba(180,60,100,0.08), 0 20px 60px rgba(180,60,100,0.15), inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
      >
        <Sparkles count={14} />
        <div style={{ position: "absolute", left: "-8px", bottom: "0", opacity: 0.6 }}>
          <LeafAccent side="left" color="#C8A8D8" />
        </div>
        <div style={{ position: "absolute", right: "155px", bottom: "0", opacity: 0.45 }}>
          <LeafAccent side="right" color="#A8C8B8" />
        </div>

        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          {/* Date — handwritten */}
          <p style={{ fontFamily: HW, fontSize: "16px", color: "#A84878", marginBottom: "4px", letterSpacing: "0.02em" }}>
            {todayLabel} ✦
          </p>

          {/* Greeting */}
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "46px", fontWeight: 400, color: "#281A24", lineHeight: 1.1 }}>
            {greeting}, <em style={{ fontStyle: "italic" }}>{firstName}</em>{" "}
            <SparkleInline size={22} color="#C9A96E" />
          </h1>

          {/* Affirmation — the soul of the hero */}
          <p style={{ fontFamily: HW, fontSize: "20px", color: "#7A4868", marginTop: "12px", lineHeight: 1.4, maxWidth: "440px" }}>
            " {affirmation} "
          </p>

          {/* Progress — feels like a scrawled note */}
          {habits.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Flame size={14} color="#C04878" strokeWidth={2} />
                <span style={{ fontFamily: HW, fontSize: "17px", color: "#A82850" }}>
                  {completedToday} of {habits.length} done
                </span>
                {pct === 100 && (
                  <span style={{ fontFamily: HW, fontSize: "15px", color: "#5A9870" }}>
                    — all of them! 🎉
                  </span>
                )}
              </div>
              <div className="hero-progress" style={{ height: "6px", background: "rgba(255,255,255,0.45)", borderRadius: "99px", overflow: "hidden", maxWidth: "320px", boxShadow: "inset 0 1px 3px rgba(180,60,100,0.15)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #E890C0, #C090E0, #80C0F0)", borderRadius: "99px", transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 0 6px rgba(200,80,140,0.5)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Chibi */}
        <div className="hero-chibi" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", marginTop: "-8px" }}>
          <div style={{ animation: "glow-pulse 3s ease-in-out infinite", borderRadius: "50%", padding: "4px" }}>
            <ChibiCharacter
              mood={chibiMood}
              outfit={(profile?.chibi_outfit as "default" | "ballet" | "cozy" | "study" | "clean") ?? "default"}
              size={130}
              animate
            />
          </div>
          <p style={{ fontFamily: HW, fontSize: "14px", color: "#A84878", letterSpacing: "0.04em" }}>
            {profile?.chibi_name ?? "eden"}
          </p>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div className="grid-3-col" style={{ gap: "20px" }}>

        {/* Today's Habits — 2 cols */}
        <div className="col-span-2" style={{ gridColumn: "span 2" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "18px" }}>
              <div>
                <CardTitle>Today&apos;s Habits</CardTitle>
                <p style={{ fontFamily: HW, fontSize: "14px", color: "#B870A0", marginTop: "1px" }}>
                  check these off one by one →
                </p>
              </div>
              <Link href="/plan/habits" style={{ fontSize: "12px", color: "#C04878", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 500, flexShrink: 0 }}>
                all <ArrowRight size={12} />
              </Link>
            </div>

            {habits.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <p style={{ fontFamily: HW, fontSize: "19px", color: "#8A6878", marginBottom: "16px" }}>
                  no habits yet — build your first one ✍
                </p>
                <Link href="/plan/habits" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "12px", background: "linear-gradient(135deg, #FAE0EC, #F0D8F8)", color: "#C04878", textDecoration: "none", fontSize: "13px", fontWeight: 500, border: "1px solid rgba(200,100,140,0.2)" }}>
                  <Plus size={13} /> Add habit
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {habits.slice(0, 6).map((habit) => {
                  const log = habitLogs.find((l) => l.habit_id === habit.id);
                  const done = log?.completed ?? false;
                  return (
                    <div
                      key={habit.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 14px", borderRadius: "12px",
                        background: done ? "linear-gradient(135deg, #F0F8F0, #E8F4E8)" : "#FDFAFE",
                        border: `1px solid ${done ? "rgba(140,190,140,0.38)" : "rgba(200,100,140,0.1)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      {done
                        ? <CheckCircle2 size={18} color="#70A870" strokeWidth={2} />
                        : <Circle size={18} color="#D8B0C8" strokeWidth={1.5} />}
                      <span style={{ fontSize: "14px", color: done ? "#6A9870" : "#281A24", textDecoration: done ? "line-through" : "none", flex: 1, opacity: done ? 0.7 : 1 }}>
                        {habit.title}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "99px", fontWeight: 500, letterSpacing: "0.03em" }} className={getPillarColor(habit.pillar)}>
                        {getPillarLabel(habit.pillar).split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Milestones */}
        <div>
          <Card variant="cream">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <CardTitle>Milestones</CardTitle>
                <p style={{ fontFamily: HW, fontSize: "13px", color: "#B870A0", marginTop: "1px" }}>
                  the bigger picture ✦
                </p>
              </div>
              <Link href="/plan/milestones" style={{ fontSize: "12px", color: "#C04878", textDecoration: "none" }}>
                <ArrowRight size={14} />
              </Link>
            </div>
            {milestones.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontFamily: HW, fontSize: "18px", color: "#8A6878", marginBottom: "10px" }}>
                  what are you working towards?
                </p>
                <Link href="/plan/milestones" style={{ fontFamily: HW, fontSize: "16px", color: "#C04878", textDecoration: "none" }}>
                  set a goal →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {milestones.map((m) => (
                  <div key={m.id} style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(200,100,140,0.14)", boxShadow: "0 1px 4px rgba(180,60,100,0.06)" }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#281A24", marginBottom: "5px" }}>{m.title}</p>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "99px", fontWeight: 500 }} className={getPillarColor(m.pillar)}>
                      Phase {m.phase}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Nourishment */}
        <div>
          <Card>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <CardTitle>Nourishment</CardTitle>
                <p style={{ fontFamily: HW, fontSize: "13px", color: "#B870A0", marginTop: "1px" }}>
                  fed myself today?
                </p>
              </div>
              <Link href="/food/diary" style={{ fontSize: "12px", color: "#C04878", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px" }}>
                log <Plus size={12} />
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {mealTypeOrder.map((type) => {
                const logged = loggedMealTypes.has(type as FoodLog["meal_type"]);
                return (
                  <div
                    key={type}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 12px", borderRadius: "10px",
                      background: logged ? "linear-gradient(135deg, #F0F8F0, #E8F4E8)" : "#FDFAFE",
                      border: `1px solid ${logged ? "rgba(140,190,140,0.35)" : "rgba(200,100,140,0.1)"}`,
                    }}
                  >
                    {logged
                      ? <CheckCircle2 size={15} color="#70A870" strokeWidth={2} />
                      : <Circle size={15} color="#D8B0C8" strokeWidth={1.5} />}
                    <span style={{ fontSize: "13px", color: logged ? "#5A8860" : "#8A6878", textTransform: "capitalize" }}>
                      {type}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Quick Access */}
        <div>
          <Card variant="cream">
            <div style={{ marginBottom: "14px" }}>
              <CardTitle>Quick Access</CardTitle>
              <p style={{ fontFamily: HW, fontSize: "13px", color: "#B870A0", marginTop: "1px" }}>
                where do you need to be?
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 13px", borderRadius: "11px",
                      background: item.bg,
                      border: `1px solid ${item.bg}`,
                      textDecoration: "none",
                      transition: "all 0.15s",
                      boxShadow: "0 1px 4px rgba(180,60,100,0.06)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(180,60,100,0.12)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(180,60,100,0.06)"; }}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color={item.color} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#281A24", display: "block" }}>{item.label}</span>
                      <span style={{ fontFamily: HW, fontSize: "12px", color: item.color, display: "block", lineHeight: 1 }}>{item.note}</span>
                    </div>
                    <ArrowRight size={12} color={item.color} />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <Card>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <CardTitle>Pinned Notes</CardTitle>
                  <p style={{ fontFamily: HW, fontSize: "13px", color: "#B870A0", marginTop: "1px" }}>
                    things i want to remember
                  </p>
                </div>
                <Link href="/notes" style={{ fontSize: "12px", color: "#C04878", textDecoration: "none" }}>
                  <ArrowRight size={14} />
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {pinnedNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notes"
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      padding: "10px 12px", borderRadius: "11px",
                      background: "linear-gradient(135deg, #FEF0F6, #F8E8F8)",
                      border: "1px solid rgba(200,100,140,0.16)",
                      textDecoration: "none", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,100,140,0.35)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(200,100,140,0.16)")}
                  >
                    <Pin size={13} color="#C04878" strokeWidth={2} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#281A24", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.title || "Untitled note"}
                      </p>
                      <p style={{ fontFamily: HW, fontSize: "12px", color: "#8A6878", marginTop: "1px" }}>
                        {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Today's Tasks */}
        {todos.length > 0 && (
          <div>
            <Card variant="cream">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <CardTitle>On the List</CardTitle>
                  <p style={{ fontFamily: HW, fontSize: "13px", color: "#B870A0", marginTop: "1px" }}>
                    still on my mind
                  </p>
                </div>
                <Link href="/todos" style={{ fontSize: "12px", color: "#C04878", textDecoration: "none", display: "flex", alignItems: "center", gap: "3px" }}>
                  <ClipboardList size={12} /> view
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {todos.map((todo) => (
                  <div key={todo.id} style={{ display: "flex", alignItems: "flex-start", gap: "9px", padding: "8px 10px", borderRadius: "10px", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(200,100,140,0.13)" }}>
                    <Circle size={14} color="#D8B0C8" strokeWidth={1.5} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "#281A24", flex: 1, lineHeight: 1.45 }}>{todo.text}</span>
                    {todo.priority === "high" && (
                      <span style={{ fontFamily: HW, fontSize: "12px", color: "#C04878", flexShrink: 0 }}>urgent</span>
                    )}
                  </div>
                ))}
                <Link
                  href="/todos"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px", borderRadius: "10px", border: "1.5px dashed rgba(200,100,140,0.28)", textDecoration: "none", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,100,140,0.55)"; (e.currentTarget.querySelector("span") as HTMLElement).style.color = "#C04878"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,100,140,0.28)"; (e.currentTarget.querySelector("span") as HTMLElement).style.color = "#8A6878"; }}
                >
                  <Plus size={12} color="#8A6878" />
                  <span style={{ fontFamily: HW, fontSize: "14px", color: "#8A6878", transition: "color 0.15s" }}>add something</span>
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Life Pillars — slightly tilted cards for a "pinned to board" feel */}
        <div className="col-span-3" style={{ gridColumn: "span 3" }}>
          <div style={{ marginBottom: "10px", display: "flex", alignItems: "baseline", gap: "10px" }}>
            <h3 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "18px", fontWeight: 400, color: "#281A24" }}>
              Life Areas
            </h3>
            <span style={{ fontFamily: HW, fontSize: "15px", color: "#B870A0" }}>
              — how are they doing?
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "12px 4px" }}>
            {LIFE_PILLARS.map((pillar, i) => (
              <Link
                key={pillar.value}
                href={`/discipline?pillar=${pillar.value}`}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  padding: "16px 18px", borderRadius: "14px", textDecoration: "none", flexShrink: 0,
                  background: "linear-gradient(160deg, #ffffff 0%, #fff5f8 100%)",
                  border: "1px solid rgba(200,100,140,0.18)",
                  boxShadow: "0 2px 8px rgba(180,60,100,0.09), inset 0 1px 0 rgba(255,255,255,0.9)",
                  transition: "all 0.2s",
                  minWidth: "90px",
                  transform: `rotate(${PILLAR_TILTS[i % PILLAR_TILTS.length]}deg)`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "rotate(0deg) translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(180,60,100,0.18), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = `rotate(${PILLAR_TILTS[i % PILLAR_TILTS.length]}deg)`; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(180,60,100,0.09), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
              >
                <BookOpen size={14} color="#C880B8" strokeWidth={1.5} />
                <span style={{ fontFamily: HW, fontSize: "15px", fontWeight: 600, color: "#281A24", textAlign: "center", whiteSpace: "nowrap" }}>
                  {pillar.label.split(" ")[0]}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
