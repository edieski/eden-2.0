"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Shuffle, Sparkles, ChevronDown, ChevronRight, Heart, Rocket, X, Send, Brain, Check, ChevronLeft, PlayCircle } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import ChibiCharacter from "@/components/features/ChibiCharacter";
import SpinWheelModal from "@/components/ui/SpinWheelModal";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
  parent_id: string | null;
}

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

// ─── I'm Struggling Panel ────────────────────────────────────────────────────
function StrugglingPanel({ onClose, tasks }: { onClose: () => void; tasks: Todo[] }) {
  const activeTasks = tasks.filter((t) => !t.completed && !t.parent_id);
  const [phase, setPhase] = useState<"pick" | "write" | "chat">("pick");
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [dumpText, setDumpText] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const dumpRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === "write") setTimeout(() => dumpRef.current?.focus(), 100);
  }, [phase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streamingText]);

  const QUICK = [
    "I can't start anything",
    "Everything feels like too much",
    "I'm spiraling in my head",
    "I feel paralyzed",
    "I don't even know what's wrong",
    "I'm exhausted and overwhelmed",
  ];

  async function sendToAI(text: string, history: ChatMsg[] = []) {
    setStreaming(true);
    setStreamingText("");
    try {
      const context = history.length > 0
        ? history.map((m) => `${m.role === "user" ? "Me" : "Eden"}: ${m.content}`).join("\n\n") + `\n\nMe: ${text}`
        : text;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: context }),
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
            try { const { text: t } = JSON.parse(d); full += t; setStreamingText(full); } catch { /* skip */ }
          }
        }
      }
      setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: full }]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  async function submitDump() {
    if (!dumpText.trim()) return;
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: dumpText.trim() };
    setMsgs([userMsg]);
    setPhase("chat");
    const taskContext = selectedTask
      ? `The specific task I'm struggling with is: "${selectedTask.text}" (priority: ${selectedTask.priority}).\n\n`
      : "";
    const prompt = `I'm struggling right now. ${taskContext}Here's what's going on:\n\n"${dumpText.trim()}"\n\nCan you help me understand what I'm feeling and figure out what to do?`;
    await sendToAI(prompt);
  }

  async function sendQuick(text: string) {
    const taskContext = selectedTask
      ? `I'm struggling with the task "${selectedTask.text}". ${text}`
      : text;
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text };
    setMsgs([userMsg]);
    setPhase("chat");
    await sendToAI(taskContext);
  }

  async function sendFollowUp(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text };
    setMsgs((p) => [...p, userMsg]);
    await sendToAI(text, msgs);
  }

  function pickTask(task: Todo | null) {
    setSelectedTask(task);
    setPhase("write");
  }

  const subHeaderText =
    phase === "pick" ? "Which task is making things hard right now?" :
    phase === "write" ? "Let it all out — no filter needed" :
    "Let\u2019s figure this out together";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(61,53,53,0.22)", backdropFilter: "blur(2px)", zIndex: 50 }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "white", borderRadius: "28px 28px 0 0",
        boxShadow: "0 -8px 40px rgba(180,150,140,0.18)",
        zIndex: 51, display: "flex", flexDirection: "column",
        maxHeight: "78vh", animation: "slide-up 0.35s ease-out",
      }}>
        {/* Drag handle + header */}
        <div style={{ padding: "16px 24px 14px", borderBottom: "1px solid #F0EBE3", flexShrink: 0 }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#EDE5E5", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <ChibiCharacter mood="sad" outfit="default" size={46} animate={false} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#3D3535" }}>
                I&apos;m here with you
              </p>
              <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "1px" }}>
                {subHeaderText}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: "6px", border: "1px solid #F0EBE3", borderRadius: "10px", background: "white", cursor: "pointer", display: "flex" }}
            >
              <X size={15} color="#9B8E8E" />
            </button>
          </div>
        </div>

        {/* Phase: pick a task */}
        {phase === "pick" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "linear-gradient(135deg, #FEF0F3, #F5EDF8)", border: "1px solid #F2C4CE", borderRadius: "16px", padding: "14px 16px" }}>
              <p style={{ fontSize: "13.5px", color: "#5A4E4E", lineHeight: 1.65, margin: 0 }}>
                Is there a specific task that&apos;s weighing on you? Picking it helps Eden understand what&apos;s going on.
              </p>
            </div>

            {activeTasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activeTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => pickTask(task)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 16px", borderRadius: "14px",
                      border: "1.5px solid #EDE5E5", background: "white",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      transition: "all 0.15s", width: "100%",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.background = "#FEF6F8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EDE5E5"; e.currentTarget.style.background = "white"; }}
                  >
                    <span style={{
                      fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: "99px", flexShrink: 0,
                      background: PRIORITY_COLORS[task.priority], color: PRIORITY_TEXT[task.priority],
                    }}>
                      {task.priority}
                    </span>
                    <span style={{ flex: 1, fontSize: "13.5px", color: "#3D3535" }}>{task.text}</span>
                    <Heart size={13} color="#E0B0C0" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
              <span style={{ fontSize: "11px", color: "#C4B8B8", letterSpacing: "0.06em" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
            </div>

            <button
              onClick={() => pickTask(null)}
              style={{
                padding: "12px 16px", borderRadius: "14px",
                border: "1.5px dashed #E0D8D8", background: "transparent",
                color: "#9B8E8E", fontSize: "13.5px", cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B8B8"; e.currentTarget.style.color = "#5A4E4E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#9B8E8E"; }}
            >
              It&apos;s not about a specific task — just struggling generally
            </button>
          </div>
        )}

        {/* Phase: write it out */}
        {phase === "write" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {selectedTask && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", background: "#FAE8EC", border: "1px solid #F2C4CE" }}>
                <Heart size={13} color="#C0607A" fill="#C0607A" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: "13px", color: "#5A3040", fontWeight: 500 }}>
                  Struggling with: <em>{selectedTask.text}</em>
                </span>
                <button
                  onClick={() => setPhase("pick")}
                  style={{ fontSize: "11px", color: "#C0607A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
                >
                  change
                </button>
              </div>
            )}

            <div style={{
              background: "linear-gradient(135deg, #FEF0F3, #F5EDF8)",
              border: "1px solid #F2C4CE",
              borderRadius: "16px",
              padding: "16px 18px",
            }}>
              <p style={{ fontSize: "14px", color: "#5A4E4E", lineHeight: 1.7, margin: 0 }}>
                Something is feeling hard right now, and that&apos;s completely okay. You don&apos;t need to have it figured out.
                <br /><br />
                <strong style={{ fontWeight: 600 }}>Write what&apos;s going on</strong> — as messy or scattered as it is. Eden will read it and help you make sense of it.
              </p>
            </div>

            <textarea
              ref={dumpRef}
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitDump(); }}
              placeholder="I'm struggling because… / I feel… / Everything feels… / I can't seem to…"
              rows={5}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "16px",
                border: "1.5px solid #EDE5E5", background: "#FDFBFB",
                fontSize: "14px", color: "#3D3535", resize: "none",
                outline: "none", lineHeight: 1.65, fontFamily: "inherit",
                transition: "border-color 0.2s", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />

            <button
              onClick={submitDump}
              disabled={!dumpText.trim()}
              style={{
                padding: "13px 24px", borderRadius: "14px",
                background: dumpText.trim() ? "linear-gradient(135deg, #F2C4CE, #C8B8D8)" : "#F0EBE3",
                border: "none", cursor: dumpText.trim() ? "pointer" : "not-allowed",
                color: dumpText.trim() ? "#3D3535" : "#9B8E8E",
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              Talk to Eden about this →
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
              <span style={{ fontSize: "11px", color: "#C4B8B8", letterSpacing: "0.06em" }}>OR CHOOSE A FEELING</span>
              <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuick(q)}
                  style={{
                    padding: "8px 16px", borderRadius: "99px",
                    border: "1px solid #EDE5F5", background: "#F7F3FC",
                    color: "#7B6BAF", fontSize: "13px", cursor: "pointer",
                    transition: "all 0.15s", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE5F5"; e.currentTarget.style.borderColor = "#C8B8D8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#F7F3FC"; e.currentTarget.style.borderColor = "#EDE5F5"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase: chat */}
        {phase === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {msgs.map((msg) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)",
                      flexShrink: 0, marginRight: "10px", marginTop: "2px",
                    }} />
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: msg.role === "user" ? "10px 14px" : "12px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "#3D3535" : "white",
                    color: msg.role === "user" ? "white" : "#3D3535",
                    fontSize: "13.5px", lineHeight: 1.65,
                    border: msg.role === "assistant" ? "1px solid #F0EBE3" : "none",
                    boxShadow: msg.role === "assistant" ? "0 2px 10px rgba(180,150,140,0.07)" : "none",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {streaming && streamingText && (
                <div style={{ display: "flex" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #F2C4CE, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
                  <div style={{ maxWidth: "78%", padding: "12px 16px", borderRadius: "4px 16px 16px 16px", background: "white", color: "#3D3535", fontSize: "13.5px", lineHeight: 1.65, border: "1px solid #F0EBE3", whiteSpace: "pre-wrap" }}>
                    {streamingText}
                    <span style={{ display: "inline-block", width: "2px", height: "13px", background: "#F2C4CE", marginLeft: "2px", animation: "pop 1s ease-in-out infinite", verticalAlign: "middle" }} />
                  </div>
                </div>
              )}

              {streaming && !streamingText && (
                <div style={{ display: "flex", gap: "5px", paddingLeft: "36px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#F2C4CE", animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "12px 24px 24px", borderTop: "1px solid #F0EBE3", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFollowUp(input); } }}
                  placeholder="Keep going… Eden is listening"
                  rows={1}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: "14px",
                    border: "1.5px solid #EDE5E5", background: "white",
                    fontSize: "13px", color: "#3D3535", resize: "none",
                    outline: "none", lineHeight: 1.5, fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
                  onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
                />
                <button
                  onClick={() => sendFollowUp(input)}
                  disabled={!input.trim() || streaming}
                  style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    background: input.trim() && !streaming ? "#3D3535" : "#F0EBE3",
                    border: "none", cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.15s",
                  }}
                >
                  <Send size={15} color={input.trim() && !streaming ? "white" : "#9B8E8E"} />
                </button>
              </div>
              <button
                onClick={() => { setPhase("pick"); setMsgs([]); setDumpText(""); setStreamingText(""); setSelectedTask(null); }}
                style={{ marginTop: "8px", fontSize: "11.5px", color: "#B5A8A8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              >
                ← Start over
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Brain Dump / Overwhelm Triage Panel ────────────────────────────────────

interface TriageTask {
  text: string;
  bucket: "today" | "this-week" | "someday";
  priority: "high" | "medium" | "low";
  note: string;
}

interface TriageResult {
  framing: string;
  tasks: TriageTask[];
  realTalk: string;
}

const GUIDED_QUESTIONS = [
  { id: "top", q: "what's taking up the most space in your head right now?", hint: "the thing you keep coming back to" },
  { id: "work", q: "anything work, school, or money related that's stressing you?", hint: "emails, deadlines, tasks you've been avoiding" },
  { id: "personal", q: "anything personal? relationships, home, health, people you owe a reply to?", hint: "or just say 'nothing' if it's clear" },
  { id: "avoiding", q: "what have you been putting off for way too long?", hint: "the thing you close your eyes and skip past" },
  { id: "deadlines", q: "is there anything with an actual deadline coming up?", hint: "something where there are real consequences if you miss it" },
  { id: "misc", q: "anything else rattling around? even small stuff.", hint: "sometimes it's the small things that clog everything up" },
];

function BrainDumpPanel({ onClose, onAddTasks }: {
  onClose: () => void;
  onAddTasks: (tasks: { text: string; priority: "high" | "medium" | "low" }[]) => void;
}) {
  const [phase, setPhase] = useState<"choose" | "dump" | "guided" | "loading" | "result">("choose");
  const [dump, setDump] = useState("");
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === "dump") setTimeout(() => textareaRef.current?.focus(), 100);
    if (phase === "guided") setTimeout(() => answerRef.current?.focus(), 100);
  }, [phase]);

  useEffect(() => {
    if (phase === "guided") setTimeout(() => answerRef.current?.focus(), 80);
  }, [guidedStep]);

  function submitGuidedAnswer() {
    const answer = currentAnswer.trim() || "nothing";
    const updated = [...guidedAnswers, answer];
    setGuidedAnswers(updated);
    setCurrentAnswer("");
    if (guidedStep < GUIDED_QUESTIONS.length - 1) {
      setGuidedStep((s) => s + 1);
    } else {
      // Build the dump from guided answers
      const combined = GUIDED_QUESTIONS.map((q, i) =>
        updated[i] && updated[i] !== "nothing" ? updated[i] : null
      ).filter(Boolean).join("\n");
      setDump(combined);
      runTriage(combined);
    }
  }

  async function runTriage(text: string) {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/todos/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dump: text }),
      });
      if (!res.ok) throw new Error();
      const data: TriageResult = await res.json();
      setResult(data);
      setSelected(new Set(data.tasks.map((_, i) => i)));
      setPhase("result");
    } catch {
      setError("Something went wrong — try again.");
      setPhase("choose");
    }
  }

  async function triage() {
    if (!dump.trim()) return;
    await runTriage(dump.trim());
  }

  function toggleTask(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function addSelected() {
    if (!result) return;
    const toAdd = [...selected].map((i) => ({
      text: result.tasks[i].text,
      priority: result.tasks[i].priority,
    }));
    onAddTasks(toAdd);
    onClose();
  }

  const BUCKET_LABELS: Record<string, string> = {
    today: "Do today",
    "this-week": "This week",
    someday: "Someday",
  };
  const BUCKET_COLORS: Record<string, string> = {
    today: "#FAE8EC",
    "this-week": "#EDE5F5",
    someday: "#E8F0E8",
  };
  const BUCKET_TEXT: Record<string, string> = {
    today: "#C0607A",
    "this-week": "#7B5FA8",
    someday: "#4A6847",
  };
  const BUCKET_ORDER = ["today", "this-week", "someday"];

  const grouped = result
    ? BUCKET_ORDER.map((b) => ({
        bucket: b,
        tasks: result.tasks.map((t, i) => ({ ...t, index: i })).filter((t) => t.bucket === b),
      })).filter((g) => g.tasks.length > 0)
    : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,53,53,0.25)", backdropFilter: "blur(3px)", zIndex: 50 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "white", borderRadius: "28px 28px 0 0",
          boxShadow: "0 -8px 40px rgba(180,150,140,0.18)",
          zIndex: 51, display: "flex", flexDirection: "column",
          maxHeight: "84vh", animation: "slide-up 0.35s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 24px 14px", borderBottom: "1px solid #F0EBE3", flexShrink: 0 }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#EDE5E5", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #EDE5F5, #D4CAEA)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={20} color="#7B5FA8" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#3D3535" }}>
                {phase === "choose" ? "Everything feels like too much" :
                 phase === "dump" ? "Brain dump" :
                 phase === "guided" ? `question ${guidedStep + 1} of ${GUIDED_QUESTIONS.length}` :
                 phase === "loading" ? "Reading it…" :
                 "Here's what's actually going on"}
              </p>
              <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "1px" }}>
                {phase === "choose" ? "how do you want to do this?" :
                 phase === "dump" ? "get it all out — Eden will help you sort it" :
                 phase === "guided" ? "answer as much or as little as you want" :
                 phase === "loading" ? "untangling the pile" :
                 `${result?.tasks.length ?? 0} tasks sorted — tap to deselect any`}
              </p>
            </div>
            <button onClick={onClose} style={{ padding: "6px", border: "1px solid #F0EBE3", borderRadius: "10px", background: "white", cursor: "pointer", display: "flex", flexShrink: 0 }}>
              <X size={15} color="#9B8E8E" />
            </button>
          </div>
        </div>

        {/* Phase: choose */}
        {phase === "choose" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "14px", color: "#7A6A6A", lineHeight: 1.65, marginBottom: "8px" }}>
              okay so — do you want to dump it all at once, or does that feel like too much right now?
            </p>

            <button
              onClick={() => setPhase("dump")}
              style={{
                display: "flex", alignItems: "flex-start", gap: "16px",
                padding: "18px 20px", borderRadius: "16px", textAlign: "left",
                border: "1.5px solid #DDD0F0", background: "linear-gradient(135deg, #F3EEF9, #EDE5F5)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8B8D8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#DDD0F0"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontSize: "24px", flexShrink: 0 }}>✍️</span>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", margin: "0 0 4px" }}>write it all out</p>
                <p style={{ fontSize: "13px", color: "#7A6A6A", margin: 0, lineHeight: 1.5 }}>one big text box — dump everything and let Eden sort it</p>
              </div>
            </button>

            <button
              onClick={() => setPhase("guided")}
              style={{
                display: "flex", alignItems: "flex-start", gap: "16px",
                padding: "18px 20px", borderRadius: "16px", textAlign: "left",
                border: "1.5px solid #F2C4CE", background: "linear-gradient(135deg, #FEF0F3, #F9EBF0)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#E8A8B8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontSize: "24px", flexShrink: 0 }}>💬</span>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", margin: "0 0 4px" }}>take me through it step by step</p>
                <p style={{ fontSize: "13px", color: "#7A6A6A", margin: 0, lineHeight: 1.5 }}>Eden asks one question at a time — good for when even starting feels impossible</p>
              </div>
            </button>
          </div>
        )}

        {/* Phase: guided */}
        {phase === "guided" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              {GUIDED_QUESTIONS.map((_, i) => (
                <div key={i} style={{
                  height: "4px", flex: 1, borderRadius: "99px",
                  background: i < guidedStep ? "#C0607A" : i === guidedStep ? "#F2C4CE" : "#F0EBE3",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>

            {/* Previous answers */}
            {guidedAnswers.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {guidedAnswers.map((ans, i) => (
                  ans !== "nothing" && (
                    <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", opacity: 0.55 }}>
                      <span style={{ fontSize: "11px", color: "#9B8E8E", paddingTop: "2px", flexShrink: 0, fontWeight: 600 }}>
                        {i + 1}.
                      </span>
                      <p style={{ fontSize: "13px", color: "#5A4E4E", margin: 0, lineHeight: 1.5 }}>{ans}</p>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Current question */}
            <div style={{ background: "linear-gradient(135deg, #FEF0F3, #F9EBF0)", border: "1px solid #F2C4CE", borderRadius: "16px", padding: "16px 18px" }}>
              <p style={{ fontSize: "15px", color: "#3D3535", fontWeight: 500, margin: "0 0 6px", lineHeight: 1.5 }}>
                {GUIDED_QUESTIONS[guidedStep].q}
              </p>
              <p style={{ fontSize: "12px", color: "#B5A8A8", margin: 0, fontStyle: "italic" }}>
                {GUIDED_QUESTIONS[guidedStep].hint}
              </p>
            </div>

            <textarea
              ref={answerRef}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitGuidedAnswer(); } }}
              placeholder="type anything — or just press enter to skip"
              rows={3}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "14px",
                border: "1.5px solid #EDE5E5", background: "#FDFBFB",
                fontSize: "14px", color: "#3D3535", resize: "none",
                outline: "none", lineHeight: 1.65, fontFamily: "inherit",
                boxSizing: "border-box", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={submitGuidedAnswer}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: "14px",
                  background: currentAnswer.trim()
                    ? "linear-gradient(135deg, #F2C4CE, #EAB8C8)"
                    : "#F0EBE3",
                  border: "none", cursor: "pointer",
                  color: currentAnswer.trim() ? "#3D3535" : "#9B8E8E",
                  fontSize: "14px", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {guidedStep < GUIDED_QUESTIONS.length - 1
                  ? currentAnswer.trim() ? "next →" : "skip →"
                  : currentAnswer.trim() ? "done, sort it out →" : "that's everything →"}
              </button>
              {guidedStep > 0 && (
                <button
                  onClick={() => { setGuidedStep((s) => s - 1); setGuidedAnswers((a) => a.slice(0, -1)); }}
                  style={{ padding: "12px 16px", borderRadius: "14px", border: "1.5px solid #EDE5E5", background: "white", cursor: "pointer", fontSize: "13px", color: "#9B8E8E", fontFamily: "inherit" }}
                >
                  ← back
                </button>
              )}
            </div>

            <button
              onClick={() => { setPhase("choose"); setGuidedStep(0); setGuidedAnswers([]); setCurrentAnswer(""); }}
              style={{ fontSize: "12px", color: "#C4B8B8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "left" }}
            >
              ← write it all out instead
            </button>
          </div>
        )}

        {/* Phase: dump */}
        {phase === "dump" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "linear-gradient(135deg, #F3EEF9, #EDE5F5)", border: "1px solid #DDD0F0", borderRadius: "16px", padding: "14px 16px" }}>
              <p style={{ fontSize: "13.5px", color: "#5A4E4E", lineHeight: 1.65, margin: 0 }}>
                dump everything that&apos;s in your head — tasks, worries, things you&apos;ve been avoiding, stuff you&apos;re supposed to do. all of it. even the embarrassing ones.
              </p>
            </div>

            <textarea
              ref={textareaRef}
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) triage(); }}
              placeholder={"reply to Sarah's email, finish the report that's been sitting there for 3 weeks, call the doctor, clean the kitchen, figure out my finances, I haven't responded to my mum in 4 days, the laundry, I need to figure out what I'm doing with my life…"}
              rows={7}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "16px",
                border: "1.5px solid #EDE5E5", background: "#FDFBFB",
                fontSize: "14px", color: "#3D3535", resize: "none",
                outline: "none", lineHeight: 1.7, fontFamily: "inherit",
                boxSizing: "border-box", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#DDD0F0")}
              onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
            />

            {error && <p style={{ fontSize: "13px", color: "#C0607A" }}>{error}</p>}

            <button
              onClick={triage}
              disabled={!dump.trim()}
              style={{
                padding: "13px 24px", borderRadius: "14px",
                background: dump.trim() ? "linear-gradient(135deg, #DDD0F0, #C8B8D8)" : "#F0EBE3",
                border: "none", cursor: dump.trim() ? "pointer" : "not-allowed",
                color: dump.trim() ? "#3D3535" : "#9B8E8E",
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              help me sort this out →
            </button>

            <button
              onClick={() => setPhase("choose")}
              style={{ fontSize: "12px", color: "#C4B8B8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "left" }}
            >
              ← too much? take me through it step by step instead
            </button>
          </div>
        )}

        {/* Phase: loading */}
        {phase === "loading" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "40px" }}>
            <div style={{ display: "flex", gap: "7px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#C8B8D8", animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <p style={{ fontSize: "14px", color: "#9B8E8E", textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
              reading it all, figuring out what&apos;s actually urgent vs what anxiety is making feel urgent
            </p>
          </div>
        )}

        {/* Phase: result */}
        {phase === "result" && result && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
              {/* Framing */}
              <div style={{ background: "#F3EEF9", border: "1px solid #DDD0F0", borderRadius: "14px", padding: "14px 16px", marginBottom: "18px" }}>
                <p style={{ fontSize: "14px", color: "#5A4E4E", lineHeight: 1.65, margin: 0 }}>{result.framing}</p>
              </div>

              {/* Bucketed tasks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {grouped.map(({ bucket, tasks }) => (
                  <div key={bucket}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: BUCKET_TEXT[bucket], marginBottom: "8px" }}>
                      {BUCKET_LABELS[bucket]}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {tasks.map((task) => {
                        const isSelected = selected.has(task.index);
                        return (
                          <div
                            key={task.index}
                            onClick={() => toggleTask(task.index)}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: "12px",
                              padding: "12px 14px", borderRadius: "14px", cursor: "pointer",
                              border: `1.5px solid ${isSelected ? BUCKET_COLORS[bucket] : "#F0EBE3"}`,
                              background: isSelected ? BUCKET_COLORS[bucket] : "white",
                              opacity: isSelected ? 1 : 0.45,
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                              border: `1.5px solid ${isSelected ? BUCKET_TEXT[bucket] : "#C4B8B8"}`,
                              background: isSelected ? BUCKET_TEXT[bucket] : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}>
                              {isSelected && <Check size={11} color="white" strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: "14px", color: "#3D3535", fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{task.text}</p>
                              {task.note && (
                                <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "4px", fontStyle: "italic", lineHeight: 1.5 }}>{task.note}</p>
                              )}
                            </div>
                            <span style={{
                              fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                              padding: "3px 7px", borderRadius: "99px", flexShrink: 0, marginTop: 2,
                              background: PRIORITY_COLORS[task.priority], color: PRIORITY_TEXT[task.priority],
                            }}>
                              {task.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Real talk */}
              {result.realTalk && (
                <div style={{ marginTop: "18px", padding: "12px 16px", borderRadius: "12px", background: "#F8F8F8", border: "1px solid #EDE5E5" }}>
                  <p style={{ fontSize: "13px", color: "#7A6A6A", fontStyle: "italic", margin: 0, lineHeight: 1.6 }}>
                    &ldquo;{result.realTalk}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px 28px", borderTop: "1px solid #F0EBE3", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={addSelected}
                  disabled={selected.size === 0}
                  style={{
                    flex: 1, padding: "13px 20px", borderRadius: "14px",
                    background: selected.size > 0 ? "linear-gradient(135deg, #DDD0F0, #C8B8D8)" : "#F0EBE3",
                    border: "none", cursor: selected.size > 0 ? "pointer" : "not-allowed",
                    color: selected.size > 0 ? "#3D3535" : "#9B8E8E",
                    fontSize: "14px", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                  }}
                >
                  add {selected.size} task{selected.size !== 1 ? "s" : ""} to my list →
                </button>
                <button
                  onClick={() => { setPhase("dump"); setResult(null); setSelected(new Set()); }}
                  style={{ fontSize: "12px", color: "#9B8E8E", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px" }}
                >
                  redo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Task Launch Panel ───────────────────────────────────────────────────────
function TaskLaunchPanel({ tasks, onClose }: { tasks: Todo[]; onClose: () => void }) {
  const activeTasks = tasks.filter((t) => !t.completed && !t.parent_id);
  const [phase, setPhase] = useState<"pick" | "launching">("pick");
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streamingText]);

  async function launchTask(task: Todo) {
    setSelectedTask(task);
    setPhase("launching");
    setStreaming(true);
    setStreamingText("");
    const launchMsg = `I want to start "${task.text}" right now but I'm stuck with task initiation. What's the absolute tiniest first step — something so small it feels almost silly — that I can do right now to begin?`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: launchMsg }),
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
            try { const { text: t } = JSON.parse(d); full += t; setStreamingText(full); } catch { /* skip */ }
          }
        }
      }
      setMsgs([{ id: crypto.randomUUID(), role: "assistant", content: full }]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  async function sendFollowUp(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "user", content: text }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
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
            try { const { text: t } = JSON.parse(d); full += t; setStreamingText(full); } catch { /* skip */ }
          }
        }
      }
      setMsgs((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: full }]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  const taskLabel = selectedTask
    ? (selectedTask.text.length > 38 ? selectedTask.text.slice(0, 36) + "…" : selectedTask.text)
    : "";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(61,53,53,0.25)", backdropFilter: "blur(3px)", zIndex: 50 }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "white", borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(61,53,53,0.18)",
          zIndex: 51, width: "min(600px, 92vw)", maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          animation: "center-slide-up 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #F0EBE3", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "14px",
              background: "linear-gradient(135deg, #EDE5F5, #D4CAEA)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Rocket size={20} color="#8B72B0" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "22px", fontWeight: 400, color: "#3D3535", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {phase === "pick" ? "Task Launch" : `Starting: ${taskLabel}`}
              </p>
              <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "1px" }}>
                {phase === "pick" ? "Pick a task — Eden will help you take the first step" : "One tiny step at a time — you've got this"}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: "6px", border: "1px solid #F0EBE3", borderRadius: "10px", background: "white", cursor: "pointer", display: "flex", flexShrink: 0 }}
            >
              <X size={15} color="#9B8E8E" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {phase === "pick" && (
            activeTasks.length === 0 ? (
              <p style={{ color: "#9B8E8E", fontSize: "14px", textAlign: "center", padding: "40px 0" }}>
                No active tasks yet. Add some tasks first!
              </p>
            ) : (
              <>
                <p style={{ fontSize: "12.5px", color: "#9B8E8E", marginBottom: "6px" }}>
                  Which task would you like help starting?
                </p>
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => launchTask(task)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "14px 16px", borderRadius: "14px",
                      border: "1.5px solid #EDE5E5", background: "white",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#DDD0F0";
                      (e.currentTarget as HTMLDivElement).style.background = "#F9F6FF";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#EDE5E5";
                      (e.currentTarget as HTMLDivElement).style.background = "white";
                    }}
                  >
                    <span style={{
                      fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
                      textTransform: "uppercase", padding: "3px 8px", borderRadius: "99px",
                      background: PRIORITY_COLORS[task.priority], color: PRIORITY_TEXT[task.priority],
                      flexShrink: 0,
                    }}>
                      {task.priority}
                    </span>
                    <span style={{ flex: 1, fontSize: "14px", color: "#3D3535" }}>{task.text}</span>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "9px",
                      background: "linear-gradient(135deg, #EDE5F5, #D4CAEA)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Rocket size={13} color="#8B72B0" />
                    </div>
                  </div>
                ))}
              </>
            )
          )}

          {phase === "launching" && (
            <>
              {msgs.map((msg) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #EDE5F5, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
                  )}
                  <div style={{
                    maxWidth: "82%",
                    padding: msg.role === "user" ? "10px 14px" : "14px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user" ? "#3D3535" : "white",
                    color: msg.role === "user" ? "white" : "#3D3535",
                    fontSize: "13.5px", lineHeight: 1.7,
                    border: msg.role === "assistant" ? "1px solid #F0EBE3" : "none",
                    boxShadow: msg.role === "assistant" ? "0 2px 10px rgba(180,150,140,0.07)" : "none",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {streaming && streamingText && (
                <div style={{ display: "flex" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #EDE5F5, #C8B8D8)", flexShrink: 0, marginRight: "10px", marginTop: "2px" }} />
                  <div style={{ maxWidth: "82%", padding: "14px 16px", borderRadius: "4px 16px 16px 16px", background: "white", color: "#3D3535", fontSize: "13.5px", lineHeight: 1.7, border: "1px solid #F0EBE3", whiteSpace: "pre-wrap" }}>
                    {streamingText}
                    <span style={{ display: "inline-block", width: "2px", height: "13px", background: "#C8B8D8", marginLeft: "2px", animation: "pop 1s ease-in-out infinite", verticalAlign: "middle" }} />
                  </div>
                </div>
              )}

              {streaming && !streamingText && (
                <div style={{ display: "flex", gap: "5px", paddingLeft: "36px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#C8B8D8", animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Follow-up input — only after first response */}
        {phase === "launching" && msgs.length > 0 && !streaming && (
          <div style={{ padding: "12px 24px 0", borderTop: "1px solid #F0EBE3", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFollowUp(input); } }}
                placeholder="Ask a follow-up…"
                rows={1}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: "14px",
                  border: "1.5px solid #EDE5E5", background: "white",
                  fontSize: "13px", color: "#3D3535", resize: "none",
                  outline: "none", lineHeight: 1.5, fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#DDD0F0")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE5E5")}
              />
              <button
                onClick={() => sendFollowUp(input)}
                disabled={!input.trim()}
                style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: input.trim() ? "#8B72B0" : "#F0EBE3",
                  border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s",
                }}
              >
                <Send size={15} color={input.trim() ? "white" : "#9B8E8E"} />
              </button>
            </div>
          </div>
        )}

        {/* Back button */}
        {phase === "launching" && !streaming && (
          <div style={{ padding: "10px 24px 18px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => { setPhase("pick"); setMsgs([]); setSelectedTask(null); setStreamingText(""); }}
              style={{ fontSize: "12px", color: "#B5A8A8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              ← Choose a different task
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Task Guided Mode ────────────────────────────────────────────────────────

function TaskGuidedMode({
  parentTask,
  subtasks,
  completedItems,
  onToggle,
  onClose,
}: {
  parentTask: Todo;
  subtasks: Todo[];
  completedItems: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const firstIncomplete = subtasks.findIndex((s) => !completedItems.includes(s.id));
  const [stepIdx, setStepIdx] = useState(Math.max(0, firstIncomplete));
  const [stepPhase, setStepPhase] = useState<"active" | "completing">("active");
  const [guidance, setGuidance] = useState<string | null>(null);
  const [donePhrase, setDonePhrase] = useState<string | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [askText, setAskText] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const askRef = useRef<HTMLInputElement>(null);

  const step = subtasks[stepIdx];
  const totalDone = completedItems.length;
  const pct = Math.round((totalDone / subtasks.length) * 100);

  useEffect(() => {
    setStepPhase("active");
    setAskAnswer(null);
    setAskText("");
    setAnimKey((k) => k + 1);
    fetchGuidance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  async function fetchGuidance() {
    if (!step) return;
    setGuidance(null);
    setDonePhrase(null);
    setLoadingGuidance(true);
    try {
      const res = await fetch("/api/todos/step-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentTask: parentTask.text,
          subtask: step.text,
          subtaskIndex: stepIdx,
          totalSubtasks: subtasks.length,
          priority: parentTask.priority,
        }),
      });
      const { guidance: g, done: d } = await res.json();
      setGuidance(g || null);
      setDonePhrase(d || null);
    } finally {
      setLoadingGuidance(false);
    }
  }

  async function askEden() {
    if (!askText.trim() || askLoading) return;
    const q = askText.trim();
    setAskText("");
    setAskAnswer(null);
    setAskLoading(true);
    try {
      const res = await fetch("/api/todos/step-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentTask: parentTask.text,
          subtask: step.text,
          subtaskIndex: stepIdx,
          totalSubtasks: subtasks.length,
          priority: parentTask.priority,
          question: q,
        }),
      });
      const { answer } = await res.json();
      setAskAnswer(answer || null);
    } finally {
      setAskLoading(false);
    }
  }

  function handleDone() {
    if (!completedItems.includes(step.id)) onToggle(step.id);
    setStepPhase("completing");
    setTimeout(() => {
      if (stepIdx < subtasks.length - 1) {
        setStepIdx((i) => i + 1);
      } else {
        setShowComplete(true);
      }
    }, 1500);
  }

  function handleSkip() {
    if (stepIdx < subtasks.length - 1) setStepIdx((i) => i + 1);
    else setShowComplete(true);
  }

  const accent = "#8B72B0";
  const bg = "linear-gradient(155deg, #F8F3FF 0%, #EDE0FA 50%, #E4D4F5 100%)";

  if (showComplete) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: "56px", marginBottom: "20px" }}>✦</div>
          <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "34px", fontWeight: 400, color: "#3D3535", marginBottom: "12px" }}>
            {parentTask.text}
          </h2>
          <p style={{ fontSize: "14px", color: "#7A6A6A", lineHeight: 1.7, marginBottom: "8px" }}>done.</p>
          <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.6, marginBottom: "40px" }}>
            {subtasks.length} steps. you stayed with it.
          </p>
          <button
            onClick={onClose}
            style={{ padding: "13px 32px", borderRadius: "14px", border: "none", background: accent, color: "white", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            back to my list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: bg, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes taskStepIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes taskFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}99`, marginBottom: "3px" }}>
            Working on
          </p>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "18px", color: "#3D3535", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {parentTask.text}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: "rgba(0,0,0,0.07)", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: "16px" }}
        >
          <X size={16} color="#7A6A6A" />
        </button>
      </div>

      {/* Progress bar + step label */}
      <div style={{ padding: "0 28px 16px" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
          {subtasks.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: "5px", borderRadius: "99px",
              background: completedItems.includes(s.id) ? accent : i === stepIdx ? `${accent}66` : "rgba(0,0,0,0.10)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}99` }}>
            Step {stepIdx + 1} of {subtasks.length}
          </span>
          <span style={{ fontSize: "11px", color: "#9B8E8E" }}>{pct}% done</span>
        </div>
      </div>

      {/* Main step content */}
      <div
        key={animKey}
        style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px", overflowY: "auto", animation: "taskStepIn 0.3s ease forwards" }}
      >
        {/* Step title */}
        <h2 style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: "clamp(24px, 4vw, 38px)",
          fontWeight: 400, color: "#3D3535", lineHeight: 1.3,
          marginBottom: "20px", maxWidth: "520px",
        }}>
          {step?.text}
        </h2>

        {/* Eden's coaching */}
        <div style={{ minHeight: "64px", marginBottom: "20px" }}>
          {loadingGuidance ? (
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: accent, opacity: 0.4, animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          ) : stepPhase === "completing" && donePhrase ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: `${accent}18`, border: `1.5px solid ${accent}35`, borderRadius: "14px", padding: "14px 16px", animation: "taskFadeIn 0.3s ease forwards" }}>
              <CheckCircle2 size={17} color={accent} style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "14px", color: "#3D3535", fontWeight: 500, margin: 0, lineHeight: 1.6 }}>{donePhrase}</p>
            </div>
          ) : guidance ? (
            <p style={{ fontSize: "15px", color: "#5A4E6A", lineHeight: 1.7, fontStyle: "italic", background: `${accent}0C`, border: `1px solid ${accent}20`, borderRadius: "14px", padding: "13px 16px", margin: 0, animation: "taskFadeIn 0.4s ease forwards" }}>
              {guidance}
            </p>
          ) : null}
        </div>

        {/* Ask Eden */}
        {stepPhase === "active" && (
          <div style={{ marginBottom: "8px" }}>
            {askAnswer && (
              <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "14px", padding: "13px 16px", marginBottom: "10px", animation: "taskFadeIn 0.35s ease forwards" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: `${accent}`, marginBottom: "5px" }}>Eden</p>
                <p style={{ fontSize: "14px", color: "#3D3535", lineHeight: 1.65, margin: 0 }}>{askAnswer}</p>
              </div>
            )}
            {askLoading && (
              <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "14px", padding: "13px 16px", marginBottom: "10px", display: "flex", gap: "5px", alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: accent, opacity: 0.4, animation: `pop 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                ref={askRef}
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") askEden(); }}
                placeholder="ask Eden anything — stuck? not sure how? say it here"
                style={{
                  flex: 1, padding: "11px 15px", borderRadius: "12px",
                  border: "1.5px solid rgba(0,0,0,0.12)", background: "rgba(255,255,255,0.7)",
                  fontSize: "13px", color: "#3D3535", outline: "none", fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = accent)}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
              />
              <button
                onClick={askEden}
                disabled={!askText.trim() || askLoading}
                style={{
                  width: "38px", height: "38px", borderRadius: "10px", border: "none", flexShrink: 0,
                  background: askText.trim() && !askLoading ? accent : "rgba(0,0,0,0.10)",
                  cursor: askText.trim() && !askLoading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                }}
              >
                <Send size={14} color={askText.trim() && !askLoading ? "white" : "#9B8E8E"} />
              </button>
            </div>

            {/* Quick prompts */}
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
              {["I'm stuck", "how do I actually start this?", "I got distracted, help me refocus"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setAskText(q); setTimeout(() => askEden(), 10); }}
                  style={{
                    padding: "5px 12px", borderRadius: "99px", border: `1px solid ${accent}40`,
                    background: `${accent}0C`, color: accent, fontSize: "12px",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}20`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${accent}0C`; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: "16px 28px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "480px" }}>
          {stepIdx > 0 && stepPhase === "active" && (
            <button
              onClick={() => setStepIdx((i) => i - 1)}
              style={{ flex: 1, padding: "13px 16px", borderRadius: "14px", border: "1.5px solid rgba(0,0,0,0.10)", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#7A6A6A", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}
          <button
            onClick={handleDone}
            disabled={stepPhase === "completing"}
            style={{
              flex: stepIdx > 0 && stepPhase === "active" ? 2 : 1,
              padding: "15px 24px", borderRadius: "14px", border: "none",
              background: stepPhase === "completing" ? `${accent}60` : accent,
              cursor: stepPhase === "completing" ? "default" : "pointer",
              fontSize: "16px", fontWeight: 700, color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              boxShadow: stepPhase === "completing" ? "none" : `0 4px 24px ${accent}50`,
              transition: "all 0.3s ease",
            }}
          >
            <CheckCircle2 size={18} />
            {stepPhase === "completing"
              ? "Moving on…"
              : stepIdx < subtasks.length - 1
                ? "Done — next step"
                : "Done — finish task"}
          </button>
        </div>
        {stepPhase === "active" && (
          <button onClick={handleSkip} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: "rgba(0,0,0,0.3)", padding: "4px 12px" }}>
            skip →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Spin Wheel ──────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number; maxLife: number;
  shape: "circle" | "star" | "square"; rotation: number; rotSpeed: number;
}

function SpinWheel({ tasks, onResult }: { tasks: Todo[]; onResult: (task: Todo) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Todo | null>(null);
  const [winnerVisible, setWinnerVisible] = useState(false);
  const animRef = useRef<number | null>(null);
  const confettiAnimRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickAngleRef = useRef(0);

  const activeTasks = tasks.filter((t) => !t.completed && !t.parent_id);

  const COLORS = [
    "#F2C4CE", "#D8E4D6", "#C8B8D8", "#F5C9A8",
    "#FAE8EC", "#EDE5F5", "#BEDAD6", "#F0E4CC",
  ];
  const CONFETTI_COLORS = ["#F2C4CE", "#8B72B0", "#C8D8A8", "#F5C9A8", "#82C4D8", "#F2E4A0", "#D4A8F5"];

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function playTick(freq = 880, vol = 0.15) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch { /* ignore if blocked */ }
  }

  function playWinSound() {
    try {
      const ctx = getAudioCtx();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch { /* ignore */ }
  }

  function spawnConfetti(cx: number, cy: number, count = 60) {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 6,
      life: 1,
      maxLife: 1,
      shape: (["circle", "star", "square"] as Particle["shape"][])[Math.floor(Math.random() * 3)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    }));
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const spikes = 5;
    const step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.4;
      ctx.lineTo(x + Math.cos(i * step - Math.PI / 2) * radius, y + Math.sin(i * step - Math.PI / 2) * radius);
    }
    ctx.closePath();
  }

  function animateConfetti() {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((p) => p.life > 0.01);

    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.99;
      p.life -= 0.015;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "square") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        drawStar(ctx, 0, 0, p.size / 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (particlesRef.current.length > 0) {
      confettiAnimRef.current = requestAnimationFrame(animateConfetti);
    }
  }

  function drawWheel(angle: number) {
    const canvas = canvasRef.current;
    if (!canvas || activeTasks.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;
    const sliceAngle = (2 * Math.PI) / activeTasks.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer glow ring when spinning
    if (spinning) {
      ctx.save();
      ctx.shadowColor = "#C8A8F0";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#C8A8F060";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    activeTasks.forEach((task, i) => {
      const start = angle + i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#3D3535";
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      const label = task.text.length > 18 ? task.text.slice(0, 16) + "…" : task.text;
      ctx.fillText(label, r - 14, 4);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 24);
    hubGrad.addColorStop(0, "white");
    hubGrad.addColorStop(1, "#F0EBF8");
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = "#D8CEE8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer (triangle) at the right edge
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx + r - 2, cy - 11);
    ctx.lineTo(cx + r + 16, cy);
    ctx.lineTo(cx + r - 2, cy + 11);
    ctx.closePath();
    ctx.fillStyle = "#8B72B0";
    ctx.fill();
    ctx.restore();
  }

  useEffect(() => {
    drawWheel(rotation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks.length]);

  function spin() {
    if (spinning || activeTasks.length === 0) return;
    setSpinning(true);
    setWinner(null);
    setWinnerVisible(false);
    particlesRef.current = [];

    playTick(440, 0.2);

    const extraSpins = 6 + Math.random() * 5;
    const finalAngle = rotation + extraSpins * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const duration = 3800;
    const start = performance.now();
    const startAngle = rotation;
    const sliceAngle = (2 * Math.PI) / activeTasks.length;
    lastTickAngleRef.current = rotation;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out with a little bounce at the end
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 4) : 1;
      const current = startAngle + (finalAngle - startAngle) * eased;
      setRotation(current);
      drawWheel(current);

      // Tick sound when pointer crosses a slice boundary
      const speed = (finalAngle - startAngle) * (1 - Math.pow(1 - progress, 3)) / duration * 1000;
      const normalised = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const lastNorm = ((lastTickAngleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const crossedBoundary = Math.floor(normalised / sliceAngle) !== Math.floor(lastNorm / sliceAngle);
      if (crossedBoundary && speed > 0.3) {
        const vol = Math.min(0.18, speed * 0.04);
        const freq = 600 + speed * 80;
        playTick(freq, vol);
      }
      lastTickAngleRef.current = current;

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const norm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pointerAngle = (2 * Math.PI - norm) % (2 * Math.PI);
        const index = Math.floor(pointerAngle / sliceAngle) % activeTasks.length;
        const picked = activeTasks[index];
        setWinner(picked);

        // Win celebration
        playWinSound();

        const canvas = canvasRef.current;
        if (canvas) {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          // Burst from center
          spawnConfetti(cx, cy, 80);
          // Bursts from edges
          spawnConfetti(20, 20, 20);
          spawnConfetti(canvas.width - 20, 20, 20);
          confettiAnimRef.current = requestAnimationFrame(animateConfetti);
        }

        setTimeout(() => setWinnerVisible(true), 100);
        onResult(picked);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }

  if (activeTasks.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px", gap: "12px" }}>
        <p style={{ color: "#9B8E8E", fontSize: "14px" }}>Add tasks to spin the wheel</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <style>{`
        @keyframes winnerPop {
          0% { transform: scale(0.7) translateY(6px); opacity: 0; }
          60% { transform: scale(1.06) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes spinBtnPulse {
          0%, 100% { box-shadow: 0 4px 20px #8B72B040; }
          50% { box-shadow: 0 4px 32px #8B72B090; }
        }
      `}</style>

      {/* Canvas stack — wheel behind, confetti overlay */}
      <div style={{ position: "relative", width: 270, height: 270 }}>
        <canvas
          ref={canvasRef}
          width={270}
          height={270}
          style={{ display: "block", position: "absolute", top: 0, left: 0 }}
        />
        <canvas
          ref={confettiRef}
          width={270}
          height={270}
          style={{ display: "block", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "12px 28px", borderRadius: "14px", border: "none",
          background: spinning ? "#C8B8D8" : "linear-gradient(135deg, #8B72B0, #A882C8)",
          color: "white", fontSize: "15px", fontWeight: 700, cursor: spinning ? "default" : "pointer",
          fontFamily: "inherit", minWidth: "170px", justifyContent: "center",
          transition: "all 0.2s",
          animation: !spinning && !winner ? "spinBtnPulse 2s ease-in-out infinite" : "none",
          boxShadow: spinning ? "none" : "0 4px 20px #8B72B040",
        }}
      >
        <Shuffle size={16} style={{ animation: spinning ? "spin 0.5s linear infinite" : "none" }} />
        {spinning ? "Spinning…" : "Spin the wheel"}
      </button>

      {winner && winnerVisible && (
        <div
          style={{
            background: "linear-gradient(135deg, #FAE8EC, #F5E8FA)",
            border: "1.5px solid #F2C4CE",
            borderRadius: "16px",
            padding: "16px 22px",
            textAlign: "center",
            animation: "winnerPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            maxWidth: "240px",
            boxShadow: "0 6px 24px rgba(200,140,180,0.2)",
          }}
        >
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C0607A", marginBottom: "8px" }}>
            ✦ your next task
          </p>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", lineHeight: 1.4 }}>{winner.text}</p>
        </div>
      )}
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#FAE8EC",
  medium: "#F0E4CC",
  low: "#D8E4D6",
};
const PRIORITY_TEXT: Record<string, string> = {
  high: "#C0607A",
  medium: "#8A6230",
  low: "#4A6847",
};

function SubtaskRow({ todo, onToggle, onDelete }: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px 8px 16px",
        borderRadius: "10px",
        background: todo.completed ? "transparent" : "#FDFBFB",
        border: `1px solid ${todo.completed ? "#F0EBE3" : "#EDE5E5"}`,
        transition: "all 0.2s ease",
        cursor: "pointer",
        opacity: todo.completed ? 0.6 : 1,
      }}
      onClick={() => onToggle(todo)}
    >
      {todo.completed
        ? <CheckCircle2 size={15} color="#8FAB8A" strokeWidth={2} style={{ flexShrink: 0 }} />
        : <Circle size={15} color="#D8D0D0" strokeWidth={1.5} style={{ flexShrink: 0 }} />
      }
      <span style={{
        flex: 1,
        fontSize: "13px",
        color: todo.completed ? "#9B8E8E" : "#5A4E4E",
        textDecoration: todo.completed ? "line-through" : "none",
        transition: "all 0.2s",
      }}>
        {todo.text}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
        style={{
          padding: "3px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#D8D0D0",
          display: "flex",
          borderRadius: "5px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#D8D0D0")}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function TodosPage() {
  const supabase = createClient();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "done">("active");
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showStrugglingPanel, setShowStrugglingPanel] = useState(false);
  const [showLaunchPanel, setShowLaunchPanel] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [guidedTask, setGuidedTask] = useState<Todo | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setLoading(false);
  }

  async function addTodo() {
    if (!newText.trim() || !userId) return;
    const user = { id: userId };

    const { data } = await supabase
      .from("todos")
      .insert({ user_id: user.id, text: newText.trim(), completed: false, priority, parent_id: null })
      .select()
      .single();

    if (!data) return;

    setTodos((prev) => [...prev, data]);
    setNewText("");

    setSplittingId(data.id);
    try {
      const res = await fetch("/api/todos/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskText: data.text, taskId: data.id, priority: data.priority }),
      });
      const json = await res.json();
      if (json.subtasks?.length > 0) {
        setTodos((prev) => [...prev, ...json.subtasks]);
        setExpandedIds((prev) => new Set([...prev, data.id]));
      }
    } finally {
      setSplittingId(null);
    }
  }

  async function toggleTodo(todo: Todo) {
    // Optimistic update — instant UI feedback
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, completed: !t.completed } : t));
    supabase.from("todos").update({ completed: !todo.completed }).eq("id", todo.id)
      .select().single().then(({ data }) => {
        if (data) setTodos((prev) => prev.map((t) => t.id === todo.id ? data : t));
      });
  }

  async function addTriagedTasks(tasks: { text: string; priority: "high" | "medium" | "low" }[]) {
    if (!userId) return;
    for (const task of tasks) {
      const { data } = await supabase
        .from("todos")
        .insert({ user_id: userId, text: task.text, completed: false, priority: task.priority, parent_id: null })
        .select()
        .single();
      if (data) setTodos((prev) => [...prev, data]);
    }
  }

  async function deleteTodo(id: string) {
    await supabase.from("todos").delete().eq("id", id);
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parent_id !== id));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleWheelResult(task: Todo) {
    setHighlighted(task.id);
    setExpandedIds((prev) => new Set([...prev, task.id]));
    setTimeout(() => setHighlighted(null), 4000);
  }

  const parentTodos = todos.filter((t) => !t.parent_id);
  const subtasksOf = (id: string) => todos.filter((t) => t.parent_id === id);

  const filteredParents = parentTodos.filter((t) => {
    if (activeFilter === "active") return !t.completed;
    if (activeFilter === "done") return t.completed;
    return true;
  });

  return (
    <div className="page-padding" style={{ maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
          Tasks
        </p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>
          To-Do & <em>Wheel</em>
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>
          Add a task — Eden will break it into tiny steps automatically.
        </p>

        {/* Support action buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "22px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowStrugglingPanel(true)}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "11px 20px", borderRadius: "14px",
              border: "1.5px solid #F2C4CE",
              background: "linear-gradient(135deg, #FEF0F3 0%, #F9EBF0 100%)",
              color: "#C0607A", fontSize: "13.5px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: "0 2px 10px rgba(242,196,206,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #F2C4CE, #EAB8C8)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(192,96,122,0.22)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #FEF0F3 0%, #F9EBF0 100%)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(242,196,206,0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Heart size={15} fill="#C0607A" />
            I&apos;m struggling
          </button>
          <button
            onClick={() => setShowLaunchPanel(true)}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "11px 20px", borderRadius: "14px",
              border: "1.5px solid #DDD0F0",
              background: "linear-gradient(135deg, #F3EEF9 0%, #EDE5F5 100%)",
              color: "#7B5FA8", fontSize: "13.5px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: "0 2px 10px rgba(200,184,216,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #DDD0F0, #C8B8D8)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,114,176,0.22)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #F3EEF9 0%, #EDE5F5 100%)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(200,184,216,0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Rocket size={15} />
            Launch a task
          </button>
          <button
            onClick={() => setShowBrainDump(true)}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "11px 20px", borderRadius: "14px",
              border: "1.5px solid #D8D0E8",
              background: "linear-gradient(135deg, #F5F2FC 0%, #ECE8F5 100%)",
              color: "#5A4A8A", fontSize: "13.5px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: "0 2px 10px rgba(160,140,210,0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #D8D0E8, #C8B8DC)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(120,90,180,0.22)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #F5F2FC 0%, #ECE8F5 100%)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(160,140,210,0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Brain size={15} />
            Everything feels like too much
          </button>
          <button
            onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "11px 20px", borderRadius: "14px",
              border: "1.5px solid #C8B8D8",
              background: "linear-gradient(135deg, #F0EBF8, #E8E0F0)",
              color: "#8B72B0", fontSize: "13.5px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s",
              boxShadow: "0 2px 10px rgba(139,114,176,0.18)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8B72B0, #A882C8)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#8B72B0";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #F0EBF8, #E8E0F0)";
              e.currentTarget.style.color = "#8B72B0";
              e.currentTarget.style.borderColor = "#C8B8D8";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Shuffle size={15} /> Spin selected
          </button>
        </div>
      </div>

      {/* Select mode toolbar */}
      {selectMode && (
        <div style={{
          position: "sticky", top: "12px", zIndex: 100,
          display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
          padding: "10px 16px", borderRadius: "14px", marginBottom: "12px",
          background: "rgba(139,114,176,0.12)", backdropFilter: "blur(8px)",
          border: "1.5px solid #8B72B035",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B72B0", flex: 1 }}>
            {selectedIds.size === 0 ? "Tap tasks to select" : `${selectedIds.size} selected`}
          </span>
          <button onClick={() => {
            const allIds = todos.filter(t => !t.completed && !t.parent_id).map(t => t.id);
            setSelectedIds(new Set(allIds));
          }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#8B72B0", fontWeight: 600, padding: "4px 8px" }}>
            All
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#9B8E8E", fontWeight: 600, padding: "4px 8px" }}>
            None
          </button>
          <button
            onClick={() => { if (selectedIds.size > 0) setShowSpinModal(true); }}
            disabled={selectedIds.size === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "10px", border: "none",
              background: selectedIds.size > 0 ? "linear-gradient(135deg, #8B72B0, #A882C8)" : "#D8CEE8",
              color: "white", fontSize: "13px", fontWeight: 700,
              cursor: selectedIds.size > 0 ? "pointer" : "default", fontFamily: "inherit",
              boxShadow: selectedIds.size > 0 ? "0 3px 12px #8B72B045" : "none",
            }}
          >
            <Shuffle size={13} /> Spin
          </button>
          <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#C4B8B8", padding: "4px", display: "flex" }}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid-todo" style={{ gap: "24px", alignItems: "start" }}>
        {/* Left — task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Add task */}
          <Card padding="sm">
            <div className="todo-add-form">
              <div className="todo-add-input">
                <Input
                  placeholder="Add a task…"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodo()}
                  onFocus={(e) => {
                    window.setTimeout(() => {
                      e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                    }, 300);
                  }}
                />
              </div>
              <div className="todo-add-meta">
              <div className="todo-priority-group">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${priority === p ? PRIORITY_COLORS[p] : "#F0EBE3"}`,
                      background: priority === p ? PRIORITY_COLORS[p] : "transparent",
                      color: priority === p ? PRIORITY_TEXT[p] : "#9B8E8E",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "capitalize",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Button onClick={addTodo} size="md" disabled={!newText.trim()}>
                <Plus size={15} /> Add
              </Button>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div style={{ display: "flex", gap: "8px" }}>
            {(["active", "all", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "99px",
                  border: "1px solid",
                  borderColor: activeFilter === f ? "#F2C4CE" : "#F0EBE3",
                  background: activeFilter === f ? "#FAE8EC" : "transparent",
                  color: activeFilter === f ? "#C0607A" : "#9B8E8E",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {f} {f === "active" ? `(${parentTodos.filter((t) => !t.completed).length})` : f === "done" ? `(${parentTodos.filter((t) => t.completed).length})` : ""}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {loading && <p style={{ color: "#9B8E8E", fontSize: "14px" }}>Loading…</p>}
            {!loading && filteredParents.length === 0 && (
              <Card variant="cream" padding="md">
                <p style={{ textAlign: "center", color: "#9B8E8E", fontSize: "14px" }}>
                  {activeFilter === "active" ? "No active tasks — you're clear!" : "Nothing here yet."}
                </p>
              </Card>
            )}

            {filteredParents.map((todo) => {
              const subs = subtasksOf(todo.id);
              const completedSubs = subs.filter((s) => s.completed).length;
              const isExpanded = expandedIds.has(todo.id);
              const isSplitting = splittingId === todo.id;

              return (
                <div key={todo.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {/* Parent task row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      background: selectMode && selectedIds.has(todo.id) ? "#F0EBF8" : highlighted === todo.id ? "#FAE8EC" : todo.completed ? "#F8F8F8" : "white",
                      border: `1.5px solid ${selectMode && selectedIds.has(todo.id) ? "#8B72B060" : highlighted === todo.id ? "#F2C4CE" : todo.completed ? "#F0EBE3" : "#EDE5E5"}`,
                      boxShadow: selectMode && selectedIds.has(todo.id) ? "0 0 0 3px rgba(139,114,176,0.15)" : highlighted === todo.id ? "0 0 0 3px rgba(242,196,206,0.3)" : "0 2px 12px rgba(180,150,140,0.06)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (selectMode) {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(todo.id) ? next.delete(todo.id) : next.add(todo.id);
                          return next;
                        });
                      } else {
                        toggleTodo(todo);
                      }
                    }}
                  >
                    {selectMode
                      ? <div style={{ width: "19px", height: "19px", borderRadius: "5px", flexShrink: 0, border: `2px solid ${selectedIds.has(todo.id) ? "#8B72B0" : "#D8D0D0"}`, background: selectedIds.has(todo.id) ? "#8B72B0" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                          {selectedIds.has(todo.id) && <Check size={11} color="white" strokeWidth={3} />}
                        </div>
                      : todo.completed
                        ? <CheckCircle2 size={19} color="#8FAB8A" strokeWidth={2} style={{ flexShrink: 0 }} />
                        : <Circle size={19} color="#D8D0D0" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    }

                    <span style={{
                      flex: 1,
                      fontSize: "14px",
                      color: todo.completed ? "#9B8E8E" : "#3D3535",
                      textDecoration: todo.completed ? "line-through" : "none",
                      transition: "all 0.2s",
                    }}>
                      {todo.text}
                    </span>

                    {isSplitting && (
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11px",
                        color: "#B09BC8",
                        fontWeight: 500,
                      }}>
                        <Sparkles size={12} style={{ animation: "pulse 1.2s ease-in-out infinite" }} />
                        breaking down…
                      </span>
                    )}

                    {!isSplitting && subs.length > 0 && !todo.completed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGuidedTask(todo); }}
                        title="Guide me through this step by step"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "99px",
                          border: "1.5px solid #8B72B030",
                          background: "linear-gradient(135deg, #8B72B015, #C09BD015)",
                          color: "#8B72B0",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#8B72B020"; e.currentTarget.style.borderColor = "#8B72B060"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #8B72B015, #C09BD015)"; e.currentTarget.style.borderColor = "#8B72B030"; }}
                      >
                        <PlayCircle size={11} />
                        guide me
                      </button>
                    )}

                    {!isSplitting && subs.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(todo.id); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "99px",
                          border: "1px solid #EDE5F5",
                          background: "#F7F3FC",
                          color: "#8B72B0",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#EDE5F5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#F7F3FC")}
                      >
                        {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {completedSubs}/{subs.length}
                      </button>
                    )}

                    <span style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "99px",
                      background: PRIORITY_COLORS[todo.priority],
                      color: PRIORITY_TEXT[todo.priority],
                      flexShrink: 0,
                    }}>
                      {todo.priority}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                      style={{
                        padding: "4px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#C4B8B8",
                        display: "flex",
                        borderRadius: "6px",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isExpanded && subs.length > 0 && (
                    <div style={{
                      marginLeft: "28px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      paddingLeft: "8px",
                      borderLeft: "2px solid #EDE5F5",
                    }}>
                      {subs.map((sub) => (
                        <SubtaskRow
                          key={sub.id}
                          todo={sub}
                          onToggle={toggleTodo}
                          onDelete={deleteTodo}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — Spin wheel */}
        <div className="todo-wheel-panel" style={{ position: "sticky", top: "40px" }}>
          <Card variant="cream">
            <CardTitle style={{ marginBottom: "20px", textAlign: "center" }}>Spin the Wheel</CardTitle>
            <SpinWheel tasks={todos} onResult={handleWheelResult} />
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showStrugglingPanel && <StrugglingPanel onClose={() => setShowStrugglingPanel(false)} tasks={todos} />}
      {showLaunchPanel && <TaskLaunchPanel tasks={todos} onClose={() => setShowLaunchPanel(false)} />}
      {showBrainDump && <BrainDumpPanel onClose={() => setShowBrainDump(false)} onAddTasks={addTriagedTasks} />}
      {showSpinModal && (
        <SpinWheelModal
          items={todos.filter(t => selectedIds.has(t.id)).map(t => ({ id: t.id, label: t.text }))}
          onClose={() => setShowSpinModal(false)}
        />
      )}
      {guidedTask && (() => {
        const guidedSubs = subtasksOf(guidedTask.id);
        const completedSubIds = guidedSubs.filter((s) => s.completed).map((s) => s.id);
        return (
          <TaskGuidedMode
            parentTask={guidedTask}
            subtasks={guidedSubs}
            completedItems={completedSubIds}
            onToggle={(id) => { const sub = todos.find((t) => t.id === id); if (sub) toggleTodo(sub); }}
            onClose={() => setGuidedTask(null)}
          />
        );
      })()}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pop {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes center-slide-up {
          from { transform: translate(-50%, calc(-50% + 24px)); opacity: 0; }
          to { transform: translate(-50%, -50%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
