import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarded) {
    redirect("/onboarding");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-cream, #FAF7F2)" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", position: "relative", maxWidth: "100%" }}>
        {children}
      </main>
    </div>
  );
}
