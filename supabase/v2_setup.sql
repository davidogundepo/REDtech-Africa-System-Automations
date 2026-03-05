-- ========================================================
-- REDtech Africa System Automations — V2 Database Schema
-- Run this AFTER the existing setup.sql has been applied.
-- ========================================================

-- --------------------------------------------------------
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member' 
    CHECK (role IN ('super_admin', 'admin', 'team_member', 'viewer')),
  department TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can manage all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- --------------------------------------------------------
-- 2. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE
      WHEN new.email IN (
        'ayomide@redtechafrica.com',
        'olu@redtechafrica.com',
        'dapo@redtechafrica.com'
      ) THEN 'super_admin'
      ELSE 'team_member'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------
-- 3. DOMAIN RESTRICTION FUNCTION
-- Only @redtechafrica.com emails can sign up
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS trigger AS $$
BEGIN
  IF new.email NOT LIKE '%@redtechafrica.com' THEN
    RAISE EXCEPTION 'Only @redtechafrica.com email addresses are allowed to register.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_email_domain ON auth.users;
CREATE TRIGGER enforce_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_email_domain();

-- --------------------------------------------------------
-- 4. UPDATE EXISTING TABLES: Add user FK columns
-- --------------------------------------------------------

-- Tasks: link to assigned user
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocker_notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;

-- Task audit trail
CREATE TABLE IF NOT EXISTS task_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on task_updates" ON task_updates FOR ALL USING (true);

-- Clients: assigned user + deal status
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deal_status TEXT DEFAULT 'prospect' 
  CHECK (deal_status IN ('prospect', 'active', 'closed-won', 'closed-lost'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 20,
  used_days INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  UNIQUE(user_id, leave_type, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on leave_balances" ON leave_balances FOR ALL USING (true);

-- Leave requests: add user FK + cancelled status
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- Transactions: soft delete
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Payment requests (finance approval workflow)
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on payment_requests" ON payment_requests FOR ALL USING (true);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(quarter, year, category)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on budgets" ON budgets FOR ALL USING (true);

-- Attendance / Clock-in-out
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on attendance_records" ON attendance_records FOR ALL USING (true);

-- Social media posts: add image support + approval
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Documents: add department visibility
ALTER TABLE documents ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS access_roles TEXT[] DEFAULT '{team_member,admin,super_admin}';
