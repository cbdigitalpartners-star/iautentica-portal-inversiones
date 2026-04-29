import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DocumentsPanel } from "@/components/investor/documents-panel";

export default async function AdvisorDocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("documents");

  // Agregado vía RLS: el advisor ve funds/documents de todos sus inversores.
  const [{ data: funds }, { data: documents }, { data: assignments }] = await Promise.all([
    supabase.from("funds").select("id, name").order("name"),
    supabase
      .from("documents")
      .select("*, funds(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("advisor_investors")
      .select("investor_id, profiles:investor_id(full_name, email)")
      .eq("advisor_id", user.id),
  ]);

  // fund_id -> [investor names]
  const investorIds = (assignments ?? []).map((a) => a.investor_id);
  const investorMap = new Map<string, string>();
  for (const a of assignments ?? []) {
    const p = (a as any).profiles;
    investorMap.set(a.investor_id, p?.full_name ?? p?.email ?? "Inversor");
  }

  const investorsByFund: Record<string, string[]> = {};
  if (investorIds.length > 0) {
    const { data: accesses } = await supabase
      .from("fund_access")
      .select("user_id, fund_id")
      .in("user_id", investorIds);
    for (const fa of accesses ?? []) {
      const name = investorMap.get(fa.user_id);
      if (!name) continue;
      const list = investorsByFund[fa.fund_id] ?? [];
      if (!list.includes(name)) list.push(name);
      investorsByFund[fa.fund_id] = list;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DocumentsPanel
        documents={documents ?? []}
        funds={funds ?? []}
        investorsByFund={investorsByFund}
      />
    </div>
  );
}
