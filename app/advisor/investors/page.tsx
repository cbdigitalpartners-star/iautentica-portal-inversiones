import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdvisorInvestorsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("advisor");

  const { data: assignments } = await supabase
    .from("advisor_investors")
    .select("investor_id, granted_at, profiles:investor_id(id, full_name, email)")
    .eq("advisor_id", user.id)
    .order("granted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("myInvestors")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {(assignments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes inversores asignados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Correo</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(assignments ?? []).map((a) => {
                  const p = (a as any).profiles;
                  return (
                    <tr key={a.investor_id} className="border-b">
                      <td className="py-3 font-medium">{p?.full_name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{p?.email}</td>
                      <td className="py-3 text-right">
                        <Link href={`/advisor/investors/${a.investor_id}`} className="text-primary hover:underline">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
