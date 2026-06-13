"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type PromptCategory = "before" | "urge" | "after";

const PROMPTS: Record<PromptCategory, string[]> = {
  before: [
    "What emotion am I feeling right now, before I eat?",
    "Where in my body do I notice this sensation — is it physical hunger or something emotional?",
    "What triggered the urge to eat right now? Was it a thought, a feeling, or a situation?",
    "On a scale of 1–10, how strong is my urge to eat past fullness? What does that number feel like?",
    "What need am I trying to meet with food right now? Could it be met another way?",
    "If I waited 10 minutes, would this urge feel different? What am I afraid of feeling?",
  ],
  urge: [
    "Can I sit with this urge for 5 minutes without acting on it? What do I notice as I wait?",
    "What would I say to a dear friend who was feeling this same urge right now?",
    "Describe this urge like a wave — how big is it? Is it building, cresting, or starting to pass?",
    "What is one thing I can do to cope with this feeling that isn't food?",
    "What emotion is underneath this urge? Can I name it and let it exist without judgment?",
    "This feeling will pass. What small act of care can I offer myself right now?",
  ],
  after: [
    "How do I feel after eating? Is it different from how I felt before?",
    "Was this meal nourishing — for my body, my heart, or both?",
    "Did I eat mindfully or automatically? What was I thinking or feeling during the meal?",
    "What would I do differently next time? What went well that I want to remember?",
    "Whatever happened with this meal, I can hold it with compassion. What do I notice without self-criticism?",
    "This moment has already happened. What is one small thing within my control going forward?",
  ],
};

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  before: "Before eating",
  urge: "Urge surfing",
  after: "After eating",
};

const CATEGORY_COLORS: Record<PromptCategory, { bg: string; border: string; text: string; tab: string }> = {
  before: { bg: "#FAF5FF", border: "#E9D8FD", text: "#553C9A", tab: "#B794F4" },
  urge: { bg: "#FFF5F7", border: "#FED7E2", text: "#97266D", tab: "#F687B3" },
  after: { bg: "#F0FFF4", border: "#C6F6D5", text: "#276749", tab: "#68D391" },
};

interface DBTMealCheckInProps {
  prompt: string;
  reflection: string;
  onPromptChange: (prompt: string) => void;
  onReflectionChange: (reflection: string) => void;
}

export default function DBTMealCheckIn({
  prompt,
  reflection,
  onPromptChange,
  onReflectionChange,
}: DBTMealCheckInProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PromptCategory>("before");
  const [promptIndex, setPromptIndex] = useState(0);

  const currentPrompt = PROMPTS[category][promptIndex];
  const colors = CATEGORY_COLORS[category];

  function selectCategory(cat: PromptCategory) {
    setCategory(cat);
    setPromptIndex(0);
    const firstPrompt = PROMPTS[cat][0];
    onPromptChange(firstPrompt);
    if (reflection === prompt || reflection === "") {
      // Don't overwrite if user has typed something
    }
  }

  function shufflePrompt() {
    const next = (promptIndex + 1) % PROMPTS[category].length;
    setPromptIndex(next);
    onPromptChange(PROMPTS[category][next]);
  }

  function handleOpen() {
    if (!open) {
      onPromptChange(currentPrompt);
    }
    setOpen((v) => !v);
  }

  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1.5px solid ${open ? colors.border : "#EDE5E5"}`,
        overflow: "hidden",
        transition: "border-color 0.2s",
        background: open ? colors.bg : "white",
      }}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={handleOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🌸</span>
          <div style={{ textAlign: "left" }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: open ? colors.text : "#9B8E8E",
                margin: 0,
              }}
            >
              DBT check-in
            </p>
            {!open && (
              <p style={{ fontSize: "11px", color: "#B5A8A8", margin: 0, marginTop: "1px" }}>
                Optional writing prompt for this meal
              </p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp size={14} color={colors.text} />
        ) : (
          <ChevronDown size={14} color="#9B8E8E" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Category tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
            {(["before", "urge", "after"] as PromptCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: "99px",
                  border: `1px solid ${category === cat ? CATEGORY_COLORS[cat].tab : "#EDE5E5"}`,
                  background: category === cat ? CATEGORY_COLORS[cat].tab : "white",
                  color: category === cat ? "white" : "#9B8E8E",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.03em",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div
            style={{
              background: "white",
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#3D3535",
                lineHeight: 1.6,
                flex: 1,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              &ldquo;{currentPrompt}&rdquo;
            </p>
            <button
              type="button"
              onClick={shufflePrompt}
              title="Different prompt"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#C4B8B8",
                padding: "2px",
                flexShrink: 0,
                marginTop: "1px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Reflection textarea */}
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: colors.text,
                display: "block",
                marginBottom: "6px",
              }}
            >
              Your reflection
            </label>
            <textarea
              value={reflection}
              onChange={(e) => onReflectionChange(e.target.value)}
              placeholder="Write whatever comes up — no right answers here…"
              rows={4}
              style={{
                width: "100%",
                borderRadius: "10px",
                border: `1px solid ${colors.border}`,
                background: "white",
                padding: "10px 12px",
                fontSize: "13px",
                color: "#3D3535",
                resize: "vertical",
                lineHeight: 1.6,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.border = `1.5px solid ${colors.tab}`)}
              onBlur={(e) => (e.currentTarget.style.border = `1px solid ${colors.border}`)}
            />
          </div>

          <p style={{ fontSize: "11px", color: "#B5A8A8", marginTop: "8px", lineHeight: 1.5 }}>
            Based on DBT skills for emotional eating. This is for your eyes only.
          </p>
        </div>
      )}
    </div>
  );
}
