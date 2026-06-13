"use client";

import Image from "next/image";

type ChibiMood = "thriving" | "happy" | "okay" | "sad" | "sleeping";
type ChibiOutfit = "default" | "ballet" | "cozy" | "study" | "clean";

interface ChibiCharacterProps {
  mood?: ChibiMood;
  outfit?: ChibiOutfit;
  size?: number;
  animate?: boolean;
  name?: string;
  showName?: boolean;
}

const moodOverlay: Record<ChibiMood, string> = {
  thriving: "✨",
  happy: "🩰",
  okay: "💕",
  sad: "🫂",
  sleeping: "💤",
};

const moodGlow: Record<ChibiMood, string> = {
  thriving: "drop-shadow(0 0 18px rgba(255, 192, 220, 0.9)) drop-shadow(0 0 32px rgba(255, 230, 240, 0.6))",
  happy: "drop-shadow(0 0 12px rgba(255, 182, 210, 0.7))",
  okay: "drop-shadow(0 0 8px rgba(240, 200, 220, 0.5))",
  sad: "drop-shadow(0 0 6px rgba(180, 160, 200, 0.4))",
  sleeping: "drop-shadow(0 0 10px rgba(200, 210, 240, 0.5))",
};

export default function ChibiCharacter({
  mood = "happy",
  outfit: _outfit,
  size = 180,
  animate = true,
  name,
  showName = false,
}: ChibiCharacterProps) {
  const overlay = moodOverlay[mood];
  const glow = moodGlow[mood];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          animation: animate ? "float 3.5s ease-in-out infinite" : "none",
        }}
      >
        <Image
          src="/pippa.png"
          alt={name ? `${name} the ballet bunny` : "Pippa the ballet bunny"}
          width={size}
          height={size}
          style={{
            objectFit: "contain",
            filter: glow,
            borderRadius: "50%",
          }}
          priority
        />

        {/* Mood sparkle overlay */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: size < 80 ? -4 : 4,
            right: size < 80 ? -4 : 8,
            fontSize: size < 80 ? "12px" : size < 120 ? "16px" : "22px",
            lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
            animation: animate ? "float 2.8s ease-in-out infinite reverse" : "none",
          }}
        >
          {overlay}
        </span>

        {mood === "sleeping" && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: size * 0.15,
                right: size * 0.05,
                fontSize: size < 100 ? "10px" : "15px",
                opacity: 0.7,
                animation: "float 4s ease-in-out infinite",
              }}
            >
              z
            </span>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: size * 0.05,
                right: size * 0.15,
                fontSize: size < 100 ? "8px" : "11px",
                opacity: 0.5,
                animation: "float 4s ease-in-out 0.8s infinite",
              }}
            >
              z
            </span>
          </>
        )}

        {mood === "thriving" && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: size * 0.05,
                left: size * 0.05,
                fontSize: size < 100 ? "10px" : "16px",
                animation: "float 2.5s ease-in-out infinite",
              }}
            >
              ✦
            </span>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: size * 0.1,
                right: size * 0.02,
                fontSize: size < 100 ? "8px" : "12px",
                animation: "float 3s ease-in-out 0.5s infinite",
              }}
            >
              ✦
            </span>
          </>
        )}
      </div>

      {showName && name && (
        <p
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "16px",
            fontWeight: 400,
            letterSpacing: "0.06em",
            color: "#6B5E5E",
          }}
        >
          {name}
        </p>
      )}
    </div>
  );
}
