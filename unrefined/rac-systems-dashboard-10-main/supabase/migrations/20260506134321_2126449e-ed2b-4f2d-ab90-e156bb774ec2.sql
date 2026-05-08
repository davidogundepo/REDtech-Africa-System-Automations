
-- =========================
-- ACTIVITY LOG
-- =========================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own activity + admins all"
  ON public.activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "users insert own activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super admins delete activity"
  ON public.activity_log FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =========================
-- USER STORAGE QUOTA
-- =========================
CREATE TABLE IF NOT EXISTS public.user_storage_quota (
  user_id UUID NOT NULL PRIMARY KEY,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  quota_bytes BIGINT NOT NULL DEFAULT 524288000, -- 500 MB default
  last_alert_level INT NOT NULL DEFAULT 0, -- 0/80/95
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_storage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own quota + admins all"
  ON public.user_storage_quota FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "users upsert own quota"
  ON public.user_storage_quota FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own quota + admins all"
  ON public.user_storage_quota FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "admins delete quota"
  ON public.user_storage_quota FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Helper function to add bytes to quota
CREATE OR REPLACE FUNCTION public.add_storage_bytes(_user_id UUID, _bytes BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_storage_quota (user_id, used_bytes)
  VALUES (_user_id, GREATEST(_bytes, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET used_bytes = GREATEST(public.user_storage_quota.used_bytes + _bytes, 0),
        updated_at = now();
END;
$$;

-- =========================
-- PLATFORM SETTINGS
-- =========================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authd read settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('allow_user_emails', 'true'::jsonb, 'Allow non-admin users to send documents via email'),
  ('presence_visible_to_all', 'true'::jsonb, 'Show online presence indicator to all users (not just admins)'),
  ('storage_alerts_enabled', 'true'::jsonb, 'Send alerts when users approach storage limits'),
  ('default_storage_quota_mb', '500'::jsonb, 'Default storage quota for new users (in MB)')
ON CONFLICT (key) DO NOTHING;

-- =========================
-- DEPARTMENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authd read departments"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.departments (name, sort_order) VALUES
  ('Engineering', 1),
  ('Operations', 2),
  ('Finance', 3),
  ('Marketing', 4),
  ('Human Resources', 5),
  ('Sales', 6)
ON CONFLICT (name) DO NOTHING;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
