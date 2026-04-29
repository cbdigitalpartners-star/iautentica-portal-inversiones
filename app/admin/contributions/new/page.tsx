import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { ContributionForm } from "@/components/admin/contribution-form";

export default async function NewContributionPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");

  const [{ data: users }, { data: funds }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "investor"),
    supabase.from("funds").select("id, name"),
  ]);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">{t("newContribution")}</h1>
      <ContributionForm users={users ?? []} funds={funds ?? []} />
    </div>
  );
}
