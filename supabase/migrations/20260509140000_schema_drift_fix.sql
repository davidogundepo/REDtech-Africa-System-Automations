-- ============================================================
-- Schema drift fix — 2026-05-09
-- Adds columns that the frontend writes but are missing in prod
-- Safe: uses IF NOT EXISTS / column-add guards throughout
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_days       jsonb,
  ADD COLUMN IF NOT EXISTS work_mode       text    DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS clock_in_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS performance_score integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_score_check timestamptz,
  ADD COLUMN IF NOT EXISTS score_history   jsonb   DEFAULT '[]'::jsonb;

-- ── 2. TASKS ────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS subtasks           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocker_notes      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid  REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at       timestamptz;

-- ── 3. FEEDBACK ─────────────────────────────────────────────
-- Replaces broken edge-function path with a simple DB table
CREATE TABLE IF NOT EXISTS public.feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL    DEFAULT now(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  category    text,
  message     text        NOT NULL,
  page_url    text
);

-- Allow authenticated users to insert their own feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedback' AND policyname = 'Users can insert feedback'
  ) THEN
    CREATE POLICY "Users can insert feedback"
      ON public.feedback FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedback' AND policyname = 'Admins can read feedback'
  ) THEN
    CREATE POLICY "Admins can read feedback"
      ON public.feedback FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Refresh schema cache so PostgREST picks up new columns immediately
NOTIFY pgrst, 'reload schema';
