import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { InvestorSidebar, InvestorMobileNav } from "@/components/layout/investor-sidebar";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar role="investor" />
      <div className="flex flex-1">
        <InvestorSidebar />
        <main className="flex-1 p-4 md:p-6 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <InvestorMobileNav />
    </div>
  );
}
