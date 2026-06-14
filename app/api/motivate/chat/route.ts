import { NextRequest, NextResponse } from "next/server";
import { openai, buildSystemPrompt, type MemoryContext } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

const CONVERSATION_WINDOW = 30;
const SUMMARIZE_THRESHOLD = 60;

type MotivateMode = "motivate" | "plan" | "why" | "talk";

const MODE_OVERLAYS: Record<MotivateMode, string> = {
  motivate: `**SESSION MODE: Get Motivated → Lock In a Plan**
{userName} opened "Talk It Through" because they need motivation. This session ALWAYS ends with a concrete plan they're accountable for. The arc:
1. Help them name what's blocking them (avoidance? fear? exhaustion? shame? ADHD paralysis?)
2. Connect it to something that actually matters — values, not guilt
3. Talk through why today matters and what would make it feel worth it
4. When there's enough clarity, nudge toward locking in: "okay so what are we actually committing to today?"
5. The plan step comes next — help them arrive ready with 2-4 realistic commitments
Don't rush past the feeling, but always steer toward an ending they can hold themselves to.`,

  plan: `**SESSION MODE: Plan My Day → Lock In**
{userName} wants to plan their day. This session ALWAYS ends with a concrete plan they're accountable for. Your job:
1. Ask what's on their plate (todos, habits, appointments, energy level)
2. Help them separate "must do today" from "anxiety says urgent" from "can wait"
3. Talk through WHY each priority matters — connect tasks to values
4. Work toward 2-4 clear priorities and one "if I only do one thing" answer
5. When ready, nudge: "let's lock this in — what are you committing to?"
Be ADHD-aware: one thing at a time, small steps. The plan at the end is the point.`,

  why: `**SESSION MODE: Understand Why → Lock In a Plan**
{userName} is stuck and wants to understand WHY. This session ALWAYS ends with a concrete plan they're accountable for. The arc:
1. Explore what's underneath the avoidance (fear? perfectionism? meaningless task? executive dysfunction?)
2. Use ACT defusion and check the facts — separate story from reality
3. Connect to values: what would make this worth doing?
4. Understanding is step one — step two is deciding what they'll actually do about it today
5. When clarity lands, nudge toward commitments: "so knowing all that — what are you locking in?"
Don't leave them in insight-only mode. Always land on action they can hold themselves to.`,

  talk: `**SESSION MODE: Talk It Through → Lock In a Plan**
{userName} needs to talk it out. This session ALWAYS ends with a concrete plan they're accountable for. The arc:
1. Listen first. Validate without fixing.
2. Reflect back what you hear — help them hear themselves
3. Even when venting, gently work toward "so what matters here?" and "what do you want to do about it?"
4. When they're ready (or after enough processing), nudge: "want to turn this into what you're committing to today?"
5. Every conversation here ends with 2-4 things on their plan — not just feelings, commitments
Be present first, but don't let the session end without landing on action.`,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, mode = "talk" } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const sessionMode = (["motivate", "plan", "why", "talk"].includes(mode) ? mode : "talk") as MotivateMode;
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
    summaryRes,
    calendarRes,
    allMessagesCountRes,
    historyRes,
  ] = await Promise.all([
    supabase.from("profiles").select("name, created_at").eq("id", user.id).single(),
    supabase.from("milestones").select("title, pillar, description").eq("user_id", user.id).eq("status", "in_progress").limit(8),
    supabase.from("habits").select("id, title, pillar").eq("user_id", user.id).limit(20),
    supabase.from("habit_logs").select("habit_id, completed").eq("user_id", user.id).eq("date", today),
    supabase.from("user_memories").select("category, memory").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30),
    supabase.from("notes").select("title, content, created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("discipline_reviews").select("week_start, wins, struggles, intentions, overall_mood").eq("user_id", user.id).order("week_start", { ascending: false }).limit(1).single(),
    supabase.from("todos").select("text, priority").eq("user_id", user.id).eq("completed", false).order("priority", { ascending: false }).limit(15),
    supabase.from("food_logs").select("description, mood, meal_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(7),
    supabase.from("chat_summaries").select("summary, period_end").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("calendar_events").select("title, start_time, end_time").eq("user_id", user.id).gte("start_time", `${today}T00:00:00`).lte("start_time", `${today}T23:59:59`).order("start_time"),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("chat_messages").select("role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(CONVERSATION_WINDOW),
  ]);

  const totalMessages = allMessagesCountRes.count ?? 0;
  const existingSummary = summaryRes.data ?? null;
  const recentHistory = (historyRes.data ?? []).reverse();

  const completedHabitIds = new Set(
    (habitLogsRes.data ?? []).filter((l) => l.completed).map((l) => l.habit_id)
  );
  const todayHabits = (habitsRes.data ?? []).map((h) => ({
    title: h.title,
    pillar: h.pillar,
    completed: completedHabitIds.has(h.id),
  }));

  const profile = profileRes.data;
  const userName = profile?.name?.split(" ")[0] ?? "you";

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

  const calendarEvents = calendarRes.data ?? [];
  const calendarSection = calendarEvents.length
    ? `\n\n**Today's calendar:**\n${calendarEvents.map((e) => `  • ${e.title} (${new Date(e.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})`).join("\n")}`
    : "";

  const basePrompt = buildSystemPrompt(ctx);
  const modeOverlay = MODE_OVERLAYS[sessionMode].replace(/\{userName\}/g, userName);

  const systemPrompt = `${basePrompt}\n\n---\n\n${modeOverlay}${calendarSection}\n\n**Response style for this session:** Shorter messages than usual. One thought, one question. 2-4 sentences max unless they're asking for something deeper. Remember: every Talk It Through session ends with them locking in a plan — guide the conversation there naturally.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        stream: true,
        max_completion_tokens: 500,
      });

      let fullResponse = "";

      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          fullResponse += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }

      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: fullResponse,
      });

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();

      triggerBackgroundTasks({
        userId: user.id,
        userMessage: message,
        assistantMessage: fullResponse,
        totalMessages: totalMessages + 2,
        existingSummaryPeriodEnd: existingSummary?.period_end ?? null,
        requestUrl: req.url,
      }).catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function triggerBackgroundTasks(opts: {
  userId: string;
  userMessage: string;
  assistantMessage: string;
  totalMessages: number;
  existingSummaryPeriodEnd: string | null;
  requestUrl: string;
}) {
  const baseUrl = new URL(opts.requestUrl).origin;

  fetch(`${baseUrl}/api/chat/extract-memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: opts.userId,
      userMessage: opts.userMessage,
      assistantMessage: opts.assistantMessage,
    }),
  }).catch(() => {});

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
