-- Resend email outbox: durable retry queue for outbound emails.
-- Edge function `process-email-outbox` drains pending rows on a 1-minute cron.

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text NOT NULL DEFAULT 'no-reply@momms.co.uk',
  subject text NOT NULL,
  html text NOT NULL,
  reply_to text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','dlq')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending
  ON public.email_outbox (scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_by
  ON public.email_outbox (created_by);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbox_insert_self" ON public.email_outbox
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "outbox_select_own_or_admin" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "outbox_admin_manage" ON public.email_outbox
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
