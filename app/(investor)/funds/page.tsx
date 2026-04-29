import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function FundsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("funds");

  const { data: access } = await supabase
    .from("fund_access")
    .select("funds(id, name, type, total_equity, delivery_date, units, cover_image)")
    .eq("user_id", user.id);

  const funds = (access ?? []).map((a) => a.funds as any).filter(Boolean);

  if (!funds.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Card className="ia-rise-in">
          <CardContent className="flex flex-col items-center text-center gap-3 py-12 px-6">
            <div className="h-12 w-12 rounded-full bg-secondary/60 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <p className="text-base font-medium">Aún no hay proyectos en tu cartera.</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Cuando se asigne tu primer proyecto, lo verás acá con su detalle, documentos y aportes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {funds.map((fund: any, i: number) => (
          <Link key={fund.id} href={`/funds/${fund.id}`} className="group block">
            <Card className="hover:shadow-md transition-shadow duration-300 h-full">
              {fund.cover_image && (
                <div className="relative h-40 overflow-hidden rounded-t-lg">
                  <Image
                    src={fund.cover_image}
                    alt={fund.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]"
                    priority={i === 0}
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <CardTitle className="text-base leading-snug min-w-0 break-words">{fund.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">{fund.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p className="tabular-nums">
                  <span className="font-medium text-foreground">{t("equity")}:</span>{" "}
                  {formatCurrency(fund.total_equity)}
                </p>
                {fund.delivery_date && (
                  <p>
                    <span className="font-medium text-foreground">{t("delivery")}:</span>{" "}
                    {formatDate(fund.delivery_date)}
                  </p>
                )}
                <p className="tabular-nums">
                  <span className="font-medium text-foreground">{t("units")}:</span>{" "}
                  {fund.units ?? "—"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
