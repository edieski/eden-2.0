import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { FRANCE_SUPERMARKET_RULES, BUDGET_MEALPREP_RULES } from "@/lib/food/franceSupermarket";
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const CATEGORIES = ["produce", "protein", "dairy", "pantry", "frozen", "bakery", "other"] as const;
const MAX_IMAGES = 50;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { images, num_days: rawDays } = await req.json() as {
    images: { base64: string; mimeType: string }[];
    num_days?: number;
  };

  if (!images?.length) return NextResponse.json({ error: "No images provided" }, { status: 400 });
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} photos per scan` }, { status: 400 });
  }

  const numDays = Math.min(30, Math.max(1, Number(rawDays) || 7));
  const photoCount = images.length;
  const mealsTarget = numDays * 3;

  const multiPhotoNote = photoCount > 1
    ? `The user shared ${photoCount} meal photos. Review ALL of them — each photo may show a different dish, ingredient, recipe, or inspiration. Synthesize ideas across the full set: rotate dishes, reuse ingredients smartly, and don't let any photo go unused unless it's a duplicate of another.`
    : "The user shared a photo of a meal, recipe, ingredients, or food inspiration.";

  const prompt = `You are Eden — a warm, ADHD-friendly nourishment coach. No diet culture, no calorie counts, no guilt language. ${multiPhotoNote}

${FRANCE_SUPERMARKET_RULES}

${BUDGET_MEALPREP_RULES.replace("{num_days}", String(numDays))}

Look at every image carefully. Identify dishes, ingredients, recipes, or food inspiration shown. Then plan a budget-friendly, meal-prep-oriented menu for exactly ${numDays} day(s) and ONE consolidated grocery list for a French supermarket.

Return a JSON object with this exact shape (no markdown, no code fences, just raw JSON):
{
  "summary": "one warm sentence about the budget-meal-prep vibe of this plan",
  "budget_tip": "one practical money-saving tip for this specific plan",
  "detected_foods": [
    { "name": "what you identified", "type": "dish|ingredient|recipe" }
  ],
  "prep_schedule": [
    {
      "day_index": 0,
      "label": "Batch cook session",
      "duration_minutes": 90,
      "tasks": ["task 1", "task 2"]
    }
  ],
  "menu": [
    {
      "day_index": 0,
      "meal_type": "breakfast",
      "title": "meal name",
      "description": "prep note: Batch Day 1 / Reheat / Assemble 5 min — be specific",
      "ingredients": [
        { "name": "ingredient (French name)", "quantity": "e.g. 200 g or 1 barquette" }
      ]
    }
  ],
  "grocery_list": [
    { "name": "item (French name)", "quantity": "bulk amount in metric", "category": "produce" }
  ]
}

Rules:
- day_index: 0 = Day 1, 1 = Day 2, … up to ${numDays - 1} for Day ${numDays}
- meal_type must be one of: breakfast, lunch, dinner, snack
- Plan exactly 3 meals per day (breakfast, lunch, dinner) for all ${numDays} days — ${mealsTarget} meals total
- MAXIMISE ingredient overlap — same poulet, riz, légumes, œufs across the week
- At least 60% of lunches should be leftovers or assemblies from batch prep
- prep_schedule: 1–2 sessions with concrete batch tasks (what to cook, portion, fridge)
- grocery_list: ONE consolidated shop list with bulk quantities, as few unique items as possible
- category must be one of: produce, protein, dairy, pantry, frozen, bakery, other
- Be specific to what's visible — adapt non-French items to French supermarket equivalents
- Meal titles can be French or bilingual; ingredient names should use French supermarket labels
- Tone: nourishing, gentle, practical — never restrictive or shame-based
- You MUST return "menu", "grocery_list", and "prep_schedule" — never omit any`;

  try {
    const imageDetail = photoCount > 12 ? "low" as const : "high" as const;
    const imageContent = images.map(({ base64, mimeType }) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: imageDetail,
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
      max_completion_tokens: Math.min(16000, 2000 + numDays * 400 + photoCount * 50),
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const menuRaw = parsed.menu ?? parsed.weekly_menu ?? [];

    return NextResponse.json({
      num_days: numDays,
      summary: parsed.summary ?? "",
      budget_tip: parsed.budget_tip ?? "",
      prep_schedule: (parsed.prep_schedule ?? []).map((p: {
        day_index?: number;
        label?: string;
        duration_minutes?: number;
        tasks?: string[];
      }) => ({
        day_index: Math.min(numDays - 1, Math.max(0, Number(p.day_index) || 0)),
        label: p.label ?? "Batch cook",
        duration_minutes: Number(p.duration_minutes) || 60,
        tasks: (p.tasks ?? []).filter(Boolean),
      })),
      detected_foods: (parsed.detected_foods ?? []).map((f: { name?: string; type?: string }) => ({
        name: f.name ?? "",
        type: ["dish", "ingredient", "recipe"].includes(f.type ?? "") ? f.type : "dish",
      })),
      menu: menuRaw.map((m: {
        day_index?: number;
        day_of_week?: number;
        meal_type?: string;
        title?: string;
        description?: string;
        ingredients?: { name?: string; quantity?: string }[];
      }) => ({
        day_index: Math.min(numDays - 1, Math.max(0, Number(m.day_index ?? m.day_of_week) || 0)),
        meal_type: MEAL_TYPES.includes(m.meal_type as typeof MEAL_TYPES[number]) ? m.meal_type : "dinner",
        title: m.title ?? "",
        description: m.description ?? "",
        ingredients: (m.ingredients ?? []).map((i) => ({
          name: i.name ?? "",
          quantity: i.quantity ?? "",
        })),
      })),
      grocery_list: (parsed.grocery_list ?? []).map((g: { name?: string; quantity?: string; category?: string }) => ({
        name: g.name ?? "",
        quantity: g.quantity ?? "",
        category: CATEGORIES.includes(g.category as typeof CATEGORIES[number]) ? g.category : "other",
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Food scan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
