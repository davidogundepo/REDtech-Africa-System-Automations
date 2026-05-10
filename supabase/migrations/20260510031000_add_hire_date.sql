-- ============================================================
-- Add hire_date to profiles — 2026-05-10
-- Super admins can set each user's actual hire/start date,
-- independent of the Supabase account creation date.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hire_date date;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
