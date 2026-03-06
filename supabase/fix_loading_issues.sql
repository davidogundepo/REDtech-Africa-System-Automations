-- ========================================================
-- RAC Automations — FIXED SQL Script (v2)
-- Run this in Supabase SQL Editor → Click Run
-- ========================================================

-- =============================================
-- FIX 1: Profiles RLS — INFINITE RECURSION FIX
-- The old "Super admins" policy queries profiles
-- FROM a profiles policy = infinite loop = 500 error
-- =============================================
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Simple, non-recursive policies
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Anyone can insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete profiles" ON profiles FOR DELETE USING (auth.uid() = id);

-- =============================================
-- FIX 2: deal_status — update old values FIRST
-- then apply the new CHECK constraint
-- =============================================
UPDATE clients SET deal_status = 'lead' WHERE deal_status = 'prospect';
UPDATE clients SET deal_status = 'won' WHERE deal_status = 'closed-won';
UPDATE clients SET deal_status = 'lost' WHERE deal_status = 'closed-lost';
UPDATE clients SET deal_status = 'contacted' WHERE deal_status = 'active';
UPDATE clients SET deal_status = 'lead' WHERE deal_status IS NULL;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_deal_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_deal_status_check 
  CHECK (deal_status IN ('lead','contacted','proposal','negotiation','won','lost'));

-- =============================================
-- FIX 3: Create notifications table
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- FIX 4: Add WITH CHECK(true) to ALL table policies
-- =============================================
DROP POLICY IF EXISTS "Allow public all operations on transactions" ON transactions;
CREATE POLICY "Allow public all operations on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on documents" ON documents;
CREATE POLICY "Allow public all operations on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on ops_metrics" ON ops_metrics;
CREATE POLICY "Allow public all operations on ops_metrics" ON ops_metrics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on social_posts" ON social_posts;
CREATE POLICY "Allow public all operations on social_posts" ON social_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on tasks" ON tasks;
CREATE POLICY "Allow public all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on clients" ON clients;
CREATE POLICY "Allow public all operations on clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all operations on leave_requests" ON leave_requests;
CREATE POLICY "Allow public all operations on leave_requests" ON leave_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attendance_records" ON attendance_records;
CREATE POLICY "Allow all on attendance_records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on leave_balances" ON leave_balances;
CREATE POLICY "Allow all on leave_balances" ON leave_balances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on payment_requests" ON payment_requests;
CREATE POLICY "Allow all on payment_requests" ON payment_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on budgets" ON budgets;
CREATE POLICY "Allow all on budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on task_updates" ON task_updates;
CREATE POLICY "Allow all on task_updates" ON task_updates FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- FIX 5: Welcome notifications for all users
-- =============================================
INSERT INTO notifications (user_id, title, message, type, link)
SELECT p.id, 'Check Your Performance Score 🏆', 
  'See how you rank among your teammates! Your score is calculated from task completion, speed, and attendance.', 
  'info', '/profile'
FROM profiles p
WHERE p.is_active = true
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = p.id AND n.title LIKE '%Performance Score%');

INSERT INTO notifications (user_id, title, message, type, link)
SELECT p.id, 'Complete Your Profile 📸', 
  'Upload a profile photo and make sure your details are up to date. A complete profile helps your team recognize you!', 
  'info', '/profile'
FROM profiles p
WHERE p.is_active = true
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = p.id AND n.title LIKE '%Complete Your Profile%');

INSERT INTO notifications (user_id, title, message, type, link)
SELECT p.id, 'Welcome to RAC Automations! 🎉', 
  'Explore the dashboard to manage tasks, track attendance, submit leave requests, and more. We''re glad you''re here!', 
  'success', '/'
FROM profiles p
WHERE p.is_active = true
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = p.id AND n.title LIKE '%Welcome to RAC%');

SELECT 'ALL FIXES APPLIED SUCCESSFULLY!' AS result;
