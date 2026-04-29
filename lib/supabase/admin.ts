import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Service-role client que envía `x-actor-id` en cada request, para que el
// trigger `tg_audit_row` (sql/audit.sql) atribuya la fila auditada al admin
// real en lugar de quedar como NULL.
//
// Usar SIEMPRE en API routes admin que muten datos. El UID viene de
// requireAdmin().userId (sesión del admin que originó el request).
export const createAuditedAdminClient = (actorId: string) =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "x-actor-id": actorId } },
    }
  );
