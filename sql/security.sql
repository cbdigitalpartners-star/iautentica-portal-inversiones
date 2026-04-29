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
