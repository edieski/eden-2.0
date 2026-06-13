import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskText, taskId, priority } = await req.json();
  if (!taskText || !taskId) {
    return NextResponse.json({ error: "taskText and taskId required" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `You are a task breakdown assistant for someone with ADHD.

Your job: break tasks into clear, concrete steps that remove the guesswork — each one should be something a person can just sit down and do.

ADHD context:
- What looks "simple" to others (reply to email, clean kitchen, make a call) can feel enormous with ADHD
- Executive dysfunction means starting is the hardest part — the first step must be obvious and frictionless
- Vague steps like "research X" or "work on Y" cause paralysis — be specific about what to actually do
- Every step should feel like: "I know exactly what this means, I can just do it"

Rules:
- Return as many subtasks as the task genuinely needs — do not cap the number
- Steps should be granular — small enough to feel doable, specific enough to be unambiguous
- Good granularity: "Open the document", "Write the intro paragraph", "Check the fridge and list what's missing", "Text back and suggest a time"
- Too granular (avoid): "Open your laptop", "Pick up the pen", "Put hands on keyboard", "Walk to the room"
- Only return an empty array [] if the task is already fully clear and actionable on its own (e.g. "buy milk", "set an alarm")
- Start each step with a strong verb (Write, Call, Send, Clean, Find, Fill in, Book, etc.)
- Keep each step to max 10 words
- No vague steps like "think about", "consider", "work on", "deal with"

Return ONLY a valid JSON array of strings. No explanation, no markdown, no extra text.
Example output: ["Open the email app", "Find the email from Sarah", "Type a 2-sentence reply", "Hit send"]`,
      },
      {
        role: "user",
        content: `Break this task into tiny ADHD-friendly steps: "${taskText}"`,
      },
    ],
    max_completion_tokens: 600,
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "[]";

  let subtaskTexts: string[] = [];
  try {
    subtaskTexts = JSON.parse(content);
  } catch {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      try { subtaskTexts = JSON.parse(match[0]); } catch { subtaskTexts = []; }
    }
  }

  if (!Array.isArray(subtaskTexts) || subtaskTexts.length === 0) {
    return NextResponse.json({ subtasks: [] });
  }

  const inserts = subtaskTexts.map((text: string) => ({
    user_id: user.id,
    text: String(text).trim(),
    completed: false,
    priority,
    parent_id: taskId,
  }));

  const { data, error } = await supabase.from("todos").insert(inserts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ subtasks: data ?? [] });
}
