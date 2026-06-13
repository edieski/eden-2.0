import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dump } = await req.json();
  if (!dump?.trim()) return NextResponse.json({ error: "No content" }, { status: 400 });

  const profile = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile.data?.name ?? "you";

  const prompt = `You are Eden — ${name}'s best friend with a therapy background. Late twenties, real talk, not a wellness bot.

${name} just brain-dumped everything that's overwhelming them:

"${dump}"

Your job: help them go from "everything is screaming at me" to "here's what's actually happening and what to do."

Use DBT "check the facts" thinking to separate what's genuinely urgent from what anxiety is inflating. Use ACT values to distinguish what actually matters from noise. Use ADHD-aware thinking — task initiation paralysis makes EVERYTHING feel equally urgent and terrible, so help them see the difference.

Return a JSON object with exactly this shape:

{
  "framing": "1-2 sentences. Validate the overwhelm without being sappy. Name what you see — is this ADHD paralysis? anxiety spiral? genuinely a lot on the plate? Be specific to what they actually wrote. Sound like a friend who read it, not a bot who processed it. Lowercase is fine.",
  "tasks": [
    {
      "text": "clear, specific, actionable task — not vague",
      "bucket": "today" | "this-week" | "someday",
      "priority": "high" | "medium" | "low",
      "note": "optional — 1 sentence if this task needs context or a reality-check, e.g. 'anxiety is making this feel urgent but it can wait' or 'this is the one that actually unblocks everything else'. Leave as empty string if nothing to add."
    }
  ],
  "realTalk": "1 sentence. The thing a good friend would say after seeing all of this. Honest, maybe slightly dry, not cheerleader energy. Something like 'most of this is this week at most, not today' or 'three of these are the same problem dressed differently'."
}

Rules for tasks:
- Extract every distinct task from the dump — don't merge things that are separate
- If something is too vague ("sort my life out"), break it into the most obvious concrete first step
- "today" = genuinely needs to happen today or there are real consequences
- "this-week" = important but not on fire
- "someday" = valid but not time-sensitive, often anxiety-inflated urgency
- Flag anxiety-inflated tasks in the note field
- Keep task text short and actionable (max 8 words, starts with a verb)
- priority "high" = urgent AND important; "medium" = important not urgent; "low" = someday/nice-to-have

Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
