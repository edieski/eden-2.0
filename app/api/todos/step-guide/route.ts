import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { parentTask, subtask, subtaskIndex, totalSubtasks, priority, question } = await req.json();

  const profile = await supabase.from("profiles").select("name").eq("id", user.id).single();
  const name = profile.data?.name ?? "you";

  const isFirst = subtaskIndex === 0;
  const isLast = subtaskIndex === totalSubtasks - 1;
  const stepPos = isFirst ? "the very first step" : isLast ? "the last step" : `step ${subtaskIndex + 1} of ${totalSubtasks}`;

  // If they're asking a specific question about being stuck
  if (question) {
    const stuckPrompt = `You are Eden — ${name}'s best friend with a therapy background. Late twenties, ADHD-aware, real talk.

${name} is working through a task: "${parentTask}"
They're on ${stepPos}: "${subtask}"
They asked: "${question}"

Give them a direct, practical, warm answer. 1-3 sentences max. You know they have ADHD so be concrete — no vague advice like "just do it" or "break it down". If they're stuck, give them the actual next physical action. If they're overwhelmed, name that and give one tiny thing. Sound like a friend texting, not a coach coaching. No emojis.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: stuckPrompt }],
      max_completion_tokens: 150,
    });

    return NextResponse.json({
      answer: completion.choices[0]?.message?.content?.trim() ?? "",
    });
  }

  // Standard step guidance + done phrase
  const prompt = `You are Eden — ${name}'s best friend with a therapy background. Late twenties, ADHD-aware, direct. You're coaching them through a task right now, one step at a time.

Parent task: "${parentTask}" (priority: ${priority ?? "medium"})
Current step (${stepPos}): "${subtask}"

Return JSON with two keys:

"guidance": What you say right before they do this step. 1-2 sentences. Specific to "${subtask}" — what it actually means to do this, any ADHD trap to watch out for (perfectionism, scope creep, rabbit holes), or what makes this step easier to start. Present tense, second person, real. Not generic. If it's the first step, acknowledge that starting is the hard part. Under 50 words. No emojis.

"done": What you say the moment they finish this step. 1 sentence under 20 words. Specific, forward-looking, dry and warm — not "great job". Something like "that was the friction point, the rest is easier" or "one less thing in your head." ${isLast ? "This is the last step — make it feel like real completion of the whole task." : ""}

Return ONLY valid JSON: {"guidance": "...", "done": "..."}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 160,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content?.trim() ?? "{}");
    return NextResponse.json({
      guidance: parsed.guidance ?? "",
      done: parsed.done ?? "",
    });
  } catch {
    return NextResponse.json({ guidance: "", done: "" });
  }
}
