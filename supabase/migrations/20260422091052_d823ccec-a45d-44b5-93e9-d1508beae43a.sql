
-- ════════════════════════════════════════════════════════════
-- RAC AUTOMATIONS — Full Schema Bootstrap
-- ════════════════════════════════════════════════════════════

-- ── Roles enum + user_roles table (security best practice) ──
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','team_member','viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'team_member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('super_admin','admin')) $$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Profiles ──
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'team_member',
  department text,
  job_title text,
  contract_type text,
  start_date date,
  gender text,
  phone text,
  performance_score integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed-in can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id);
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Timestamp updater ──
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Auto-create profile + role on signup ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IN ('david.oludepo@gmail.com','david@redtechafrica.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET role='super_admin' WHERE id=NEW.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'team_member') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── AI Chats (the missing one!) ──
CREATE TABLE public.ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'New Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own ai_chats" ON public.ai_chats FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE INDEX idx_ai_chats_user ON public.ai_chats(user_id, updated_at DESC);
CREATE TRIGGER trg_ai_chats_updated BEFORE UPDATE ON public.ai_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Notifications ──
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  link text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id OR auth.uid()=recipient_id OR public.is_admin(auth.uid()));
CREATE POLICY "anyone authd insert notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users update own notif" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id OR auth.uid()=recipient_id);
CREATE POLICY "admins delete notif" ON public.notifications FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ── Clients ──
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  industry text,
  source text,
  stage text DEFAULT 'lead',
  deal_value numeric DEFAULT 0,
  currency text DEFAULT 'NGN',
  assigned_to uuid REFERENCES auth.users(id),
  notes text,
  address text,
  status text DEFAULT 'active',
  last_contact_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authd view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "authd manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Tasks ──
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  user_id uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  due_date date,
  tags jsonb DEFAULT '[]'::jsonb,
  subtasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authd view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "authd manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Leave Requests + Balances ──
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  leave_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notify_team boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own + admins all" ON public.leave_requests FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid()));
CREATE POLICY "users insert own leave" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "admins update leave" ON public.leave_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid()=user_id);
CREATE POLICY "admins delete leave" ON public.leave_requests FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_leave_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_days integer DEFAULT 14,
  used_days integer DEFAULT 0,
  year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own balance + admins" ON public.leave_balances FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage balance" ON public.leave_balances FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Attendance ──
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  clock_out timestamptz,
  status text DEFAULT 'on_time',
  hours_worked numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own attendance + admins all" ON public.attendance_records FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid()));
CREATE POLICY "users manage own attendance" ON public.attendance_records FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ── Finance: Transactions, Budgets, Payment Requests ──
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  category text,
  amount numeric NOT NULL,
  type text DEFAULT 'debit',
  logged_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage transactions" ON public.transactions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  allocated numeric NOT NULL,
  spent numeric DEFAULT 0,
  period text DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage budgets" ON public.budgets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  description text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own + admins all" ON public.payment_requests FOR SELECT TO authenticated USING (auth.uid()=requested_by OR public.is_admin(auth.uid()));
CREATE POLICY "users create requests" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()=requested_by);
CREATE POLICY "admins update requests" ON public.payment_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- ── Documents ──
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text,
  size bigint DEFAULT 0,
  department text,
  category text,
  tags jsonb DEFAULT '[]'::jsonb,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authd view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "authd upload" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid()=uploaded_by);
CREATE POLICY "uploader/admins manage" ON public.documents FOR ALL TO authenticated USING (auth.uid()=uploaded_by OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=uploaded_by OR public.is_admin(auth.uid()));

-- ── Ops Metrics ──
CREATE TABLE public.ops_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  deliveries integer DEFAULT 0,
  issues integer DEFAULT 0,
  status text DEFAULT 'optimal',
  notes text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authd view ops" ON public.ops_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "authd log ops" ON public.ops_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid()=logged_by);
CREATE POLICY "admins manage ops" ON public.ops_metrics FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ── Social Posts ──
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text,
  platforms jsonb DEFAULT '[]'::jsonb,
  media_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  tags jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authd view posts" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authd manage own posts" ON public.social_posts FOR ALL TO authenticated USING (auth.uid()=created_by OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=created_by OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_social_updated BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Storage Buckets ──
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents',false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media','social-media',true) ON CONFLICT DO NOTHING;

CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "avatars authd upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars');
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND auth.uid()::text=(storage.foldername(name))[1]);

CREATE POLICY "documents authd read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='documents');
CREATE POLICY "documents authd upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='documents');

CREATE POLICY "social public read" ON storage.objects FOR SELECT USING (bucket_id='social-media');
CREATE POLICY "social authd upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='social-media');
