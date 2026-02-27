
-- Drop existing restrictive policies and allow anon access since auth is handled by password gate
DROP POLICY IF EXISTS "Clients viewable by authenticated" ON public.clients;
DROP POLICY IF EXISTS "Clients insertable by authenticated" ON public.clients;
DROP POLICY IF EXISTS "Clients updatable by authenticated" ON public.clients;
DROP POLICY IF EXISTS "Clients deletable by authenticated" ON public.clients;

CREATE POLICY "Clients full access" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks deletable by authenticated" ON public.tasks;

CREATE POLICY "Tasks full access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Leave viewable by authenticated" ON public.leave_requests;
DROP POLICY IF EXISTS "Leave insertable by authenticated" ON public.leave_requests;
DROP POLICY IF EXISTS "Leave updatable by authenticated" ON public.leave_requests;
DROP POLICY IF EXISTS "Leave deletable by authenticated" ON public.leave_requests;

CREATE POLICY "Leave full access" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

-- Make employee_id nullable since we're not using auth
ALTER TABLE public.leave_requests ALTER COLUMN employee_id DROP NOT NULL;
