import { NextResponse } from "next/server";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function buildAllowedOrigins(): string[] {
  // La allowlist se basa exclusivamente en variables de entorno controladas
  // por el deploy. NO derivamos orígenes del header Host del request: en
  // entornos donde el proxy/edge no fija o no valida Host, un atacante
  // podría enviarlo manipulado y relajar la validación.
  const origins: string[] = [];

  const app = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (app) origins.push(app);

  const extras = process.env.CSRF_ALLOWED_ORIGINS;
  if (extras) {
    for (const raw of extras.split(",")) {
      const o = normalizeOrigin(raw.trim());
      if (o) origins.push(o);
    }
  }

  return origins;
}

export function requireSameOrigin(
  request: Request
): { ok: true } | { ok: false; response: NextResponse } {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const referer = normalizeOrigin(request.headers.get("referer"));
  const candidate = origin ?? referer;

  if (!candidate) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 }
      ),
    };
  }

  const allowed = buildAllowedOrigins();
  if (allowed.length === 0) {
    // Sin NEXT_PUBLIC_APP_URL configurada no hay forma segura de validar.
    // Falla cerrado: rechazar. Loguear para que el deploy se note rápido.
    console.error("[csrf] NEXT_PUBLIC_APP_URL no está configurada — rechazando request");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 }
      ),
    };
  }

  if (!allowed.includes(candidate)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
