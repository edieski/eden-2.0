"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, Shuffle } from "lucide-react";

interface WheelItem {
  id: string;
  label: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number;
  shape: "circle" | "star" | "square";
  rotation: number; rotSpeed: number;
}

const COLORS = [
  "#F2C4CE","#D8E4D6","#C8B8D8","#F5C9A8",
  "#FAE8EC","#EDE5F5","#BEDAD6","#F0E4CC",
];
const CONFETTI_COLORS = ["#F2C4CE","#8B72B0","#C8D8A8","#F5C9A8","#82C4D8","#F2E4A0","#D4A8F5"];
const ACCENT = "#8B72B0";

export default function SpinWheelModal({
  items,
  onClose,
}: {
  items: WheelItem[];
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const confettiAnimRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(0);
  const rotRef = useRef(0);

  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [winnerVisible, setWinnerVisible] = useState(false);

  function audio() {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtxRef.current;
  }

  function tick(freq = 880, vol = 0.13) {
    try {
      const ctx = audio();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "triangle";
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
    } catch { /* ignore */ }
  }

  function winSound() {
    try {
      const ctx = audio();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.17, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch { /* ignore */ }
  }

  function spawnConfetti(cx: number, cy: number, n = 80) {
    particlesRef.current = [
      ...particlesRef.current,
      ...Array.from({ length: n }, () => ({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 10 - 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 5 + Math.random() * 6,
        life: 1,
        shape: (["circle","star","square"] as Particle["shape"][])[Math.floor(Math.random() * 3)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      })),
    ];
  }

  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const sp = 5; const st = Math.PI / sp;
    ctx.beginPath();
    for (let i = 0; i < sp * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.4;
      ctx.lineTo(x + Math.cos(i * st - Math.PI / 2) * rr, y + Math.sin(i * st - Math.PI / 2) * rr);
    }
    ctx.closePath();
  };

  const animConfetti = useCallback(() => {
    const canvas = confettiRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current = particlesRef.current.filter(p => p.life > 0.01);
    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99;
      p.life -= 0.015; p.rotation += p.rotSpeed;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
      if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (p.shape === "square") { ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); }
      else { drawStar(ctx, 0, 0, p.size / 2); ctx.fill(); }
      ctx.restore();
    });
    if (particlesRef.current.length > 0) confettiAnimRef.current = requestAnimationFrame(animConfetti);
  }, []);

  function drawWheel(angle: number) {
    const canvas = canvasRef.current; if (!canvas || !items.length) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width; const cx = size / 2; const cy = size / 2; const r = cx - 10;
    const slice = (2 * Math.PI) / items.length;
    ctx.clearRect(0, 0, size, size);

    if (spinning) {
      ctx.save(); ctx.shadowColor = "#C8A8F0"; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = "#C8A8F060"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }

    items.forEach((item, i) => {
      const start = angle + i * slice; const end = start + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2.5; ctx.stroke();

      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#3D3535";
      ctx.font = `600 ${items.length > 8 ? 10 : 11}px Inter, system-ui, sans-serif`;
      const max = items.length > 8 ? 16 : 20;
      const label = item.label.length > max ? item.label.slice(0, max - 2) + "…" : item.label;
      ctx.fillText(label, r - 14, 4);
      ctx.restore();
    });

    // Hub
    const hub = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 26);
    hub.addColorStop(0, "white"); hub.addColorStop(1, "#F0EBF8");
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
    ctx.fillStyle = hub; ctx.fill(); ctx.strokeStyle = "#D8CEE8"; ctx.lineWidth = 2; ctx.stroke();

    // Pointer
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(cx + r - 2, cy - 12); ctx.lineTo(cx + r + 18, cy); ctx.lineTo(cx + r - 2, cy + 12);
    ctx.closePath(); ctx.fillStyle = ACCENT; ctx.fill(); ctx.restore();
  }

  useEffect(() => {
    drawWheel(rotRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  function spin() {
    if (spinning || !items.length) return;
    setSpinning(true); setWinner(null); setWinnerVisible(false);
    particlesRef.current = [];
    tick(440, 0.2);

    const extra = 6 + Math.random() * 5;
    const finalAngle = rotRef.current + extra * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const duration = 3800; const startTime = performance.now();
    const startAngle = rotRef.current;
    const slice = (2 * Math.PI) / items.length;
    lastTickRef.current = rotRef.current;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 4) : 1;
      const current = startAngle + (finalAngle - startAngle) * eased;
      rotRef.current = current;
      drawWheel(current);

      const speed = (finalAngle - startAngle) * (1 - Math.pow(1 - progress, 3)) / duration * 1000;
      const norm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const lastNorm = ((lastTickRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.floor(norm / slice) !== Math.floor(lastNorm / slice) && speed > 0.3)
        tick(600 + speed * 80, Math.min(0.18, speed * 0.04));
      lastTickRef.current = current;

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const finalNorm = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor(((2 * Math.PI - finalNorm) % (2 * Math.PI)) / slice) % items.length;
        setWinner(items[idx]);
        winSound();
        const canvas = canvasRef.current;
        if (canvas) {
          spawnConfetti(canvas.width / 2, canvas.height / 2, 90);
          spawnConfetti(20, 20, 20);
          spawnConfetti(canvas.width - 20, 20, 20);
          confettiAnimRef.current = requestAnimationFrame(animConfetti);
        }
        setTimeout(() => setWinnerVisible(true), 80);
      }
    }
    animRef.current = requestAnimationFrame(animate);
  }

  const size = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 64 : 340);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}
      onClick={onClose}
    >
      <style>{`
        @keyframes wheelModalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wheelWinPop {
          0% { transform: scale(0.7) translateY(8px); opacity: 0; }
          60% { transform: scale(1.07) translateY(-3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes wheelSpinIcon { to { transform: rotate(360deg); } }
        @keyframes wheelBtnPulse {
          0%, 100% { box-shadow: 0 4px 20px #8B72B040; }
          50% { box-shadow: 0 4px 32px #8B72B090; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(155deg, #F8F3FF 0%, #EDE0FA 60%, #E4D4F5 100%)",
          borderRadius: "24px",
          padding: "28px 24px 32px",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(100,60,160,0.25)",
          animation: "wheelModalIn 0.35s cubic-bezier(0.34,1.2,0.64,1) forwards",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            width: "32px", height: "32px", borderRadius: "50%",
            border: "none", background: "rgba(0,0,0,0.08)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={15} color="#7A6A6A" />
        </button>

        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: `${ACCENT}99`, marginBottom: "4px" }}>
          {items.length} task{items.length !== 1 ? "s" : ""}
        </p>
        <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "26px", fontWeight: 400, color: "#3D3535", marginBottom: "20px" }}>
          Spin the wheel
        </h2>

        {/* Canvas */}
        <div style={{ position: "relative", width: size, height: size, margin: "0 auto 20px" }}>
          <canvas ref={canvasRef} width={size} height={size} style={{ position: "absolute", top: 0, left: 0, display: "block" }} />
          <canvas ref={confettiRef} width={size} height={size} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
        </div>

        {/* Winner */}
        {winner && winnerVisible && (
          <div style={{
            textAlign: "center", marginBottom: "16px",
            padding: "14px 20px", borderRadius: "16px",
            background: "linear-gradient(135deg, #FAE8EC, #F5E8FA)",
            border: "1.5px solid #F2C4CE",
            animation: "wheelWinPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
            boxShadow: "0 6px 24px rgba(200,140,180,0.2)",
          }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C0607A", marginBottom: "6px" }}>
              ✦ your next task
            </p>
            <p style={{ fontSize: "17px", fontWeight: 600, color: "#3D3535", lineHeight: 1.35 }}>
              {winner.label}
            </p>
          </div>
        )}

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px",
            padding: "15px", borderRadius: "16px", border: "none",
            background: spinning ? "#C8B8D8" : `linear-gradient(135deg, ${ACCENT}, #A882C8)`,
            color: "white", fontSize: "16px", fontWeight: 700,
            cursor: spinning ? "default" : "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
            animation: !spinning && !winner ? "wheelBtnPulse 2s ease-in-out infinite" : "none",
            boxShadow: spinning ? "none" : `0 4px 20px ${ACCENT}45`,
          }}
        >
          <Shuffle size={17} style={{ animation: spinning ? "wheelSpinIcon 0.5s linear infinite" : "none" }} />
          {spinning ? "Spinning…" : winner ? "Spin again" : "Spin!"}
        </button>

        {/* Task list as legend */}
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", borderRadius: "9px", background: winner?.id === item.id ? `${ACCENT}15` : "rgba(255,255,255,0.5)", transition: "background 0.3s" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: winner?.id === item.id ? "#3D3535" : "#6B5E5E", fontWeight: winner?.id === item.id ? 700 : 400, flex: 1, lineHeight: 1.4 }}>
                {item.label}
              </span>
              {winner?.id === item.id && (
                <span style={{ fontSize: "11px", color: ACCENT, fontWeight: 700 }}>← start here</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
