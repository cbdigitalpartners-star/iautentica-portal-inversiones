import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UserForm } from "@/components/admin/user-form";

export default async function NewUserPage() {
  const t = await getTranslations("admin");
  const supabase = createClient();
  const { data: advisors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "advisor")
    .order("full_name");

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">{t("newUser")}</h1>
      <UserForm advisors={advisors ?? []} />
    </div>
  );
}
