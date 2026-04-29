-- =============================================================
-- iAutentica — Triggers de seguridad e integridad
-- Correr DESPUÉS de schema.sql, rls.sql y audit.sql.
-- Idempotente: re-correr no rompe.
-- =============================================================

-- ─── 1. PROTEGER COLUMNAS PRIVILEGIADAS DE profiles ───────────
-- La policy `profiles_update_own` deja al usuario editar su fila.
-- Sin esta protección, cualquier user autenticado podría hacer
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
-- desde el cliente y obtener acceso total. El trigger rechaza
-- cambios de `role`/`id` por no-admins y preserva `email`
-- silenciosamente (Supabase Auth lo administra aparte).

CREATE OR REPLACE FUNCTION protect_profile_privileged_columns() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo aplicamos restricciones cuando hay un usuario autenticado por JWT
  -- que no es admin. Los callers sin sesión (service_role usado por las API
  -- routes admin, Dashboard SQL Editor, jobs) bypasean el chequeo a propósito
  -- — su autorización se valida a otro nivel.
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'No tienes permiso para modificar el rol' USING ERRCODE = '42501';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'id no puede modificarse' USING ERRCODE = '42501';
    END IF;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged ON profiles;
CREATE TRIGGER profiles_protect_privileged
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_privileged_columns();

-- ─── 2. VALIDAR ROLES EN advisor_investors ────────────────────
-- Garantiza a nivel DB que advisor_id pertenezca a un advisor y
-- investor_id a un investor. Sin esto, una UI con bug (o un admin
-- comprometido) podría enlazar cuentas de cualquier rol y exponer
-- datos no esperados.

CREATE OR REPLACE FUNCTION validate_advisor_investor_roles() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  advisor_role TEXT;
  investor_role TEXT;
BEGIN
  SELECT role INTO advisor_role FROM profiles WHERE id = NEW.advisor_id;
  SELECT role INTO investor_role FROM profiles WHERE id = NEW.investor_id;

  IF advisor_role IS DISTINCT FROM 'advisor' THEN
    RAISE EXCEPTION 'advisor_id debe pertenecer a un usuario con rol advisor (rol actual: %)',
      COALESCE(advisor_role, 'desconocido')
      USING ERRCODE = '23514';
  END IF;
  IF investor_role IS DISTINCT FROM 'investor' THEN
    RAISE EXCEPTION 'investor_id debe pertenecer a un usuario con rol investor (rol actual: %)',
      COALESCE(investor_role, 'desconocido')
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_investors_validate_roles ON advisor_investors;
CREATE TRIGGER advisor_investors_validate_roles
  BEFORE INSERT OR UPDATE ON advisor_investors
  FOR EACH ROW EXECUTE FUNCTION validate_advisor_investor_roles();

-- ─── 3. COHERENCIA EN contributions ───────────────────────────
-- (a) amount > 0: una contribución nunca puede ser <= 0.
-- (b) milestone_id debe pertenecer al mismo fund_id si se especifica.
-- Defensa en profundidad: la API admin también chequea, esto cubre
-- inserts que pasen por service role / SQL editor / jobs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contributions_amount_positive'
      AND conrelid = 'public.contributions'::regclass
  ) THEN
    ALTER TABLE contributions
      ADD CONSTRAINT contributions_amount_positive CHECK (amount > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_contribution_milestone_fund() RETURNS TRIGGER
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  ms_fund UUID;
BEGIN
  IF NEW.milestone_id IS NOT NULL THEN
    SELECT fund_id INTO ms_fund FROM contribution_milestones WHERE id = NEW.milestone_id;
    IF ms_fund IS DISTINCT FROM NEW.fund_id THEN
      RAISE EXCEPTION 'milestone_id no pertenece al fund_id de la contribución'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributions_validate_milestone_fund ON contributions;
CREATE TRIGGER contributions_validate_milestone_fund
  BEFORE INSERT OR UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION validate_contribution_milestone_fund();

-- ─── 4. CONSTRAINTS DE INTEGRIDAD DE DOMINIO ──────────────────
-- CHECKs adicionales que faltaban en schema.sql original. Todos son
-- idempotentes (envueltos en IF NOT EXISTS sobre pg_constraint).
-- Una migración con datos sucios fallaría: limpiar antes si aplica.

DO $$
BEGIN
  -- (a) advisor_investors: prohibir auto-relación advisor=investor.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'advisor_investors_no_self_link'
      AND conrelid = 'public.advisor_investors'::regclass
  ) THEN
    ALTER TABLE advisor_investors
      ADD CONSTRAINT advisor_investors_no_self_link
      CHECK (advisor_id <> investor_id);
  END IF;

  -- (b) Montos financieros: contributions
  -- amount > 0 ya está como `contributions_amount_positive` desde la sección 3.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contributions_committed_amount_positive'
      AND conrelid = 'public.contributions'::regclass
  ) THEN
    ALTER TABLE contributions
      ADD CONSTRAINT contributions_committed_amount_positive
      CHECK (committed_amount IS NULL OR committed_amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contributions_dividends_nonnegative'
      AND conrelid = 'public.contributions'::regclass
  ) THEN
    ALTER TABLE contributions
      ADD CONSTRAINT contributions_dividends_nonnegative
      CHECK (dividends IS NULL OR dividends >= 0);
  END IF;

  -- (c) Montos: contribution_milestones.expected_amount
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'milestones_expected_amount_positive'
      AND conrelid = 'public.contribution_milestones'::regclass
  ) THEN
    ALTER TABLE contribution_milestones
      ADD CONSTRAINT milestones_expected_amount_positive
      CHECK (expected_amount IS NULL OR expected_amount > 0);
  END IF;

  -- (d) Coordenadas geográficas en funds (NULL permitido).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'funds_latitude_range'
      AND conrelid = 'public.funds'::regclass
  ) THEN
    ALTER TABLE funds
      ADD CONSTRAINT funds_latitude_range
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'funds_longitude_range'
      AND conrelid = 'public.funds'::regclass
  ) THEN
    ALTER TABLE funds
      ADD CONSTRAINT funds_longitude_range
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;

  -- (e) Unicidad de rutas de storage. Evita duplicados que complican
  -- borrado, auditoría y referencias. Las rutas las generamos client-side
  -- con UUID/timestamp así que colisiones reales son imposibles, pero el
  -- UNIQUE las hace imposibles también a nivel DB.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_storage_path_unique'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_storage_path_unique UNIQUE (storage_path);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fund_photos_storage_path_unique'
      AND conrelid = 'public.fund_photos'::regclass
  ) THEN
    ALTER TABLE fund_photos
      ADD CONSTRAINT fund_photos_storage_path_unique UNIQUE (storage_path);
  END IF;
END $$;

-- ─── 5. FORCE ROW LEVEL SECURITY ──────────────────────────────
-- Por default, el dueño de la tabla (rol que la creó) bypassea RLS.
-- FORCE hace que las policies apliquen también al owner. En Supabase
-- el owner típico es `postgres` (superuser), que igualmente bypasea RLS;
-- pero si en el futuro la app conecta con un rol no-superuser que
-- accidentalmente se vuelva owner (ownership migra), FORCE evita que
-- toda la RLS quede silenciosamente desactivada. service_role no se
-- ve afectado: bypassea RLS por su grant explícito.

DO $$
DECLARE
  t TEXT;
  forced TEXT[] := ARRAY[
    'profiles',
    'developers',
    'funds',
    'fund_access',
    'advisor_investors',
    'contribution_milestones',
    'contributions',
    'documents',
    'fund_photos',
    'notifications',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY forced LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── 6. ESTRECHAR developers_select ───────────────────────────
-- La policy original deja a cualquier autenticado leer todos los
-- developers. Se restringe a admins y a usuarios con un fund que
-- referencia ese developer (via fund_access para investors o
-- advisor_fund_ids para advisors). El JOIN funds → developers que
-- usan las páginas de advisor sigue funcionando porque el usuario
-- tiene visibilidad sobre el fund.

DROP POLICY IF EXISTS "developers_select" ON developers;
CREATE POLICY "developers_select" ON developers FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM funds f
      WHERE f.developer_id = developers.id
        AND (
          EXISTS (
            SELECT 1 FROM fund_access fa
            WHERE fa.fund_id = f.id AND fa.user_id = auth.uid()
          )
          OR f.id IN (SELECT * FROM advisor_fund_ids())
        )
    )
  );

-- ─── 7. AUDIT EN storage.objects ──────────────────────────────
-- Trigger separado del genérico tg_audit_row porque storage.objects
-- vive en otro schema y solo nos interesa loguear cambios de identidad
-- (insert/delete del archivo o rename). Updates de metadata/last_accessed
-- se ignoran para no llenar la tabla de ruido sin valor forense.
--
-- Nota: storage.objects pertenece al rol supabase_storage_admin. El
-- CREATE TRIGGER requiere correr como postgres (Dashboard SQL Editor).

CREATE OR REPLACE FUNCTION tg_audit_storage_object() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  UUID := current_actor_id();
  v_email  TEXT;
  v_role   TEXT;
  v_before JSONB;
  v_after  JSONB;
  v_pk     TEXT;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT p.email, p.role INTO v_email, v_role
    FROM public.profiles p WHERE p.id = v_actor;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_after := jsonb_build_object(
      'id', NEW.id, 'bucket_id', NEW.bucket_id, 'name', NEW.name, 'owner', NEW.owner
    );
    v_pk := NEW.id::text;
  ELSIF TG_OP = 'DELETE' THEN
    v_before := jsonb_build_object(
      'id', OLD.id, 'bucket_id', OLD.bucket_id, 'name', OLD.name, 'owner', OLD.owner
    );
    v_pk := OLD.id::text;
  ELSE
    IF OLD.bucket_id IS NOT DISTINCT FROM NEW.bucket_id
       AND OLD.name IS NOT DISTINCT FROM NEW.name THEN
      RETURN NEW;
    END IF;
    v_before := jsonb_build_object('id', OLD.id, 'bucket_id', OLD.bucket_id, 'name', OLD.name);
    v_after  := jsonb_build_object('id', NEW.id, 'bucket_id', NEW.bucket_id, 'name', NEW.name);
    v_pk := NEW.id::text;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, actor_role, action,
    entity_table, entity_id, before, after, diff
  ) VALUES (
    v_actor, v_email, v_role, TG_OP,
    'storage.objects', v_pk, v_before, v_after, NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_storage_objects ON storage.objects;
CREATE TRIGGER audit_storage_objects
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION tg_audit_storage_object();
