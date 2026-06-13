"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Timer, Shuffle, Save, Pencil, X, Camera, Upload, Sparkles, ChevronDown, ChevronUp, ChevronRight, Check } from "lucide-react";
import SpinWheelModal from "@/components/ui/SpinWheelModal";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { today } from "@/lib/utils";
import type { CleaningTask, CleaningLog, CleaningWheel } from "@/types";

const ROOMS = [
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living_room", label: "Living Room" },
  { value: "general", label: "General" },
];

const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const ROOM_COLORS: Record<string, string> = {
  bedroom: "#FAE8EC",
  bathroom: "#EDE5F5",
  kitchen: "#F0E4CC",
  living_room: "#D8E4D6",
  general: "#F0EBE3",
};

const DEFAULT_TASKS = [
  { room: "bedroom", title: "Make the bed", duration_minutes: 5, frequency: "daily", is_minimum_viable: true },
  { room: "bedroom", title: "Pick up floor clutter", duration_minutes: 10, frequency: "daily", is_minimum_viable: true },
  { room: "bathroom", title: "Quick sink & mirror wipe", duration_minutes: 5, frequency: "daily", is_minimum_viable: true },
  { room: "kitchen", title: "Wipe down counters", duration_minutes: 5, frequency: "daily", is_minimum_viable: true },
  { room: "kitchen", title: "Wash dishes / load dishwasher", duration_minutes: 15, frequency: "daily", is_minimum_viable: false },
  { room: "living_room", title: "Tidy surfaces", duration_minutes: 10, frequency: "weekly", is_minimum_viable: false },
  { room: "bathroom", title: "Full bathroom clean", duration_minutes: 25, frequency: "weekly", is_minimum_viable: false },
  { room: "bedroom", title: "Change bed sheets", duration_minutes: 20, frequency: "biweekly", is_minimum_viable: false },
];

// ─── Space Scan Panel ────────────────────────────────────────────────────────

interface ScanSubtask {
  title: string;
  duration_minutes: number;
}

interface ScanTask {
  title: string;
  duration_minutes: number;
  priority: "high" | "medium" | "low";
  note: string;
  subtasks: ScanSubtask[];
  selected: boolean;
  expanded: boolean;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "#C0607A",
  medium: "#C08040",
  low: "#6A8A68",
};

function SpaceScanPanel({
  onAddTasks,
}: {
  onAddTasks: (tasks: { title: string; room: string; duration_minutes: number; priority: string; subtasks: ScanSubtask[] }[]) => Promise<void>;
}) {
  const [phase, setPhase] = useState<"idle" | "preview" | "loading" | "result">("idle");
  const [images, setImages] = useState<{ preview: string; base64: string; mimeType: string }[]>([]);
  const [room, setRoom] = useState("general");
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<ScanTask[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wheelHighlight, setWheelHighlight] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const wheelConfettiRef = useRef<HTMLCanvasElement>(null);
  const wheelAnimRef = useRef<number | null>(null);
  const wheelConfettiAnimRef = useRef<number | null>(null);
  const wheelParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; shape: string; rotation: number; rotSpeed: number }[]>([]);
  const wheelRotRef = useRef(0);
  const wheelAudioRef = useRef<AudioContext | null>(null);
  const wheelLastTickRef = useRef(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<number | null>(null);
  const [wheelWinnerVisible, setWheelWinnerVisible] = useState(false);

  const accent = "#8B72B0";

  function readFileAsImage(file: File): Promise<{ preview: string; base64: string; mimeType: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({ preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: file.type });
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const loaded = await Promise.all(imageFiles.map(readFileAsImage));
    setImages((prev) => [...prev, ...loaded]);
    setPhase("preview");
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scan() {
    if (!images.length) return;
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/clean/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(({ base64, mimeType }) => ({ base64, mimeType })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setRoom(data.room ?? "general");
      setSummary(data.summary ?? "");
      setTasks((data.tasks ?? []).map((t: Omit<ScanTask, "selected" | "expanded">) => ({ ...t, selected: true, expanded: false })));
      setPhase("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Scan failed: ${msg}`);
      setPhase("preview");
    }
  }

  async function importSelected() {
    const selected = tasks.filter((t) => t.selected);
    if (!selected.length) return;
    setAdding(true);
    await onAddTasks(selected.map((t) => ({
      title: t.title,
      room,
      duration_minutes: t.duration_minutes,
      priority: t.priority,
      subtasks: t.subtasks,
    })));
    setAdding(false);
    reset();
  }

  function reset() {
    setPhase("idle");
    setImages([]);
    setTasks([]);
    setSummary("");
    setError(null);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  }

  function toggleAll(val: boolean) {
    setTasks((prev) => prev.map((t) => ({ ...t, selected: val })));
  }

  const selectedCount = tasks.filter((t) => t.selected).length;

  // ── Inline spin wheel for scan results ──
  const WHEEL_COLORS = ["#F2C4CE","#D8E4D6","#C8B8D8","#F5C9A8","#FAE8EC","#EDE5F5","#BEDAD6","#F0E4CC"];
  const WHEEL_CONFETTI = ["#F2C4CE","#8B72B0","#C8D8A8","#F5C9A8","#82C4D8","#F2E4A0","#D4A8F5"];

  function getWheelAudio() {
    if (!wheelAudioRef.current) wheelAudioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return wheelAudioRef.current;
  }
  function playWheelTick(freq = 880, vol = 0.12) {
    try {
      const ctx = getWheelAudio();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "triangle";
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
    } catch { /* ignore */ }
  }
  function playWheelWin() {
    try {
      const ctx = getWheelAudio();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch { /* ignore */ }
  }

  function drawScanWheel(angle: number, items: ScanTask[]) {
    const canvas = wheelCanvasRef.current;
    if (!canvas || !items.length) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const r = cx - 8;
    const slice = (2 * Math.PI) / items.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (wheelSpinning) {
      ctx.save(); ctx.shadowColor = "#C8A8F0"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#C8A8F060"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }

    items.forEach((task, i) => {
      const start = angle + i * slice; const end = start + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#3D3535";
      ctx.font = "600 10px Inter, system-ui, sans-serif";
      const label = task.title.length > 20 ? task.title.slice(0, 18) + "…" : task.title;
      ctx.fillText(label, r - 12, 4); ctx.restore();
    });

    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    const hub = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 20);
    hub.addColorStop(0, "white"); hub.addColorStop(1, "#F0EBF8");
    ctx.fillStyle = hub; ctx.fill(); ctx.strokeStyle = "#D8CEE8"; ctx.lineWidth = 2; ctx.stroke();

    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx + r - 2, cy - 9); ctx.lineTo(cx + r + 14, cy); ctx.lineTo(cx + r - 2, cy + 9);
    ctx.closePath(); ctx.fillStyle = "#8B72B0"; ctx.fill(); ctx.restore();
  }

  function spawnWheelConfetti(cx: number, cy: number) {
    const newP = Array.from({ length: 70 }, () => ({
      x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 9 - 2,
      color: WHEEL_CONFETTI[Math.floor(Math.random() * WHEEL_CONFETTI.length)],
      size: 5 + Math.random() * 5, life: 1, shape: ["circle","star","square"][Math.floor(Math.random() * 3)],
      rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2,
    }));
    wheelParticlesRef.current = [...wheelParticlesRef.current, ...newP];
  }

  function animWheelConfetti() {
    const canvas = wheelConfettiRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    wheelParticlesRef.current = wheelParticlesRef.current.filter(p => p.life > 0.01);
    wheelParticlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.vx *= 0.99;
      p.life -= 0.015; p.rotation += p.rotSpeed;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
      if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (p.shape === "square") { ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); }
      else {
        const sp = 5; const st = Math.PI / sp; ctx.beginPath();
        for (let i = 0; i < sp * 2; i++) { const rr = i % 2 === 0 ? p.size / 2 : p.size * 0.2; ctx.lineTo(Math.cos(i * st - Math.PI / 2) * rr, Math.sin(i * st - Math.PI / 2) * rr); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });
    if (wheelParticlesRef.current.length > 0) wheelConfettiAnimRef.current = requestAnimationFrame(animWheelConfetti);
  }

  function spinScanWheel() {
    const items = tasks.filter(t => t.selected);
    if (wheelSpinning || items.length === 0) return;
    setWheelSpinning(true); setWheelWinner(null); setWheelWinnerVisible(false); setWheelHighlight(null);
    wheelParticlesRef.current = [];
    playWheelTick(440, 0.18);
    const extra = 6 + Math.random() * 5;
    const finalAngle = wheelRotRef.current + extra * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const duration = 3800; const startTime = performance.now();
    const startAngle = wheelRotRef.current;
    const slice = (2 * Math.PI) / items.length;
    wheelLastTickRef.current = wheelRotRef.current;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 4) : 1;
      const current = startAngle + (finalAngle - startAngle) * eased;
      wheelRotRef.current = current;
      drawScanWheel(current, items);

      const speed = (finalAngle - startAngle) * (1 - Math.pow(1 - progress, 3)) / duration * 1000;
      const norm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const lastNorm = ((wheelLastTickRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.floor(norm / slice) !== Math.floor(lastNorm / slice) && speed > 0.3) {
        playWheelTick(600 + speed * 80, Math.min(0.16, speed * 0.04));
      }
      wheelLastTickRef.current = current;

      if (progress < 1) {
        wheelAnimRef.current = requestAnimationFrame(animate);
      } else {
        setWheelSpinning(false);
        const finalNorm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor(((2 * Math.PI - finalNorm) % (2 * Math.PI)) / slice) % items.length;
        const winnerTask = items[idx];
        const globalIdx = tasks.indexOf(winnerTask);
        setWheelWinner(globalIdx);
        setWheelHighlight(globalIdx);
        playWheelWin();
        const canvas = wheelCanvasRef.current;
        if (canvas) { spawnWheelConfetti(canvas.width / 2, canvas.height / 2); wheelConfettiAnimRef.current = requestAnimationFrame(animWheelConfetti); }
        setTimeout(() => setWheelWinnerVisible(true), 80);
      }
    }
    wheelAnimRef.current = requestAnimationFrame(animate);
  }

  // Draw wheel when tasks change or phase changes to result
  useEffect(() => {
    if (phase === "result" && tasks.length > 0) {
      const items = tasks.filter(t => t.selected);
      if (items.length > 0) drawScanWheel(wheelRotRef.current, items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tasks.filter(t => t.selected).length]);

  return (
    <div>
      <style>{`
        @keyframes scanPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes scanSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes winnerPop {
          0% { transform: scale(0.7) translateY(6px); opacity: 0; }
          60% { transform: scale(1.06) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes spinIcon { to { transform: rotate(360deg); } }
        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 #8B72B040; }
          50% { box-shadow: 0 0 0 6px #8B72B025; }
        }
      `}</style>

      {/* ── Idle: drop zone ── */}
      {phase === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
          style={{
            border: `2px dashed ${accent}50`,
            borderRadius: "20px",
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: `${accent}06`,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}90`; e.currentTarget.style.background = `${accent}10`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${accent}50`; e.currentTarget.style.background = `${accent}06`; }}
        >
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: `linear-gradient(135deg, ${accent}20, ${accent}35)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Camera size={26} color={accent} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#3D3535", marginBottom: "6px" }}>
            Drop photos of your space
          </p>
          <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.6 }}>
            Add one or more photos — different angles, different rooms
          </p>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: `1.5px solid ${accent}40`, background: "transparent", color: accent, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Camera size={13} /> Take photo
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: `1.5px solid ${accent}40`, background: "transparent", color: accent, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Upload size={13} /> Upload photos
            </button>
          </div>
        </div>
      )}

      {/* ── Preview ── */}
      {phase === "preview" && images.length > 0 && (
        <div style={{ animation: "scanSlideUp 0.3s ease forwards" }}>
          {/* Photo grid */}
          <div style={{ display: "grid", gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: "relative", borderRadius: "12px", overflow: "hidden", aspectRatio: images.length === 1 ? "16/9" : "1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`Photo ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  onClick={() => removeImage(idx)}
                  style={{ position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Add more button */}
            <div
              onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
              style={{
                borderRadius: "12px", aspectRatio: "1", border: `2px dashed ${accent}40`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "6px", cursor: "pointer", background: `${accent}06`, transition: "all 0.15s",
                minHeight: images.length === 1 ? "100px" : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}12`; e.currentTarget.style.borderColor = `${accent}70`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${accent}06`; e.currentTarget.style.borderColor = `${accent}40`; }}
            >
              <Plus size={18} color={accent} />
              <span style={{ fontSize: "11px", color: accent, fontWeight: 600 }}>Add more</span>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#9B8E8E", marginBottom: "14px" }}>
            {images.length} photo{images.length !== 1 ? "s" : ""} — Eden will look at all of them together
          </p>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#FAE8EC", color: "#C0607A", fontSize: "13px", marginBottom: "12px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={scan}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "14px 20px", borderRadius: "14px", border: "none",
                background: `linear-gradient(135deg, ${accent}, #A882C8)`,
                color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                boxShadow: `0 4px 20px ${accent}40`,
              }}
            >
              <Sparkles size={16} />
              Scan {images.length > 1 ? `${images.length} photos` : "this space"}
            </button>
            <button
              onClick={reset}
              style={{ padding: "14px 16px", borderRadius: "14px", border: `1.5px solid ${accent}30`, background: "transparent", color: accent, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px", flexWrap: "wrap" }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.55)" }} />
                {idx === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={22} color="white" style={{ animation: "scanPulse 1.2s ease-in-out infinite" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", marginBottom: "8px" }}>
            Scanning {images.length > 1 ? `${images.length} photos` : "your space"}…
          </p>
          <p style={{ fontSize: "13px", color: "#9B8E8E" }}>Eden is looking at every corner</p>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "16px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: accent, animation: `scanPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {phase === "result" && (
        <div style={{ animation: "scanSlideUp 0.35s ease forwards" }}>
          {/* Photos + summary */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "20px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {images.slice(0, 3).map((img, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={img.preview} alt="" style={{ width: images.length === 1 ? "80px" : "52px", height: images.length === 1 ? "80px" : "52px", objectFit: "cover", borderRadius: "10px" }} />
              ))}
              {images.length > 3 && (
                <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: `${accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: accent }}>
                  +{images.length - 3}
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}99`, marginBottom: "5px" }}>
                Eden sees
              </p>
              <p style={{ fontSize: "14px", color: "#3D3535", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{summary}&rdquo;
              </p>
            </div>
          </div>

          {/* ── Spin Wheel ── */}
          {tasks.filter(t => t.selected).length > 1 && (
            <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "16px", background: `${accent}06`, border: `1px solid ${accent}20` }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}99`, textAlign: "center", marginBottom: "12px" }}>
                ✦ spin to pick where to start
              </p>
              <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 220, height: 220, flexShrink: 0, margin: "0 auto" }}>
                  <canvas ref={wheelCanvasRef} width={220} height={220} style={{ position: "absolute", top: 0, left: 0 }} />
                  <canvas ref={wheelConfettiRef} width={220} height={220} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
                </div>
                <div style={{ flex: 1, minWidth: "120px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={spinScanWheel}
                    disabled={wheelSpinning}
                    style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      padding: "11px 22px", borderRadius: "12px", border: "none",
                      background: wheelSpinning ? "#C8B8D8" : `linear-gradient(135deg, ${accent}, #A882C8)`,
                      color: "white", fontSize: "14px", fontWeight: 700,
                      cursor: wheelSpinning ? "default" : "pointer", fontFamily: "inherit",
                      boxShadow: wheelSpinning ? "none" : `0 4px 16px ${accent}45`,
                      transition: "all 0.2s", whiteSpace: "nowrap",
                    }}
                  >
                    <Shuffle size={14} style={{ animation: wheelSpinning ? "spinIcon 0.5s linear infinite" : "none" }} />
                    {wheelSpinning ? "Spinning…" : "Spin!"}
                  </button>

                  {wheelWinner !== null && wheelWinnerVisible && (
                    <div style={{
                      textAlign: "center", padding: "10px 14px", borderRadius: "12px",
                      background: "linear-gradient(135deg, #FAE8EC, #F5E8FA)",
                      border: "1.5px solid #F2C4CE",
                      animation: "winnerPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
                    }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C0607A", marginBottom: "4px" }}>start here</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#3D3535", lineHeight: 1.3 }}>{tasks[wheelWinner]?.title}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Select all / none */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9B8E8E" }}>
              {tasks.length} tasks found
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => toggleAll(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: accent, fontWeight: 600 }}>Select all</button>
              <button onClick={() => toggleAll(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#9B8E8E", fontWeight: 600 }}>None</button>
            </div>
          </div>

          {/* Task list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px", maxHeight: "420px", overflowY: "auto" }}>
            {tasks.map((task, i) => (
              <div
                key={i}
                style={{
                  borderRadius: "14px", overflow: "hidden",
                  border: `1.5px solid ${wheelHighlight === i ? accent : task.selected ? `${accent}35` : "#EDE5E5"}`,
                  background: wheelHighlight === i ? `${accent}15` : task.selected ? `${accent}07` : "#FAFAFA",
                  transition: "all 0.3s",
                  animation: wheelHighlight === i ? "highlightPulse 1.5s ease-in-out 3" : "none",
                }}
              >
                {/* Parent row */}
                <div
                  onClick={() => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, selected: !t.selected } : t))}
                  style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", cursor: "pointer" }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
                    border: `2px solid ${task.selected ? accent : "#D8D0D0"}`,
                    background: task.selected ? accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {task.selected && <CheckCircle2 size={11} color="white" strokeWidth={3} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#3D3535", lineHeight: 1.4, margin: 0 }}>
                      {task.title}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_DOT[task.priority], display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#9B8E8E" }}>{task.priority}</span>
                      <span style={{ fontSize: "11px", color: "#B5A8A8" }}>·</span>
                      <span style={{ fontSize: "11px", color: "#9B8E8E" }}>~{task.duration_minutes} min</span>
                      <span style={{ fontSize: "11px", color: "#B5A8A8" }}>·</span>
                      <span style={{ fontSize: "11px", color: "#B5A8A8" }}>{task.subtasks.length} steps</span>
                    </div>
                    {task.note && (
                      <p style={{ fontSize: "12px", color: "#7A6A8A", lineHeight: 1.5, marginTop: "5px", fontStyle: "italic" }}>
                        {task.note}
                      </p>
                    )}
                  </div>

                  {/* Expand toggle */}
                  {task.subtasks.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTasks((prev) => prev.map((t, j) => j === i ? { ...t, expanded: !t.expanded } : t)); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#B5A8A8", padding: "2px", display: "flex", alignItems: "center", flexShrink: 0 }}
                    >
                      {task.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Subtasks */}
                {task.expanded && task.subtasks.length > 0 && (
                  <div style={{ borderTop: `1px solid ${accent}18`, padding: "8px 14px 10px 42px", display: "flex", flexDirection: "column", gap: "5px" }}>
                    {task.subtasks.map((sub, si) => (
                      <div key={si} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: `${accent}60`, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "#5A4E6A", flex: 1, lineHeight: 1.4 }}>{sub.title}</span>
                        <span style={{ fontSize: "11px", color: "#B5A8A8", flexShrink: 0 }}>{sub.duration_minutes}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={importSelected}
              disabled={selectedCount === 0 || adding}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "13px 20px", borderRadius: "14px", border: "none",
                background: selectedCount > 0 && !adding ? `linear-gradient(135deg, ${accent}, #A882C8)` : "#D8CEE8",
                color: "white", fontSize: "14px", fontWeight: 700, cursor: selectedCount > 0 && !adding ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              <Plus size={15} />
              {adding ? "Adding…" : `Add ${selectedCount} task${selectedCount !== 1 ? "s" : ""} to my list`}
            </button>
            <button
              onClick={reset}
              style={{ padding: "13px 16px", borderRadius: "14px", border: `1.5px solid ${accent}30`, background: "transparent", color: accent, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
            >
              Scan another
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input — multiple */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Spin Wheel ───────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number; maxLife: number;
  shape: "circle" | "star" | "square"; rotation: number; rotSpeed: number;
}

function CleaningSpinWheel({
  tasks,
  logs,
  onResult,
  onMarkDone,
}: {
  tasks: CleaningTask[];
  logs: CleaningLog[];
  onResult: (task: CleaningTask) => void;
  onMarkDone: (task: CleaningTask) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<CleaningTask | null>(null);
  const [winnerVisible, setWinnerVisible] = useState(false);
  const animRef = useRef<number | null>(null);
  const confettiAnimRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickAngleRef = useRef(0);

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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "triangle";
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
    } catch { /* ignore if blocked */ }
  }

  function playWinSound() {
    try {
      const ctx = getAudioCtx();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
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
      life: 1, maxLife: 1,
      shape: (["circle", "star", "square"] as Particle["shape"][])[Math.floor(Math.random() * 3)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    }));
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const spikes = 5; const step = Math.PI / spikes;
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
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99;
      p.life -= 0.015; p.rotation += p.rotSpeed;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === "square") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else { drawStar(ctx, 0, 0, p.size / 2); ctx.fill(); }
      ctx.restore();
    });
    if (particlesRef.current.length > 0) confettiAnimRef.current = requestAnimationFrame(animateConfetti);
  }

  function drawWheel(angle: number) {
    const canvas = canvasRef.current;
    if (!canvas || tasks.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    const r = cx - 10;
    const sliceAngle = (2 * Math.PI) / tasks.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (spinning) {
      ctx.save();
      ctx.shadowColor = "#C8A8F0"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#C8A8F060"; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }

    tasks.forEach((task, i) => {
      const start = angle + i * sliceAngle;
      const end = start + sliceAngle;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#3D3535";
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      const label = task.title.length > 18 ? task.title.slice(0, 16) + "…" : task.title;
      ctx.fillText(label, r - 14, 4);
      ctx.restore();
    });

    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 24);
    hubGrad.addColorStop(0, "white"); hubGrad.addColorStop(1, "#F0EBF8");
    ctx.fillStyle = hubGrad; ctx.fill();
    ctx.strokeStyle = "#D8CEE8"; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx + r - 2, cy - 11); ctx.lineTo(cx + r + 16, cy); ctx.lineTo(cx + r - 2, cy + 11);
    ctx.closePath(); ctx.fillStyle = "#8B72B0"; ctx.fill();
    ctx.restore();
  }

  useEffect(() => {
    drawWheel(rotation);
    setWinner(null);
    setWinnerVisible(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, tasks.map(t => t.id).join(",")]);

  function spin() {
    if (spinning || tasks.length === 0) return;
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
    const sliceAngle = (2 * Math.PI) / tasks.length;
    lastTickAngleRef.current = rotation;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 4) : 1;
      const current = startAngle + (finalAngle - startAngle) * eased;
      setRotation(current);
      drawWheel(current);

      const speed = (finalAngle - startAngle) * (1 - Math.pow(1 - progress, 3)) / duration * 1000;
      const normalised = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const lastNorm = ((lastTickAngleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.floor(normalised / sliceAngle) !== Math.floor(lastNorm / sliceAngle) && speed > 0.3) {
        playTick(600 + speed * 80, Math.min(0.18, speed * 0.04));
      }
      lastTickAngleRef.current = current;

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const norm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const index = Math.floor(((2 * Math.PI - norm) % (2 * Math.PI)) / sliceAngle) % tasks.length;
        const picked = tasks[index];
        setWinner(picked);
        playWinSound();
        const canvas = canvasRef.current;
        if (canvas) {
          spawnConfetti(canvas.width / 2, canvas.height / 2, 80);
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

  const winnerDone = winner ? logs.find(l => l.task_id === winner.id)?.completed : false;

  if (tasks.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "260px", gap: "12px" }}>
        <Shuffle size={28} color="#C8B8D8" strokeWidth={1.5} />
        <p style={{ color: "#9B8E8E", fontSize: "14px", textAlign: "center", maxWidth: "200px", lineHeight: 1.5 }}>
          Select at least one task on the left to build your wheel.
        </p>
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
        @keyframes spinIcon { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: "relative", width: 270, height: 270 }}>
        <canvas ref={canvasRef} width={270} height={270} style={{ display: "block", position: "absolute", top: 0, left: 0 }} />
        <canvas ref={confettiRef} width={270} height={270} style={{ display: "block", position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "12px 28px", borderRadius: "14px", border: "none",
          background: spinning ? "#C8B8D8" : "linear-gradient(135deg, #8B72B0, #A882C8)",
          color: "white", fontSize: "15px", fontWeight: 700,
          cursor: spinning ? "default" : "pointer", fontFamily: "inherit",
          minWidth: "170px", justifyContent: "center", transition: "all 0.2s",
          animation: !spinning && !winner ? "spinBtnPulse 2s ease-in-out infinite" : "none",
          boxShadow: spinning ? "none" : "0 4px 20px #8B72B040",
        }}
      >
        <Shuffle size={16} style={{ animation: spinning ? "spinIcon 0.5s linear infinite" : "none" }} />
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
            maxWidth: "260px",
            boxShadow: "0 6px 24px rgba(200,140,180,0.2)",
          }}
        >
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C0607A", marginBottom: "8px" }}>
            ✦ clean this next
          </p>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", lineHeight: 1.4, marginBottom: "4px" }}>
            {winner.title}
          </p>
          <p style={{ fontSize: "12px", color: "#9B8E8E", marginBottom: "14px" }}>
            {winner.duration_minutes} min · {ROOMS.find(r => r.value === winner!.room)?.label ?? winner.room}
          </p>
          <button
            onClick={() => onMarkDone(winner)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "10px", border: "none",
              background: winnerDone ? "#D8E4D6" : "#F2C4CE",
              color: winnerDone ? "#6A8A68" : "#C0607A",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", margin: "0 auto", transition: "all 0.15s",
            }}
          >
            {winnerDone
              ? <><CheckCircle2 size={14} /> Done today!</>
              : <><Circle size={14} /> Mark done today</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [wheels, setWheels] = useState<CleaningWheel[]>([]);
  const [activeWheelId, setActiveWheelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"minimum" | "all" | "wheel" | "scan">("minimum");
  const [form, setForm] = useState({
    room: "bedroom", title: "", duration_minutes: "10", frequency: "weekly", is_minimum_viable: false,
  });
  const [loading, setLoading] = useState(true);

  // Wheel builder
  const [editingWheelId, setEditingWheelId] = useState<string | "new" | null>(null);
  const [wheelForm, setWheelForm] = useState({ name: "", task_ids: [] as string[] });
  // Select & spin
  const [cleanSelectMode, setCleanSelectMode] = useState(false);
  const [cleanSelectedIds, setCleanSelectedIds] = useState<Set<string>>(new Set());
  const [showCleanSpinModal, setShowCleanSpinModal] = useState(false);
  // Subtask expand/split
  const [expandedClean, setExpandedClean] = useState<Set<string>>(new Set());
  const [splittingClean, setSplittingClean] = useState<string | null>(null);

  const todayStr = today();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: t }, { data: l }, { data: w }] = await Promise.all([
      supabase.from("cleaning_tasks").select("*").eq("user_id", user.id).order("order_index"),
      supabase.from("cleaning_logs").select("*").eq("user_id", user.id).eq("date", todayStr),
      supabase.from("cleaning_wheels").select("*").eq("user_id", user.id).order("created_at"),
    ]);

    if (!t?.length) {
      const inserts = DEFAULT_TASKS.map((task, i) => ({ ...task, user_id: user.id, order_index: i }));
      const { data: seeded } = await supabase.from("cleaning_tasks").insert(inserts).select();
      setTasks(seeded ?? []);
    } else {
      setTasks(t ?? []);
    }
    setLogs(l ?? []);
    setWheels(w ?? []);
    setLoading(false);
  }

  async function toggleTask(task: CleaningTask) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = logs.find((l) => l.task_id === task.id);
    if (existing) {
      const { data } = await supabase.from("cleaning_logs").update({ completed: !existing.completed }).eq("id", existing.id).select().single();
      if (data) setLogs((p) => p.map((l) => l.id === data.id ? data : l));
    } else {
      const { data } = await supabase.from("cleaning_logs").insert({ task_id: task.id, user_id: user.id, date: todayStr, completed: true }).select().single();
      if (data) setLogs((p) => [...p, data]);
    }
  }

  async function addTask() {
    if (!form.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("cleaning_tasks").insert({
      user_id: user.id, ...form, duration_minutes: Number(form.duration_minutes), order_index: tasks.length,
    }).select().single();
    if (data) { setTasks((p) => [...p, data]); setAdding(false); }
  }

  async function splitCleanTask(task: CleaningTask) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSplittingClean(task.id);
    try {
      const res = await fetch("/api/clean/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: task.title, room: task.room, duration_minutes: task.duration_minutes }),
      });
      const json = await res.json();
      if (json.subtasks?.length > 0) {
        const inserts = json.subtasks.map((s: { title: string; duration_minutes: number }, i: number) => ({
          user_id: user.id,
          title: s.title,
          room: task.room,
          duration_minutes: s.duration_minutes,
          frequency: task.frequency,
          is_minimum_viable: false,
          order_index: i,
          parent_id: task.id,
        }));
        const { data } = await supabase.from("cleaning_tasks").insert(inserts).select();
        if (data) {
          setTasks(prev => [...prev, ...data]);
          setExpandedClean(prev => new Set([...prev, task.id]));
        }
      }
    } finally {
      setSplittingClean(null);
    }
  }

  async function addScannedTasks(scanned: { title: string; room: string; duration_minutes: number; priority: string; subtasks: ScanSubtask[] }[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const inserts = scanned.map((t, i) => ({
      user_id: user.id,
      title: t.title,
      room: t.room,
      duration_minutes: t.duration_minutes,
      frequency: "weekly" as const,
      is_minimum_viable: t.priority === "high",
      order_index: tasks.length + i,
    }));
    const { data: parentData } = await supabase.from("cleaning_tasks").insert(inserts).select();
    if (parentData) {
      // Add subtasks for each parent
      const subtaskInserts = parentData.flatMap((parent, i) =>
        (scanned[i].subtasks ?? []).map((sub, si) => ({
          user_id: user.id,
          title: sub.title,
          room: scanned[i].room,
          duration_minutes: sub.duration_minutes,
          frequency: "weekly" as const,
          is_minimum_viable: false,
          order_index: si,
          parent_id: parent.id,
        }))
      );
      if (subtaskInserts.length > 0) {
        const { data: subData } = await supabase.from("cleaning_tasks").insert(subtaskInserts).select();
        setTasks((prev) => [...prev, ...parentData, ...(subData ?? [])]);
      } else {
        setTasks((prev) => [...prev, ...parentData]);
      }
      setView("minimum");
    }
  }

  async function deleteTask(id: string) {
    await supabase.from("cleaning_tasks").delete().eq("id", id);
    setTasks((p) => p.filter((t) => t.id !== id));
    setWheels((prev) => prev.map(w => ({ ...w, task_ids: w.task_ids.filter(tid => tid !== id) })));
    if (activeWheelId) {
      const wheel = wheels.find(w => w.id === activeWheelId);
      if (wheel?.task_ids.includes(id)) setActiveWheelId(null);
    }
  }

  // ── Wheel CRUD ──

  function openNewWheel() {
    setEditingWheelId("new");
    setWheelForm({ name: "", task_ids: [] });
  }

  function openEditWheel(wheel: CleaningWheel) {
    setEditingWheelId(wheel.id);
    setWheelForm({ name: wheel.name, task_ids: [...wheel.task_ids] });
  }

  function cancelWheelEdit() {
    setEditingWheelId(null);
    setWheelForm({ name: "", task_ids: [] });
  }

  function toggleWheelTask(taskId: string) {
    setWheelForm((prev) => ({
      ...prev,
      task_ids: prev.task_ids.includes(taskId)
        ? prev.task_ids.filter(id => id !== taskId)
        : [...prev.task_ids, taskId],
    }));
  }

  async function saveWheel() {
    if (!wheelForm.name.trim() || wheelForm.task_ids.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingWheelId && editingWheelId !== "new") {
      const { data } = await supabase.from("cleaning_wheels")
        .update({ name: wheelForm.name, task_ids: wheelForm.task_ids })
        .eq("id", editingWheelId).select().single();
      if (data) {
        setWheels((prev) => prev.map(w => w.id === data.id ? data : w));
        setActiveWheelId(data.id);
      }
    } else {
      const { data } = await supabase.from("cleaning_wheels")
        .insert({ user_id: user.id, name: wheelForm.name, task_ids: wheelForm.task_ids })
        .select().single();
      if (data) {
        setWheels((prev) => [...prev, data]);
        setActiveWheelId(data.id);
      }
    }
    cancelWheelEdit();
  }

  async function deleteWheel(id: string) {
    await supabase.from("cleaning_wheels").delete().eq("id", id);
    setWheels((prev) => prev.filter(w => w.id !== id));
    if (activeWheelId === id) setActiveWheelId(null);
  }

  // ── Derived ──

  // Only top-level tasks (no parent_id) for display
  const parentTasks = tasks.filter(t => !t.parent_id);
  const displayTasks = view === "minimum"
    ? parentTasks.filter(t => t.is_minimum_viable)
    : parentTasks;
  const subtasksOf = (id: string) => tasks.filter(t => t.parent_id === id);
  const completedCount = logs.filter((l) => l.completed).length;
  const rooms = [...new Set(displayTasks.map((t) => t.room))];
  const activeWheel = wheels.find(w => w.id === activeWheelId) ?? null;
  const spinTasks = activeWheel ? tasks.filter(t => activeWheel.task_ids.includes(t.id)) : [];

  if (loading) return null;

  return (
    <div className="page-padding" style={{ maxWidth: "960px" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>Home & Space</p>
        <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "40px", fontWeight: 400, color: "#3D3535" }}>Cleaning <em>System</em></h1>
        <p style={{ color: "#9B8E8E", fontSize: "14px", marginTop: "6px" }}>Your space reflects your mind. Small steps, consistently.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {(["minimum", "all", "wheel", "scan"] as const).map((v) => {
          const labels = { minimum: "Minimum Viable Day", all: "Full list", wheel: "Spin the Wheel ✦", scan: "📸 Scan a space" };
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "8px 20px", borderRadius: "99px",
                border: `1.5px solid ${active ? "#F2C4CE" : "#F0EBE3"}`,
                background: active ? (v === "wheel" ? "linear-gradient(135deg, #F5E8FA, #FAE8EC)" : "#FAE8EC") : "transparent",
                color: active ? "#C0607A" : "#9B8E8E",
                fontSize: "13px", fontWeight: active ? 600 : 400, cursor: "pointer",
              }}
            >
              {labels[v]}
            </button>
          );
        })}
      </div>

      {/* ── Wheel Mode ── */}
      {view === "wheel" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>

          {/* Left: wheel management */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#3D3535", margin: 0 }}>Saved Wheels</h2>
              {editingWheelId === null && (
                <button
                  onClick={openNewWheel}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "5px 12px", borderRadius: "8px", border: "1.5px dashed #E0D8D8",
                    background: "transparent", cursor: "pointer", color: "#9B8E8E", fontSize: "12px",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#9B8E8E"; }}
                >
                  <Plus size={12} /> New wheel
                </button>
              )}
            </div>

            {/* Saved wheels list */}
            {wheels.length === 0 && editingWheelId === null && (
              <p style={{ fontSize: "13px", color: "#B5A8A8", lineHeight: 1.5 }}>
                Create a wheel to save a custom set of tasks you can spin anytime.
              </p>
            )}
            {wheels.map((wheel) => (
              <div
                key={wheel.id}
                onClick={() => { if (editingWheelId === null) setActiveWheelId(activeWheelId === wheel.id ? null : wheel.id); }}
                style={{
                  padding: "12px 14px", borderRadius: "12px",
                  border: `1.5px solid ${activeWheelId === wheel.id ? "#C8A8F0" : "#EDE5E5"}`,
                  background: activeWheelId === wheel.id ? "#F5F0FF" : "white",
                  cursor: editingWheelId === null ? "pointer" : "default",
                  transition: "all 0.15s",
                  boxShadow: activeWheelId === wheel.id ? "0 2px 12px rgba(200,168,240,0.2)" : "0 1px 4px rgba(180,150,140,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shuffle size={13} color={activeWheelId === wheel.id ? "#8B72B0" : "#C4B8B8"} />
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: activeWheelId === wheel.id ? "#8B72B0" : "#3D3535" }}>
                    {wheel.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "#B5A8A8" }}>{wheel.task_ids.length} tasks</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditWheel(wheel); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "2px", display: "flex" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#8B72B0")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWheel(wheel.id); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "2px", display: "flex" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {activeWheelId === wheel.id && (
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {tasks.filter(t => wheel.task_ids.includes(t.id)).map(t => (
                      <span key={t.id} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: ROOM_COLORS[t.room] ?? "#F0EBE3", color: "#3D3535" }}>
                        {t.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Wheel builder form */}
            {editingWheelId !== null && (
              <Card style={{ marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <CardTitle style={{ margin: 0 }}>
                    {editingWheelId === "new" ? "New wheel" : "Edit wheel"}
                  </CardTitle>
                  <button onClick={cancelWheelEdit} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "2px", display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>
                <Input
                  label="Wheel name"
                  value={wheelForm.name}
                  onChange={(e) => setWheelForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Morning Blitz, Weekend Deep Clean…"
                  autoFocus
                  style={{ marginBottom: "14px" }}
                />
                <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9B8E8E", marginBottom: "8px" }}>
                  Include tasks
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto", marginBottom: "14px" }}>
                  {tasks.map((task) => {
                    const checked = wheelForm.task_ids.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "7px 10px", borderRadius: "10px", background: checked ? "#F5F0FF" : "transparent", border: `1px solid ${checked ? "#C8A8F0" : "#F0EBE3"}`, transition: "all 0.1s" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWheelTask(task.id)}
                          style={{ accentColor: "#8B72B0", width: "14px", height: "14px", flexShrink: 0 }}
                        />
                        <span style={{ flex: 1, fontSize: "12px", color: "#3D3535" }}>{task.title}</span>
                        <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: ROOM_COLORS[task.room] ?? "#F0EBE3", color: "#6B5E5E", flexShrink: 0 }}>
                          {ROOMS.find(r => r.value === task.room)?.label ?? task.room}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    onClick={saveWheel}
                    disabled={!wheelForm.name.trim() || wheelForm.task_ids.length === 0}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Save size={13} />
                    {editingWheelId === "new" ? "Save wheel" : "Update wheel"}
                  </Button>
                  <Button variant="ghost" onClick={cancelWheelEdit}>Cancel</Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: spin wheel */}
          <div>
            {activeWheel ? (
              <>
                <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8B72B0", marginBottom: "16px" }}>
                  ✦ {activeWheel.name}
                </p>
                <CleaningSpinWheel
                  tasks={spinTasks}
                  logs={logs}
                  onResult={() => {}}
                  onMarkDone={toggleTask}
                />
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "320px", gap: "16px", padding: "32px", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #F5E8FA, #FAE8EC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shuffle size={24} color="#C8A8D8" strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#3D3535", margin: 0 }}>Pick a wheel to spin</p>
                <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.6, margin: 0 }}>
                  Select a saved wheel on the left, or create one to get started.
                </p>
                {wheels.length === 0 && (
                  <button
                    onClick={openNewWheel}
                    style={{
                      marginTop: "4px", display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 20px", borderRadius: "12px",
                      border: "none", background: "linear-gradient(135deg, #8B72B0, #A882C8)",
                      color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <Plus size={14} /> Create your first wheel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scan Mode ── */}
      {view === "scan" && (
        <div style={{ maxWidth: "520px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "26px", fontWeight: 400, color: "#3D3535", marginBottom: "6px" }}>
              Scan your space
            </h2>
            <p style={{ fontSize: "13px", color: "#9B8E8E", lineHeight: 1.6 }}>
              Take or upload a photo of any room and Eden will break it into specific, manageable cleaning tasks you can add to your list.
            </p>
          </div>
          <SpaceScanPanel onAddTasks={addScannedTasks} />
        </div>
      )}

      {/* ── List Modes ── */}
      {view !== "wheel" && view !== "scan" && (
        <>
          {view === "minimum" && (
            <Card variant="blush" padding="sm" style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "13px", color: "#6B5E5E", lineHeight: 1.6 }}>
                <strong>Bad day mode.</strong> These are the 4 tasks that make the biggest difference when you&apos;re running on empty. Just these, and you&apos;re doing great.
              </p>
            </Card>
          )}

          {/* Select & spin toolbar */}
          {!cleanSelectMode ? (
            <button
              onClick={() => { setCleanSelectMode(true); setCleanSelectedIds(new Set()); }}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "7px 14px", borderRadius: "10px",
                border: "1.5px solid #C8B8D8", background: "transparent",
                color: "#8B72B0", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", marginBottom: "14px",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#8B72B0"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#8B72B0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8B72B0"; e.currentTarget.style.borderColor = "#C8B8D8"; }}
            >
              <Shuffle size={13} /> Select &amp; spin
            </button>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
              padding: "10px 16px", borderRadius: "14px", marginBottom: "14px",
              background: "rgba(139,114,176,0.10)", border: "1.5px solid #8B72B030",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B72B0", flex: 1 }}>
                {cleanSelectedIds.size === 0 ? "Tap tasks to select" : `${cleanSelectedIds.size} selected`}
              </span>
              <button onClick={() => setCleanSelectedIds(new Set(displayTasks.map(t => t.id)))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#8B72B0", fontWeight: 600, padding: "4px 8px" }}>All</button>
              <button onClick={() => setCleanSelectedIds(new Set())} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#9B8E8E", fontWeight: 600, padding: "4px 8px" }}>None</button>
              <button
                onClick={() => { if (cleanSelectedIds.size > 0) setShowCleanSpinModal(true); }}
                disabled={cleanSelectedIds.size === 0}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "10px", border: "none",
                  background: cleanSelectedIds.size > 0 ? "linear-gradient(135deg, #8B72B0, #A882C8)" : "#D8CEE8",
                  color: "white", fontSize: "13px", fontWeight: 700,
                  cursor: cleanSelectedIds.size > 0 ? "pointer" : "default", fontFamily: "inherit",
                }}
              >
                <Shuffle size={13} /> Spin
              </button>
              <button onClick={() => { setCleanSelectMode(false); setCleanSelectedIds(new Set()); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#C4B8B8", padding: "4px", display: "flex" }}>
                <X size={15} />
              </button>
            </div>
          )}

          {completedCount > 0 && (
            <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "12px", background: "#F6FBF5", border: "1px solid #D8E4D6", display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={16} color="#8FAB8A" />
              <span style={{ fontSize: "13px", color: "#6A8A68" }}>{completedCount} task{completedCount !== 1 ? "s" : ""} done today</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {rooms.map((room) => (
              <div key={room}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", padding: "3px 12px", borderRadius: "99px", background: ROOM_COLORS[room] ?? "#F0EBE3", color: "#3D3535" }}>
                    {ROOMS.find((r) => r.value === room)?.label ?? room}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#F0EBE3" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {displayTasks.filter((t) => t.room === room).map((task) => {
                    const log = logs.find((l) => l.task_id === task.id);
                    const done = log?.completed ?? false;
                    const isCleanSelected = cleanSelectedIds.has(task.id);
                    const subs = subtasksOf(task.id);
                    const isExpanded = expandedClean.has(task.id);
                    const isSplitting = splittingClean === task.id;
                    const completedSubs = subs.filter(s => logs.find(l => l.task_id === s.id)?.completed).length;

                    return (
                      <div key={task.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {/* Parent row */}
                        <div
                          style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "12px 16px", borderRadius: "14px",
                            background: cleanSelectMode && isCleanSelected ? "#F0EBF8" : done ? "#F6FBF5" : "white",
                            border: `1.5px solid ${cleanSelectMode && isCleanSelected ? "#8B72B050" : done ? "#D8E4D6" : "#EDE5E5"}`,
                            cursor: "pointer", transition: "all 0.15s",
                            boxShadow: cleanSelectMode && isCleanSelected ? "0 0 0 2px rgba(139,114,176,0.12)" : "0 2px 8px rgba(180,150,140,0.05)",
                          }}
                          onClick={() => {
                            if (cleanSelectMode) {
                              setCleanSelectedIds(prev => { const n = new Set(prev); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n; });
                            } else {
                              toggleTask(task);
                            }
                          }}
                        >
                          {cleanSelectMode
                            ? <div style={{ width: "19px", height: "19px", borderRadius: "5px", flexShrink: 0, border: `2px solid ${isCleanSelected ? "#8B72B0" : "#D8D0D0"}`, background: isCleanSelected ? "#8B72B0" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                                {isCleanSelected && <Check size={11} color="white" strokeWidth={3} />}
                              </div>
                            : done
                              ? <CheckCircle2 size={19} color="#8FAB8A" strokeWidth={2} />
                              : <Circle size={19} color="#D8D0D0" strokeWidth={1.5} />}

                          <span style={{ flex: 1, fontSize: "14px", color: done ? "#8FAB8A" : "#3D3535", textDecoration: done ? "line-through" : "none" }}>
                            {task.title}
                          </span>

                          {/* Splitting indicator */}
                          {isSplitting && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#B09BC8", fontWeight: 500 }}>
                              <Sparkles size={11} style={{ animation: "pulse 1.2s ease-in-out infinite" }} />
                              breaking down…
                            </span>
                          )}

                          {/* Subtask chip or break-down button */}
                          {!isSplitting && subs.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedClean(prev => { const n = new Set(prev); isExpanded ? n.delete(task.id) : n.add(task.id); return n; }); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "99px", border: "1px solid #EDE5F5", background: "#F7F3FC", color: "#8B72B0", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                              {completedSubs}/{subs.length}
                            </button>
                          )}

                          {!isSplitting && subs.length === 0 && !done && (
                            <button
                              onClick={(e) => { e.stopPropagation(); splitCleanTask(task); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "99px", border: "1px solid #EDE5F5", background: "#F7F3FC", color: "#8B72B0", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE5F5"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#F7F3FC"; }}
                            >
                              <Sparkles size={10} /> break it down
                            </button>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#B5A8A8" }}>
                            <Timer size={12} />
                            <span style={{ fontSize: "12px" }}>{task.duration_minutes}m</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#B5A8A8", textTransform: "capitalize" }}>{task.frequency}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "4px" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Subtask children */}
                        {isExpanded && subs.length > 0 && (
                          <div style={{ marginLeft: "28px", paddingLeft: "8px", borderLeft: "2px solid #EDE5F5", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {subs.map(sub => {
                              const subLog = logs.find(l => l.task_id === sub.id);
                              const subDone = subLog?.completed ?? false;
                              return (
                                <div
                                  key={sub.id}
                                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", background: subDone ? "#F6FBF5" : "white", border: `1px solid ${subDone ? "#D8E4D6" : "#EDE5E5"}`, cursor: "pointer", transition: "all 0.15s" }}
                                  onClick={() => toggleTask(sub)}
                                >
                                  {subDone
                                    ? <CheckCircle2 size={15} color="#8FAB8A" strokeWidth={2} />
                                    : <Circle size={15} color="#D8D0D0" strokeWidth={1.5} />}
                                  <span style={{ flex: 1, fontSize: "13px", color: subDone ? "#8FAB8A" : "#3D3535", textDecoration: subDone ? "line-through" : "none" }}>{sub.title}</span>
                                  <span style={{ fontSize: "11px", color: "#B5A8A8" }}>{sub.duration_minutes}m</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteTask(sub.id); }}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C4B8B8", padding: "3px", display: "flex" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#C0607A")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#C4B8B8")}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {adding && (
            <Card style={{ marginTop: "20px" }}>
              <CardTitle style={{ marginBottom: "16px" }}>Add cleaning task</CardTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Input label="Task name" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Vacuum bedroom" autoFocus />
                <div className="grid-3-col" style={{ gap: "12px" }}>
                  <Select label="Room" options={ROOMS} value={form.room} onChange={(v) => setForm((p) => ({ ...p, room: v }))} />
                  <Select label="Frequency" options={FREQ_OPTIONS} value={form.frequency} onChange={(v) => setForm((p) => ({ ...p, frequency: v }))} />
                  <Input label="Duration (min)" type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.is_minimum_viable} onChange={(e) => setForm((p) => ({ ...p, is_minimum_viable: e.target.checked }))} style={{ accentColor: "#F2C4CE", width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "13px", color: "#6B5E5E" }}>Include in Minimum Viable Day</span>
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button onClick={addTask} disabled={!form.title.trim()}><Plus size={14} /> Add task</Button>
                  <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              style={{
                marginTop: "16px", display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 16px", borderRadius: "12px", border: "1.5px dashed #E0D8D8",
                background: "transparent", cursor: "pointer", color: "#9B8E8E", fontSize: "13px",
                transition: "all 0.15s", width: "100%", justifyContent: "center",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F2C4CE"; e.currentTarget.style.color = "#C0607A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0D8D8"; e.currentTarget.style.color = "#9B8E8E"; }}
            >
              <Plus size={14} /> Add custom task
            </button>
          )}
        </>
      )}

      {showCleanSpinModal && (
        <SpinWheelModal
          items={tasks.filter(t => cleanSelectedIds.has(t.id)).map(t => ({ id: t.id, label: t.title }))}
          onClose={() => setShowCleanSpinModal(false)}
        />
      )}
    </div>
  );
}
