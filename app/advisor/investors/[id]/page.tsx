import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdvisorInvestorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("advisor_investors")
    .select("investor_id")
    .eq("advisor_id", user.id)
    .eq("investor_id", params.id)
    .maybeSingle();

  if (!assignment) notFound();

  const [{ data: profile }, { data: contributions }, { data: fundAccess }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("id", params.id).single(),
    supabase
      .from("contributions")
      .select("*, funds(id, name)")
      .eq("user_id", params.id)
      .order("date", { ascending: false }),
    supabase
      .from("fund_access")
      .select("funds(id, name, type, developers(name))")
      .eq("user_id", params.id),
  ]);

  const totalCommitted = (contributions ?? []).reduce((s, c) => s + Number(c.committed_amount ?? 0), 0);
  const totalContributed = (contributions ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const pending = Math.max(0, totalCommitted - totalContributed);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/advisor/investors" className="text-sm text-muted-foreground hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold mt-2">{profile?.full_name ?? profile?.email}</h1>
        <p className="text-sm text-muted-foreground">{profile?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Compromiso</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalCommitted)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aportado</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalContributed)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendiente</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(pending)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Proyectos</CardTitle></CardHeader>
        <CardContent>
          {(fundAccess ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin proyectos asignados.</p>
          ) : (
            <ul className="divide-y">
              {(fundAccess ?? []).map((fa) => {
                const f = (fa as any).funds;
                return (
                  <li key={f?.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f?.type} {f?.developers?.name ? `· ${f.developers.name}` : ""}
                      </div>
                    </div>
                    <Link href={`/advisor/funds/${f?.id}`} className="text-sm text-primary hover:underline">Ver</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aportes</CardTitle></CardHeader>
        <CardContent>
          {(contributions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin aportes registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Proyecto</th>
                  <th className="py-2 text-right">Monto</th>
                  <th className="py-2 text-right">Compromiso</th>
                </tr>
              </thead>
              <tbody>
                {(contributions ?? []).map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{formatDate(c.date)}</td>
                    <td className="py-2">{(c as any).funds?.name}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(c.amount))}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {c.committed_amount ? formatCurrency(Number(c.committed_amount)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
