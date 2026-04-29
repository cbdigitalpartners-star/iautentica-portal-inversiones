import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserForm } from "@/components/admin/user-form";
import { FundAccessSelector } from "@/components/admin/fund-access-selector";

export default async function EditUserPage({ params }: { params: { userId: string } }) {
  const supabase = createClient();
  const t = await getTranslations("common");

  const [{ data: profile }, { data: funds }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.userId).single(),
    supabase.from("funds").select("id, name"),
    supabase.from("fund_access").select("fund_id").eq("user_id", params.userId),
  ]);

  if (!profile) notFound();

  const grantedFundIds = (access ?? []).map((a) => a.fund_id);

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">{profile.full_name ?? profile.email}</h1>
      <UserForm profile={profile} />
      <FundAccessSelector
        userId={params.userId}
        funds={funds ?? []}
        grantedFundIds={grantedFundIds}
      />
    </div>
  );
}
