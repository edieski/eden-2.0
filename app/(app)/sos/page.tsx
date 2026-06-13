"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ChevronRight, ChevronLeft, RotateCcw, Zap, Wind, Hand } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// ─── EFT Tapping Sequence ────────────────────────────────────────────────────

type TappingStep =
  | { kind: "mantra" }
  | { kind: "setup"; phrases: string[] }
  | { kind: "round"; label: string; subtitle: string; points: { point: string; phrase: string }[] }
  | { kind: "bridge" };

const TAPPING_STEPS: TappingStep[] = [
  { kind: "mantra" },
  {
    kind: "setup",
    phrases: [
      "Even though I have this strong urge to eat right now, I can stay with this feeling without acting on it.",
      "Even though my brain wants a state change, I can give it a different kind of input.",
      "Even though this feels uncomfortable, I'm safe — and I can slow this down.",
    ],
  },
  {
    kind: "round",
    label: "Round 1 — Acknowledge",
    subtitle: "Name it. Don't fight it.",
    points: [
      { point: "Eyebrow", phrase: "There's an urge here" },
      { point: "Side of eye", phrase: "My brain wants stimulation" },
      { point: "Under eye", phrase: "It makes sense" },
      { point: "Under nose", phrase: "Nothing is wrong with me" },
      { point: "Chin", phrase: "This is just a state shift needed" },
      { point: "Collarbone", phrase: "My system is under-stimulated" },
      { point: "Under arm", phrase: "It wants quick dopamine" },
      { point: "Top of head", phrase: "I can work with this" },
    ],
  },
  {
    kind: "round",
    label: "Round 2 — Regulate",
    subtitle: "Downshift. Ride the wave.",
    points: [
      { point: "Eyebrow", phrase: "I don't have to react immediately" },
      { point: "Side of eye", phrase: "I can pause the autopilot" },
      { point: "Under eye", phrase: "My body can settle even slightly" },
      { point: "Under nose", phrase: "I can ride this wave for a moment" },
      { point: "Chin", phrase: "I'm allowed to feel this without fixing it" },
      { point: "Collarbone", phrase: "The urge can be here without controlling me" },
      { point: "Under arm", phrase: "I can choose the next action slowly" },
      { point: "Top of head", phrase: "I'm back in the driver's seat" },
    ],
  },
  {
    kind: "round",
    label: "Round 3 — Shift",
    subtitle: "Name what you actually need.",
    points: [
      { point: "Eyebrow", phrase: "What my brain needs is stimulation, not food" },
      { point: "Side of eye", phrase: "I can give it something real" },
      { point: "Under eye", phrase: "I have options right now" },
      { point: "Under nose", phrase: "I can move my body for 30 seconds" },
      { point: "Chin", phrase: "I can change this state without eating" },
      { point: "Collarbone", phrase: "The urge doesn't have to win" },
      { point: "Under arm", phrase: "I'm choosing what happens next" },
      { point: "Top of head", phrase: "I made it through this moment" },
    ],
  },
  { kind: "bridge" },
];

const BRIDGE_ACTIONS = [
  { icon: "🏃", label: "Move for 30 seconds", desc: "Jumping jacks, shake out arms, walk fast" },
  { icon: "🧊", label: "Cold water on face/hands", desc: "Activates the dive reflex — drops heart rate" },
  { icon: "🚶", label: "Change rooms", desc: "Break the environmental cue" },
  { icon: "🎵", label: "Loud music + move", desc: "Redirect the dopamine loop" },
  { icon: "🍬", label: "Strong mint or gum", desc: "Sensory replacement" },
];

// ─── Urge Surfing Timer ───────────────────────────────────────────────────────

function UrgeSurfingTimer() {
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { setRunning(false); setDone(true); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const pct = ((120 - seconds) / 120) * 100;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  function reset() { setSeconds(120); setRunning(false); setDone(false); }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 16px" }}>
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r="60" fill="none" stroke="#F2C4CE" strokeWidth="8" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={done ? "#7AA88A" : "#C0607A"}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {done ? (
            <span style={{ fontSize: 28 }}>🌊</span>
          ) : (
            <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 32, color: "#281A24", fontWeight: 400 }}>
              {mins}:{secs.toString().padStart(2, "0")}
            </span>
          )}
        </div>
      </div>

      {done ? (
        <div>
          <p style={{ fontSize: 15, color: "#4A6B4A", fontWeight: 500, marginBottom: 8 }}>You rode the wave.</p>
          <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 16 }}>That urge peaked and passed. That&apos;s what they always do.</p>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw size={13} /> Reset</Button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 12 }}>
            {running
              ? "Feel the urge without acting on it. It's a wave — just watch it."
              : "Close your eyes. Find the urge in your body. Give it a shape, a colour. Don't fight it — just observe it."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button
              variant={running ? "secondary" : "primary"}
              size="sm"
              onClick={() => setRunning(!running)}
            >
              {running ? "Pause" : seconds === 120 ? "Start urge surfing" : "Resume"}
            </Button>
            {seconds < 120 && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw size={13} /></Button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Breathing Tool ───────────────────────────────────────────────────────────

function BreathingTool() {
  const [phase, setPhase] = useState<"idle" | "in" | "hold" | "out">("idle");
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (phase === "idle") return;
    const durations: Record<string, number> = { in: 4, hold: 0, out: 6 };
    const dur = durations[phase];
    if (dur === 0) { setPhase("out"); return; }

    const interval = setInterval(() => {
      setCount((c) => {
        if (c >= dur - 1) {
          clearInterval(interval);
          if (phase === "in") setPhase("out");
          else if (phase === "out") { setCycles((cy) => cy + 1); setPhase("in"); setCount(0); }
          return 0;
        }
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const labels = { idle: "4-6 Breathing", in: "breathe in", hold: "hold", out: "breathe out slowly" };
  const colors = { idle: "#C0607A", in: "#7AA8C0", hold: "#A8C07A", out: "#C0A87A" };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px",
          background: colors[phase],
          opacity: 0.85,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.5s ease",
          transform: phase === "in" ? "scale(1.12)" : phase === "out" ? "scale(0.88)" : "scale(1)",
          boxShadow: `0 0 30px ${colors[phase]}60`,
        }}
      >
        <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>{labels[phase]}</span>
      </div>
      <p style={{ fontSize: 12, color: "#9A7090", marginBottom: 12 }}>
        Extended exhale activates the vagus nerve — calms the nervous system directly.
        {cycles > 0 && ` · ${cycles} ${cycles === 1 ? "cycle" : "cycles"} done`}
      </p>
      <Button
        variant={phase !== "idle" ? "secondary" : "primary"}
        size="sm"
        onClick={() => { if (phase === "idle") { setPhase("in"); setCount(0); } else { setPhase("idle"); setCount(0); } }}
      >
        <Wind size={13} /> {phase !== "idle" ? "Stop" : "Start breathing"}
      </Button>
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

type Msg = { role: "user" | "assistant"; content: string };

function SOSChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "okay I'm here. this is an urge, not an emergency — your brain wants a state change, that's literally all this is.\n\nwhat's going on right now?" },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  async function send() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const userMsg: Msg = { role: "user", content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    try {
      const res = await fetch("/api/sos/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-8) }),
      });
      if (!res.ok) throw new Error();
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
      setMessages((p) => [...p, { role: "assistant", content: full }]);
      setStreamingText("");
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "I'm still here. Something went wrong on my end — can you try again?" }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "4px 0 16px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "82%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user" ? "#3D3535" : "rgba(255,255,255,0.85)",
                color: m.role === "user" ? "#fff" : "#281A24",
                fontSize: 14,
                lineHeight: 1.6,
                border: m.role === "assistant" ? "1px solid rgba(200,100,140,0.15)" : "none",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming && streamingText && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.85)", color: "#281A24", fontSize: 14, lineHeight: 1.6, border: "1px solid rgba(200,100,140,0.15)", whiteSpace: "pre-wrap" }}>
              {streamingText}
            </div>
          </div>
        )}
        {streaming && !streamingText && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 16px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(200,100,140,0.15)", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#C0607A", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingTop: 12, borderTop: "1px solid rgba(200,100,140,0.12)" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Tell me what's happening right now..."
          rows={2}
          style={{
            flex: 1, resize: "none", border: "1px solid rgba(200,100,140,0.25)", borderRadius: 14,
            padding: "10px 14px", fontSize: 14, lineHeight: 1.5, background: "rgba(255,255,255,0.7)",
            color: "#281A24", outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
            background: !input.trim() || streaming ? "#E0C0D0" : "#C0607A",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── EFT Tapping Guide ────────────────────────────────────────────────────────

const POINT_LOCATIONS: Record<string, string> = {
  "Karate Chop": "Side edge of your hand (below the pinky)",
  "Eyebrow": "Inner edge of your eyebrow",
  "Side of eye": "Outer corner of your eye (on the bone)",
  "Under eye": "Under the centre of your eye (on the bone)",
  "Under nose": "Between your nose and upper lip",
  "Chin": "Midpoint between your lower lip and chin",
  "Collarbone": "Just below your collarbone (either side)",
  "Under arm": "About 4 inches below your armpit",
  "Top of head": "Centre of the top of your head",
};

function TappingGuide() {
  const [stepIndex, setStepIndex] = useState(0);
  const [pointIndex, setPointIndex] = useState(0);
  const [setupPhraseIndex, setSetupPhraseIndex] = useState(0);

  const step = TAPPING_STEPS[stepIndex];

  function nextPoint() {
    if (step.kind === "setup") {
      if (setupPhraseIndex < step.phrases.length - 1) { setSetupPhraseIndex((p) => p + 1); return; }
      setSetupPhraseIndex(0); setStepIndex((s) => s + 1); setPointIndex(0); return;
    }
    if (step.kind === "round") {
      if (pointIndex < step.points.length - 1) { setPointIndex((p) => p + 1); return; }
      setStepIndex((s) => s + 1); setPointIndex(0); return;
    }
    if (stepIndex < TAPPING_STEPS.length - 1) setStepIndex((s) => s + 1);
  }

  function prevPoint() {
    if (step.kind === "setup" && setupPhraseIndex > 0) { setSetupPhraseIndex((p) => p - 1); return; }
    if (step.kind === "round" && pointIndex > 0) { setPointIndex((p) => p - 1); return; }
    if (stepIndex > 0) { setStepIndex((s) => s - 1); setPointIndex(0); setSetupPhraseIndex(0); }
  }

  function reset() { setStepIndex(0); setPointIndex(0); setSetupPhraseIndex(0); }

  const isLast = stepIndex === TAPPING_STEPS.length - 1;
  const totalPoints = TAPPING_STEPS.filter((s) => s.kind === "round").reduce((a, s) => a + (s.kind === "round" ? s.points.length : 0), 0);
  const donePoints = TAPPING_STEPS.slice(0, stepIndex)
    .filter((s) => s.kind === "round")
    .reduce((a, s) => a + (s.kind === "round" ? s.points.length : 0), 0) + (step.kind === "round" ? pointIndex : 0);
  const overallPct = Math.round((donePoints / (totalPoints || 1)) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#9A7090" }}>Step {stepIndex + 1} of {TAPPING_STEPS.length}</span>
          {step.kind === "round" && <span style={{ fontSize: 11, color: "#9A7090" }}>{overallPct}% through rounds</span>}
        </div>
        <div style={{ height: 4, background: "#F0D8E8", borderRadius: 4 }}>
          <div style={{ height: 4, background: "#C0607A", borderRadius: 4, width: `${((stepIndex) / (TAPPING_STEPS.length - 1)) * 100}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Step content */}
      {step.kind === "mantra" && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌊</div>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 22, color: "#281A24", fontWeight: 400, marginBottom: 8 }}>
            This is an urge, not an emergency.
          </p>
          <p style={{ fontSize: 14, color: "#7A4868", lineHeight: 1.6, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
            An urge is your nervous system asking for a state change. It peaks and passes — always. We&apos;re going to ride it together with EFT tapping, rooted in DBT distress tolerance.
          </p>
          <p style={{ fontSize: 13, color: "#9A7090", marginBottom: 0 }}>Tap the point shown, repeat the phrase aloud or in your head, about 7 times per point.</p>
        </div>
      )}

      {step.kind === "setup" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#C0607A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Setup</span>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#281A24", marginTop: 4 }}>Karate Chop</p>
            <p style={{ fontSize: 13, color: "#9A7090", marginTop: 2 }}>{POINT_LOCATIONS["Karate Chop"]}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "20px 18px", border: "1px solid rgba(200,100,140,0.15)", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#9A7090", marginBottom: 8 }}>Phrase {setupPhraseIndex + 1} of {step.phrases.length} — tap while saying:</p>
            <p style={{ fontSize: 15, color: "#281A24", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{step.phrases[setupPhraseIndex]}&rdquo;
            </p>
          </div>
          <p style={{ fontSize: 12, color: "#9A7090" }}>DBT: Radical acceptance in micro-dose. You don&apos;t have to like the urge — just acknowledge it&apos;s here without fighting it.</p>
        </div>
      )}

      {step.kind === "round" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#C0607A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{step.label}</span>
            <p style={{ fontSize: 13, color: "#7A4868", marginTop: 3 }}>{step.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {step.points.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= pointIndex ? "#C0607A" : "#F0D8E8", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "20px 18px", border: "1px solid rgba(200,100,140,0.15)", marginBottom: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#281A24", marginBottom: 4 }}>{step.points[pointIndex].point}</p>
            <p style={{ fontSize: 12, color: "#9A7090", marginBottom: 14 }}>{POINT_LOCATIONS[step.points[pointIndex].point]}</p>
            <p style={{ fontSize: 15, color: "#281A24", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{step.points[pointIndex].phrase}&rdquo;
            </p>
          </div>
          <p style={{ fontSize: 12, color: "#9A7090" }}>
            {step.label.includes("1") && "ACT: Defusion — naming the urge creates distance from it. You're observing it, not being it."}
            {step.label.includes("2") && "DBT: Urge surfing — the urge is a wave. It peaks. It breaks. You don't have to act on it."}
            {step.label.includes("3") && "ACT: Committed action — what your brain actually needs is stimulation. You get to choose what that is."}
          </p>
        </div>
      )}

      {step.kind === "bridge" && (
        <div>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 20, color: "#281A24", marginBottom: 6 }}>The replacement bridge</p>
          <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 18, lineHeight: 1.6 }}>
            Your brain needed stimulation, not food. Now give it something real. Pick one and do it for 30 seconds.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {BRIDGE_ACTIONS.map((a) => (
              <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.7)", borderRadius: 12, border: "1px solid rgba(200,100,140,0.15)" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#281A24", marginBottom: 1 }}>{a.label}</p>
                  <p style={{ fontSize: 12, color: "#9A7090" }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(180,220,180,0.2)", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(100,160,100,0.2)" }}>
            <p style={{ fontSize: 13, color: "#4A6B4A", lineHeight: 1.6 }}>
              <strong>The AND that breaks the loop:</strong> &ldquo;I can feel this urge AND choose what I do next.&rdquo; Not suppression. Not giving in. Both things, parallel.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <Button variant="ghost" size="sm" onClick={prevPoint} disabled={stepIndex === 0 && pointIndex === 0 && setupPhraseIndex === 0}>
          <ChevronLeft size={14} /> Back
        </Button>
        {isLast ? (
          <Button variant="secondary" size="sm" onClick={reset}>
            <RotateCcw size={14} /> Start again
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={nextPoint}>
            {step.kind === "mantra" ? "Start tapping" : step.kind === "bridge" ? "Done" : "Next"} <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Toolkit ──────────────────────────────────────────────────────────────────

function Toolkit() {
  const [openTool, setOpenTool] = useState<string | null>(null);

  const tools = [
    {
      id: "surf",
      icon: <span style={{ fontSize: 22 }}>🌊</span>,
      label: "Urge surfing",
      desc: "2-minute timer. Ride the wave.",
      dbtAct: "DBT distress tolerance",
      component: <UrgeSurfingTimer />,
    },
    {
      id: "breath",
      icon: <Wind size={20} color="#7AA8C0" />,
      label: "4-6 Breathing",
      desc: "Exhale longer to activate the vagus nerve.",
      dbtAct: "DBT TIPP — Paced breathing",
      component: <BreathingTool />,
    },
    {
      id: "ground",
      icon: <Hand size={20} color="#C0A07A" />,
      label: "5-4-3-2-1 Grounding",
      desc: "Drop anchor in the present moment.",
      dbtAct: "ACT — Contact with the present moment",
      component: <GroundingGuide />,
    },
    {
      id: "tipp",
      icon: <Zap size={20} color="#C0607A" />,
      label: "Quick TIPP",
      desc: "Fast body regulation right now.",
      dbtAct: "DBT TIPP",
      component: <TIPPGuide />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tools.map((t) => (
        <div key={t.id}>
          <div
            onClick={() => setOpenTool(openTool === t.id ? null : t.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.75)", borderRadius: 14, border: `1px solid ${openTool === t.id ? "rgba(192,96,122,0.35)" : "rgba(200,100,140,0.15)"}`, cursor: "pointer", transition: "all 0.15s" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(200,100,140,0.12)" }}>
              {t.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#281A24" }}>{t.label}</p>
              <p style={{ fontSize: 12, color: "#9A7090" }}>{t.desc}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#C0607A", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.dbtAct}</span>
              <ChevronRight size={14} color="#9A7090" style={{ transform: openTool === t.id ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </div>
          </div>
          {openTool === t.id && (
            <div style={{ padding: "16px", background: "rgba(250,240,245,0.8)", borderRadius: "0 0 14px 14px", border: "1px solid rgba(200,100,140,0.12)", borderTop: "none", marginTop: -2 }}>
              {t.component}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GroundingGuide() {
  const steps = [
    { num: 5, sense: "see", prompt: "Look around. Name 5 things you can see right now." },
    { num: 4, sense: "touch", prompt: "Notice 4 things you can physically feel — your feet on the floor, fabric on your skin, temperature of the air." },
    { num: 3, sense: "hear", prompt: "Listen carefully. Name 3 sounds you can hear." },
    { num: 2, sense: "smell", prompt: "Notice 2 things you can smell (or breathe in and notice the air)." },
    { num: 1, sense: "taste", prompt: "Notice 1 thing you can taste." },
  ];
  const [idx, setIdx] = useState(0);
  const done = idx >= steps.length;

  return (
    <div style={{ textAlign: "center" }}>
      {done ? (
        <div>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🌿</p>
          <p style={{ fontSize: 14, color: "#4A6B4A", fontWeight: 500, marginBottom: 8 }}>You&apos;re here. In this moment.</p>
          <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 16 }}>The urge exists in your mind. This room, this moment — this is real too.</p>
          <Button variant="ghost" size="sm" onClick={() => setIdx(0)}><RotateCcw size={13} /> Again</Button>
        </div>
      ) : (
        <div>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#C0607A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, margin: "0 auto 14px" }}>
            {steps[idx].num}
          </div>
          <p style={{ fontSize: 13, color: "#9A7090", marginBottom: 8 }}>things you can <strong>{steps[idx].sense}</strong></p>
          <p style={{ fontSize: 14, color: "#281A24", lineHeight: 1.6, marginBottom: 20 }}>{steps[idx].prompt}</p>
          <Button variant="primary" size="sm" onClick={() => setIdx((i) => i + 1)}>
            Done <ChevronRight size={13} />
          </Button>
        </div>
      )}
    </div>
  );
}

function TIPPGuide() {
  const steps = [
    { letter: "T", name: "Temperature", instruction: "Splash cold water on your face or hold something cold. This activates the dive reflex — your heart rate drops within seconds.", duration: "30 seconds" },
    { letter: "I", name: "Intense Exercise", instruction: "30 seconds of jumping jacks, running in place, or shaking your arms and legs fast. Burn the adrenaline.", duration: "30 seconds" },
    { letter: "P", name: "Paced Breathing", instruction: "Breathe in for 4 counts. Breathe out for 6-8 counts. The long exhale activates your vagus nerve. Do 5 rounds.", duration: "~1 minute" },
    { letter: "P", name: "Progressive Relaxation", instruction: "Tense your fists as tight as you can while breathing in (5 seconds). Release completely as you breathe out. Shoulders next. Then your whole body.", duration: "2 minutes" },
  ];
  const [idx, setIdx] = useState(0);
  const done = idx >= steps.length;

  return (
    <div>
      {done ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>✓</p>
          <p style={{ fontSize: 14, color: "#4A6B4A", fontWeight: 500, marginBottom: 8 }}>TIPP complete.</p>
          <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 16 }}>Your nervous system has had a reset. Check in — how&apos;s the urge now?</p>
          <Button variant="ghost" size="sm" onClick={() => setIdx(0)}><RotateCcw size={13} /> Again</Button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: i <= idx ? "#C0607A" : "#F0D8E8", color: i <= idx ? "white" : "#9A7090", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, margin: "0 auto 4px", transition: "all 0.3s" }}>
                  {s.letter}
                </div>
                <span style={{ fontSize: 9, color: i <= idx ? "#C0607A" : "#9A7090" }}>{s.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#281A24", marginBottom: 4 }}>{steps[idx].name}</p>
          <p style={{ fontSize: 11, color: "#C0607A", fontWeight: 500, marginBottom: 10 }}>{steps[idx].duration}</p>
          <p style={{ fontSize: 13, color: "#3D3535", lineHeight: 1.65, marginBottom: 18 }}>{steps[idx].instruction}</p>
          <Button variant="primary" size="sm" onClick={() => setIdx((i) => i + 1)}>
            Done <ChevronRight size={13} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "tapping" | "talk" | "toolkit";

export default function SOSPage() {
  const [tab, setTab] = useState<Tab>("tapping");

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "tapping", label: "EFT Tapping", emoji: "✋" },
    { id: "talk", label: "Talk to Eden", emoji: "💬" },
    { id: "toolkit", label: "Toolkit", emoji: "🧰" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #fdf0f5 0%, #f5e4ec 100%)", minHeight: "100vh" }}>
      <div className="mobile-top-pad" style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", flex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C0607A", boxShadow: "0 0 8px rgba(192,96,122,0.6)", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#C0607A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Binge Urge SOS</span>
          </div>
          <CardTitle style={{ fontSize: 26, marginBottom: 4 }}>You&apos;re not broken.</CardTitle>
          <p style={{ fontSize: 14, color: "#7A4868", lineHeight: 1.6 }}>
            This is an urge, not an emergency. It will peak and pass. Let&apos;s ride it together — using DBT distress tolerance and ACT urge surfing.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: 4, border: "1px solid rgba(200,100,140,0.15)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "9px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === t.id ? "white" : "transparent",
                color: tab === t.id ? "#C0607A" : "#9A7090",
                fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
                fontFamily: "inherit",
                boxShadow: tab === t.id ? "0 1px 6px rgba(180,60,100,0.12)" : "none",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              <span>{t.emoji}</span>
              <span style={{ display: "none", whiteSpace: "nowrap" }}>{t.label}</span>
              <span style={{ fontSize: 11 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "tapping" && (
          <Card variant="white" padding="md">
            <TappingGuide />
          </Card>
        )}

        {tab === "talk" && (
          <Card variant="white" padding="md" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 480 }}>
            <SOSChat />
          </Card>
        )}

        {tab === "toolkit" && (
          <div>
            <p style={{ fontSize: 13, color: "#7A4868", marginBottom: 14, lineHeight: 1.6 }}>
              These tools are rooted in DBT&apos;s TIPP (Temperature, Intense exercise, Paced breathing, Progressive relaxation) and ACT&apos;s present-moment grounding. Each one directly changes your physiological state — not just your thoughts.
            </p>
            <Toolkit />
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
