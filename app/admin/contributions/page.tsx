import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ContributionsPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");

  const { data: contributions } = await supabase
    .from("contributions")
    .select("*, profiles(full_name, email), funds(name)")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("contributions")}</h1>
        <Button asChild size="sm">
          <Link href="/admin/contributions/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("newContribution")}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Inversor</th>
              <th className="text-left p-3 font-medium">Fondo</th>
              <th className="text-right p-3 font-medium">Monto</th>
              <th className="text-right p-3 font-medium">Dividendos</th>
              <th className="text-left p-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(contributions ?? []).map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{(c.profiles as any)?.full_name ?? (c.profiles as any)?.email ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{(c.funds as any)?.name ?? "—"}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(Number(c.amount))}</td>
                <td className="p-3 text-right text-muted-foreground">{formatCurrency(Number(c.dividends))}</td>
                <td className="p-3 text-muted-foreground">{formatDate(c.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
