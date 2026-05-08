-- Per-user module access overrides for granular permissions inside User Management
CREATE TABLE IF NOT EXISTS public.user_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

ALTER TABLE public.user_module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own module overrides + admins all"
  ON public.user_module_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage module overrides"
  ON public.user_module_overrides FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_user_module_overrides_updated_at
  BEFORE UPDATE ON public.user_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_module_overrides_user ON public.user_module_overrides(user_id);