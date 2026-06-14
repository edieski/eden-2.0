import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { FRANCE_SUPERMARKET_RULES, BUDGET_MEALPREP_RULES } from "@/lib/food/franceSupermarket";
const CATEGORIES = ["produce", "protein", "dairy", "pantry", "frozen", "bakery", "other"] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { week_start, items: directItems } = await req.json() as {
    week_start: string;
    items?: { name: string; quantity: string; category: string }[];
  };

  if (!week_start) return NextResponse.json({ error: "week_start required" }, { status: 400 });

  let groceryItems: { name: string; quantity: string; category: string }[] = [];

  if (directItems?.length) {
    groceryItems = directItems;
  } else {
    const { data: meals } = await supabase
      .from("meal_plans")
      .select("id, title, description")
      .eq("user_id", user.id)
      .eq("week_start", week_start);

    if (!meals?.length) {
      return NextResponse.json({ error: "No meals planned for this week" }, { status: 400 });
    }

    const mealIds = meals.map((m) => m.id);
    const { data: ingredients } = await supabase
      .from("meal_ingredients")
      .select("name, quantity")
      .eq("user_id", user.id)
      .in("meal_plan_id", mealIds);

    const ingredientList = ingredients?.length
      ? ingredients.map((i) => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n")
      : "";

    const mealList = meals.map((m) => `- ${m.title}${m.description ? `: ${m.description}` : ""}`).join("\n");

    const prompt = `You are a budget-conscious grocery list assistant for someone meal-prepping and shopping in France.

${FRANCE_SUPERMARKET_RULES}

${BUDGET_MEALPREP_RULES.replace("{num_days}", "7")}

Given these planned meals for the week:

${mealList}
${ingredientList ? `\nKnown ingredients:\n${ingredientList}` : ""}

Return a JSON object with ONE consolidated, budget-optimised grocery list:
{
  "items": [
    { "name": "item name (French supermarket label)", "quantity": "bulk amount in metric", "category": "produce" }
  ]
}

Rules:
- Merge duplicate ingredients aggressively — one line per product, bulk quantities
- Prefer the cheapest shoppable option (MDD, basics, seasonal)
- Minimise unique items — if 5 meals use poulet, one "1 kg blanc de poulet" line not five separate entries
- category must be one of: produce, protein, dairy, pantry, frozen, bakery, other
- Include staples only when needed (huile, sel, etc.)
- Keep quantities practical for one person or small household doing meal prep
- Every item must be buyable at a standard French supermarket — French names, metric units
- No markdown, just raw JSON`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    groceryItems = (parsed.items ?? []).map((g: { name?: string; quantity?: string; category?: string }) => ({
      name: g.name ?? "",
      quantity: g.quantity ?? "",
      category: CATEGORIES.includes(g.category as typeof CATEGORIES[number]) ? g.category : "other",
    }));
  }

  await supabase.from("grocery_items").delete().eq("user_id", user.id).eq("week_start", week_start);

  const rows = groceryItems
    .filter((g) => g.name.trim())
    .map((g) => ({
      user_id: user.id,
      week_start,
      name: g.name.trim(),
      quantity: g.quantity || null,
      category: g.category || "other",
      checked: false,
    }));

  if (rows.length) {
    const { data, error } = await supabase.from("grocery_items").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data });
  }

  return NextResponse.json({ items: [] });
}
