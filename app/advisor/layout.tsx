import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { AdvisorSidebar } from "@/components/layout/advisor-sidebar";

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin/dashboard");
  if (profile?.role !== "advisor") redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar role="advisor" />
      <div className="flex flex-1">
        <AdvisorSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
