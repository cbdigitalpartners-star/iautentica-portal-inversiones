// Rate limiter de proceso, en memoria. Token bucket simple por clave.
//
// Limitación conocida: en Vercel/serverless cada instancia tiene su propio
// estado y los buckets no se comparten. Esto NO es defensa contra un atacante
// distribuido; es defensa contra un admin comprometido o un script de tab
// loop que dispare cientos de invites/uploads en segundos. Para protección
// más fuerte (multi-instancia, persistente), migrar a Upstash Redis o similar.

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

interface Limit {
  capacity: number;
  refillPerSecond: number;
}

export function checkRateLimit(
  key: string,
  limit: Limit
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: limit.capacity - 1, updatedAt: now });
    return { ok: true };
  }

  const elapsed = (now - existing.updatedAt) / 1000;
  const refilled = Math.min(
    limit.capacity,
    existing.tokens + elapsed * limit.refillPerSecond
  );

  if (refilled < 1) {
    const retryAfterSeconds = Math.ceil((1 - refilled) / limit.refillPerSecond);
    existing.tokens = refilled;
    existing.updatedAt = now;
    return { ok: false, retryAfterSeconds };
  }

  existing.tokens = refilled - 1;
  existing.updatedAt = now;
  return { ok: true };
}

// Presets razonables para una operación admin sobria.
// 10 invites/hora es alto para uso normal, bloqueante para abuso.
export const INVITE_LIMIT: Limit = { capacity: 10, refillPerSecond: 10 / 3600 };
// 30 documentos/hora cubre cierres trimestrales sin frenar al admin.
export const DOCUMENT_LIMIT: Limit = { capacity: 30, refillPerSecond: 30 / 3600 };
