import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OnboardingPayload {
  preferredName?: string;
  reasons: string[];
  biggestGoal: string;
  supportStyle: string;
  additionalContext?: string;
  diagnoses: string[];
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: OnboardingPayload = await req.json();
  const { preferredName, reasons, biggestGoal, supportStyle, additionalContext, diagnoses } = body;

  const memories: Array<{ user_id: string; category: string; memory: string; source: string }> = [];

  // Preferred name
  if (preferredName?.trim()) {
    memories.push({
      user_id: user.id,
      category: "personal",
      memory: `Prefers to be called "${preferredName.trim()}"`,
      source: "onboarding",
    });
  }

  // Reasons they came to Eden
  if (reasons.length > 0) {
    memories.push({
      user_id: user.id,
      category: "goal",
      memory: `Came to Eden to work on: ${reasons.join(", ")}`,
      source: "onboarding",
    });
  }

  // Biggest goal
  if (biggestGoal?.trim()) {
    memories.push({
      user_id: user.id,
      category: "goal",
      memory: `Biggest goal right now: ${biggestGoal.trim()}`,
      source: "onboarding",
    });
  }

  // Support style preference
  if (supportStyle?.trim()) {
    memories.push({
      user_id: user.id,
      category: "preference",
      memory: `Prefers support style: ${supportStyle}`,
      source: "onboarding",
    });
  }

  // Diagnoses / neurodivergence
  if (diagnoses.length > 0) {
    memories.push({
      user_id: user.id,
      category: "personal",
      memory: `Has shared: ${diagnoses.join(", ")}`,
      source: "onboarding",
    });
  }

  // Free-form additional context
  if (additionalContext?.trim()) {
    memories.push({
      user_id: user.id,
      category: "personal",
      memory: additionalContext.trim().slice(0, 300),
      source: "onboarding",
    });
  }

  // Run DB writes in parallel
  const writes: Promise<unknown>[] = [
    // Mark user as onboarded
    supabase.from("profiles").update({ onboarded: true }).eq("id", user.id),
  ];

  // Update preferred name in profile if provided
  if (preferredName?.trim()) {
    writes.push(
      supabase.from("profiles").update({ name: preferredName.trim() }).eq("id", user.id)
    );
  }

  // Insert memories
  if (memories.length > 0) {
    writes.push(supabase.from("user_memories").insert(memories));
  }

  await Promise.all(writes);

  return NextResponse.json({ ok: true });
}
