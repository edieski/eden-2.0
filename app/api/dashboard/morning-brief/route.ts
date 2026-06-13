import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // ── Pull everything Eden knows ─────────────────────────────────────────────
  const [
    profileRes,
    memoriesRes,
    reviewRes,
    routinesRes,
    routineLogsRes,
    todosRes,
    habitsRes,
    habitLogsRes,
    notesRes,
    milestonesRes,
    foodRes,
    chatSummaryRes,
  ] = await Promise.all([
    supabase.from("profiles").select("name, created_at").eq("id", user.id).single(),

    // All extracted memories — the full accumulated knowledge about her
    supabase
      .from("user_memories")
      .select("category, memory, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),

    // Latest weekly review
    supabase
      .from("discipline_reviews")
      .select("week_start, wins, struggles, intentions, overall_mood, pillar_ratings")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),

    // Morning routine
    supabase
      .from("routines")
      .select("id, name, type, items")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),

    // Today's routine completion
    supabase
      .from("routine_logs")
      .select("routine_id, completed_items")
      .eq("user_id", user.id)
      .eq("date", todayStr),

    // Pending todos
    supabase
      .from("todos")
      .select("text, priority")
      .eq("user_id", user.id)
      .eq("completed", false)
      .is("parent_id", null)
      .order("priority")
      .limit(8),

    supabase.from("habits").select("id, title, pillar").eq("user_id", user.id),

    supabase
      .from("habit_logs")
      .select("habit_id, completed")
      .eq("user_id", user.id)
      .eq("date", todayStr),

    // Recent journal notes — what she's been thinking about
    supabase
      .from("notes")
      .select("title, content, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(4),

    // Active milestones — what she's working toward
    supabase
      .from("milestones")
      .select("title, pillar, description, phase")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .limit(5),

    // Recent food + mood logs
    supabase
      .from("food_logs")
      .select("description, mood, meal_type, date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),

    // Compressed conversation summary (older chat context)
    supabase
      .from("chat_summaries")
      .select("summary, period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  // Recent chat messages — what they literally talked about last
  const { data: recentChats } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  // ── Process data ───────────────────────────────────────────────────────────
  const name = profileRes.data?.name?.split(" ")[0] ?? "love";
  const memories = memoriesRes.data ?? [];
  const review = reviewRes.data ?? null;
  const routines = routinesRes.data ?? [];
  const routineLogs = routineLogsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const habitLogs = habitLogsRes.data ?? [];
  const notes = notesRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const foodLogs = foodRes.data ?? [];
  const chatSummary = chatSummaryRes.data?.summary ?? null;
  const recentMessages = (recentChats ?? []).reverse(); // chronological order

  // Group memories by category
  const byCategory: Record<string, string[]> = {};
  for (const m of memories) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m.memory);
  }

  const morningRoutine = routines.find((r) => r.type === "morning");
  const morningLog = routineLogs.find((l) => l.routine_id === morningRoutine?.id);
  const completedRoutineItems = new Set(morningLog?.completed_items ?? []);
  const completedHabits = habitLogs.filter((l) => l.completed).length;

  // ── Build rich context for the AI ─────────────────────────────────────────
  const sections: string[] = [];

  // 1. What she's actively working towards
  if (milestones.length) {
    sections.push(
      `ACTIVE GOALS:\n` +
      milestones.map((m) =>
        `  • [${m.pillar}] ${m.title}${m.description ? ` — "${m.description}"` : ""} (phase ${m.phase})`
      ).join("\n")
    );
  }

  // 2. Long-term memories Eden has extracted from conversations
  const memoryLabels: Record<string, string> = {
    personal: "Personal facts",
    emotional: "Emotional patterns",
    preference: "Preferences & dislikes",
    struggle: "Ongoing struggles",
    pattern: "Behavioral patterns",
    goal: "Goals & aspirations",
    win: "Wins & growth moments",
    relationship: "People in her life",
  };
  const memoryText = Object.entries(byCategory)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `  ${memoryLabels[cat] ?? cat}:\n${items.slice(0, 4).map((i) => `    - ${i}`).join("\n")}`)
    .join("\n");
  if (memoryText) sections.push(`WHAT EDEN KNOWS ABOUT ${name.toUpperCase()}:\n${memoryText}`);

  // 3. Weekly review — how last week actually went
  if (review) {
    const mood = review.overall_mood ? `(mood rated ${review.overall_mood}/5)` : "";
    const weekDate = new Date(review.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    sections.push(
      `LAST WEEKLY REVIEW (week of ${weekDate}) ${mood}:\n` +
      `  What went well: ${review.wins || "nothing logged"}\n` +
      `  What was hard: ${review.struggles || "nothing logged"}\n` +
      `  Intentions she set: ${review.intentions || "none set"}`
    );
  }

  // 4. Recent journal notes — her own words
  if (notes.length) {
    const noteLines = notes.map((n) => {
      const date = new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const preview = n.content.length > 180 ? n.content.slice(0, 180) + "…" : n.content;
      return `  [${date}] "${n.title}": ${preview}`;
    }).join("\n");
    sections.push(`RECENT JOURNAL ENTRIES (her own words):\n${noteLines}`);
  }

  // 5. Recent food + mood signals
  const moodFoodLogs = foodLogs.filter((f) => f.mood);
  if (moodFoodLogs.length) {
    sections.push(
      `RECENT FOOD + MOOD SIGNALS:\n` +
      moodFoodLogs.map((f) => `  • ${f.meal_type} (${f.date}): "${f.description}" — mood: ${f.mood}`).join("\n")
    );
  }

  // 6. Today's habits status
  if (habits.length) {
    const done = habits.filter((h) => habitLogs.find((l) => l.habit_id === h.id && l.completed));
    const pending = habits.filter((h) => !habitLogs.find((l) => l.habit_id === h.id && l.completed));
    const habitLines: string[] = [];
    if (done.length) habitLines.push(`  ✓ Already done today: ${done.map((h) => h.title).join(", ")}`);
    if (pending.length) habitLines.push(`  ○ Still to do: ${pending.map((h) => h.title).join(", ")}`);
    sections.push(`TODAY'S HABITS:\n${habitLines.join("\n")}`);
  }

  // 7. Active to-dos
  if (todos.length) {
    const high = todos.filter((t) => t.priority === "high");
    const rest = todos.filter((t) => t.priority !== "high");
    const todoLines: string[] = [];
    if (high.length) todoLines.push(`  High priority: ${high.map((t) => t.text).join(" · ")}`);
    if (rest.length) todoLines.push(`  Also pending: ${rest.slice(0, 4).map((t) => t.text).join(" · ")}`);
    sections.push(`PENDING TO-DOS:\n${todoLines.join("\n")}`);
  }

  // 8. Older conversation context (compressed)
  if (chatSummary) {
    sections.push(`SUMMARY OF OLDER CONVERSATIONS WITH EDEN:\n${chatSummary}`);
  }

  // 9. Most recent actual chat messages — what they literally talked about last
  if (recentMessages.length) {
    const chatLines = recentMessages
      .slice(-10)
      .map((m) => {
        const who = m.role === "user" ? name : "Eden";
        const preview = m.content.length > 200 ? m.content.slice(0, 200) + "…" : m.content;
        return `  ${who}: ${preview}`;
      })
      .join("\n");
    sections.push(`MOST RECENT CONVERSATION (read this to understand where she's at RIGHT NOW):\n${chatLines}`);
  }

  const fullContext = sections.join("\n\n");

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `You are Eden — ${name}'s best friend who also has a therapy background. You're in your late twenties. It is ${dayOfWeek} morning and ${name} just opened her dashboard.

You have been talking with her for a while and you know a LOT about her. Here is everything:

${fullContext || "No data yet — keep it warm and open."}

---

Write ${name} a morning check-in message. This should feel like a text from a friend who actually READ the last conversation and REMEMBERS what's going on in her life. Not a generic affirmation. Not a wellness bot. A real person who cares.

Your voice: casual, warm, direct — you use lowercase sometimes, you say things like "okay so", "hey", "real talk", "honestly", "I've been thinking about you". You reference SPECIFIC things from her life. If she talked about something in her last chat with you, reference that. If she's been struggling with something specific, name it by name (gently). If she had a win recently, bring it up.

Rules:
- "greeting": 2-3 sentences. Casual, specific, human. Reference something real from her recent chat or life. Could start with "hey" or "okay so" or just jump in. NOT generic. NOT "beautiful soul" or "you are worthy". Just real friend energy.
- "gentleNote": 1 sentence. Gently acknowledge one specific thing she's been going through — name the actual thing, not a vague "I know things have been hard." Can be empty string if nothing specific.
- "nextStep": 1 short sentence. The single most useful thing to do right now given everything you know. Concrete, actionable. Like a friend saying "okay just [specific thing], that's it for now."

Respond ONLY with valid JSON, no markdown:
{
  "greeting": "...",
  "gentleNote": "...",
  "nextStep": "..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 350,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      greeting: parsed.greeting ?? `hey ${name}! okay it's morning, you showed up — that already counts.`,
      nextStep: parsed.nextStep ?? "just start your morning routine, literally the first step.",
      gentleNote: parsed.gentleNote ?? "",
      morningRoutine: morningRoutine
        ? {
            id: morningRoutine.id,
            name: morningRoutine.name,
            items: (morningRoutine.items as Array<{ id: string; title: string; duration_minutes: number | null }>).map((item) => ({
              ...item,
              completed: completedRoutineItems.has(item.id),
            })),
          }
        : null,
      balletDay: dayOfWeek,
      habitsCompleted: completedHabits,
      habitsTotal: habits.length,
    });
  } catch {
    return NextResponse.json({
      greeting: `hey ${name}! okay it's morning, you showed up — that already counts.`,
      nextStep: "just start your morning routine, literally the first step.",
      gentleNote: "",
      morningRoutine: null,
      balletDay: dayOfWeek,
      habitsCompleted: completedHabits,
      habitsTotal: habits.length,
    });
  }
}
