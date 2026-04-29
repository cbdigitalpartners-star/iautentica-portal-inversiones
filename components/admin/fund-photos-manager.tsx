"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { PHOTO_CAPTIONS } from "@/lib/photo-captions";
import { sanitizeFilename } from "@/lib/utils";
import type { FundPhoto } from "@/lib/types/database";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

type PhotoWithUrl = FundPhoto & { url: string };

export function FundPhotosManager({
  fundId,
  photos,
}: {
  fundId: string;
  photos: PhotoWithUrl[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [captionChoice, setCaptionChoice] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [err, setErr] = useState("");

  const isOther = captionChoice === "__other__";
  const caption = isOther ? customCaption.trim() : captionChoice;
  const captionSelected = caption.length > 0;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!captionSelected) {
      setErr("Seleccioná un nombre antes de elegir la foto.");
      e.target.value = "";
      return;
    }
    const oversized = Array.from(files).find((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized) {
      setErr(`"${oversized.name}" supera el máximo permitido (15 MB).`);
      e.target.value = "";
      return;
    }
    const nonImage = Array.from(files).find((f) => !f.type.startsWith("image/"));
    if (nonImage) {
      setErr(`"${nonImage.name}" no es una imagen.`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    setErr("");
    let count = 0;

    for (const file of Array.from(files)) {
      const safeName = sanitizeFilename(file.name);
      const ext = safeName.split(".").pop() || "jpg";
      const path = `gallery/${fundId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("fund-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) { setErr(`No pudimos subir "${file.name}": ${upErr.message}`); break; }

      const { error: insErr } = await supabase
        .from("fund_photos")
        .insert({
          fund_id: fundId,
          storage_path: path,
          caption,
          sort_order: photos.length + count,
        });
      if (insErr) {
        // Compensate: drop the orphan storage object.
        void supabase.storage.from("fund-photos").remove([path]);
        setErr(`No pudimos guardar "${file.name}": ${insErr.message}`);
        break;
      }
      count++;
    }

    setUploading(false);
    e.target.value = "";
    if (count > 0) {
      setSavedCount(count);
      setTimeout(() => setSavedCount(0), 3000);
      router.refresh();
    }
  }

  async function remove(photo: PhotoWithUrl) {
    if (!confirm("¿Eliminar esta foto?")) return;
    setErr("");
    const { error: delDbErr } = await supabase.from("fund_photos").delete().eq("id", photo.id);
    if (delDbErr) { setErr(delDbErr.message); return; }
    await supabase.storage.from("fund-photos").remove([photo.storage_path]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

      <div className="space-y-3 border rounded-md p-4 bg-muted/30">
        <div className="space-y-2">
          <Label>
            Paso 1 · Nombre de la foto <span className="text-destructive">*</span>
          </Label>
          <Select value={captionChoice} onValueChange={setCaptionChoice}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un nombre" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {PHOTO_CAPTIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
              <SelectItem value="__other__">Otro (escribir nombre)…</SelectItem>
            </SelectContent>
          </Select>
          {isOther && (
            <Input
              autoFocus
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Ej: Sala de yoga"
            />
          )}
          <p className="text-xs text-muted-foreground">
            El nombre se aplica a todas las fotos que subas en este paso.
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Paso 2 · Subir foto{captionSelected ? "s" : ""}
          </Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading || !captionSelected}
          />
          {!captionSelected && (
            <p className="text-xs text-amber-600">
              Primero seleccioná un nombre arriba para habilitar la subida.
            </p>
          )}
          {uploading && <p className="text-xs text-muted-foreground">Subiendo…</p>}
          {!uploading && savedCount > 0 && (
            <p className="text-xs text-green-600">
              ✓ {savedCount} foto{savedCount > 1 ? "s" : ""} guardada{savedCount > 1 ? "s" : ""} como &quot;{caption}&quot;
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cada foto se guarda automáticamente al subirla. No hace falta apretar Guardar arriba.
          </p>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay fotos para este proyecto.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-md overflow-hidden border bg-muted aspect-square">
              <Image src={p.url} alt={p.caption ?? "Foto"} fill className="object-cover" sizes="200px" />
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
              {p.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-background/80 px-2 py-1 text-xs truncate">
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
