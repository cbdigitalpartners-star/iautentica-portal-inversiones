import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: { fundId?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("admin");

  const { data: funds } = await supabase.from("funds").select("id, name").order("name");

  const defaultFundId = searchParams.fundId;
  const lockFund = !!defaultFundId && (funds ?? []).some((f) => f.id === defaultFundId);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">{t("uploadDocument")}</h1>
      <DocumentUploadForm
        funds={funds ?? []}
        defaultFundId={lockFund ? defaultFundId : undefined}
        lockFund={lockFund}
      />
    </div>
  );
}
