-- =========================================================
-- HR MODULE SCHEMA
-- =========================================================

-- Helper: admin check (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_hr_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
  );
$$;

-- updated_at trigger reuse
-- (public.update_updated_at_column already exists)

-- ---------- JOB OPENINGS ----------
CREATE TABLE IF NOT EXISTS public.hr_job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  hiring_manager UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','on_hold','closed')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_job_openings_status ON public.hr_job_openings(status);
CREATE INDEX IF NOT EXISTS idx_hr_job_openings_dept ON public.hr_job_openings(department);

ALTER TABLE public.hr_job_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_job_openings read" ON public.hr_job_openings FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_job_openings write admin" ON public.hr_job_openings FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());

CREATE TRIGGER trg_hr_job_openings_updated BEFORE UPDATE ON public.hr_job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- CANDIDATES ----------
CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_opening_id UUID REFERENCES public.hr_job_openings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  cv_url TEXT,
  stage TEXT NOT NULL DEFAULT 'applied' CHECK (stage IN ('applied','screening','interview','assessment','offer','hired','rejected')),
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  hired_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_job ON public.hr_candidates(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_stage ON public.hr_candidates(stage);

ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_candidates read" ON public.hr_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_candidates write admin" ON public.hr_candidates FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());

CREATE TRIGGER trg_hr_candidates_updated BEFORE UPDATE ON public.hr_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- CANDIDATE ACTIVITIES (audit log of stage changes / notes) ----------
CREATE TABLE IF NOT EXISTS public.hr_candidate_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_cand_act_cand ON public.hr_candidate_activities(candidate_id);

ALTER TABLE public.hr_candidate_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_cand_act read" ON public.hr_candidate_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_cand_act write admin" ON public.hr_candidate_activities FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());

-- ---------- INTERVIEWS ----------
CREATE TABLE IF NOT EXISTS public.hr_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL DEFAULT 'video' CHECK (mode IN ('video','phone','onsite')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_interviews_cand ON public.hr_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_interviews_when ON public.hr_interviews(scheduled_at);

ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_interviews read" ON public.hr_interviews FOR SELECT TO authenticated USING (
  public.is_hr_admin() OR interviewer_id = auth.uid()
);
CREATE POLICY "hr_interviews write admin" ON public.hr_interviews FOR ALL TO authenticated USING (
  public.is_hr_admin() OR interviewer_id = auth.uid()
) WITH CHECK (
  public.is_hr_admin() OR interviewer_id = auth.uid()
);

CREATE TRIGGER trg_hr_interviews_updated BEFORE UPDATE ON public.hr_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- REVIEW CYCLES ----------
CREATE TABLE IF NOT EXISTS public.hr_review_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_label TEXT,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_review_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_cycles read" ON public.hr_review_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_cycles write admin" ON public.hr_review_cycles FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());
CREATE TRIGGER trg_hr_review_cycles_updated BEFORE UPDATE ON public.hr_review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- GOALS ----------
CREATE TABLE IF NOT EXISTS public.hr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.hr_review_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT,
  target_value TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','missed','dropped')),
  weight INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_goals_emp ON public.hr_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_goals_cycle ON public.hr_goals(cycle_id);

ALTER TABLE public.hr_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_goals read" ON public.hr_goals FOR SELECT TO authenticated USING (
  public.is_hr_admin() OR employee_id = auth.uid()
);
CREATE POLICY "hr_goals write admin" ON public.hr_goals FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());
CREATE POLICY "hr_goals self update" ON public.hr_goals FOR UPDATE TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());
CREATE TRIGGER trg_hr_goals_updated BEFORE UPDATE ON public.hr_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS public.hr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.hr_review_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'manager' CHECK (type IN ('self','manager','peer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  strengths TEXT,
  improvements TEXT,
  summary TEXT,
  acknowledged_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_reviews_emp ON public.hr_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_reviews_cycle ON public.hr_reviews(cycle_id);

ALTER TABLE public.hr_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_reviews read" ON public.hr_reviews FOR SELECT TO authenticated USING (
  public.is_hr_admin() OR employee_id = auth.uid() OR reviewer_id = auth.uid()
);
CREATE POLICY "hr_reviews write admin" ON public.hr_reviews FOR ALL TO authenticated USING (
  public.is_hr_admin() OR reviewer_id = auth.uid()
) WITH CHECK (
  public.is_hr_admin() OR reviewer_id = auth.uid()
);
CREATE POLICY "hr_reviews self ack" ON public.hr_reviews FOR UPDATE TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());
CREATE TRIGGER trg_hr_reviews_updated BEFORE UPDATE ON public.hr_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- LEARNING PROGRAMS ----------
CREATE TABLE IF NOT EXISTS public.hr_learning_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'self_paced' CHECK (delivery_mode IN ('self_paced','live','blended','external')),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  material_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_learning_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_programs read" ON public.hr_learning_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_programs write admin" ON public.hr_learning_programs FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());
CREATE TRIGGER trg_hr_programs_updated BEFORE UPDATE ON public.hr_learning_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- LEARNING ENROLLMENTS ----------
CREATE TABLE IF NOT EXISTS public.hr_learning_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.hr_learning_programs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','overdue')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_hr_enroll_prog ON public.hr_learning_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_hr_enroll_emp ON public.hr_learning_enrollments(employee_id);

ALTER TABLE public.hr_learning_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_enroll read" ON public.hr_learning_enrollments FOR SELECT TO authenticated USING (
  public.is_hr_admin() OR employee_id = auth.uid()
);
CREATE POLICY "hr_enroll write admin" ON public.hr_learning_enrollments FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());
CREATE POLICY "hr_enroll self update" ON public.hr_learning_enrollments FOR UPDATE TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());
CREATE TRIGGER trg_hr_enroll_updated BEFORE UPDATE ON public.hr_learning_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- LEARNING PROGRESS (granular events) ----------
CREATE TABLE IF NOT EXISTS public.hr_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.hr_learning_enrollments(id) ON DELETE CASCADE,
  percent INTEGER NOT NULL DEFAULT 0 CHECK (percent BETWEEN 0 AND 100),
  note TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_progress_enroll ON public.hr_learning_progress(enrollment_id);

ALTER TABLE public.hr_learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_progress read" ON public.hr_learning_progress FOR SELECT TO authenticated USING (
  public.is_hr_admin() OR EXISTS (
    SELECT 1 FROM public.hr_learning_enrollments e
    WHERE e.id = enrollment_id AND e.employee_id = auth.uid()
  )
);
CREATE POLICY "hr_progress insert self" ON public.hr_learning_progress FOR INSERT TO authenticated WITH CHECK (
  public.is_hr_admin() OR EXISTS (
    SELECT 1 FROM public.hr_learning_enrollments e
    WHERE e.id = enrollment_id AND e.employee_id = auth.uid()
  )
);
CREATE POLICY "hr_progress admin all" ON public.hr_learning_progress FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin());
