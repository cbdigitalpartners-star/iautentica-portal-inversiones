import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Landmark, DollarSign, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function AdvisorDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("advisor");

  const { data: assignments } = await supabase
    .from("advisor_investors")
    .select("investor_id, profiles:investor_id(id, full_name, email)")
    .eq("advisor_id", user.id);

  const investorIds = (assignments ?? []).map((a) => a.investor_id);

  const [{ data: contributions }, { data: fundAccess }, { data: documents }] = await Promise.all([
    investorIds.length
      ? supabase.from("contributions").select("amount, user_id").in("user_id", investorIds)
      : Promise.resolve({ data: [] as { amount: number; user_id: string }[] }),
    investorIds.length
      ? supabase.from("fund_access").select("fund_id").in("user_id", investorIds)
      : Promise.resolve({ data: [] as { fund_id: string }[] }),
    investorIds.length
      ? supabase.from("documents").select("id", { count: "exact", head: true })
      : Promise.resolve({ data: null, count: 0 } as any),
  ]);

  const totalCapital = (contributions ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const uniqueFunds = new Set((fundAccess ?? []).map((fa) => fa.fund_id)).size;
  const docCount = (documents as any)?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Link
          href="/advisor/investors"
          className="group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        >
          <Card className="h-full transition hover:shadow-md hover:border-primary/40 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("myInvestors")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{investorIds.length}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ver inversores</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/advisor/funds"
          className="group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        >
          <Card className="h-full transition hover:shadow-md hover:border-primary/40 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proyectos</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{uniqueFunds}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ver proyectos</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalCapital)}</p>
          </CardContent>
        </Card>

        <Link
          href="/advisor/documents"
          className="group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        >
          <Card className="h-full transition hover:shadow-md hover:border-primary/40 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{docCount}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ver documentos</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("myInvestors")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(assignments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes inversores asignados.</p>
          ) : (
            <ul className="divide-y">
              {(assignments ?? []).map((a) => {
                const p = (a as any).profiles;
                return (
                  <li key={a.investor_id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p?.full_name ?? p?.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p?.email}</div>
                    </div>
                    <Link
                      href={`/advisor/investors/${a.investor_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Ver detalle →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
