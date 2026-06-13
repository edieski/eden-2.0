"use client";

import { useEffect, useState } from "react";

interface SparkleProps {
  count?: number;
  area?: "header" | "full" | "corner";
  color?: string;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  type: "star4" | "star6" | "dot" | "cross";
}

function Star4({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill={color} />
    </svg>
  );
}

function Star6({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 1 L12 7 L18 7 L13 11 L15 17 L10 13 L5 17 L7 11 L2 7 L8 7 Z" fill={color} opacity="0.8" />
    </svg>
  );
}

function Cross({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="9" y="2" width="2" height="16" rx="1" fill={color} />
      <rect x="2" y="9" width="16" height="2" rx="1" fill={color} />
    </svg>
  );
}

const SPARKLE_COLORS = [
  "rgba(201,169,110,0.9)",   // gold
  "rgba(242,196,206,0.9)",   // blush
  "rgba(200,184,216,0.9)",   // lavender
  "rgba(181,196,177,0.85)",  // sage
  "rgba(245,201,168,0.85)",  // peach
];

export default function Sparkles({ count = 8, area = "header", color }: SparkleProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const types: Star["type"][] = ["star4", "star6", "dot", "cross"];
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: area === "corner" ? 70 + Math.random() * 30 : Math.random() * 100,
        y: area === "header" ? Math.random() * 100 : Math.random() * 100,
        size: 6 + Math.random() * 10,
        delay: Math.random() * 3,
        duration: 1.5 + Math.random() * 2.5,
        type: types[Math.floor(Math.random() * types.length)],
      }))
    );
  }, [count, area]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
      aria-hidden
    >
      {stars.map((star) => {
        const c = color ?? SPARKLE_COLORS[star.id % SPARKLE_COLORS.length];
        const Component = star.type === "star4" ? Star4 : star.type === "star6" ? Star6 : star.type === "cross" ? Cross : null;
        return (
          <div
            key={star.id}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              opacity: 0,
            }}
          >
            {Component ? (
              <Component size={star.size} color={c} />
            ) : (
              <div
                style={{
                  width: star.size * 0.5,
                  height: star.size * 0.5,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Botanical leaf accent — SVG
export function LeafAccent({ side = "left", color = "#B5C4B1" }: { side?: "left" | "right"; color?: string }) {
  return (
    <svg
      width="48"
      height="64"
      viewBox="0 0 48 64"
      fill="none"
      style={{
        transform: side === "right" ? "scaleX(-1)" : "none",
        opacity: 0.55,
        animation: "leaf-sway 4s ease-in-out infinite",
        transformOrigin: "bottom center",
      }}
      aria-hidden
    >
      <path d="M24 60 C24 60 8 44 8 28 C8 14 16 4 24 2 C32 4 40 14 40 28 C40 44 24 60 24 60Z" fill={color} />
      <path d="M24 60 L24 20" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 40 C18 36 14 30 16 24" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <path d="M24 48 C30 44 34 36 32 30" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// Small sparkle burst used inline
export function SparkleInline({ size = 16, color = "#C9A96E" }: { size?: number; color?: string }) {
  return (
    <span style={{ display: "inline-block", animation: `sparkle 2s ease-in-out infinite`, verticalAlign: "middle" }} aria-hidden>
      <Star4 size={size} color={color} />
    </span>
  );
}
