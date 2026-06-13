import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

// Keep the most recent N messages outside any summary
const KEEP_RECENT = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, existingSummaryPeriodEnd } = await req.json();
    if (!userId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();

    // Load all messages older than the recent window, after the last summary
    let query = supabase
      .from("chat_messages")
      .select("role, content, created_at, id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    // Only summarize messages after the last summary's end point
    if (existingSummaryPeriodEnd) {
      query = query.gt("created_at", existingSummaryPeriodEnd);
    }

    const { data: allMessages } = await query;
    if (!allMessages || allMessages.length <= KEEP_RECENT) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // The messages to summarize = everything except the most recent KEEP_RECENT
    const toSummarize = allMessages.slice(0, allMessages.length - KEEP_RECENT);
    if (toSummarize.length < 10) {
      // Not worth summarizing fewer than 10 messages
      return NextResponse.json({ ok: true, skipped: true });
    }

    const conversationText = toSummarize
      .map((m) => `${m.role === "user" ? "User" : "Eden"}: ${m.content}`)
      .join("\n\n");

    const summaryPrompt = `You are summarizing a conversation between a user and their AI companion "Eden" for long-term memory purposes. Eden needs to understand what was discussed, what the user shared, and any important emotional or personal context — so she can continue being a deeply personal companion.

Write a concise but emotionally intelligent summary (200–400 words) that captures:
- What topics and themes came up
- What the user shared about their life, feelings, and circumstances
- Any breakthroughs, struggles, or meaningful moments
- The emotional tone and where the user seemed to be in their journey
- Anything Eden should remember to be a better companion going forward

Do NOT list every message. Synthesize into a flowing, warm, narrative summary.

Conversation:
${conversationText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: summaryPrompt }],
      max_completion_tokens: 600,
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const periodStart = toSummarize[0].created_at;
    const periodEnd = toSummarize[toSummarize.length - 1].created_at;

    // Upsert: if a summary already exists for this user, replace it with an
    // updated one (simpler than chaining summaries for now)
    await supabase.from("chat_summaries").insert({
      user_id: userId,
      summary,
      message_count: toSummarize.length,
      period_start: periodStart,
      period_end: periodEnd,
    });

    return NextResponse.json({ ok: true, summarized: toSummarize.length });
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }
}
