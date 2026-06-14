import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

interface PlanPriority {
  text: string;
  why: string;
  firstStep: string;
  priority: "high" | "medium" | "low";
}

interface DayPlan {
  focus: string;
  whyToday: string;
  priorities: PlanPriority[];
  ifOneThing: string;
  gentleNote: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { history, mode = "plan" } = await req.json();
  if (!history?.length) return NextResponse.json({ error: "Conversation required" }, { status: 400 });

  const profile = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile.data?.name?.split(" ")[0] ?? "you";

  const conversation = history
    .map((m: { role: string; content: string }) => `${m.role === "user" ? name : "Eden"}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are Eden — ${name}'s best friend with a therapy background. You just had a "talk it through" conversation with ${name}. Now turn what you discussed into a clear, actionable day plan.

Mode was: ${mode}

Conversation:
${conversation}

Create a day plan that captures what you actually talked about — not generic advice. Reference their specific situation, tasks, and feelings from the conversation.

Return ONLY valid JSON:
{
  "focus": "one sentence — the theme or energy for today",
  "whyToday": "1-2 sentences — why these things matter today, connected to their values or situation",
  "priorities": [
    {
      "text": "clear actionable task (max 8 words, starts with verb)",
      "why": "one sentence — why this matters to them specifically",
      "firstStep": "the tiniest first step — literally what they do first (e.g. 'open the doc', 'send one text')",
      "priority": "high" | "medium" | "low"
    }
  ],
  "ifOneThing": "if they only do ONE thing today, what should it be and why — one sentence",
  "gentleNote": "one sentence of real-talk encouragement — not cheerleader, friend energy"
}

Rules:
- 2-4 priorities max — ADHD-friendly, not overwhelming
- firstStep must be absurdly small (task initiation)
- why fields must be personal to what they said, not generic
- ifOneThing should be the highest-leverage thing from the conversation
- gentleNote should sound like Eden, lowercase is fine`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 700,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as DayPlan;

    return NextResponse.json({
      focus: parsed.focus ?? "take it one step at a time",
      whyToday: parsed.whyToday ?? "",
      priorities: (parsed.priorities ?? []).slice(0, 4),
      ifOneThing: parsed.ifOneThing ?? "",
      gentleNote: parsed.gentleNote ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to build plan" }, { status: 500 });
  }
}
