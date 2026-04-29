-- =============================================================
-- iAutentica — Row Level Security
-- Correr DESPUÉS de schema.sql
-- =============================================================

-- ─── ENABLE RLS ───────────────────────────────────────────────

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE developers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_access             ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_investors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ─────────────────────────────────────────────────
-- Own profile | admin | advisor can see own + assigned investors

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_admin()
    OR is_advisor_of(id)
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (is_admin());

-- ─── DEVELOPERS ───────────────────────────────────────────────
-- All authenticated can read; admin writes

CREATE POLICY "developers_select" ON developers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "developers_admin_write" ON developers FOR ALL
  USING (is_admin());

-- ─── FUNDS ────────────────────────────────────────────────────
-- Investor: vía fund_access | Advisor: vía advisor_fund_ids() | Admin: todo

CREATE POLICY "funds_select" ON funds FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM fund_access WHERE fund_id = funds.id AND user_id = auth.uid())
    OR funds.id IN (SELECT * FROM advisor_fund_ids())
  );

CREATE POLICY "funds_admin_write" ON funds FOR ALL
  USING (is_admin());

-- ─── FUND_ACCESS ──────────────────────────────────────────────

CREATE POLICY "fund_access_select" ON fund_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR is_advisor_of(user_id)
  );

CREATE POLICY "fund_access_admin_write" ON fund_access FOR ALL
  USING (is_admin());

-- ─── ADVISOR_INVESTORS ────────────────────────────────────────

CREATE POLICY "advisor_investors_select" ON advisor_investors FOR SELECT
  USING (
    advisor_id = auth.uid()
    OR investor_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "advisor_investors_admin_write" ON advisor_investors FOR ALL
  USING (is_admin());

-- ─── MILESTONES ───────────────────────────────────────────────

CREATE POLICY "milestones_select" ON contribution_milestones FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM fund_access WHERE fund_id = contribution_milestones.fund_id AND user_id = auth.uid())
    OR contribution_milestones.fund_id IN (SELECT * FROM advisor_fund_ids())
  );

CREATE POLICY "milestones_admin_write" ON contribution_milestones FOR ALL
  USING (is_admin());

-- ─── CONTRIBUTIONS ────────────────────────────────────────────

CREATE POLICY "contributions_select" ON contributions FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR is_advisor_of(user_id)
  );

CREATE POLICY "contributions_admin_write" ON contributions FOR ALL
  USING (is_admin());

-- ─── DOCUMENTS ────────────────────────────────────────────────

CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM fund_access WHERE fund_id = documents.fund_id AND user_id = auth.uid())
    OR documents.fund_id IN (SELECT * FROM advisor_fund_ids())
  );

CREATE POLICY "documents_admin_write" ON documents FOR ALL
  USING (is_admin());

-- ─── FUND_PHOTOS ──────────────────────────────────────────────

CREATE POLICY "fund_photos_select" ON fund_photos FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM fund_access WHERE fund_id = fund_photos.fund_id AND user_id = auth.uid())
    OR fund_photos.fund_id IN (SELECT * FROM advisor_fund_ids())
  );

CREATE POLICY "fund_photos_admin_write" ON fund_photos FOR ALL
  USING (is_admin());

-- ─── NOTIFICATIONS ────────────────────────────────────────────
-- Cada usuario solo ve las suyas. Service role inserta (bypasses RLS).

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── STORAGE POLICIES ─────────────────────────────────────────

-- fund-photos (público para autenticados, admin escribe)
CREATE POLICY "fund_photos_storage_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'fund-photos' AND auth.role() = 'authenticated');

CREATE POLICY "fund_photos_storage_admin_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fund-photos' AND is_admin());

CREATE POLICY "fund_photos_storage_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'fund-photos' AND is_admin());

-- documents (lectura vía signed URL desde servidor; RLS solo bloquea acceso directo)
CREATE POLICY "documents_storage_admin_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND is_admin());

CREATE POLICY "documents_storage_admin_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND is_admin());

CREATE POLICY "documents_storage_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND is_admin());

-- developer-logos (público, admin escribe)
CREATE POLICY "developer_logos_storage_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'developer-logos' AND auth.role() = 'authenticated');

CREATE POLICY "developer_logos_storage_admin_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'developer-logos' AND is_admin());

CREATE POLICY "developer_logos_storage_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'developer-logos' AND is_admin());
