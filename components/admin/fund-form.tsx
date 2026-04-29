"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { sanitizeFilename } from "@/lib/utils";
import type { Fund, Developer } from "@/lib/types/database";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function FundForm({
  fund,
  developers,
}: {
  fund?: Fund;
  developers: Pick<Developer, "id" | "name">[];
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!fund;

  const [developerId, setDeveloperId] = useState<string>(fund?.developer_id ?? "");
  const [name, setName] = useState(fund?.name ?? "");
  const [type, setType] = useState(fund?.type ?? "");
  const [units, setUnits] = useState(String(fund?.units ?? ""));
  const [equity, setEquity] = useState(String(fund?.total_equity ?? ""));
  const [delivery, setDelivery] = useState(fund?.delivery_date ?? "");
  const [lat, setLat] = useState(String(fund?.latitude ?? ""));
  const [lng, setLng] = useState(String(fund?.longitude ?? ""));
  const [description, setDescription] = useState(fund?.description ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(fund?.cover_image ?? null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("La imagen principal debe ser un archivo de imagen.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErr(`La imagen supera el máximo permitido (15 MB). Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    setErr("");
    const safeName = sanitizeFilename(file.name);
    const ext = safeName.split(".").pop() || "jpg";
    const path = `cover/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("fund-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) { setErr(`No pudimos subir la imagen: ${upErr.message}`); setUploading(false); return; }
    const { data } = supabase.storage.from("fund-photos").getPublicUrl(path);
    setCoverImage(data.publicUrl);

    // En modo edición persistimos al toque para que el usuario no tenga que
    // volver al botón Guardar solo por la imagen.
    if (isEdit && fund) {
      const { error: updErr } = await supabase
        .from("funds")
        .update({ cover_image: data.publicUrl })
        .eq("id", fund.id);
      if (updErr) { setErr(updErr.message); setUploading(false); return; }
      router.refresh();
    }
    setUploading(false);
  }

  async function clearCover() {
    setCoverImage(null);
    if (isEdit && fund) {
      await supabase.from("funds").update({ cover_image: null }).eq("id", fund.id);
      router.refresh();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    const payload = {
      developer_id: developerId || null,
      name,
      type,
      units: Number(units),
      total_equity: Number(equity),
      delivery_date: delivery || null,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      description: description || null,
      cover_image: coverImage,
    };

    const { error } = isEdit
      ? await supabase.from("funds").update(payload).eq("id", fund.id)
      : await supabase.from("funds").insert(payload);

    if (error) { setErr(`No pudimos guardar el proyecto: ${error.message}`); setLoading(false); return; }
    router.push("/admin/funds");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

          <div className="space-y-2">
            <Label>Inmobiliaria</Label>
            <Select
              value={developerId || "__none__"}
              onValueChange={(v) => setDeveloperId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Sin inmobiliaria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin inmobiliaria —</SelectItem>
                {developers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Imagen principal</Label>
            {coverImage && (
              <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted">
                <Image src={coverImage} alt="Cover" fill className="object-cover" sizes="600px" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploading}
              />
              {coverImage && (
                <Button type="button" variant="outline" size="sm" onClick={clearCover}>
                  Quitar
                </Button>
              )}
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Subiendo…</p>}
            <p className="text-xs text-muted-foreground">
              JPG, PNG o WebP · máximo 15 MB.
              {isEdit && " La imagen se guarda automáticamente al subirla."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nombre del proyecto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Tipo de proyecto</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidades estimadas</Label>
              <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} step="any" />
            </div>
            <div className="space-y-2">
              <Label>Equity total</Label>
              <Input type="number" value={equity} onChange={(e) => setEquity(e.target.value)} step="any" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Entrega estimada</Label>
            <Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitud</Label>
              <Input type="number" value={lat} onChange={(e) => setLat(e.target.value)} step="any" />
            </div>
            <div className="space-y-2">
              <Label>Longitud</Label>
              <Input type="number" value={lng} onChange={(e) => setLng(e.target.value)} step="any" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading || uploading}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Guardando…" : isEdit ? "Guardar datos del proyecto" : t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
