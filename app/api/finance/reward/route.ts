import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { item_name, amount } = await req.json();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are Eden's financial cheerleader with a Y2K / early-2000s aesthetic. Generate ONE ultra-short (max 12 words) celebratory reward message for someone who resisted an impulse buy to save money. Use cute symbols like ☆ ✦ ★ ♡ ✧ ⊹ ✿ ❋ ☽ ¤ ~ ∿. Be empowering, fun, slightly slay-coded. No hashtags. Output ONLY the message, nothing else.`,
        },
        {
          role: "user",
          content: `They skipped buying: "${item_name}" (worth $${amount}). Give them a cute reward message!`,
        },
      ],
      max_completion_tokens: 60,
    });

    const message =
      response.choices[0]?.message?.content?.trim() ??
      "✦ that skip was absolutely iconic of you ✦";

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({
      message: "✦ that skip was so girlboss of you ✦",
    });
  }
}
