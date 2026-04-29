import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FundForm } from "@/components/admin/fund-form";

export default async function NewFundPage() {
  const t = await getTranslations("admin");
  const supabase = createClient();
  const { data: developers } = await supabase.from("developers").select("id, name").order("name");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("newFund")}</h1>
      <FundForm developers={developers ?? []} />
    </div>
  );
}
