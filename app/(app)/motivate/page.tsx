"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Sparkles, Target, HelpCircle, MessageCircle, Sun,
  Check, Loader, ArrowRight, Plus, ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import ChibiCharacter from "@/components/features/ChibiCharacter";
import { createClient } from "@/lib/supabase/client";

type MotivateMode = "motivate" | "plan" | "why" | "talk";
type Phase = "choose" | "reflect" | "chat" | "plan" | "done";
type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

interface PlanPriority {
  text: string;
  why: string;
  firstStep: string;
  priority: "high" | "medium" | "low";
}

interface DayPlan {
  focus: string;
  whyToday: string;
  priorities: PlanPriority[];
  ifOneThing: string;
  gentleNote: string;
}

const MODES: {
  id: MotivateMode;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "motivate",
    label: "I need motivation",
    sub: "talk through the why → lock in your plan",
    icon: Sparkles,
    color: "#C0607A",
    bg: "#FEF0F3",
    border: "#F2C4CE",
  },
  {
    id: "plan",
    label: "Plan my day",
    sub: "figure out what matters → commit to it",
    icon: Sun,
    color: "#8060A8",
    bg: "#F5EDF8",
    border: "#D8C8E8",
  },
  {
    id: "why",
    label: "Why am I stuck?",
    sub: "understand what's blocking you → take action",
    icon: HelpCircle,
    color: "#508878",
    bg: "#F0F8F4",
    border: "#C8DEC8",
  },
  {
    id: "talk",
    label: "Just talk it out",
    sub: "process it → land on what you'll do",
    icon: MessageCircle,
    color: "#A07050",
    bg: "#FFF8F0",
    border: "#E8D8C8",
  },
];

const QUICK_BY_MODE: Record<MotivateMode, string[]> = {
  motivate: [
    "I know what I need to do but can't start",
    "Nothing feels worth doing today",
    "I'm procrastinating on something important",
    "I need a reason to care right now",
  ],
  plan: [
    "I have too much on my plate",
    "I don't know where to start today",
    "Help me prioritize what matters",
    "I want a realistic plan for today",
  ],
  why: [
    "I keep avoiding this one thing",
    "I don't understand why I'm dreading it",
    "Part of me wants to but part of me won't",
    "I think fear is stopping me",
  ],
  talk: [
    "Something's been weighing on me",
    "I need to process something",
    "I'm not sure what I need, I just need to talk",
    "I had a hard day and need to decompress",
  ],
};

const PRIORITY_COLORS = { high: "#FEF0F0", medium: "#FFF8F0", low: "#F5F5F5" };
const PRIORITY_TEXT = { high: "#C0607A", medium: "#A08050", low: "#9B8E8E" };

export default function MotivatePage() {
  const [phase, setPhase] = useState<Phase>("choose");
  const [mode, setMode] = useState<MotivateMode | null>(null);
  const [reflectText, setReflectText] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [sessionStartCount, setSessionStartCount] = useState(0);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const reflectRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingHistory(false); return; }
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(60);
      setMsgs((data ?? []).map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      setLoadingHistory(false);
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (phase === "reflect") setTimeout(() => reflectRef.current?.focus(), 100);
  }, [phase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streamingText, phase]);

  const sessionMsgs = msgs.slice(sessionStartCount);
  const hasTalked = sessionMsgs.some((m) => m.role === "assistant");
  const canLockIn = hasTalked && !streaming;

  async function sendToAI(text: string) {
    setStreaming(true);
    setStreamingText("");
    try {
      const res = await fetch("/api/motivate/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6);
            if (d === "[DONE]") break;
            try {
              const { text: t } = JSON.parse(d);
              full += t;
              setStreamingText(full);
            } catch { /* skip */ }
          }
        }
      }
      setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: full }]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  function pickMode(m: MotivateMode) {
    setMode(m);
    setPhase("reflect");
  }

  async function startChat(text: string) {
    setSessionStartCount(msgs.length);
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text };
    setMsgs((p) => [...p, userMsg]);
    setPhase("chat");
    await sendToAI(text);
  }

  function submitReflect() {
    if (!reflectText.trim()) return;
    startChat(reflectText.trim());
  }

  function sendQuick(text: string) {
    setReflectText(text);
    startChat(text);
  }

  async function sendFollowUp(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text };
    setMsgs((p) => [...p, userMsg]);
    await sendToAI(text);
  }

  async function buildPlan() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/motivate/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: sessionMsgs, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlan(data);
        setSelectedPriorities(new Set(data.priorities.map((_: PlanPriority, i: number) => i)));
        setPhase("plan");
      }
    } finally {
      setPlanLoading(false);
    }
  }

  async function saveToTodos() {
    if (!plan || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const toAdd = plan.priorities.filter((_, i) => selectedPriorities.has(i));
    for (const task of toAdd) {
      await supabase.from("todos").insert({
        user_id: user.id,
        text: task.text,
        priority: task.priority,
        completed: false,
      });
    }
    setSaving(false);
    setPhase("done");
  }

  function reset() {
    setPhase("choose");
    setMode(null);
    setReflectText("");
    setInput("");
    setPlan(null);
    setSelectedPriorities(new Set());
  }

  function continueChat() {
    setSessionStartCount(msgs.length);
    setPhase("chat");
    setMode("talk");
  }

  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <div className="page-padding" style={{ maxWidth: "720px", margin: "0 auto", paddingBottom: "48px" }}>

      <div style={{ padding: "32px 0 28px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <ChibiCharacter mood="happy" outfit="cozy" size={56} animate={false} />
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "32px", fontWeight: 400, color: "#3D3535", lineHeight: 1.1 }}>
            Talk It Through
          </h1>
          <p style={{ fontSize: "13px", color: "#9B8E8E", marginTop: "4px", lineHeight: 1.5 }}>
            talk it out, understand the why — then lock in a plan you&apos;re accountable for
          </p>
        </div>
        <Link
          href="/chat"
          style={{ fontSize: "12px", color: "#C0607A", textDecoration: "none", padding: "8px 14px", borderRadius: "10px", border: "1px solid #F0EBE3", background: "white", flexShrink: 0 }}
        >
          open full chat →
        </Link>
        {phase !== "choose" && phase !== "done" && (
          <button
            onClick={reset}
            style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #F0EBE3", background: "white", cursor: "pointer", fontSize: "12px", color: "#9B8E8E", fontFamily: "inherit" }}
          >
            back to menu
          </button>
        )}
      </div>

      {phase === "choose" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{
            background: "linear-gradient(135deg, #FEF0F3, #F5EDF8)",
            border: "1px solid #F2C4CE",
            borderRadius: "18px",
            padding: "18px 20px",
            marginBottom: "8px",
          }}>
            <p style={{ fontSize: "14px", color: "#5A4E4E", lineHeight: 1.7, margin: 0 }}>
              Every session follows the same arc: <strong>talk it through</strong> with Eden,
              understand <em>why</em> it matters or what&apos;s blocking you, then <strong>lock in a plan</strong> —
              real commitments that go on your to-do list.
            </p>
          </div>

          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => pickMode(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "18px 20px", borderRadius: "16px",
                  border: `1.5px solid ${m.border}`, background: m.bg,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(180,150,140,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: "white", border: `1px solid ${m.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={20} color={m.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", margin: "0 0 3px" }}>{m.label}</p>
                  <p style={{ fontSize: "12.5px", color: "#9B8E8E", margin: 0 }}>{m.sub}</p>
                </div>
                <ArrowRight size={16} color={m.color} style={{ flexShrink: 0, opacity: 0.6 }} />
              </button>
            );
          })}

          {!loadingHistory && msgs.length > 0 && (
            <button
              onClick={continueChat}
              style={{
                marginTop: "8px", padding: "14px 20px", borderRadius: "14px", width: "100%",
                border: "1.5px solid #EDE5E5", background: "white", cursor: "pointer",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#3D3535", margin: "0 0 3px" }}>
                Continue your conversation
              </p>
              <p style={{ fontSize: "12px", color: "#9B8E8E", margin: 0 }}>
                {msgs.length} messages with Eden — pick up and lock in your plan
              </p>
            </button>
          )}
        </div>
      )}

      {phase === "reflect" && currentMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => setPhase("choose")}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#B5A8A8", fontFamily: "inherit", padding: 0, alignSelf: "flex-start" }}
          >
            <ChevronLeft size={14} /> change mode
          </button>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "8px 14px", borderRadius: "99px",
            background: currentMode.bg, border: `1px solid ${currentMode.border}`,
            alignSelf: "flex-start",
          }}>
            <currentMode.icon size={14} color={currentMode.color} />
            <span style={{ fontSize: "12.5px", fontWeight: 500, color: currentMode.color }}>{currentMode.label}</span>
          </div>

          <div style={{
            background: "white", border: "1px solid #EDE8E4", borderRadius: "18px", padding: "22px 24px",
          }}>
            <p style={{ fontSize: "14px", color: "#5A4E4E", lineHeight: 1.7, margin: "0 0 16px" }}>
              {mode === "motivate" && "What's feeling hard to start? Talk it through with Eden — you'll end by locking in what you're committing to today."}
              {mode === "plan" && "What's on your mind for today? Dump everything — you'll turn it into a plan you're accountable for."}
              {mode === "why" && "What are you stuck on? Understand the why first — then decide what you'll actually do about it."}
              {mode === "talk" && "What's going on? Say it however it comes out — every session ends with a plan."}
            </p>

            <textarea
              ref={reflectRef}
              value={reflectText}
              onChange={(e) => setReflectText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitReflect(); }}
              placeholder={
                mode === "motivate" ? "I need to do X but I keep avoiding it because…"
                : mode === "plan" ? "Today I need to… / I'm worried about… / I keep putting off…"
                : mode === "why" ? "I keep avoiding… / Every time I think about it I feel…"
                : "What's on my mind is… / I've been feeling… / Something happened and…"
              }
              rows={5}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "14px",
                border: "1.5px solid #EDE5E5", background: "#FDFBFB",
                fontSize: "14px", color: "#3D3535", resize: "none",
                outline: "none", lineHeight: 1.65, fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />

            <button
              onClick={submitReflect}
              disabled={!reflectText.trim()}
              style={{
                marginTop: "14px", padding: "13px 24px", borderRadius: "14px", width: "100%",
                background: reflectText.trim() ? "linear-gradient(135deg, #F2C4CE, #C8B8D8)" : "#F0EBE3",
                border: "none", cursor: reflectText.trim() ? "pointer" : "not-allowed",
                color: reflectText.trim() ? "#3D3535" : "#9B8E8E",
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
              }}
            >
              Talk to Eden →
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
            <span style={{ fontSize: "11px", color: "#C4B8B8", letterSpacing: "0.06em" }}>OR PICK ONE</span>
            <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {QUICK_BY_MODE[mode!].map((q) => (
              <button
                key={q}
                onClick={() => sendQuick(q)}
                style={{
                  padding: "9px 16px", borderRadius: "99px",
                  border: "1px solid #EDE5F5", background: "#F7F3FC",
                  color: "#7B6BAF", fontSize: "13px", cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE5F5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#F7F3FC"; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "chat" && (
        <div style={{
          display: "flex", flexDirection: "column",
          background: "white", border: "1px solid #EDE8E4", borderRadius: "20px",
          overflow: "hidden", minHeight: "480px",
        }}>
          {currentMode && (
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #F0EBE3",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
              background: currentMode.bg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <currentMode.icon size={15} color={currentMode.color} />
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: currentMode.color }}>{currentMode.label}</span>
              </div>
              <span style={{ fontSize: "11px", color: "#9B8E8E" }}>ends with your plan →</span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "320px" }}>
            {loadingHistory && (
              <p style={{ fontSize: "13px", color: "#9B8E8E", textAlign: "center", padding: "20px 0" }}>loading conversation…</p>
            )}
            {msgs.map((msg, i) => {
              const isBeforeSession = i < sessionStartCount;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", opacity: isBeforeSession ? 0.55 : 1 }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)",
                      flexShrink: 0, marginRight: "10px", marginTop: "2px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Sparkles size={12} color="white" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: "80%",
                    padding: msg.role === "user" ? "11px 15px" : "13px 17px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "#3D3535" : "#FAFAF9",
                    color: msg.role === "user" ? "white" : "#3D3535",
                    fontSize: "14px", lineHeight: 1.65,
                    border: msg.role === "assistant" ? "1px solid #F0EBE3" : "none",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {streaming && streamingText && (
              <div style={{ display: "flex" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
                <div style={{ maxWidth: "80%", padding: "13px 17px", borderRadius: "4px 16px 16px 16px", background: "#FAFAF9", fontSize: "14px", lineHeight: 1.65, border: "1px solid #F0EBE3", whiteSpace: "pre-wrap" }}>
                  {streamingText}
                  <span style={{ display: "inline-block", width: "2px", height: "14px", background: "#F2C4CE", marginLeft: "2px", animation: "blink 1s ease-in-out infinite", verticalAlign: "middle" }} />
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div style={{ display: "flex", gap: "5px", paddingLeft: "38px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#F2C4CE", animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 22px 0", borderTop: "1px solid #F0EBE3" }}>
            <button
              onClick={buildPlan}
              disabled={!canLockIn || planLoading}
              style={{
                width: "100%", padding: "13px 18px", borderRadius: "12px", marginBottom: "12px",
                background: canLockIn ? "linear-gradient(135deg, #F2C4CE, #C8B8D8)" : "#F0EBE3",
                border: "none", cursor: canLockIn && !planLoading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                fontSize: "14px", fontWeight: 600, color: canLockIn ? "#3D3535" : "#9B8E8E", fontFamily: "inherit",
              }}
            >
              {planLoading ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> building your plan…</>
                : <><Target size={15} /> lock in my plan →</>}
            </button>
          </div>

          <div style={{ padding: "0 22px 20px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFollowUp(input); } }}
                placeholder="Keep talking…"
                rows={1}
                style={{
                  flex: 1, padding: "11px 15px", borderRadius: "14px",
                  border: "1.5px solid #EDE5E5", background: "white",
                  fontSize: "13.5px", color: "#3D3535", resize: "none",
                  outline: "none", lineHeight: 1.5, fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
              />
              <button
                onClick={() => sendFollowUp(input)}
                disabled={!input.trim() || streaming}
                style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: input.trim() && !streaming ? "#3D3535" : "#F0EBE3",
                  border: "none", cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <Send size={15} color={input.trim() && !streaming ? "white" : "#9B8E8E"} />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "plan" && plan && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "linear-gradient(135deg, #F5EDF8, #FEF0F3)",
            border: "1px solid #D8C8E8", borderRadius: "18px", padding: "22px 24px",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8060A8", margin: "0 0 8px" }}>
              your plan for today
            </p>
            <p style={{ fontSize: "18px", fontFamily: "var(--font-cormorant), Georgia, serif", color: "#3D3535", margin: "0 0 12px", lineHeight: 1.3 }}>
              {plan.focus}
            </p>
            {plan.whyToday && (
              <p style={{ fontSize: "13.5px", color: "#6A5A5A", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                {plan.whyToday}
              </p>
            )}
          </div>

          {plan.ifOneThing && (
            <div style={{
              padding: "16px 18px", borderRadius: "14px",
              background: "#FAF0F2", border: "1px solid #F2C4CE",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C0607A", margin: "0 0 6px" }}>
                if you only do one thing
              </p>
              <p style={{ fontSize: "14px", color: "#3D3535", margin: 0, lineHeight: 1.6 }}>{plan.ifOneThing}</p>
            </div>
          )}

          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#3D3535", margin: "0 0 4px" }}>
              What you&apos;re committing to
            </p>
            <p style={{ fontSize: "12px", color: "#9B8E8E", margin: "0 0 12px" }}>
              Tap to include on your to-do list — this is your accountability
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {plan.priorities.map((task, i) => {
                const selected = selectedPriorities.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedPriorities((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                    style={{
                      padding: "16px 18px", borderRadius: "14px", textAlign: "left",
                      border: `1.5px solid ${selected ? "#C8B8D8" : "#EDE5E5"}`,
                      background: selected ? "#F7F3FC" : "white",
                      cursor: "pointer", fontFamily: "inherit", width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0, marginTop: "1px",
                        background: selected ? "linear-gradient(135deg, #F2C4CE, #C8B8D8)" : "white",
                        border: `1.5px solid ${selected ? "transparent" : "#E0D8D8"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <Check size={13} color="white" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#3D3535" }}>{task.text}</span>
                          <span style={{
                            fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                            padding: "2px 8px", borderRadius: "99px",
                            background: PRIORITY_COLORS[task.priority], color: PRIORITY_TEXT[task.priority],
                          }}>
                            {task.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: "12.5px", color: "#7A6A6A", margin: "0 0 6px", lineHeight: 1.5, fontStyle: "italic" }}>
                          why: {task.why}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9B8E8E", margin: 0 }}>
                          first step → <strong style={{ color: "#5A4E4E", fontWeight: 500 }}>{task.firstStep}</strong>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {plan.gentleNote && (
            <p style={{ fontSize: "13px", color: "#9B8E8E", fontStyle: "italic", textAlign: "center", margin: "4px 0" }}>
              {plan.gentleNote}
            </p>
          )}

          <button
            onClick={saveToTodos}
            disabled={selectedPriorities.size === 0 || saving}
            style={{
              padding: "14px 24px", borderRadius: "14px", width: "100%",
              background: selectedPriorities.size > 0 ? "linear-gradient(135deg, #F2C4CE, #C8B8D8)" : "#F0EBE3",
              border: "none", cursor: selectedPriorities.size > 0 && !saving ? "pointer" : "not-allowed",
              color: selectedPriorities.size > 0 ? "#3D3535" : "#9B8E8E",
              fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {saving ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> saving…</>
              : <><Plus size={15} /> commit {selectedPriorities.size} to my to-do list</>}
          </button>

          <button
            onClick={() => setPhase("chat")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#B5A8A8", fontFamily: "inherit", padding: "4px 0" }}
          >
            ← keep talking first
          </button>
        </div>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <ChibiCharacter mood="thriving" outfit="cozy" size={80} animate />
          </div>
          <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#3D3535", margin: "0 0 10px" }}>
            plan locked in
          </h2>
          <p style={{ fontSize: "14px", color: "#9B8E8E", margin: "0 0 28px", lineHeight: 1.6 }}>
            Your commitments are on your to-do list. You talked it through, you know the why — now just one step at a time.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/todos" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "12px 22px", borderRadius: "14px",
              background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)",
              color: "#3D3535", textDecoration: "none", fontSize: "14px", fontWeight: 600,
            }}>
              go to to-do list <ArrowRight size={14} />
            </Link>
            <Link href="/focus" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "12px 22px", borderRadius: "14px",
              background: "white", border: "1px solid #EDE5E5",
              color: "#5A4E4E", textDecoration: "none", fontSize: "14px", fontWeight: 500,
            }}>
              start focus timer
            </Link>
          </div>
          <button
            onClick={reset}
            style={{ marginTop: "20px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#B5A8A8", fontFamily: "inherit" }}
          >
            start another session
          </button>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
