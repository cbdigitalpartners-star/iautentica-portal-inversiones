"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Developer } from "@/lib/types/database";

export function DeveloperForm({
  mode,
  developer,
}: {
  mode: "create" | "edit";
  developer?: Developer;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(developer?.name ?? "");
  const [description, setDescription] = useState(developer?.description ?? "");
  const [website, setWebsite] = useState(developer?.website ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(developer?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr("");
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("developer-logos")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { setErr(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("developer-logos").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const payload =
      mode === "create"
        ? { name, description, website, logo_url: logoUrl }
        : { id: developer!.id, name, description, website, logo_url: logoUrl };

    const res = await fetch("/api/admin/developers", {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error);
      setLoading(false);
      return;
    }
    router.push("/admin/developers");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta inmobiliaria? Solo se puede si no tiene proyectos asociados.")) return;
    setLoading(true);
    const res = await fetch(`/api/admin/developers?id=${developer!.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { setErr(json.error); setLoading(false); return; }
    router.push("/admin/developers");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sitio web</Label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            {logoUrl && (
              <div className="relative w-32 h-32 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              {logoUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => setLogoUrl(null)}>
                  Quitar
                </Button>
              )}
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Subiendo…</p>}
          </div>
          <div className="flex justify-between">
            {mode === "edit" ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Eliminar
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "..." : "Guardar"}</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
