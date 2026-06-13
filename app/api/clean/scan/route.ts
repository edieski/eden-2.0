import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { images } = await req.json() as {
    images: { base64: string; mimeType: string }[];
  };

  if (!images?.length) return NextResponse.json({ error: "No images provided" }, { status: 400 });

  const photoCount = images.length;
  const multiPhotoNote = photoCount > 1
    ? `The user has shared ${photoCount} photos of their space. Treat them as a combined view of the same space (or connected spaces). Identify tasks across ALL photos — don't repeat tasks that appear in multiple photos, but cover everything visible across all of them.`
    : `The user has shared a photo of a space in their home that needs cleaning.`;

  const prompt = `You are Eden — a practical, ADHD-aware cleaning coach. ${multiPhotoNote}

Look at the image(s) carefully. Group everything you see into parent tasks (areas or categories of work). Under each parent task, list the specific subtasks that make it up.

Return a JSON object with this exact shape (no markdown, no code fences, just raw JSON):
{
  "room": "the room(s) you think this is (bedroom/bathroom/kitchen/living_room/general)",
  "summary": "one honest sentence about the overall state of the space",
  "tasks": [
    {
      "title": "parent task title",
      "duration_minutes": 20,
      "priority": "high",
      "note": "optional ADHD tip or empty string",
      "subtasks": [
        { "title": "specific action verb + what", "duration_minutes": 5 }
      ]
    }
  ]
}

Rules:
- Group by area or type of work (floor stuff, desk stuff, laundry, dishes, etc).
- Each parent task should have 2–6 subtasks.
- Order parent tasks by visual impact: biggest visible difference first.
- As many parent tasks as the space actually needs.
- priority is "high", "medium", or "low" only.
- Be specific to what you SEE. Don't invent tasks.
- ADHD tip: mention a "good enough" stopping point or a pairing trick if relevant.`;

  try {
    const imageContent = images.map(({ base64, mimeType }) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high" as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageContent,
          ],
        },
      ],
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";

    // Strip markdown code fences if model wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      room: parsed.room ?? "general",
      summary: parsed.summary ?? "",
      tasks: (parsed.tasks ?? []).map((t: { title: string; duration_minutes: number; priority: string; note?: string; subtasks?: { title: string; duration_minutes: number }[] }) => ({
        title: t.title ?? "",
        duration_minutes: Number(t.duration_minutes) || 10,
        priority: ["high", "medium", "low"].includes(t.priority) ? t.priority : "medium",
        note: t.note ?? "",
        subtasks: (t.subtasks ?? []).map((s) => ({
          title: s.title ?? "",
          duration_minutes: Number(s.duration_minutes) || 5,
        })),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Scan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
