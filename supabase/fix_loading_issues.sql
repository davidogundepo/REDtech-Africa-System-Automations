-- ========================================================
-- RAC Automations — Fix Script (Run in Supabase SQL Editor)
-- Fixes: deal_status constraint, notifications table,
--        attendance insert policy, and ensures open access
-- ========================================================

-- 1. Fix deal_status CHECK constraint on clients table
-- The schema had (prospect,active,closed-won,closed-lost) but
-- the code uses (lead,contacted,proposal,negotiation,won,lost)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_deal_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_deal_status_check 
  CHECK (deal_status IS NULL OR deal_status IN ('lead','contacted','proposal','negotiation','won','lost'));

-- 2. Create notifications table if it doesn't exist
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
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true);

-- 3. Ensure all core tables have open INSERT/UPDATE/DELETE policies with CHECK (true)
-- (FOR ALL USING (true) covers SELECT but INSERT needs WITH CHECK)
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

DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- 4. Create default welcome notifications for the current user
-- (This inserts notifications for ALL active users who don't have any yet)
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

-- 5. Fix the attendance unique constraint if it's preventing inserts
-- (the user may have already clocked in today with the old account)
-- No action needed — the UNIQUE(user_id, date) is fine since it's a new user_id

SELECT 'All fixes applied successfully!' AS result;
