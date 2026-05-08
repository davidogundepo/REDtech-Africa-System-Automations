
DROP POLICY IF EXISTS "anyone authd insert notif" ON public.notifications;
CREATE POLICY "authd send notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND (recipient_id IS NOT NULL OR user_id IS NOT NULL));
