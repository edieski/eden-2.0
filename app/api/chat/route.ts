import { NextRequest, NextResponse } from "next/server";
import { openai, buildSystemPrompt, type MemoryContext } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

// Number of recent messages to keep in the live conversation window
const CONVERSATION_WINDOW = 30;
// If total messages exceed this, summarize the overflow
const SUMMARIZE_THRESHOLD = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // ── Fetch all context in parallel ──────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const [
    profileRes,
    milestonesRes,
    habitsRes,
    habitLogsRes,
    memoriesRes,
    notesRes,
    reviewRes,
    todosRes,
    foodRes,
    allMessagesCountRes,
    summaryRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, chibi_name, created_at")
      .eq("id", user.id)
      .single(),

    supabase
      .from("milestones")
      .select("title, pillar, description")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .limit(8),

    supabase
      .from("habits")
      .select("id, title, pillar")
      .eq("user_id", user.id)
      .limit(20),

    supabase
      .from("habit_logs")
      .select("habit_id, completed")
      .eq("user_id", user.id)
      .eq("date", today),

    supabase
      .from("user_memories")
      .select("category, memory")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30),

    supabase
      .from("notes")
      .select("title, content, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),

    supabase
      .from("discipline_reviews")
      .select("week_start, wins, struggles, intentions, overall_mood")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("todos")
      .select("text, priority")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("priority", { ascending: false })
      .limit(15),

    supabase
      .from("food_logs")
      .select("description, mood, meal_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7),

    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),

    supabase
      .from("chat_summaries")
      .select("summary, period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const totalMessages = allMessagesCountRes.count ?? 0;
  const existingSummary = summaryRes.data ?? null;

  // ── Build habit completion map ──────────────────────────────────────────────
  const completedHabitIds = new Set(
    (habitLogsRes.data ?? []).filter((l) => l.completed).map((l) => l.habit_id)
  );
  const todayHabits = (habitsRes.data ?? []).map((h) => ({
    title: h.title,
    pillar: h.pillar,
    completed: completedHabitIds.has(h.id),
  }));

  // ── Decide what conversation history to load ────────────────────────────────
  // If we have a summary covering older messages, only load the recent window.
  // If total exceeds threshold and no summary exists, we'll trigger summarization.
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(CONVERSATION_WINDOW);

  const recentHistory = (history ?? []).reverse();

  // ── Assemble context for system prompt ─────────────────────────────────────
  const profile = profileRes.data;
  const ctx: MemoryContext = {
    userName: profile?.name ?? "you",
    memberSince: profile?.created_at,
    activeMilestones: milestonesRes.data ?? [],
    todayHabits,
    memories: memoriesRes.data ?? [],
    recentNotes: (notesRes.data ?? []).map((n) => ({
      title: n.title,
      content: n.content,
      created_at: n.created_at,
    })),
    latestReview: reviewRes.data ?? null,
    pendingTodos: (todosRes.data ?? []).map((t) => ({
      text: t.text,
      priority: t.priority,
    })),
    recentFoodMoods: (foodRes.data ?? []).map((f) => ({
      description: f.description,
      mood: f.mood,
      meal_type: f.meal_type,
    })),
    conversationSummary: existingSummary?.summary ?? null,
  };

  const systemPrompt = buildSystemPrompt(ctx);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // ── Save user message ───────────────────────────────────────────────────────
  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  // ── Stream response ─────────────────────────────────────────────────────────
  const stream = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages,
    stream: true,
    max_completion_tokens: 700,
  });

  let fullResponse = "";

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          fullResponse += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }

      // Save assistant response
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: fullResponse,
      });

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();

      // Fire-and-forget: extract memories + maybe summarize (non-blocking)
      triggerBackgroundTasks({
        userId: user.id,
        userMessage: message,
        assistantMessage: fullResponse,
        totalMessages: totalMessages + 2, // +2 for the messages we just saved
        existingSummaryPeriodEnd: existingSummary?.period_end ?? null,
        requestUrl: req.url,
      }).catch(() => {/* silent — memory extraction is best-effort */});
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── Background: memory extraction + summarization ──────────────────────────────
async function triggerBackgroundTasks(opts: {
  userId: string;
  userMessage: string;
  assistantMessage: string;
  totalMessages: number;
  existingSummaryPeriodEnd: string | null;
  requestUrl: string;
}) {
  const baseUrl = new URL(opts.requestUrl).origin;

  // Always try to extract memories from this turn
  fetch(`${baseUrl}/api/chat/extract-memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: opts.userId,
      userMessage: opts.userMessage,
      assistantMessage: opts.assistantMessage,
    }),
  }).catch(() => {});

  // Trigger summarization when history is long and we don't have a recent summary
  if (opts.totalMessages >= SUMMARIZE_THRESHOLD) {
    fetch(`${baseUrl}/api/chat/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: opts.userId,
        existingSummaryPeriodEnd: opts.existingSummaryPeriodEnd,
      }),
    }).catch(() => {});
  }
}
