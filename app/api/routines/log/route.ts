import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routineId, completedItems } = await req.json();
  if (!routineId) return NextResponse.json({ error: "routineId required" }, { status: 400 });

  const todayStr = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("routine_logs").upsert(
    {
      routine_id: routineId,
      user_id: user.id,
      date: todayStr,
      completed_items: completedItems ?? [],
    },
    { onConflict: "routine_id,date" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
