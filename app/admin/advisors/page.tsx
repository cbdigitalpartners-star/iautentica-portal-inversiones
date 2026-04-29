import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAdvisorsPage() {
  const supabase = createClient();
  const { data: advisors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "advisor")
    .order("full_name");

  // Contar inversores por asesor
  const advisorIds = (advisors ?? []).map((a) => a.id);
  const { data: assignments } = advisorIds.length
    ? await supabase.from("advisor_investors").select("advisor_id, investor_id").in("advisor_id", advisorIds)
    : { data: [] };

  const counts = new Map<string, number>();
  (assignments ?? []).forEach((a) => counts.set(a.advisor_id, (counts.get(a.advisor_id) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Asesores</h1>
      <p className="text-sm text-muted-foreground">
        Los asesores se crean desde <Link href="/admin/users/new" className="text-primary hover:underline">Nuevo usuario</Link> con rol &quot;Asesor&quot;.
      </p>

      <Card>
        <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
        <CardContent>
          {(advisors ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin asesores registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Correo</th>
                  <th className="py-2 text-right">Inversores</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(advisors ?? []).map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="py-3 font-medium">{a.full_name ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{a.email}</td>
                    <td className="py-3 text-right">{counts.get(a.id) ?? 0}</td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/advisors/${a.id}`} className="text-primary hover:underline">Gestionar</Link>
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
