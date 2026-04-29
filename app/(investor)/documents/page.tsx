import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DocumentsPanel } from "@/components/investor/documents-panel";

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("documents");

  const { data: access } = await supabase
    .from("fund_access")
    .select("fund_id, funds(id, name)")
    .eq("user_id", user.id);

  const fundIds = (access ?? []).map((a) => a.fund_id);

  const { data: documents } = fundIds.length
    ? await supabase
        .from("documents")
        .select("*, funds(name)")
        .in("fund_id", fundIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const funds = (access ?? [])
    .map((a) => a.funds as any)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DocumentsPanel documents={documents ?? []} funds={funds} />
    </div>
  );
}
