import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

// Valid memory categories matching the DB constraint
const VALID_CATEGORIES = [
  "personal",
  "emotional",
  "preference",
  "struggle",
  "pattern",
  "goal",
  "win",
  "relationship",
] as const;

type MemoryCategory = (typeof VALID_CATEGORIES)[number];

interface ExtractedMemory {
  category: MemoryCategory;
  memory: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, userMessage, assistantMessage } = await req.json();
    if (!userId || !userMessage) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Use a fast, cheap model for extraction
    const extractionPrompt = `You are a memory extractor for an AI companion named Eden. Your job is to identify meaningful, lasting facts and patterns about the user from a single conversation exchange. Only extract things that are genuinely useful to remember long-term — not trivial details.

Memory categories:
- personal: concrete facts (name, age, location, job, relationships, life situation)
- emotional: emotional patterns, triggers, what brings joy or pain
- preference: communication style, what helps them, what doesn't
- struggle: ongoing challenges, recurring difficulties worth tracking
- pattern: behavioral or emotional patterns you notice
- goal: aspirations, things they want to achieve or work toward
- win: victories, breakthroughs, moments of growth or progress
- relationship: specific people in their life and dynamics

User said: "${userMessage}"
Eden responded: "${assistantMessage}"

Extract 0–4 memories worth keeping. Return ONLY a JSON array. Each item: { "category": "<one of the categories above>", "memory": "<concise factual statement about the user in third person, max 100 chars>" }

If nothing meaningful to remember, return [].`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: extractionPrompt }],
      max_completion_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let memories: ExtractedMemory[] = [];

    try {
      const parsed = JSON.parse(raw);
      // Handle both { memories: [...] } and [...] formats
      const arr = Array.isArray(parsed) ? parsed : (parsed.memories ?? []);
      memories = arr.filter(
        (m: unknown): m is ExtractedMemory =>
          typeof m === "object" &&
          m !== null &&
          "category" in m &&
          "memory" in m &&
          VALID_CATEGORIES.includes((m as ExtractedMemory).category) &&
          typeof (m as ExtractedMemory).memory === "string" &&
          (m as ExtractedMemory).memory.length > 0
      );
    } catch {
      return NextResponse.json({ ok: true, extracted: 0 });
    }

    if (!memories.length) {
      return NextResponse.json({ ok: true, extracted: 0 });
    }

    // We need a service-role client for inserts from this internal route.
    // Since this runs server-side after auth is already done, we use the
    // regular server client — the caller passes userId from a verified session.
    const supabase = await createClient();

    // Insert memories (duplicates are fine — they enrich the picture)
    await supabase.from("user_memories").insert(
      memories.map((m) => ({
        user_id: userId,
        category: m.category,
        memory: m.memory,
        updated_at: new Date().toISOString(),
      }))
    );

    return NextResponse.json({ ok: true, extracted: memories.length });
  } catch {
    // Non-critical endpoint — swallow errors silently
    return NextResponse.json({ ok: true, extracted: 0 });
  }
}
