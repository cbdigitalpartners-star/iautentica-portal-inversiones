"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Fund = { id: string; name: string; latitude: number; longitude: number };

export function ProjectMap({ funds }: { funds: Fund[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (!mapRef.current || !funds.length) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    const init = async () => {
      const L = (await import("leaflet")).default;
      // @ts-ignore — Next.js resuelve el CSS, TS no tiene tipos para imports CSS
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;

      // StrictMode dev: si quedó un map previo en este container, lo desmontamos.
      const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        delete container._leaflet_id;
        container.innerHTML = "";
      }

      const tileUrl =
        theme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      map = L.map(container, { zoomControl: true, attributionControl: true })
        .setView([funds[0].latitude, funds[0].longitude], 12);

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      const bounds: [number, number][] = [];

      const escapeHtml = (s: string) =>
        s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

      funds.forEach((fund) => {
        if (!Number.isFinite(fund.latitude) || !Number.isFinite(fund.longitude)) return;
        const initial = escapeHtml((fund.name ?? "").trim()[0] ?? "•");
        const icon = L.divIcon({
          className: "",
          html: `<div class="w-8 h-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-primary-foreground text-xs font-bold">${initial}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const href = `/funds/${fund.id}`;
        const popup = document.createElement("a");
        popup.href = href;
        popup.textContent = fund.name ?? "";
        popup.className =
          "font-semibold text-primary hover:underline focus:underline outline-none";
        popup.addEventListener("click", (e) => {
          e.preventDefault();
          router.push(href);
        });

        L.marker([fund.latitude, fund.longitude], { icon })
          .bindPopup(popup)
          .addTo(map!);

        bounds.push([fund.latitude, fund.longitude]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    init();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [funds, theme]);

  const hasGeo = funds.some(
    (f) => Number.isFinite(f.latitude) && Number.isFinite(f.longitude),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapa de Proyectos</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        {hasGeo ? (
          <div ref={mapRef} className="h-48 sm:h-60 w-full" />
        ) : (
          <div className="h-48 sm:h-60 w-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground px-6 text-center">
            Aún no hay proyectos con ubicación cargada.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
