import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/investor/photo-gallery";
import { FundSwitcher } from "@/components/investor/fund-switcher";

export default async function FundDetailPage({ params }: { params: { fundId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("funds");
  const td = await getTranslations("documents");

  const { data: access } = await supabase
    .from("fund_access")
    .select("fund_id")
    .eq("user_id", user.id)
    .eq("fund_id", params.fundId)
    .single();

  if (!access) notFound();

  const [
    { data: fund },
    { data: photos },
    { data: contributions },
    { data: allAccess },
    { data: documents },
  ] = await Promise.all([
    supabase.from("funds").select("*").eq("id", params.fundId).single(),
    supabase.from("fund_photos").select("*").eq("fund_id", params.fundId).order("sort_order"),
    supabase
      .from("contributions")
      .select("*")
      .eq("user_id", user.id)
      .eq("fund_id", params.fundId)
      .order("date", { ascending: false }),
    supabase
      .from("fund_access")
      .select("funds(id, name)")
      .eq("user_id", user.id),
    supabase
      .from("documents")
      .select("id, name, category, created_at")
      .eq("fund_id", params.fundId)
      .order("created_at", { ascending: false }),
  ]);

  if (!fund) notFound();

  const accessibleProjects = (allAccess ?? [])
    .map((a) => a.funds as { id: string; name: string } | null)
    .filter((f): f is { id: string; name: string } => !!f)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const totalInvested = (contributions ?? []).reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <FundSwitcher
        current={{ id: fund.id, name: fund.name }}
        projects={accessibleProjects}
      />

      <div className="flex items-start gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold flex-1 min-w-0 break-words leading-tight">
          {fund.name}
        </h1>
        <Badge variant="secondary" className="shrink-0 mt-1">{fund.type}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: t("type"), value: fund.type },
          { label: t("units"), value: fund.units },
          { label: t("equity"), value: formatCurrency(fund.total_equity) },
          { label: t("delivery"), value: fund.delivery_date ? formatDate(fund.delivery_date) : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg font-semibold tabular-nums break-words">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {fund.description && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{fund.description}</CardContent>
        </Card>
      )}

      {contributions && contributions.length > 0 && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Mis aportes</CardTitle>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatCurrency(totalInvested)} total
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {contributions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-baseline justify-between gap-3 text-sm py-2"
                >
                  <span className="text-muted-foreground truncate">{formatDate(c.date)}</span>
                  <span className="font-medium tabular-nums shrink-0">{formatCurrency(Number(c.amount))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {documents && documents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base">Documentos del proyecto</CardTitle>
              <p className="text-sm text-muted-foreground">
                {documents.length}{" "}
                {documents.length === 1 ? "documento disponible" : "documentos disponibles"}
              </p>
            </div>
            <Link
              href="/documents"
              className="shrink-0 group inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs hidden sm:inline-flex">
                    {td(`categories.${doc.category}`)}
                  </Badge>
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-accent/40 focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                    aria-label={`Descargar ${doc.name}`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {photos && photos.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-base font-semibold tracking-tight">Galería del proyecto</h2>
          <PhotoGallery
            alt={fund.name}
            photos={photos.map((p) => ({
              id: p.id,
              url: supabase.storage.from("fund-photos").getPublicUrl(p.storage_path).data.publicUrl,
              caption: p.caption,
            }))}
          />
        </section>
      )}
    </div>
  );
}
