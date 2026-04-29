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

function allowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();

  const host = request.headers.get("host");
  if (host) {
    allowed.add(`https://${host}`);
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      allowed.add(`http://${host}`);
    }
  }

  const fromUrl = normalizeOrigin(request.url);
  if (fromUrl) allowed.add(fromUrl);

  const fromEnv = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) allowed.add(fromEnv);

  return allowed;
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

  const allowed = allowedOrigins(request);
  if (!allowed.has(candidate)) {
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
