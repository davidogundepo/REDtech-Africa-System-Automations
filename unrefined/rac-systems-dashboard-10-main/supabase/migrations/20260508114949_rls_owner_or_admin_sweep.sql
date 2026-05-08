-- RLS Sweep: enforce canonical "owner OR admin" pattern across business tables.
-- Members read/write their own rows. Admins/super_admins via public.is_admin() see everything.
-- Shared collaborative tables (clients, documents, social_posts) keep all-authenticated read but lock writes to owner-or-admin.
-- Pure finance/ops/config tables (transactions, budgets, ops_metrics, departments, app_settings, platform_settings) are all-authenticated read, admin-only write.

-- ============================================================================
-- Helper: drop all existing policies on a table before re-applying canonical ones
-- ============================================================================
CREATE OR REPLACE FUNCTION public._drop_all_policies(target_table regclass)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy WHERE polrelid = target_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.polname, target_table::text);
  END LOOP;
END $$;

-- ============================================================================
-- OWNER-OR-ADMIN tables (user_id column, full owner control)
-- ============================================================================
DO $$ BEGIN
  PERFORM public._drop_all_policies('public.attendance_records');
  PERFORM public._drop_all_policies('public.leave_balances');
  PERFORM public._drop_all_policies('public.leave_requests');
  PERFORM public._drop_all_policies('public.notifications');
  PERFORM public._drop_all_policies('public.task_updates');
  PERFORM public._drop_all_policies('public.tasks');
END $$;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "attendance_insert" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "attendance_update" ON public.attendance_records FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "attendance_delete" ON public.attendance_records FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_balances_select" ON public.leave_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "leave_balances_manage" ON public.leave_balances FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "leave_delete" ON public.leave_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);  -- system + admins broadcast
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_updates_select" ON public.task_updates FOR SELECT TO authenticated
  USING (true);  -- task collaborators all see updates
CREATE POLICY "task_updates_insert" ON public.task_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "task_updates_delete" ON public.task_updates FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Tasks: visible to owner, assignee, OR admin. Members can update tasks assigned to them.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============================================================================
-- COLLABORATIVE tables (visible to all authenticated; writes locked to owner or admin)
-- ============================================================================
DO $$ BEGIN
  PERFORM public._drop_all_policies('public.clients');
  PERFORM public._drop_all_policies('public.documents');
  PERFORM public._drop_all_policies('public.social_posts');
  PERFORM public._drop_all_policies('public.payment_requests');
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select_all_auth" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = assigned_to OR public.is_admin(auth.uid()));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_to OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = assigned_to OR public.is_admin(auth.uid()));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_all_auth" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_select_all_auth" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "social_insert" ON public.social_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "social_update" ON public.social_posts FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "social_delete" ON public.social_posts FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_select" ON public.payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by OR public.is_admin(auth.uid()));
CREATE POLICY "pay_insert" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "pay_update" ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "pay_delete" ON public.payment_requests FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- ADMIN-ONLY-WRITE / ALL-AUTH-READ (finance, ops, config)
-- ============================================================================
DO $$ BEGIN
  PERFORM public._drop_all_policies('public.transactions');
  PERFORM public._drop_all_policies('public.budgets');
  PERFORM public._drop_all_policies('public.ops_metrics');
END $$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_select" ON public.transactions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));  -- finance is admin-only by default
CREATE POLICY "tx_manage" ON public.transactions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "budgets_manage" ON public.budgets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.ops_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ops_select" ON public.ops_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops_manage" ON public.ops_metrics FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Cleanup helper
DROP FUNCTION public._drop_all_policies(regclass);
