import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_FMT = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  return CURRENCY_FMT.format(Number(amount));
}

const DATE_FMT = new Intl.DateTimeFormat("es-CL", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

const DATETIME_FMT = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

export async function parseApiError(res: Response, fallback = "No pudimos completar la acción. Probá de nuevo."): Promise<string> {
  try {
    const json = await res.json();
    if (typeof json?.error === "string" && json.error.trim()) return json.error;
    if (typeof json?.message === "string" && json.message.trim()) return json.message;
  } catch {}
  if (res.status === 401) return "Tu sesión expiró. Volvé a iniciar sesión.";
  if (res.status === 403) return "No tenés permisos para esta acción.";
  if (res.status === 404) return "No encontramos lo que buscabas.";
  if (res.status === 429) return "Demasiados intentos. Esperá un momento y probá de nuevo.";
  if (res.status >= 500) return "El servidor tuvo un problema. Probá de nuevo en unos instantes.";
  return fallback;
}

export function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : "";
  const cleanBase = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "")
    .slice(0, 80) || "archivo";
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}
