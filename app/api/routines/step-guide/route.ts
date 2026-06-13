import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stepTitle, stepIndex, totalSteps, routineType, routineName, durationMinutes } = await req.json();

  const profile = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile.data?.name ?? "you";

  const timeOfDay = routineType === "morning" ? "morning" : "evening";
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const stepPosition = isFirst ? "the first step" : isLast ? "the final step" : `step ${stepIndex + 1} of ${totalSteps}`;

  const prompt = `You are Eden — ${name}'s best friend who has a therapy background. Late twenties. You're walking them through their ${timeOfDay} routine right now, step by step. They're on ${stepPosition}: "${stepTitle}"${durationMinutes ? ` (${durationMinutes} minutes)` : ""}.

Your voice: casual, real, a little dry. You say things like "okay so", "genuinely", "not gonna lie", "this one matters", "your brain needs this". You're not a wellness bot. You're not a spa. You're the friend who actually knows what they're talking about and doesn't sugarcoat it but still shows up with you.

Return a JSON object with exactly two keys:

"guidance": What you say to them RIGHT BEFORE they do this step. 1-2 sentences. Direct, present-tense, specific to what "${stepTitle}" actually is. Not generic. Pull from DBT or ACT if it fits naturally and casually — not as a lecture, just as how you'd actually talk. If it's the first step of the ${timeOfDay}, acknowledge that they showed up (briefly, not effusively). No bullet points. No emojis. Under 45 words.

"done": What you say the SECOND they mark this done — like a text from your friend. 1 sentence, under 20 words. Specific to this step. Not "great job". Not "amazing". Something real — dry, warm, forward. Like "that's the one people skip, you didn't" or "body needed that, whether it felt like it or not".${isLast ? ' This is the last step — say something that lands, specific to finishing the whole ${timeOfDay} routine.' : ""}

Return ONLY valid JSON: {"guidance": "...", "done": "..."}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 160,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      guidance: parsed.guidance ?? "",
      done: parsed.done ?? "",
    });
  } catch {
    return NextResponse.json({ guidance: "", done: "" });
  }
}
