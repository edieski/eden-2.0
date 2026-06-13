"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Card from "@/components/ui/Card";

const STORAGE_KEY = "eden-ballet-plan-v1";

interface WeekData {
  week: number;
  title: string;
  theme: string;
  duration: string;
  barreSessions: { id: string; day: string }[];
  coreSessions: { id: string; day: string }[];
  barreVideo: { title: string; url: string };
  coreVideo: { title: string; url: string };
  stretchVideo: { title: string; url: string };
  barreItems: string[];
  coreItems: string[];
  stamina: string;
  stretchItems: string[];
  extras: { id: string; label: string }[];
}

const WEEKS: WeekData[] = [
  {
    week: 1,
    title: "Foundation",
    theme: "Posture, Core Activation & Gentle Intro",
    duration: "15–20 min + 5 min stretch",
    barreSessions: [
      { id: "w1-b1", day: "Monday" },
      { id: "w1-b2", day: "Wednesday" },
      { id: "w1-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w1-c1", day: "Tuesday" },
      { id: "w1-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "Absolute Beginner Ballet Barre for Adults & Teens — Everyday Ballet",
      url: "https://www.youtube.com/watch?v=S6Z7s9EVnTg",
    },
    coreVideo: {
      title: "8 Min Ballerina Core Workout — Train Like a Ballerina",
      url: "https://www.youtube.com/watch?v=T-n3eXEUk3o",
    },
    stretchVideo: {
      title: "10 Min Daily Stretching Routine — Ballet For All",
      url: "https://www.youtube.com/watch?v=Hld8lOQA4f0",
    },
    barreItems: ["Pliés in 1st & 2nd position", "Tendus front & side", "Relevés", "Alignment: shoulders down, long neck, neutral pelvis"],
    coreItems: ["8-min ballerina core workout", "3–5 min slow marching in place"],
    stamina: "5–10 min very slow walk or marching in place",
    stretchItems: ["Butterfly (hips)", "Seated forward fold (hamstrings)", "Standing quad stretch", "Wall calf stretch", "Seated spine twist"],
    extras: [
      { id: "w1-photos", label: "Took Week 1 posture photos" },
      { id: "w1-water", label: "Hit 3L+ water daily this week" },
    ],
  },
  {
    week: 2,
    title: "Build Stability",
    theme: "Tendus Back, Dégagés & Deeper Balance",
    duration: "20–25 min + 5–7 min stretch",
    barreSessions: [
      { id: "w2-b1", day: "Monday" },
      { id: "w2-b2", day: "Wednesday" },
      { id: "w2-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w2-c1", day: "Tuesday" },
      { id: "w2-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "25 Min Beginner Ballet Class — Kathryn Morgan (first 15–20 min)",
      url: "https://www.youtube.com/watch?v=Fu85TN5uBDE",
    },
    coreVideo: {
      title: "8 Min Core + 10 Min Quick Warm-Up Routine",
      url: "https://www.youtube.com/watch?v=IJloc6iwHCw",
    },
    stretchVideo: {
      title: "Beginner Ballet Stretches — Hannah Stevens (hips & hamstrings)",
      url: "https://www.youtube.com/watch?v=_8Kjs7NSa78",
    },
    barreItems: ["Tendus back", "Dégagés (small lifts off floor)", "Stability holds", "Smooth port de bras"],
    coreItems: ["8-min core workout", "10-min warm-up routine", "Focus on navel-to-spine engagement"],
    stamina: "10–15 min slow walk + marching with arm movements",
    stretchItems: ["Hip flexors", "Hamstrings", "Inner thigh (deeper butterfly)", "Seated forward fold"],
    extras: [
      { id: "w2-balance", label: "Practiced single-leg relevé hold" },
      { id: "w2-posture", label: "Checked posture in mirror this week" },
    ],
  },
  {
    week: 3,
    title: "Gentle Endurance",
    theme: "Longer Sessions & Continuous Flow",
    duration: "25–30 min + 7–10 min stretch",
    barreSessions: [
      { id: "w3-b1", day: "Monday" },
      { id: "w3-b2", day: "Wednesday" },
      { id: "w3-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w3-c1", day: "Tuesday" },
      { id: "w3-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "Beginner Ballet Barre 50 Min — Kathryn Morgan (first 20–25 min only)",
      url: "https://www.youtube.com/watch?v=ziT4ERqtS04",
    },
    coreVideo: {
      title: "8 Min Ballerina Core + Warm-Up",
      url: "https://www.youtube.com/watch?v=T-n3eXEUk3o",
    },
    stretchVideo: {
      title: "15 Min Gentle Daily Stretching — Ballet For All",
      url: "https://www.youtube.com/watch?v=M3qX-uRX0hY",
    },
    barreItems: ["Repeat sections for flow", "Musicality & rhythm focus", "Small turnout from hips only", "Minimal pausing"],
    coreItems: ["Core video + warm-up routine", "15 min slow walk afterward", "Marching with full arm swings"],
    stamina: "15 min slow walk — gentle continuous movement",
    stretchItems: ["25–30 sec holds each side", "Hip flexor lunge", "Hamstrings", "Deep calf stretch"],
    extras: [
      { id: "w3-flexibility", label: "Noted flexibility progress (forward fold)" },
      { id: "w3-review", label: "Mid-plan check-in — energy & soreness log" },
    ],
  },
  {
    week: 4,
    title: "Light Flow",
    theme: "Smooth Transitions & Full-Body Integration",
    duration: "30 min + 8–10 min stretch",
    barreSessions: [
      { id: "w4-b1", day: "Monday" },
      { id: "w4-b2", day: "Wednesday" },
      { id: "w4-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w4-c1", day: "Tuesday" },
      { id: "w4-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "Kathryn Morgan Beginner Playlist — mix 25–50 min videos",
      url: "https://www.youtube.com/playlist?list=PLGjHMNPqowdfuaIzONYmxbpZjzre5lQsc",
    },
    coreVideo: {
      title: "Core Workout + Warm-Up Routine",
      url: "https://www.youtube.com/watch?v=IJloc6iwHCw",
    },
    stretchVideo: {
      title: "Full Beginner Ballet Stretches — Hannah Stevens",
      url: "https://www.youtube.com/watch?v=_8Kjs7NSa78",
    },
    barreItems: ["Smooth transitions between exercises", "Gentle marching between sections", "Mix Everyday Ballet + Kathryn Morgan"],
    coreItems: ["Core workout + warm-up", "Short slow walk after", "Maintain consistent form"],
    stamina: "Marching between barre sections + 10 min walk",
    stretchItems: ["Supported hip flexor lunge", "Gentle straddle modification", "Spine twist", "Full ballet stretch routine"],
    extras: [
      { id: "w4-photos", label: "Week 4 progress photos taken" },
      { id: "w4-measurements", label: "Measurements logged" },
    ],
  },
  {
    week: 5,
    title: "Refinement",
    theme: "Sustained Effort & Musical Connection",
    duration: "30–35 min + 8–10 min stretch",
    barreSessions: [
      { id: "w5-b1", day: "Monday" },
      { id: "w5-b2", day: "Wednesday" },
      { id: "w5-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w5-c1", day: "Tuesday" },
      { id: "w5-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "Beginner Ballet Barre 25 Min (No Talking) — music-only flow",
      url: "https://www.youtube.com/watch?v=Yybu9H6VSqI",
    },
    coreVideo: {
      title: "8 Min Ballerina Core — extended",
      url: "https://www.youtube.com/watch?v=T-n3eXEUk3o",
    },
    stretchVideo: {
      title: "15 Min Gentle Stretch — alternate for variety",
      url: "https://www.youtube.com/watch?v=M3qX-uRX0hY",
    },
    barreItems: ["Music-only video — uninterrupted flow", "Longer continuous segments", "Trust your body, less pausing"],
    coreItems: ["Core + marching/walk combo", "Notice improved stamina vs Week 1", "Extend duration slightly"],
    stamina: "15–20 min slow walk — steady and continuous",
    stretchItems: ["Alternate videos for fresh feeling", "Full 30-sec holds each side", "Notice improved range of motion"],
    extras: [
      { id: "w5-range", label: "Forward fold improved — noted distance" },
      { id: "w5-balance", label: "Attempted relevé balance hold (5+ sec)" },
    ],
  },
  {
    week: 6,
    title: "Integration & Peak",
    theme: "Celebration, Flow & Final Assessment",
    duration: "30–40 min + 10 min stretch",
    barreSessions: [
      { id: "w6-b1", day: "Monday" },
      { id: "w6-b2", day: "Wednesday" },
      { id: "w6-b3", day: "Friday" },
    ],
    coreSessions: [
      { id: "w6-c1", day: "Tuesday" },
      { id: "w6-c2", day: "Thursday" },
    ],
    barreVideo: {
      title: "Mix your favorites — Kathryn Morgan + Everyday Ballet",
      url: "https://www.youtube.com/playlist?list=PLGjHMNPqowdfuaIzONYmxbpZjzre5lQsc",
    },
    coreVideo: {
      title: "Full Core Circuit — best effort",
      url: "https://www.youtube.com/watch?v=T-n3eXEUk3o",
    },
    stretchVideo: {
      title: "Full 15-Min Gentle Stretch — celebrate your progress",
      url: "https://www.youtube.com/watch?v=M3qX-uRX0hY",
    },
    barreItems: ["Mix all 6 weeks' sequences", "Flowing with minimal pauses", "Move with intention and grace"],
    coreItems: ["Core circuit", "20 min slow walk/marching", "Celebrate your endurance gains"],
    stamina: "20 min slow walk — steady, graceful, proud",
    stretchItems: ["Full 15-min routine", "Compare to Week 1 range", "Celebrate every inch of progress"],
    extras: [
      { id: "w6-posture", label: "Posture visibly improved — confirmed" },
      { id: "w6-photos", label: "Week 6 final progress photos taken" },
      { id: "w6-next", label: "Enrolled in ongoing beginner classes" },
    ],
  },
];

export default function BalletPlanPage() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCompleted(new Set(JSON.parse(stored)));
    } catch {}
    setMounted(true);
  }, []);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const toggleWeek = (week: number) =>
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allSessionIds = WEEKS.flatMap((w) => [
    ...w.barreSessions.map((s) => s.id),
    ...w.coreSessions.map((s) => s.id),
  ]);
  const totalCompleted = allSessionIds.filter((id) => completed.has(id)).length;
  const overallPct = Math.round((totalCompleted / allSessionIds.length) * 100);

  const weekProgress = (w: WeekData) => {
    const ids = [...w.barreSessions.map((s) => s.id), ...w.coreSessions.map((s) => s.id)];
    const done = ids.filter((id) => completed.has(id)).length;
    return { done, total: ids.length, pct: Math.round((done / ids.length) * 100) };
  };

  if (!mounted) return null;

  return (
    <div className="page-padding" style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
          6-Week Program
        </p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "42px", fontWeight: 400, color: "#3D3535", lineHeight: 1.1, marginBottom: "8px" }}>
          Ballet Core & Body Transformation
        </h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px" }}>
          Absolute beginner · Gentle progression · 5 days/week · Barre + Core + Stretch
        </p>
      </div>

      {/* Overall progress */}
      <Card variant="cream" padding="md">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#3D3535" }}>Overall Progress</span>
          <span style={{ fontSize: "13px", color: "#9B8E8E" }}>{totalCompleted} / {allSessionIds.length} sessions</span>
        </div>
        <div style={{ height: "7px", background: "#E8DFD8", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${overallPct}%`, background: "#C0607A", borderRadius: "99px", transition: "width 0.4s ease" }} />
        </div>
        <p style={{ fontSize: "12px", color: "#9B8E8E", marginTop: "6px" }}>{overallPct}% complete</p>
      </Card>

      {/* Warm-up reminder */}
      <div style={{ margin: "24px 0 8px", padding: "14px 18px", borderRadius: "12px", background: "#FAE8EC", border: "1px solid #F2C4CE" }}>
        <p style={{ fontSize: "13px", color: "#6B5E5E", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: "#C0607A" }}>Every session begins with 5 min warm-up:</span>
          {" "}slow march in place, arm circles, gentle neck & shoulder rolls, hip circles, ankle rolls.
        </p>
      </div>

      {/* Weeks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
        {WEEKS.map((week) => {
          const isOpen = expandedWeeks.has(week.week);
          const { done, total, pct } = weekProgress(week);
          const isComplete = done === total;
          const hasStarted = done > 0;
          const barreKey = `w${week.week}-barre`;
          const coreKey = `w${week.week}-core`;
          const stretchKey = `w${week.week}-stretch`;

          return (
            <Card
              key={week.week}
              variant={isComplete ? "sage" : "white"}
              padding="none"
            >
              {/* Week accordion header */}
              <div
                onClick={() => toggleWeek(week.week)}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px 22px", cursor: "pointer", userSelect: "none" }}
              >
                {/* Badge */}
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                  background: isComplete ? "#8FAB8A" : hasStarted ? "#FAE8EC" : "#F5F0EB",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontSize: "18px", fontWeight: 600,
                    color: isComplete ? "white" : hasStarted ? "#C0607A" : "#9B8E8E",
                  }}>
                    {week.week}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535" }}>
                      Week {week.week} — {week.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "#9B8E8E" }}>{week.duration}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#9B8E8E", marginBottom: "6px" }}>{week.theme}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, height: "4px", background: "#F0EBE3", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: isComplete ? "#8FAB8A" : "#F2C4CE", borderRadius: "99px", transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: "11px", color: "#9B8E8E", flexShrink: 0 }}>{done}/{total}</span>
                  </div>
                </div>

                <div style={{ color: "#C0C0B8", flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div style={{ padding: "0 22px 22px", borderTop: "1px solid #F0EBE3" }}>

                  {/* Barre Section */}
                  <div style={{ marginTop: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C0607A" }}>
                        Barre Days — Mon / Wed / Fri
                      </span>
                      <div
                        onClick={() => toggleSection(barreKey)}
                        style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer", userSelect: "none", color: "#9B8E8E", fontSize: "11px" }}
                      >
                        {expandedSections.has(barreKey) ? "Hide details" : "Details"}
                        {expandedSections.has(barreKey) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {week.barreSessions.map((s) => {
                        const done = completed.has(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggle(s.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              padding: "11px 14px", borderRadius: "12px", cursor: "pointer",
                              background: done ? "#F6FBF5" : "#FAFAF8",
                              border: `1px solid ${done ? "#D8E4D6" : "#F0EBE3"}`,
                              userSelect: "none", transition: "background 0.15s, border-color 0.15s",
                            }}
                          >
                            {done
                              ? <CheckCircle2 size={17} color="#8FAB8A" strokeWidth={2} style={{ flexShrink: 0 }} />
                              : <Circle size={17} color="#D8D0D0" strokeWidth={1.5} style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: "14px", color: done ? "#8FAB8A" : "#3D3535", textDecoration: done ? "line-through" : "none" }}>
                              {s.day} Barre Session
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {expandedSections.has(barreKey) && (
                      <div style={{ marginTop: "10px", padding: "14px 16px", borderRadius: "12px", background: "#FDF5F7", border: "1px solid #F2C4CE" }}>
                        <a href={week.barreVideo.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#C0607A", fontWeight: 500, textDecoration: "none", marginBottom: "10px" }}>
                          <ExternalLink size={11} />{week.barreVideo.title}
                        </a>
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          {week.barreItems.map((item, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#6B5E5E", lineHeight: 1.7 }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Core Section */}
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A6FA8" }}>
                        Core + Stamina — Tue / Thu
                      </span>
                      <div
                        onClick={() => toggleSection(coreKey)}
                        style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer", userSelect: "none", color: "#9B8E8E", fontSize: "11px" }}
                      >
                        {expandedSections.has(coreKey) ? "Hide details" : "Details"}
                        {expandedSections.has(coreKey) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {week.coreSessions.map((s) => {
                        const done = completed.has(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggle(s.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              padding: "11px 14px", borderRadius: "12px", cursor: "pointer",
                              background: done ? "#F6FBF5" : "#FAFAF8",
                              border: `1px solid ${done ? "#D8E4D6" : "#F0EBE3"}`,
                              userSelect: "none", transition: "background 0.15s, border-color 0.15s",
                            }}
                          >
                            {done
                              ? <CheckCircle2 size={17} color="#8FAB8A" strokeWidth={2} style={{ flexShrink: 0 }} />
                              : <Circle size={17} color="#D8D0D0" strokeWidth={1.5} style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: "14px", color: done ? "#8FAB8A" : "#3D3535", textDecoration: done ? "line-through" : "none" }}>
                              {s.day} Core + Stamina Session
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {expandedSections.has(coreKey) && (
                      <div style={{ marginTop: "10px", padding: "14px 16px", borderRadius: "12px", background: "#F5F2FB", border: "1px solid #EBE5F5" }}>
                        <a href={week.coreVideo.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#7A6FA8", fontWeight: 500, textDecoration: "none", marginBottom: "10px" }}>
                          <ExternalLink size={11} />{week.coreVideo.title}
                        </a>
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          {week.coreItems.map((item, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#6B5E5E", lineHeight: 1.7 }}>{item}</li>
                          ))}
                          <li style={{ fontSize: "12px", color: "#6B5E5E", lineHeight: 1.7 }}>Stamina: {week.stamina}</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Stretch Section */}
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A9B8A" }}>
                        End-of-Session Stretch
                      </span>
                      <div
                        onClick={() => toggleSection(stretchKey)}
                        style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer", userSelect: "none", color: "#9B8E8E", fontSize: "11px" }}
                      >
                        {expandedSections.has(stretchKey) ? "Hide" : "View stretches"}
                        {expandedSections.has(stretchKey) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </div>
                    </div>

                    {expandedSections.has(stretchKey) && (
                      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F2F8F4", border: "1px solid #D8E4D6" }}>
                        <a href={week.stretchVideo.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#7A9B8A", fontWeight: 500, textDecoration: "none", marginBottom: "10px" }}>
                          <ExternalLink size={11} />{week.stretchVideo.title}
                        </a>
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          {week.stretchItems.map((item, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#6B5E5E", lineHeight: 1.7 }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Week milestones */}
                  <div style={{ marginTop: "20px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", display: "block", marginBottom: "10px" }}>
                      Week {week.week} Milestones
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {week.extras.map((extra) => {
                        const done = completed.has(extra.id);
                        return (
                          <div
                            key={extra.id}
                            onClick={() => toggle(extra.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              padding: "9px 14px", borderRadius: "10px", cursor: "pointer",
                              background: done ? "#EDE5F5" : "#FAF9FF",
                              border: `1px solid ${done ? "#C8B8D8" : "#EBE5F5"}`,
                              userSelect: "none",
                            }}
                          >
                            {done
                              ? <CheckCircle2 size={15} color="#7A6FA8" strokeWidth={2} style={{ flexShrink: 0 }} />
                              : <Circle size={15} color="#C8B8D8" strokeWidth={1.5} style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: "13px", color: done ? "#7A6FA8" : "#6B5E5E", textDecoration: done ? "line-through" : "none" }}>
                              {extra.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "28px", padding: "16px 20px", borderRadius: "14px", background: "#FAF7F2", border: "1px solid #F0EBE3" }}>
        <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.7 }}>
          <span style={{ fontWeight: 600, color: "#6B5E5E" }}>Consistency over perfection.</span>{" "}
          Even short sessions count. Consult a doctor before starting. Stop for sharp pain. Modify every exercise with chair support as needed.
          By Week 6 expect better posture, core stability, leg tone, gentle stamina, and flexibility.
        </p>
      </div>
    </div>
  );
}
