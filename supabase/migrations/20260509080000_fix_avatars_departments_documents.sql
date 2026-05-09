-- ============================================================
-- Migration: fix_avatars_departments_documents
-- Applied: 2026-05-09
-- Fixes:
--   1. Storage RLS for the 'avatars' bucket (INSERT was blocked)
--   2. Re-seed departments if the table is empty in production
--   3. Drop documents.category column if it exists (schema mismatch)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. AVATARS BUCKET — Storage RLS policies
--    Allows any authenticated user to:
--      - INSERT their own avatar (path must start with their uid)
--      - UPDATE/DELETE their own avatar
--      - SELECT any avatar (so other users can see profile pics)
-- ─────────────────────────────────────────────────────────────

-- Ensure the bucket exists (safe no-op if already created via dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,               -- public bucket so profile pictures are readable without auth
  5242880,            -- 5 MB max per file
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop stale policies if they exist so we can re-create cleanly
DROP POLICY IF EXISTS "avatars_select_all"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"   ON storage.objects;

-- Allow anyone (even anon) to read avatar images — needed for <img src> in browser
CREATE POLICY "avatars_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload into their own folder
-- The code uploads to: avatars/<user_id>_<timestamp>.<ext>
-- So we check that the filename starts with their uid
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (
      -- file starts with user's own id
      name LIKE 'avatars/' || auth.uid()::text || '%'
      -- OR admin users can upload for others
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      name LIKE 'avatars/' || auth.uid()::text || '%'
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      name LIKE 'avatars/' || auth.uid()::text || '%'
      OR public.is_admin(auth.uid())
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 2. DEPARTMENTS — Re-seed if table is empty in production
--    Uses ON CONFLICT (name) DO NOTHING so it is safe to re-run
--    on environments where rows already exist.
-- ─────────────────────────────────────────────────────────────

-- Make sure the table and RLS exist (idempotent — matches the earlier migration)
CREATE TABLE IF NOT EXISTS public.departments (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_hidden  BOOLEAN     NOT NULL DEFAULT false,
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "depts_read"   ON public.departments;
DROP POLICY IF EXISTS "depts_manage" ON public.departments;

CREATE POLICY "depts_read"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "depts_manage"
  ON public.departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed the real REDtech Africa departments
-- Add or extend this list as your org grows
INSERT INTO public.departments (name, sort_order) VALUES
  ('Engineering',       1),
  ('Operations',        2),
  ('Finance',           3),
  ('Marketing',         4),
  ('Human Resources',   5),
  ('Sales',             6),
  ('Executive',         7),
  ('Design',            8),
  ('Content',           9),
  ('Media Production', 10),
  ('Legal',            11),
  ('Strategy',         12)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. DOCUMENTS — Drop the 'category' column if it exists
--    The app code no longer writes this column (fixed in round 1).
--    If it exists in production it causes insert errors.
--    DO NOT DROP if it doesn't exist — hence the DO $$ block.
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'documents'
      AND column_name  = 'category'
  ) THEN
    ALTER TABLE public.documents DROP COLUMN category;
    RAISE NOTICE 'documents.category column dropped.';
  ELSE
    RAISE NOTICE 'documents.category column does not exist — nothing to drop.';
  END IF;
END $$;
