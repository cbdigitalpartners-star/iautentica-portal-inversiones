import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function AdminDevelopersPage() {
  const supabase = createClient();
  const { data: developers } = await supabase
    .from("developers")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inmobiliarias</h1>
        <Button asChild size="sm">
          <Link href="/admin/developers/new">
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
        <CardContent>
          {(developers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin inmobiliarias registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Sitio web</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(developers ?? []).map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="py-3 font-medium">{d.name}</td>
                    <td className="py-3 text-muted-foreground">{d.website ?? "—"}</td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/developers/${d.id}`} className="text-primary hover:underline">Editar</Link>
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
