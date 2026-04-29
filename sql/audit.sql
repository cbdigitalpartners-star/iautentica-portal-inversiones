-- =============================================================
-- iAutentica — Audit Log
-- Correr DESPUÉS de schema.sql y rls.sql.
-- Idempotente: re-ejecutable sin perder datos existentes.
-- =============================================================

-- ─── 1. TABLA ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id     UUID,                       -- nullable: capturas sin sesión (job, SQL editor)
  actor_email  TEXT,                       -- denormalizado por si después se borra el profile
  actor_role   TEXT,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  entity_table TEXT NOT NULL,
  entity_id    TEXT,
  before       JSONB,
  after        JSONB,
  diff         JSONB                        -- solo para UPDATE: { col: { from, to } }
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx   ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx  ON audit_logs (entity_table, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_select" ON audit_logs;
CREATE POLICY "audit_logs_admin_select" ON audit_logs FOR SELECT
  USING (is_admin());

-- Sin policy de INSERT/UPDATE/DELETE: solo el trigger (SECURITY DEFINER) y service role escriben.

-- ─── 2. RESOLUCIÓN DE ACTOR ──────────────────────────────────
-- 1) auth.uid() — disponible en mutaciones client-side (sesión del admin)
-- 2) header `x-actor-id` — disponible cuando el cliente JS pasa el header
--    (lo hace createAuditedAdminClient en las API routes con service role)

CREATE OR REPLACE FUNCTION current_actor_id() RETURNS UUID
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  uid UUID;
  hdr TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    RETURN uid;
  END IF;

  hdr := current_setting('request.headers', true);
  IF hdr IS NOT NULL AND hdr <> '' THEN
    BEGIN
      RETURN (hdr::json->>'x-actor-id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

-- ─── 3. TRIGGER GENÉRICO ──────────────────────────────────────

CREATE OR REPLACE FUNCTION tg_audit_row() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor   UUID := current_actor_id();
  v_email   TEXT;
  v_role    TEXT;
  v_before  JSONB;
  v_after   JSONB;
  v_diff    JSONB;
  v_pk      TEXT;
  k         TEXT;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT p.email, p.role INTO v_email, v_role
    FROM public.profiles p WHERE p.id = v_actor;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_after := to_jsonb(NEW);
    v_pk := v_after->>'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_pk := v_after->>'id';
    v_diff := '{}'::jsonb;
    FOR k IN SELECT jsonb_object_keys(v_after) LOOP
      IF (v_before->k) IS DISTINCT FROM (v_after->k) THEN
        v_diff := v_diff || jsonb_build_object(
          k,
          jsonb_build_object('from', v_before->k, 'to', v_after->k)
        );
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN
      RETURN NEW;  -- nada cambió de verdad (UPDATE sin diff): no logueamos
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_pk := v_before->>'id';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, actor_role, action,
    entity_table, entity_id, before, after, diff
  ) VALUES (
    v_actor, v_email, v_role, TG_OP,
    TG_TABLE_NAME, v_pk, v_before, v_after, v_diff
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 4. ATTACH TRIGGER A TABLAS AUDITADAS ─────────────────────
-- Patrón: DROP IF EXISTS + CREATE para idempotencia.

DO $$
DECLARE
  t TEXT;
  audited TEXT[] := ARRAY[
    'profiles',
    'developers',
    'funds',
    'fund_access',
    'advisor_investors',
    'contribution_milestones',
    'contributions',
    'documents',
    'fund_photos'
  ];
BEGIN
  FOREACH t IN ARRAY audited LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION tg_audit_row()',
      t
    );
  END LOOP;
END $$;
