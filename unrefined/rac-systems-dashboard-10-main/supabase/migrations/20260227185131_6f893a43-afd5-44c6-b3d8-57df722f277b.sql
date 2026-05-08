
-- Profiles table for team members
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients / CRM table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  industry TEXT,
  source TEXT DEFAULT 'direct',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients viewable by authenticated" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients insertable by authenticated" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Clients updatable by authenticated" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Clients deletable by authenticated" ON public.clients FOR DELETE TO authenticated USING (true);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'overdue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  department TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by authenticated" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks insertable by authenticated" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Tasks updatable by authenticated" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Tasks deletable by authenticated" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Leave requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual', 'sick', 'compassionate', 'maternity', 'paternity')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leave viewable by authenticated" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leave insertable by authenticated" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Leave updatable by authenticated" ON public.leave_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Leave deletable by authenticated" ON public.leave_requests FOR DELETE TO authenticated USING (employee_id = auth.uid());

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
