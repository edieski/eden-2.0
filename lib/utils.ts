import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getMoodLabel(mood: string): string {
  const moods: Record<string, string> = {
    joyful: "Joyful",
    calm: "Calm",
    okay: "Okay",
    tired: "Tired",
    anxious: "Anxious",
    sad: "Low",
    frustrated: "Frustrated",
    motivated: "Motivated",
  };
  return moods[mood] ?? mood;
}

export function getPillarColor(pillar: string): string {
  const colors: Record<string, string> = {
    health: "bg-[#D8E4D6] text-[#4A6847]",
    mind: "bg-[#E5DDEF] text-[#6B4F8A]",
    finances: "bg-[#F0E4CC] text-[#8A6230]",
    purpose: "bg-[#FAE0D0] text-[#9A5230]",
    relationships: "bg-[#FAE8EC] text-[#C0607A]",
    spirituality: "bg-[#EEE8F8] text-[#7058A0]",
    home: "bg-[#E4EEE4] text-[#4A6A4A]",
  };
  return colors[pillar] ?? "bg-[#F0EBE3] text-[#6B5E5E]";
}

export function getPillarAccent(pillar: string): string {
  const colors: Record<string, string> = {
    health: "#B5C4B1",
    mind: "#C8B8D8",
    finances: "#C9A96E",
    purpose: "#F5C9A8",
    relationships: "#F2C4CE",
    spirituality: "#D4C8EC",
    home: "#B8CCB8",
  };
  return colors[pillar] ?? "#B5C4B1";
}

export function getPillarLabel(pillar: string): string {
  const labels: Record<string, string> = {
    health: "Health & Body",
    mind: "Mind & Growth",
    finances: "Finances",
    purpose: "Purpose & Career",
    relationships: "Relationships",
    spirituality: "Spirituality",
    home: "Home & Space",
  };
  return labels[pillar] ?? pillar;
}

export function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const todayStr = today();
  let streak = 0;
  let current = new Date(todayStr);

  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    const diffDays = Math.round(
      (current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0 || diffDays === 1) {
      streak++;
      current = d;
    } else {
      break;
    }
  }
  return streak;
}

export function getChibiMood(
  habitsCompleted: number,
  totalHabits: number,
  streak: number
): "thriving" | "happy" | "okay" | "sad" | "sleeping" {
  if (totalHabits === 0) return "okay";
  const ratio = habitsCompleted / totalHabits;
  if (streak >= 7 && ratio >= 0.8) return "thriving";
  if (ratio >= 0.6) return "happy";
  if (ratio >= 0.3) return "okay";
  if (habitsCompleted === 0) return "sleeping";
  return "sad";
}

export const MOODS = [
  { value: "joyful", label: "Joyful" },
  { value: "calm", label: "Calm" },
  { value: "motivated", label: "Motivated" },
  { value: "okay", label: "Okay" },
  { value: "tired", label: "Tired" },
  { value: "anxious", label: "Anxious" },
  { value: "frustrated", label: "Frustrated" },
  { value: "sad", label: "Low" },
] as const;

export const LIFE_PILLARS = [
  { value: "health", label: "Health & Body" },
  { value: "mind", label: "Mind & Growth" },
  { value: "finances", label: "Finances" },
  { value: "purpose", label: "Purpose & Career" },
  { value: "relationships", label: "Relationships" },
  { value: "spirituality", label: "Spirituality" },
  { value: "home", label: "Home & Space" },
] as const;
