"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { parseApiError, sanitizeFilename } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/types/database";

const CATEGORIES: DocumentCategory[] = [
  "Update Mensual",
  "Term Sheet",
  "Legal",
  "Informe Trimestral",
  "Documentos proyectos",
];

const MAX_DOC_BYTES = 25 * 1024 * 1024;

export function DocumentUploadForm({
  funds,
  defaultFundId,
  lockFund = false,
}: {
  funds: { id: string; name: string }[];
  defaultFundId?: string;
  lockFund?: boolean;
}) {
  const t = useTranslations("common");
  const td = useTranslations("documents");
  const router = useRouter();
  const supabase = createClient();

  const [fundId, setFundId] = useState(defaultFundId ?? "");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !file || !fundId || !category) return;
    if (file.size > MAX_DOC_BYTES) {
      setErr(`El archivo supera el máximo permitido (25 MB). Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }
    setLoading(true);
    setErr("");

    const safeName = sanitizeFilename(file.name);
    const path = `${fundId}/${category}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) {
      setErr(`No pudimos subir el archivo: ${uploadErr.message}`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fund_id: fundId, name, category, storage_path: path }),
    });
    if (!res.ok) {
      // Compensate: remove orphan file we just uploaded.
      void supabase.storage.from("documents").remove([path]);
      setErr(await parseApiError(res));
      setLoading(false);
      return;
    }

    router.push("/admin/documents");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={fundId} onValueChange={setFundId} required disabled={lockFund}>
              <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
              <SelectContent>
                {funds.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockFund && (
              <p className="text-xs text-muted-foreground">
                Subiendo al proyecto seleccionado. Para cambiarlo, vuelve atrás.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{td(`categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombre del documento</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Archivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required accept=".pdf,.doc,.docx,.xlsx,.xls" />
            <p className="text-xs text-muted-foreground">
              PDF, Word o Excel · máximo 25 MB.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading || !file}>{loading ? "Subiendo…" : t("save")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
