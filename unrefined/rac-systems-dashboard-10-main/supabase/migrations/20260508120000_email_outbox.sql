-- Durable email queue with retry + DLQ
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_addresses text[] NOT NULL,
  cc_addresses text[],
  subject text NOT NULL,
  html text,
  text_body text,
  attachment_filename text,
  attachment_base64 text,
  attachment_content_type text,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_due
  ON public.email_outbox (status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_outbox_created_by
  ON public.email_outbox (created_by);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbox_select_own_or_admin" ON public.email_outbox;
CREATE POLICY "outbox_select_own_or_admin" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "outbox_insert_self" ON public.email_outbox;
CREATE POLICY "outbox_insert_self" ON public.email_outbox
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS "outbox_update_admin" ON public.email_outbox;
CREATE POLICY "outbox_update_admin" ON public.email_outbox
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "outbox_delete_admin" ON public.email_outbox;
CREATE POLICY "outbox_delete_admin" ON public.email_outbox
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.touch_email_outbox()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_email_outbox ON public.email_outbox;
CREATE TRIGGER trg_touch_email_outbox
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.touch_email_outbox();
