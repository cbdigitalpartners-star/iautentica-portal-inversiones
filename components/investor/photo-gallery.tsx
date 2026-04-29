"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type Photo = { id: string; url: string; caption: string | null };

export function PhotoGallery({ photos, alt }: { photos: Photo[]; alt: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (photos.length === 0) return null;

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }
  function prev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function next() {
    setIndex((i) => (i + 1) % photos.length);
  }

  const current = photos[index];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openAt(i)}
            className="relative aspect-video overflow-hidden rounded-md group focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Image
              src={p.url}
              alt={p.caption ?? alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
          >
            <DialogPrimitive.Title className="sr-only">
              {current.caption ?? alt}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {photos.length > 1
                ? `Imagen ${index + 1} de ${photos.length}. Usá las flechas del teclado para navegar y Esc para cerrar.`
                : "Apretá Esc para cerrar."}
            </DialogPrimitive.Description>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="relative w-full max-w-6xl h-[80vh]">
              <Image
                src={current.url}
                alt={current.caption ?? alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            <div className="mt-3 text-center text-white/90 text-sm">
              {current.caption && <div className="mb-1">{current.caption}</div>}
              <div className="text-xs text-white/60">
                {index + 1} / {photos.length}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
