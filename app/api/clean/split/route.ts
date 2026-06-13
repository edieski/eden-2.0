import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, room, duration_minutes } = await req.json();
  if (!title) return NextResponse.json({ error: "No task title" }, { status: 400 });

  const profile = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile.data?.name ?? "you";

  const prompt = `You are Eden — ${name}'s ADHD-aware cleaning coach.

Break this cleaning task into small, concrete, actionable steps:
Task: "${title}"
Room: ${room ?? "general"}
Estimated total time: ${duration_minutes ?? 15} minutes

Return a JSON object:
{
  "subtasks": [
    {
      "title": "specific action — verb + what, max 8 words. e.g. 'Pick clothes off the floor', 'Wipe the bathroom mirror'",
      "duration_minutes": number (2–10 min each)
    }
  ]
}

Rules:
- 3–6 subtasks. Each one is a single concrete physical action.
- Cover the whole task — nothing vague like "clean up" or "tidy".
- ADHD-aware: start with the most visible/impactful step first. Keep each step small enough to feel doable.
- Total subtask minutes should roughly match the parent duration.

Return ONLY valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      subtasks: (parsed.subtasks ?? []).map((s: { title: string; duration_minutes: number }) => ({
        title: s.title ?? "",
        duration_minutes: Number(s.duration_minutes) || 5,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Clean split error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
