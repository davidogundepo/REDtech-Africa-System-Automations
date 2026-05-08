-- Tighten RLS on user-scoped tables to owner-or-admin.
-- Drops legacy permissive "allow all" policies and replaces them with
-- granular SELECT/INSERT/UPDATE/DELETE policies.

-- Helper: admin-or-super_admin shorthand
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'super_admin'::public.app_role)
$$;

-- ---------- attendance_records ----------
DROP POLICY IF EXISTS "Allow all on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_select_own_or_admin" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_write_own" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_admin_all" ON public.attendance_records;

CREATE POLICY "attendance_select_own_or_admin" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "attendance_insert_own" ON public.attendance_records
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "attendance_update_own_or_admin" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "attendance_delete_admin" ON public.attendance_records
  FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- leave_requests ----------
DROP POLICY IF EXISTS "Allow public all operations on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_select_own_or_admin" ON public.leave_requests;

CREATE POLICY "leave_select_own_or_admin" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "leave_insert_own" ON public.leave_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "leave_update_own_pending_or_admin" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "leave_delete_own_or_admin" ON public.leave_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));

-- ---------- leave_balances ----------
DROP POLICY IF EXISTS "Allow all on leave_balances" ON public.leave_balances;
CREATE POLICY "balance_select_own_or_admin" ON public.leave_balances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "balance_write_admin" ON public.leave_balances
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ---------- payment_requests ----------
DROP POLICY IF EXISTS "Allow all on payment_requests" ON public.payment_requests;
CREATE POLICY "payreq_select_own_or_admin" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "payreq_insert_self" ON public.payment_requests
  FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "payreq_update_admin" ON public.payment_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "payreq_delete_admin" ON public.payment_requests
  FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));

-- ---------- notifications: per-user reads only ----------
DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;
CREATE POLICY "notif_select_own_or_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "notif_insert_any" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own_or_admin" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));
