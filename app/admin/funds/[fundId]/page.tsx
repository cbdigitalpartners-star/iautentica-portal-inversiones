import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FundForm } from "@/components/admin/fund-form";
import { MilestonesManager } from "@/components/admin/milestones-manager";
import { FundPhotosManager } from "@/components/admin/fund-photos-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function EditFundPage({ params }: { params: { fundId: string } }) {
  const supabase = createClient();

  const [
    { data: fund },
    { data: developers },
    { data: milestones },
    { data: photos },
    { data: documents },
  ] = await Promise.all([
    supabase.from("funds").select("*").eq("id", params.fundId).maybeSingle(),
    supabase.from("developers").select("id, name").order("name"),
    supabase.from("contribution_milestones").select("*").eq("fund_id", params.fundId).order("sort_order"),
    supabase.from("fund_photos").select("*").eq("fund_id", params.fundId).order("sort_order"),
    supabase.from("documents").select("*").eq("fund_id", params.fundId).order("created_at", { ascending: false }),
  ]);

  if (!fund) notFound();

  const photosWithUrls = (photos ?? []).map((p) => ({
    ...p,
    url: supabase.storage.from("fund-photos").getPublicUrl(p.storage_path).data.publicUrl,
  }));

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{fund.name}</h1>

      <FundForm fund={fund} developers={developers ?? []} />

      <Card>
        <CardHeader><CardTitle>Galería de fotos</CardTitle></CardHeader>
        <CardContent>
          <FundPhotosManager fundId={params.fundId} photos={photosWithUrls} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documentos del proyecto</CardTitle>
          <Button asChild size="sm">
            <Link href={`/admin/documents/new?fundId=${params.fundId}`}>
              <Plus className="h-4 w-4 mr-1" />
              Subir documento
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {(documents ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay documentos para este proyecto.
            </p>
          ) : (
            <ul className="divide-y border rounded-md">
              {(documents ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between p-3 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] mr-2">{d.category}</Badge>
                        {formatDate(d.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Etapas del proyecto</CardTitle></CardHeader>
        <CardContent>
          <MilestonesManager fundId={params.fundId} milestones={milestones ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
