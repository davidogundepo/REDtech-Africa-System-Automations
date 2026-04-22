
-- Helper: check role without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role AND is_active = true);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role IN ('super_admin','admin') AND is_active = true);
$$;

-- Generic updated_at trigger function (already exists, but ensure)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============== TRANSACTIONS ==============
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense')),
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Delete transactions" ON public.transactions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_tx_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== BUDGETS ==============
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INT NOT NULL,
  category TEXT NOT NULL,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quarter, year, category)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View budgets" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage budgets" ON public.budgets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== PAYMENT REQUESTS ==============
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  requested_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payment_requests" ON public.payment_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert payment_requests" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update payment_requests" ON public.payment_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR requested_by = auth.uid());
CREATE POLICY "Delete payment_requests" ON public.payment_requests FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============== CLIENTS ==============
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company TEXT,
  deal_status TEXT DEFAULT 'lead' CHECK (deal_status IN ('lead','contacted','proposal','negotiation','won','lost')),
  deal_value NUMERIC DEFAULT 0,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY "Delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== TASKS ==============
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to_user_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  blocker_notes JSONB DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== TASK UPDATES (audit trail) ==============
CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View task_updates" ON public.task_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert task_updates" ON public.task_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============== LEAVE REQUESTS ==============
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View leave_requests" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert leave_requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update leave_requests" ON public.leave_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Delete leave_requests" ON public.leave_requests FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_leave_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== LEAVE BALANCES ==============
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days INT NOT NULL DEFAULT 14,
  used_days INT NOT NULL DEFAULT 0,
  bonus_days INT NOT NULL DEFAULT 0,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  UNIQUE(user_id, leave_type, year)
);
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid()) WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());

-- ============== ATTENDANCE RECORDS ==============
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present','late','absent','on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View attendance" ON public.attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Delete attendance" ON public.attendance_records FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============== NOTIFICATIONS ==============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============== DOCUMENTS ==============
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  category TEXT,
  department TEXT,
  access_roles TEXT[] DEFAULT '{team_member,admin,super_admin}',
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update documents" ON public.documents FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR uploaded_by = auth.uid());
CREATE POLICY "Delete documents" ON public.documents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR uploaded_by = auth.uid());

-- ============== SOCIAL POSTS ==============
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View social_posts" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert social_posts" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update social_posts" ON public.social_posts FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Delete social_posts" ON public.social_posts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_social_updated BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== OPS METRICS ==============
CREATE TABLE IF NOT EXISTS public.ops_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View ops_metrics" ON public.ops_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage ops_metrics" ON public.ops_metrics FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Storage bucket for documents (idempotent)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Auth can read documents" ON storage.objects;
CREATE POLICY "Auth can read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
DROP POLICY IF EXISTS "Auth can upload documents" ON storage.objects;
CREATE POLICY "Auth can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
DROP POLICY IF EXISTS "Auth can delete own documents" ON storage.objects;
CREATE POLICY "Auth can delete own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND owner = auth.uid());

DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Auth can upload avatars" ON storage.objects;
CREATE POLICY "Auth can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Auth can update avatars" ON storage.objects;
CREATE POLICY "Auth can update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
