"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward, Zap, Timer } from "lucide-react";
import ChibiCharacter from "@/components/features/ChibiCharacter";
import Card, { CardTitle } from "@/components/ui/Card";

// ─── Pomodoro ────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short_break" | "long_break";

const MODES: { key: TimerMode; label: string; minutes: number; color: string }[] = [
  { key: "focus", label: "Focus", minutes: 25, color: "#F2C4CE" },
  { key: "short_break", label: "Short break", minutes: 5, color: "#D8E4D6" },
  { key: "long_break", label: "Long break", minutes: 15, color: "#C8B8D8" },
];

const AFFIRMATIONS = [
  "One task at a time. That's all.",
  "You are doing better than you think.",
  "Progress, not perfection.",
  "Your brain works differently. That's a strength.",
  "Every minute of focus counts.",
  "You started. That's the hardest part.",
  "Rest is productive too.",
];

function PomodoroTab() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [affIdx, setAffIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMode = MODES.find((m) => m.key === mode)!;

  useEffect(() => {
    setSeconds(currentMode.minutes * 60);
    setRunning(false);
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            if (mode === "focus") setCycles((c) => c + 1);
            clearInterval(intervalRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode]);

  useEffect(() => {
    const t = setInterval(() => setAffIdx((i) => (i + 1) % AFFIRMATIONS.length), 8000);
    return () => clearInterval(t);
  }, []);

  function reset() { setSeconds(currentMode.minutes * 60); setRunning(false); }
  function skip() { setSeconds(0); setRunning(false); if (mode === "focus") setCycles((c) => c + 1); }

  const totalSeconds = currentMode.minutes * 60;
  const progress = 1 - seconds / totalSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  const chibiMood = running ? "thriving" : cycles >= 4 ? "happy" : "okay";

  return (
    <>
      {/* Mode selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "40px" }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "8px 20px", borderRadius: "99px",
              border: `1.5px solid ${mode === m.key ? m.color : "#F0EBE3"}`,
              background: mode === m.key ? m.color : "transparent",
              color: mode === m.key ? "#3D3535" : "#9B8E8E",
              fontSize: "13px", fontWeight: mode === m.key ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid-focus" style={{ gap: "32px", alignItems: "center" }}>
        {/* Timer circle */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <div style={{ position: "relative", width: "220px", height: "220px" }}>
            <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="110" cy="110" r={radius} fill="none" stroke="#F0EBE3" strokeWidth="8" />
              <circle
                cx="110" cy="110" r={radius} fill="none"
                stroke={currentMode.color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "52px", fontWeight: 300, color: "#3D3535", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {mins}:{secs}
              </span>
              <span style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {currentMode.label}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={reset}
              style={{ border: "1px solid #F0EBE3", borderRadius: "12px", padding: "10px 14px", background: "white", cursor: "pointer", display: "flex" }}
            >
              <RotateCcw size={16} color="#9B8E8E" />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              style={{
                border: "none", borderRadius: "16px", padding: "14px 40px",
                background: running ? "#F0EBE3" : "#3D3535",
                color: running ? "#9B8E8E" : "white",
                fontSize: "14px", fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
                transition: "all 0.2s",
              }}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={skip}
              style={{ border: "1px solid #F0EBE3", borderRadius: "12px", padding: "10px 14px", background: "white", cursor: "pointer", display: "flex" }}
            >
              <SkipForward size={16} color="#9B8E8E" />
            </button>
          </div>

          {/* Cycles */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i < (cycles % 4) ? "#F2C4CE" : "#F0EBE3", transition: "background 0.3s" }} />
            ))}
            <span style={{ fontSize: "12px", color: "#9B8E8E", marginLeft: "6px" }}>
              {cycles} {cycles === 1 ? "session" : "sessions"} complete
            </span>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card variant="cream" padding="md">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <ChibiCharacter mood={chibiMood} outfit="study" size={100} animate={running} />
              <p style={{ fontSize: "12px", color: "#9B8E8E", textAlign: "center" }}>
                {running ? "Working with you" : seconds === 0 ? "Great work!" : "Ready when you are"}
              </p>
            </div>
          </Card>

          <Card padding="md">
            <p
              key={affIdx}
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "17px", fontStyle: "italic", color: "#6B5E5E",
                lineHeight: 1.5, textAlign: "center",
                animation: "fade-in 0.5s ease-out",
              }}
            >
              &ldquo;{AFFIRMATIONS[affIdx]}&rdquo;
            </p>
          </Card>

          <Card variant="cream" padding="sm">
            <CardTitle style={{ fontSize: "14px", marginBottom: "10px" }}>Quick tips</CardTitle>
            <ul style={{ display: "flex", flexDirection: "column", gap: "6px", listStyle: "none", padding: 0 }}>
              {["Close unnecessary tabs", "Put phone face down", "One task written down", "Water nearby"].map((tip) => (
                <li key={tip} style={{ fontSize: "12px", color: "#9B8E8E", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#F2C4CE", flexShrink: 0 }} />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Task Initiation ─────────────────────────────────────────────────────────

const KICKSTART_AFFIRMATIONS = [
  "Just 5 minutes. That's it.",
  "Starting is the whole battle.",
  "You don't have to finish. Just begin.",
  "Five minutes is always enough to start.",
  "Momentum builds from the smallest push.",
  "You've done hard things before.",
  "One tiny step. Right now.",
];

type InitiationPhase = "setup" | "running" | "done";

function TaskInitiationTab() {
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [phase, setPhase] = useState<InitiationPhase>("setup");
  const [seconds, setSeconds] = useState(0);
  const [affIdx, setAffIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = duration * 60;
  const remaining = totalSeconds - seconds;
  const progress = seconds / totalSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");

  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= totalSeconds) {
            clearInterval(intervalRef.current!);
            setPhase("done");
            return totalSeconds;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, totalSeconds]);

  useEffect(() => {
    if (phase === "running") {
      const t = setInterval(() => setAffIdx((i) => (i + 1) % KICKSTART_AFFIRMATIONS.length), 7000);
      return () => clearInterval(t);
    }
  }, [phase]);

  function start() {
    if (!task.trim()) return;
    setSeconds(0);
    setPhase("running");
    setAffIdx(Math.floor(Math.random() * KICKSTART_AFFIRMATIONS.length));
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("setup");
    setSeconds(0);
    setTask("");
  }

  function keepGoing() {
    setSeconds(0);
    setPhase("running");
  }

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="grid-focus" style={{ gap: "32px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Task input */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "10px" }}>
              What will you work on?
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. reply to those emails, open the document, fold the laundry…"
              rows={3}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px",
                border: "1.5px solid #EDE8E3", background: "white",
                fontSize: "15px", color: "#3D3535", resize: "none",
                fontFamily: "inherit", outline: "none", lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#EDE8E3"; }}
            />
          </div>

          {/* Duration picker */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "10px" }}>
              For how long?
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              {([5, 10] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    flex: 1, padding: "20px 16px", borderRadius: "14px",
                    border: `2px solid ${duration === d ? "#F2C4CE" : "#EDE8E3"}`,
                    background: duration === d ? "#FBF0F3" : "white",
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontSize: "36px", fontWeight: 300, color: duration === d ? "#A85070" : "#9B8E8E",
                    lineHeight: 1,
                  }}>
                    {d}
                  </span>
                  <span style={{ fontSize: "12px", color: duration === d ? "#A85070" : "#9B8E8E", fontWeight: duration === d ? 500 : 400 }}>
                    minutes
                  </span>
                  {d === 5 && (
                    <span style={{ fontSize: "10px", color: "#C9849A", background: "#FDE8EE", padding: "2px 8px", borderRadius: "99px", marginTop: "2px" }}>
                      good for starting
                    </span>
                  )}
                  {d === 10 && (
                    <span style={{ fontSize: "10px", color: "#7A8E6E", background: "#EEF3EC", padding: "2px 8px", borderRadius: "99px", marginTop: "2px" }}>
                      a little more
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={start}
            disabled={!task.trim()}
            style={{
              padding: "16px 32px", borderRadius: "16px", border: "none",
              background: task.trim() ? "#3D3535" : "#EDE8E3",
              color: task.trim() ? "white" : "#C0B4B4",
              fontSize: "15px", fontWeight: 500, cursor: task.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "all 0.2s", alignSelf: "flex-start",
            }}
          >
            <Zap size={17} />
            Start {duration}-minute sprint
          </button>
        </div>

        {/* Right: explainer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Card variant="cream" padding="md">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <ChibiCharacter mood="okay" outfit="study" size={90} animate={false} />
              <p style={{ fontSize: "12px", color: "#9B8E8E", textAlign: "center" }}>
                Ready to start together
              </p>
            </div>
          </Card>

          <Card padding="md">
            <CardTitle style={{ fontSize: "13px", marginBottom: "10px" }}>Why this works</CardTitle>
            <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0 }}>
              {[
                "Task initiation is the hardest step for ADHD brains",
                "Committing to just 5 min removes the pressure",
                "Once you start, momentum often carries you",
                "You only have to do this one small thing",
              ].map((tip) => (
                <li key={tip} style={{ fontSize: "12px", color: "#9B8E8E", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#F2C4CE", flexShrink: 0, marginTop: "6px" }} />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  // ── Running screen ────────────────────────────────────────────────────────
  if (phase === "running") {
    return (
      <div className="grid-focus" style={{ gap: "32px", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          {/* Task reminder */}
          <div style={{
            padding: "12px 20px", borderRadius: "12px", background: "#FBF0F3",
            border: "1px solid #F2C4CE", maxWidth: "340px", textAlign: "center",
          }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#C9849A", marginBottom: "4px" }}>Working on</p>
            <p style={{ fontSize: "14px", color: "#3D3535", fontWeight: 500 }}>{task}</p>
          </div>

          {/* Circle */}
          <div style={{ position: "relative", width: "220px", height: "220px" }}>
            <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="110" cy="110" r={radius} fill="none" stroke="#F0EBE3" strokeWidth="8" />
              <circle
                cx="110" cy="110" r={radius} fill="none"
                stroke="#F2C4CE"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "52px", fontWeight: 300, color: "#3D3535", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {mins}:{secs}
              </span>
              <span style={{ fontSize: "11px", color: "#9B8E8E", marginTop: "4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                remaining
              </span>
            </div>
          </div>

          <button
            onClick={reset}
            style={{
              border: "1px solid #EDE8E3", borderRadius: "12px", padding: "8px 20px",
              background: "white", cursor: "pointer", fontSize: "13px", color: "#9B8E8E",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <RotateCcw size={13} /> Stop & reset
          </button>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card variant="cream" padding="md">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <ChibiCharacter mood="thriving" outfit="study" size={100} animate={true} />
              <p style={{ fontSize: "12px", color: "#9B8E8E", textAlign: "center" }}>
                Working alongside you
              </p>
            </div>
          </Card>

          <Card padding="md">
            <p
              key={affIdx}
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "17px", fontStyle: "italic", color: "#6B5E5E",
                lineHeight: 1.5, textAlign: "center",
                animation: "fade-in 0.5s ease-out",
              }}
            >
              &ldquo;{KICKSTART_AFFIRMATIONS[affIdx]}&rdquo;
            </p>
          </Card>

          <Card variant="cream" padding="sm">
            <p style={{ fontSize: "12px", color: "#9B8E8E", lineHeight: 1.6 }}>
              Just stay with the task for now. You don&apos;t have to finish — you just have to keep going until the timer ends.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", paddingTop: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "linear-gradient(135deg, #F2C4CE, #D8E4D6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: "32px",
        }}>
          ✨
        </div>
        <h2 style={{
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontSize: "32px", fontWeight: 400, color: "#3D3535", marginBottom: "8px",
        }}>
          You did it.
        </h2>
        <p style={{ color: "#9B8E8E", fontSize: "14px", lineHeight: 1.6, maxWidth: "380px" }}>
          You showed up for <strong style={{ color: "#3D3535" }}>{task}</strong> for {duration} whole minutes. That matters more than you know.
        </p>
      </div>

      <ChibiCharacter mood="happy" outfit="study" size={120} animate={false} />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={keepGoing}
          style={{
            padding: "14px 28px", borderRadius: "14px", border: "none",
            background: "#3D3535", color: "white",
            fontSize: "14px", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <Play size={15} /> Keep going — another {duration} min
        </button>
        <button
          onClick={reset}
          style={{
            padding: "14px 28px", borderRadius: "14px",
            border: "1.5px solid #EDE8E3", background: "white",
            fontSize: "14px", color: "#7A6E6E", cursor: "pointer",
          }}
        >
          Start a new task
        </button>
      </div>

      <div style={{ maxWidth: "400px", width: "100%" }}>
        <Card variant="cream" padding="md" className="text-center">
          <p style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "18px", fontStyle: "italic", color: "#6B5E5E", lineHeight: 1.6,
          }}>
            &ldquo;You started. That&apos;s the hardest part.&rdquo;
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

type Tab = "pomodoro" | "initiation";

export default function FocusPage() {
  const [tab, setTab] = useState<Tab>("pomodoro");

  return (
    <div className="page-padding" style={{ maxWidth: "760px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>ADHD Focus</p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>Focus <em>Tools</em></h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>Work in gentle sprints. Starting is always enough.</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0", marginBottom: "36px", border: "1.5px solid #EDE8E3", borderRadius: "12px", overflow: "hidden", width: "fit-content" }}>
        {([
          { key: "pomodoro", label: "Focus Timer", icon: Timer },
          { key: "initiation", label: "Task Initiation", icon: Zap },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 24px", border: "none",
              background: tab === key ? "#3D3535" : "white",
              color: tab === key ? "white" : "#9B8E8E",
              fontSize: "13px", fontWeight: tab === key ? 500 : 400,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: "7px",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "pomodoro" ? <PomodoroTab /> : <TaskInitiationTab />}
    </div>
  );
}
