"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingState {
  preferredName: string;
  reasons: string[];
  biggestGoal: string;
  supportStyle: string;
  diagnoses: string[];
  additionalContext: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REASON_OPTIONS = [
  { id: "adhd", label: "Managing ADHD" },
  { id: "habits", label: "Building better habits" },
  { id: "mental_health", label: "Mental health support" },
  { id: "focus", label: "Focus & productivity" },
  { id: "stress", label: "Managing stress & anxiety" },
  { id: "self_care", label: "Self-care & routines" },
  { id: "food", label: "Eating & nourishment" },
  { id: "purpose", label: "Finding clarity & purpose" },
];

const SUPPORT_STYLES = [
  {
    id: "gentle",
    label: "Gentle & soft",
    desc: "Lots of warmth, go slow, be patient with me",
  },
  {
    id: "direct",
    label: "Direct & honest",
    desc: "Tell me what you see, even if it's hard to hear",
  },
  {
    id: "cheerful",
    label: "Cheerful & playful",
    desc: "Keep it light, celebrate wins, stay upbeat",
  },
  {
    id: "balanced",
    label: "A mix of everything",
    desc: "Read the room and give me what I need",
  },
];

const DIAGNOSIS_OPTIONS = [
  { id: "adhd", label: "ADHD" },
  { id: "anxiety", label: "Anxiety" },
  { id: "depression", label: "Depression" },
  { id: "autism", label: "Autism / AuDHD" },
  { id: "trauma", label: "Trauma / PTSD" },
  { id: "ocd", label: "OCD" },
  { id: "eating", label: "Eating disorder" },
  { id: "other_nd", label: "Other neurodivergence" },
];

const TOTAL_STEPS = 5;

// ── Step components ────────────────────────────────────────────────────────────

function StepName({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={styles.edenLine}>
          Hi there — I'm Eden. I'm so glad you're here.
        </p>
        <p style={styles.edenLine}>
          Before we begin, I'd love to know — what would you like me to call
          you?
        </p>
        <p style={{ ...styles.subText, marginTop: "8px" }}>
          Your account name is fine too, just let me know if you prefer
          something different.
        </p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your preferred name…"
        style={styles.input}
        autoFocus
        onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
        onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
      />
    </div>
  );
}

function StepReasons({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((r) => r !== id) : [...value, id]
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={styles.edenLine}>What brings you to Eden?</p>
        <p style={styles.subText}>
          Choose everything that feels true — there's no wrong answer.
        </p>
      </div>
      <div
        className="grid-2-col"
        style={{
          gap: "10px",
        }}
      >
        {REASON_OPTIONS.map((r) => {
          const selected = value.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              style={{
                ...styles.chip,
                background: selected ? "#3D3535" : "white",
                color: selected ? "white" : "#3D3535",
                borderColor: selected ? "#3D3535" : "#F0EBE3",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoal({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={styles.edenLine}>
          What's the one thing you most want to change or work on right now?
        </p>
        <p style={styles.subText}>
          Dream big or start small — either is perfect.
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="I want to…"
        rows={4}
        style={{
          ...styles.input,
          resize: "none",
          lineHeight: 1.6,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
        onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
      />
    </div>
  );
}

function StepStyle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={styles.edenLine}>How would you like me to support you?</p>
        <p style={styles.subText}>
          You can always tell me in the moment, but this helps me start right.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {SUPPORT_STYLES.map((s) => {
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              style={{
                ...styles.optionCard,
                background: selected ? "#FAE8EC" : "white",
                borderColor: selected ? "#C0607A" : "#F0EBE3",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: selected ? "#C0607A" : "#3D3535",
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#9B8E8E",
                  marginTop: "2px",
                }}
              >
                {s.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepContext({
  diagnoses,
  onDiagnosesChange,
  additionalContext,
  onContextChange,
}: {
  diagnoses: string[];
  onDiagnosesChange: (v: string[]) => void;
  additionalContext: string;
  onContextChange: (v: string) => void;
}) {
  const toggle = (id: string) => {
    onDiagnosesChange(
      diagnoses.includes(id)
        ? diagnoses.filter((d) => d !== id)
        : [...diagnoses, id]
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={styles.edenLine}>
          Is there anything important I should know about you?
        </p>
        <p style={styles.subText}>
          Completely optional. The more you share, the better I can show up for
          you.
        </p>
      </div>

      <div>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#6B5E5E",
            marginBottom: "10px",
          }}
        >
          Diagnoses or neurodivergence (select any that apply)
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {DIAGNOSIS_OPTIONS.map((d) => {
            const selected = diagnoses.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                style={{
                  ...styles.chip,
                  background: selected ? "#EDE5F5" : "white",
                  color: selected ? "#6B3FA0" : "#3D3535",
                  borderColor: selected ? "#C4A8E0" : "#F0EBE3",
                  fontSize: "13px",
                  padding: "8px 14px",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#6B5E5E",
            marginBottom: "10px",
          }}
        >
          Anything else you'd like me to know
        </p>
        <textarea
          value={additionalContext}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="Life situation, what you've tried before, fears, hopes…"
          rows={3}
          style={{
            ...styles.input,
            resize: "none",
            lineHeight: 1.6,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#F2C4CE")}
          onBlur={(e) => (e.target.style.borderColor = "#F0EBE3")}
        />
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const styles = {
  edenLine: {
    fontFamily: "var(--font-cormorant, Georgia, serif)",
    fontSize: "24px",
    fontWeight: 400,
    color: "#3D3535",
    lineHeight: 1.4,
    marginBottom: "4px",
  } as React.CSSProperties,

  subText: {
    fontSize: "14px",
    color: "#9B8E8E",
    lineHeight: 1.6,
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #F0EBE3",
    background: "white",
    fontSize: "15px",
    color: "#3D3535",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  } as React.CSSProperties,

  chip: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1.5px solid",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
  } as React.CSSProperties,

  optionCard: {
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  } as React.CSSProperties,
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    preferredName: "",
    reasons: [],
    biggestGoal: "",
    supportStyle: "",
    diagnoses: [],
    additionalContext: "",
  });

  const update = <K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K]
  ) => setState((s) => ({ ...s, [key]: value }));

  const canContinue = () => {
    if (step === 1) return true; // name is optional
    if (step === 2) return state.reasons.length > 0;
    if (step === 3) return state.biggestGoal.trim().length > 0;
    if (step === 4) return state.supportStyle !== "";
    return true; // step 5 is optional
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    // Final step — save and redirect
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: state.preferredName,
          reasons: state.reasons.map(
            (id) => REASON_OPTIONS.find((r) => r.id === id)?.label ?? id
          ),
          biggestGoal: state.biggestGoal,
          supportStyle:
            SUPPORT_STYLES.find((s) => s.id === state.supportStyle)?.label ??
            state.supportStyle,
          diagnoses: state.diagnoses.map(
            (id) => DIAGNOSIS_OPTIONS.find((d) => d.id === id)?.label ?? id
          ),
          additionalContext: state.additionalContext,
        }),
      });
    } finally {
      router.push("/chat");
      router.refresh();
    }
  };

  const stepLabels = [
    "Your name",
    "Why you're here",
    "Your goal",
    "Support style",
    "About you",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-cormorant, Georgia, serif)",
              fontSize: "28px",
              fontWeight: 400,
              letterSpacing: "0.08em",
              color: "#3D3535",
              marginBottom: "8px",
            }}
          >
            Eden
          </p>
          {/* Progress dots */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i + 1 === step ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: i + 1 <= step ? "#C0607A" : "#F0EBE3",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "#9B8E8E",
              marginTop: "10px",
              letterSpacing: "0.04em",
            }}
          >
            {stepLabels[step - 1]} · {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "clamp(20px, 5vw, 40px)",
            border: "1px solid #F0EBE3",
            boxShadow: "0 4px 24px rgba(61,53,53,0.06)",
          }}
        >
          {step === 1 && (
            <StepName
              value={state.preferredName}
              onChange={(v) => update("preferredName", v)}
            />
          )}
          {step === 2 && (
            <StepReasons
              value={state.reasons}
              onChange={(v) => update("reasons", v)}
            />
          )}
          {step === 3 && (
            <StepGoal
              value={state.biggestGoal}
              onChange={(v) => update("biggestGoal", v)}
            />
          )}
          {step === 4 && (
            <StepStyle
              value={state.supportStyle}
              onChange={(v) => update("supportStyle", v)}
            />
          )}
          {step === 5 && (
            <StepContext
              diagnoses={state.diagnoses}
              onDiagnosesChange={(v) => update("diagnoses", v)}
              additionalContext={state.additionalContext}
              onContextChange={(v) => update("additionalContext", v)}
            />
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
          }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                background: "none",
                border: "none",
                color: "#9B8E8E",
                fontSize: "14px",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canContinue() || saving}
            style={{
              padding: "14px 32px",
              borderRadius: "12px",
              background: canContinue() && !saving ? "#3D3535" : "#F0EBE3",
              color: canContinue() && !saving ? "white" : "#9B8E8E",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              border: "none",
              cursor: canContinue() && !saving ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (canContinue() && !saving)
                e.currentTarget.style.background = "#2A2020";
            }}
            onMouseLeave={(e) => {
              if (canContinue() && !saving)
                e.currentTarget.style.background = "#3D3535";
            }}
          >
            {saving
              ? "Saving…"
              : step === TOTAL_STEPS
              ? "Meet Eden →"
              : "Continue →"}
          </button>
        </div>

        {/* Skip link on last step */}
        {step === TOTAL_STEPS && (
          <p style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              onClick={handleNext}
              disabled={saving}
              style={{
                background: "none",
                border: "none",
                color: "#9B8E8E",
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Skip this step
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
