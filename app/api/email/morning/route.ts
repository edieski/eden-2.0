import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import { buildMorningEmail, type MorningEmailData } from "@/lib/email/morningTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

const BALLET_DAYS: Record<string, MorningEmailData["balletType"]> = {
  Monday: "barre",
  Tuesday: "core",
  Wednesday: "barre",
  Thursday: "core",
  Friday: "barre",
  Saturday: "rest",
  Sunday: "rest",
};
const BALLET_LABELS: Record<string, string> = {
  Monday: "Barre session",
  Tuesday: "Core & stamina",
  Wednesday: "Barre session",
  Thursday: "Core & stamina",
  Friday: "Barre session",
  Saturday: "Active rest",
  Sunday: "Rest day",
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── Fetch all context in parallel ────────────────────────────────────────
  const [
    profileRes,
    memoriesRes,
    reviewRes,
    routinesRes,
    routineLogsRes,
    habitsRes,
    habitLogsRes,
    todosRes,
    notesRes,
    milestonesRes,
    foodRes,
    chatSummaryRes,
  ] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase.from("user_memories").select("category, memory, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase
      .from("discipline_reviews")
      .select("wins, struggles, intentions, overall_mood")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("routines")
      .select("id, name, type, items")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("type", "morning"),
    supabase
      .from("routine_logs")
      .select("routine_id, completed_items")
      .eq("user_id", user.id)
      .eq("date", todayStr),
    supabase.from("habits").select("id, title, pillar").eq("user_id", user.id),
    supabase
      .from("habit_logs")
      .select("habit_id, completed")
      .eq("user_id", user.id)
      .eq("date", todayStr),
    supabase
      .from("todos")
      .select("text, priority")
      .eq("user_id", user.id)
      .eq("completed", false)
      .is("parent_id", null)
      .order("priority")
      .limit(6),
    supabase
      .from("notes")
      .select("title, content, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("milestones")
      .select("title, pillar, description")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .limit(4),
    supabase
      .from("food_logs")
      .select("description, mood, meal_type, date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("chat_summaries")
      .select("summary")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const name = profileRes.data?.name?.split(" ")[0] ?? "love";
  const memories = memoriesRes.data ?? [];
  const review = reviewRes.data ?? null;
  const routines = routinesRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const habitLogs = habitLogsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const notes = notesRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const foodLogs = foodRes.data ?? [];
  const chatSummary = chatSummaryRes.data?.summary ?? null;

  const byCategory: Record<string, string[]> = {};
  for (const m of memories) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m.memory);
  }

  const morningRoutine = routines[0] ?? null;
  const morningItems = (morningRoutine?.items as Array<{ id: string; title: string; duration_minutes: number | null }> ?? []);
  const pendingHabits = habits.filter((h) => !habitLogs.find((l) => l.habit_id === h.id && l.completed));

  // ── Fetch recent chat messages ────────────────────────────────────────────
  const { data: recentChats } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const recentMessages = (recentChats ?? []).reverse();

  // ── Build full context ────────────────────────────────────────────────────
  const sections: string[] = [];

  if (milestones.length)
    sections.push(`Active goals:\n${milestones.map((m) => `  • [${m.pillar}] ${m.title}`).join("\n")}`);

  const memoryLabels: Record<string, string> = {
    struggle: "Ongoing struggles", win: "Wins & growth", pattern: "Behavioral patterns",
    emotional: "Emotional patterns", goal: "Goals", personal: "Personal facts",
    preference: "Preferences", relationship: "People in her life",
  };
  const memoryText = Object.entries(byCategory)
    .map(([cat, items]) => `  ${memoryLabels[cat] ?? cat}:\n${items.slice(0, 4).map((i) => `    - ${i}`).join("\n")}`)
    .join("\n");
  if (memoryText) sections.push(`What Eden knows about ${name}:\n${memoryText}`);

  if (review) {
    sections.push(
      `Last weekly review:\n  Went well: ${review.wins || "—"}\n  Was hard: ${review.struggles || "—"}\n  Intentions: ${review.intentions || "—"}`
    );
  }

  if (notes.length) {
    sections.push(`Recent journal entries:\n${notes.map((n) => {
      const preview = n.content.length > 150 ? n.content.slice(0, 150) + "…" : n.content;
      return `  [${new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}] "${n.title}": ${preview}`;
    }).join("\n")}`);
  }

  const moodFoods = foodLogs.filter((f) => f.mood);
  if (moodFoods.length)
    sections.push(`Food + mood signals:\n${moodFoods.map((f) => `  • ${f.meal_type} (${f.date}): "${f.description}" — mood: ${f.mood}`).join("\n")}`);

  if (chatSummary) sections.push(`Summary of older conversations:\n${chatSummary}`);

  if (recentMessages.length) {
    sections.push(`Most recent conversation:\n${recentMessages.slice(-8).map((m) => `  ${m.role === "user" ? name : "Eden"}: ${m.content.slice(0, 180)}`).join("\n")}`);
  }

  const fullContext = sections.join("\n\n");

  let aiGreeting = `hey ${name}! okay it's morning — you showed up, that counts.`;
  let aiGentleNote = "";
  let aiNextStep = "start with your morning routine, literally just the first step.";

  try {
    const prompt = `You are Eden — ${name}'s best friend with a therapy background, writing her morning email newsletter. It is ${dayOfWeek}.

You have all this context about her:
${fullContext || "No data yet."}

Write the opening of her morning email — warm, casual, specific, like a friend who actually read her last message. NOT a wellness bot. Reference SPECIFIC things from her recent chats or life.

Respond ONLY with valid JSON:
{
  "greeting": "2-3 casual sentences. Warm, specific, real. Could start with 'hey' or 'okay so'. Reference something from her actual recent conversation or life.",
  "gentleNote": "1 sentence acknowledging one specific thing she's been going through — name the actual thing. Empty string if nothing.",
  "nextStep": "1 sentence, the single most useful focus for today. Specific, direct, no fluff."
}`;

    const res = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 320,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    aiGreeting = parsed.greeting ?? aiGreeting;
    aiGentleNote = parsed.gentleNote ?? "";
    aiNextStep = parsed.nextStep ?? aiNextStep;
  } catch {
    // Fallback to defaults above
  }

  // ── Build email ───────────────────────────────────────────────────────────
  const emailData: MorningEmailData = {
    name,
    today: todayFormatted,
    dayOfWeek,
    greeting: aiGreeting,
    gentleNote: aiGentleNote,
    nextStep: aiNextStep,
    struggles: byCategory["struggle"] ?? [],
    wins: byCategory["win"] ?? [],
    intentions: review?.intentions ?? "",
    morningRoutineItems: morningItems,
    balletType: BALLET_DAYS[dayOfWeek] ?? "rest",
    balletLabel: BALLET_LABELS[dayOfWeek] ?? "Rest day",
    habits: pendingHabits,
    pendingTodos: todos,
  };

  const html = buildMorningEmail(emailData);

  // ── Send via Resend ───────────────────────────────────────────────────────
  const emailTo = user.email;
  if (!emailTo) return NextResponse.json({ error: "No email on account" }, { status: 400 });

  const { error: sendError } = await resend.emails.send({
    from: "Eden ✦ <onboarding@resend.dev>",
    to: emailTo,
    subject: `Good morning, ${name} ✦ here's your day`,
    html,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: emailTo });
}
