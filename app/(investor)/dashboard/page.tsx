import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Landmark, TrendingUp, ArrowRight } from "lucide-react";
import { ContributionsTable } from "@/components/investor/contributions-table";
import { FundAllocationChart, ProjectMap } from "@/components/investor/dashboard-widgets";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("dashboard");

  const [{ data: contributions }, { data: funds }] = await Promise.all([
    supabase
      .from("contributions")
      .select("id, fund_id, date, amount, committed_amount, dividends, notes, funds(name, type)")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("fund_access")
      .select("funds(id, name, latitude, longitude)")
      .eq("user_id", user.id),
  ]);

  const totalCapital = (contributions ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalCommitted = (contributions ?? []).reduce((sum, c) => sum + Number(c.committed_amount ?? 0), 0);
  const totalDividends = (contributions ?? []).reduce((sum, c) => sum + Number(c.dividends), 0);
  const pending = Math.max(0, totalCommitted - totalCapital);
  const activeFunds = funds?.length ?? 0;

  const chartData = (contributions ?? []).reduce<Record<string, number>>((acc, c) => {
    const name = (c.funds as any)?.name ?? "Fondo";
    acc[name] = (acc[name] ?? 0) + Number(c.amount);
    return acc;
  }, {});

  const mapFunds = (funds ?? [])
    .map((fa) => fa.funds as any)
    .filter((f) => f?.latitude && f?.longitude);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="space-y-1 ia-rise-in">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">Resumen consolidado de tu cartera.</p>
      </header>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Card className="ia-rise-in" style={{ animationDelay: "0ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("totalCapital")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold tabular-nums break-all">{formatCurrency(totalCapital)}</p>
            {totalCommitted > 0 && (
              <>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 tabular-nums">
                  de {formatCurrency(totalCommitted)} comprometido
                </p>
                <div
                  className="mt-2 h-1 w-full rounded-full bg-secondary/60 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(100, (totalCapital / totalCommitted) * 100))}
                  aria-label="Capital aportado sobre comprometido"
                >
                  <div
                    className="h-full bg-primary transition-[width] duration-700 ease-out-quart"
                    style={{
                      width: `${Math.min(100, Math.max(0, (totalCapital / totalCommitted) * 100))}%`,
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="ia-rise-in" style={{ animationDelay: "60ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("pending")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold tabular-nums break-all">{formatCurrency(pending)}</p>
          </CardContent>
        </Card>
        <Link
          href="/funds"
          className="group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg ia-rise-in"
          style={{ animationDelay: "120ms" }}
        >
          <Card className="h-full transition hover:shadow-md hover:border-primary/40 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("activeInvestments")}</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{activeFunds}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-0.5 group-hover:opacity-100 group-hover:translate-x-0 transition duration-200" />
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Ver mis inversiones</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="ia-rise-in" style={{ animationDelay: "180ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("dividends")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold tabular-nums break-all">{formatCurrency(totalDividends)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 ia-rise-in" style={{ animationDelay: "260ms" }}>
        <FundAllocationChart data={Object.entries(chartData).map(([name, value]) => ({ name, value }))} />
        {mapFunds.length > 0 && <ProjectMap funds={mapFunds} />}
      </div>

      <Card className="ia-rise-in" style={{ animationDelay: "340ms" }}>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{t("contributions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionsTable contributions={contributions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
