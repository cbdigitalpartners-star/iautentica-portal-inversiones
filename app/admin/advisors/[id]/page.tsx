import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvisorInvestorsManager } from "@/components/admin/advisor-investors-manager";
import Link from "next/link";

export default async function AdminAdvisorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: advisor } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", params.id)
    .maybeSingle();

  if (!advisor || advisor.role !== "advisor") notFound();

  const [{ data: allInvestors }, { data: assigned }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "investor").order("full_name"),
    supabase.from("advisor_investors").select("investor_id").eq("advisor_id", params.id),
  ]);

  const assignedIds = new Set((assigned ?? []).map((a) => a.investor_id));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin/advisors" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold mt-2">{advisor.full_name ?? advisor.email}</h1>
        <p className="text-sm text-muted-foreground">{advisor.email}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Inversores asignados</CardTitle></CardHeader>
        <CardContent>
          <AdvisorInvestorsManager
            advisorId={params.id}
            investors={allInvestors ?? []}
            assignedIds={Array.from(assignedIds)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
