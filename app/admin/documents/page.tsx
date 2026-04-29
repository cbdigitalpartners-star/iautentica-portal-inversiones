import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminDocumentsPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");
  const td = await getTranslations("documents");

  const { data: documents } = await supabase
    .from("documents")
    .select("*, funds(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("documents")}</h1>
        <Button asChild size="sm">
          <Link href="/admin/documents/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("uploadDocument")}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Nombre</th>
              <th className="text-left p-3 font-medium">Fondo</th>
              <th className="text-left p-3 font-medium">Categoría</th>
              <th className="text-left p-3 font-medium">Fecha</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((d) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3 text-muted-foreground">{(d.funds as any)?.name ?? "—"}</td>
                <td className="p-3">
                  <Badge variant="outline">{td(`categories.${d.category}`)}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(d.created_at)}</td>
                <td className="p-3 text-right">
                  <Button asChild size="icon" variant="ghost">
                    <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
