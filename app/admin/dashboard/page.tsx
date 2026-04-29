import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Landmark, DollarSign, FileText, Building2, UserCheck } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");

  const [
    { count: investorsCount },
    { count: advisorsCount },
    { count: developersCount },
    { count: fundsCount },
    { data: contributions },
    { count: docsCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "investor"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "advisor"),
    supabase.from("developers").select("*", { count: "exact", head: true }),
    supabase.from("funds").select("*", { count: "exact", head: true }),
    supabase.from("contributions").select("amount"),
    supabase.from("documents").select("*", { count: "exact", head: true }),
  ]);

  const totalCapital = (contributions ?? []).reduce((s, c) => s + Number(c.amount), 0);

  const stats = [
    { label: "Inversores", value: investorsCount ?? 0, icon: Users },
    { label: t("advisors"), value: advisorsCount ?? 0, icon: UserCheck },
    { label: t("developers"), value: developersCount ?? 0, icon: Building2 },
    { label: t("funds"), value: fundsCount ?? 0, icon: Landmark },
    { label: "Capital total", value: formatCurrency(totalCapital), icon: DollarSign },
    { label: t("documents"), value: docsCount ?? 0, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
