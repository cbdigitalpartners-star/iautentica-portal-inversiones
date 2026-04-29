import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DeveloperForm } from "@/components/admin/developer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function EditDeveloperPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: developer } = await supabase
    .from("developers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!developer) notFound();

  const { data: funds } = await supabase
    .from("funds")
    .select("id, name, type")
    .eq("developer_id", params.id)
    .order("name");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{developer.name}</h1>
      <DeveloperForm mode="edit" developer={developer} />

      <Card>
        <CardHeader><CardTitle>Proyectos de esta inmobiliaria</CardTitle></CardHeader>
        <CardContent>
          {(funds ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay proyectos asociados.</p>
          ) : (
            <ul className="divide-y">
              {(funds ?? []).map((f) => (
                <li key={f.id} className="py-2 flex justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.type}</div>
                  </div>
                  <Link href={`/admin/funds/${f.id}`} className="text-sm text-primary hover:underline">Ver</Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
