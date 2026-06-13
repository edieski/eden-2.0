import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todayStr = new Date().toISOString().split("T")[0];

  const [profileRes, habitsRes, habitLogsRes, milestonesRes, foodRes, notesRes, todosRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("habits").select("*").eq("user_id", user.id),
    supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("date", todayStr),
    supabase.from("milestones").select("*").eq("user_id", user.id).eq("status", "in_progress").limit(3),
    supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", todayStr).order("created_at", { ascending: false }).limit(4),
    supabase.from("notes").select("id, title, updated_at").eq("user_id", user.id).eq("is_pinned", true).limit(3),
    supabase.from("todos").select("id, text, completed, priority").eq("user_id", user.id).eq("completed", false).is("parent_id", null).order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <DashboardClient
      profile={profileRes.data}
      habits={habitsRes.data ?? []}
      habitLogs={habitLogsRes.data ?? []}
      milestones={milestonesRes.data ?? []}
      foodLogs={foodRes.data ?? []}
      pinnedNotes={notesRes.data ?? []}
      todos={todosRes.data ?? []}
    />
  );
}

