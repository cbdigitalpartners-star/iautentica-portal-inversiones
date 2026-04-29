-- =============================================================
-- iAutentica — Schema
-- Correr en Supabase SQL Editor en este orden exacto
-- =============================================================

-- ─── 1. TABLAS ────────────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('investor','admin','advisor')),
  locale     TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE developers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  logo_url     TEXT,
  website      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE funds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  UUID REFERENCES developers(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  units         INTEGER NOT NULL DEFAULT 0,
  total_equity  NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_date DATE,
  latitude      NUMERIC(10,7),
  longitude     NUMERIC(10,7),
  description   TEXT,
  cover_image   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fund_access (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id    UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fund_id)
);

CREATE TABLE advisor_investors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (advisor_id, investor_id)
);

CREATE TABLE contribution_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id       UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  expected_date DATE,
  expected_amount NUMERIC(18,2),
  sort_order    INTEGER DEFAULT 0,
  reached_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id          UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  milestone_id     UUID REFERENCES contribution_milestones(id) ON DELETE SET NULL,
  amount           NUMERIC(18,2) NOT NULL,
  committed_amount NUMERIC(18,2),
  dividends        NUMERIC(18,2) DEFAULT 0,
  date             DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id      UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN (
                  'Update Mensual','Term Sheet','Legal',
                  'Informe Trimestral','Documentos proyectos')),
  storage_path TEXT NOT NULL,
  uploaded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fund_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id      UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption      TEXT,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  metadata   JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, read_at, created_at DESC);

-- ─── 2. HELPERS ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_advisor_of(target_user_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.advisor_investors
    WHERE advisor_id = auth.uid() AND investor_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION advisor_fund_ids() RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT DISTINCT fa.fund_id
  FROM public.fund_access fa
  JOIN public.advisor_investors ai ON ai.investor_id = fa.user_id
  WHERE ai.advisor_id = auth.uid();
$$;

-- ─── 3. AUTO-CREAR PROFILE EN SIGNUP ──────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'investor')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 4. AUTO-ACTUALIZAR updated_at ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER developers_updated_at
  BEFORE UPDATE ON developers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5. STORAGE BUCKETS ───────────────────────────────────────
-- Si storage.buckets aún no existe (Storage no inicializado en el
-- proyecto), saltamos el bloque y los buckets se crean a mano desde
-- Dashboard → Storage. Una vez creado al menos un bucket por UI,
-- la tabla existe y estos INSERT son idempotentes.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public)
      VALUES ('fund-photos', 'fund-photos', true)
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
      VALUES ('documents', 'documents', false)
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
      VALUES ('developer-logos', 'developer-logos', true)
      ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'storage.buckets no existe todavía — crear los 3 buckets a mano desde Dashboard → Storage (fund-photos público, documents privado, developer-logos público).';
  END IF;
END $$;
