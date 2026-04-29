import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/investor/photo-gallery";

export default async function AdvisorFundDetailPage({ params }: { params: { fundId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("funds");

  // RLS filtra: advisor solo ve funds de sus inversores
  const [{ data: fund }, { data: photos }, { data: milestones }, { data: contributions }] = await Promise.all([
    supabase.from("funds").select("*, developers(name)").eq("id", params.fundId).maybeSingle(),
    supabase.from("fund_photos").select("*").eq("fund_id", params.fundId).order("sort_order"),
    supabase.from("contribution_milestones").select("*").eq("fund_id", params.fundId).order("sort_order"),
    supabase
      .from("contributions")
      .select("*, profiles:user_id(full_name, email)")
      .eq("fund_id", params.fundId)
      .order("date", { ascending: false }),
  ]);

  if (!fund) notFound();

  const totalInvested = (contributions ?? []).reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">{fund.name}</h1>
        <Badge variant="secondary">{fund.type}</Badge>
      </div>

      {(fund as any).developers?.name && (
        <p className="text-sm text-muted-foreground">
          Inmobiliaria: <span className="font-medium text-foreground">{(fund as any).developers.name}</span>
        </p>
      )}

      {photos && photos.length > 0 && (
        <PhotoGallery
          alt={fund.name}
          photos={photos.map((p) => ({
            id: p.id,
            url: supabase.storage.from("fund-photos").getPublicUrl(p.storage_path).data.publicUrl,
            caption: p.caption,
          }))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("type"), value: fund.type },
          { label: t("units"), value: fund.units },
          { label: t("equity"), value: formatCurrency(fund.total_equity) },
          { label: t("delivery"), value: fund.delivery_date ? formatDate(fund.delivery_date) : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {fund.description && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">{fund.description}</CardContent>
        </Card>
      )}

      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("milestones")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                  </div>
                  <div className="text-right">
                    {m.expected_amount && (
                      <div className="font-medium">{formatCurrency(Number(m.expected_amount))}</div>
                    )}
                    {m.expected_date && (
                      <div className="text-xs text-muted-foreground">{formatDate(m.expected_date)}</div>
                    )}
                    {m.reached_at && (
                      <Badge variant="secondary" className="text-xs mt-1">Alcanzado</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {contributions && contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Aportes — {formatCurrency(totalInvested)} total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Inversor</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{formatDate(c.date)}</td>
                    <td className="py-2">{(c as any).profiles?.full_name ?? (c as any).profiles?.email}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(c.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
