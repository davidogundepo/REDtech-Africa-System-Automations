-- ============================================================
-- REDtech Africa System Automations — Demo Seed Data
-- SCHEMA-VERIFIED: All columns cross-checked against
-- setup.sql, v2_setup.sql, and all migrations before writing.
-- ============================================================

-- Fix broken column default (DEFAULT 'prospect' violates live constraint)
ALTER TABLE public.clients ALTER COLUMN deal_status SET DEFAULT 'lead';

-- ============================================================
-- 1. CLIENTS
-- Verified columns: name, company, email, phone, address,
--   industry, source, notes, deal_status, city, postcode,
--   status, total_invoiced, total_deliveries, last_contact_date
-- Constraints:
--   deal_status IN ('lead','contacted','proposal','negotiation','won','lost')
--   status IN ('active','inactive','prospect')
-- ============================================================
INSERT INTO public.clients
  (name, company, email, phone, address, city, postcode, industry, source, notes,
   deal_status, status, total_invoiced, total_deliveries, last_contact_date)
VALUES
('Chukwuemeka Obi',   'TechFlow Nigeria Ltd',        'emeka@techflowng.com',       '+234 802 345 6789', '14 Adeola Odeku Street',   'Lagos',         '101233','Technology',   'Referral',     'Key account. Quarterly retainer.',            'won',         'active', 12500000, 3,  NOW()-INTERVAL '2 days'),
('Ngozi Adeyemi',     'Meridian Logistics',           'ngozi@meridianlog.com',      '+234 803 456 7890', '7 Wuse Zone 5',             'Abuja',         '900105','Logistics',    'Cold Outreach','Expanding fleet. High delivery volume.',       'won',         'active', 8750000,  7,  NOW()-INTERVAL '5 days'),
('Babajide Olatunji', 'Olatunji & Sons Consulting',   'jide@ols-consult.com',       '+234 805 567 8901', '32 Awolowo Road',           'Lagos',         '101221','Consulting',   'LinkedIn',     'Long-term client since 2024.',                'won',         'active', 22000000, 1,  NOW()-INTERVAL '1 day'),
('Amara Eze',         'Sunrise Pharmaceuticals',      'amara.eze@sunrisepharma.ng', '+234 706 678 9012', '9 Trans-Amadi Industrial',  'Port Harcourt', '500001','Healthcare',   'Conference',   'Proposal sent. Awaiting board approval.',     'proposal',    'active', 0,        0,  NOW()-INTERVAL '10 days'),
('Tunde Fashola',     'GreenBridge Capital',          'tunde@greenbridge.ng',       '+234 817 789 0123', '3 Marina Street',           'Lagos',         '101200','Finance',      'Website',      'VC firm. Needs monthly reporting.',           'won',         'active', 5500000,  2,  NOW()-INTERVAL '3 days'),
('Fatima Al-Hassan',  'Federal Polytechnic Bida',     'fatima@fedpolybida.edu.ng',  '+234 818 890 1234', 'PMB 55, Bida',              'Niger',         '912101','Education',    'Government',   'Education contract. Invoiced quarterly.',     'won',         'active', 3200000,  0,  NOW()-INTERVAL '14 days'),
('Obinna Nwosu',      'Swift Deliveries NG',          'obinna@swiftdelivery.ng',    '+234 901 901 2345', '22 Stadium Road',           'Enugu',         '400221','Logistics',    'Referral',     'High-frequency delivery client.',             'won',         'active', 9800000,  15, NOW()-INTERVAL '1 day'),
('Adaeze Nnamdi',     'Nnamdi Agro Exports',          'adaeze@nnamdiagroex.com',    '+234 702 012 3456', '6 Old Aba Road',            'Aba',           '450221','Agriculture',  'Trade Fair',   'Export business. Interested in logistics.',   'lead',        'active', 0,        0,  NOW()-INTERVAL '20 days'),
('Seun Olawale',      'Olawale & Partners Law',       'seun@op-law.ng',             '+234 803 123 4567', '10 Broad Street',           'Lagos',         '101211','Legal',        'Referral',     'Legal firm retainer. Monthly billing.',       'won',         'active', 6750000,  0,  NOW()-INTERVAL '7 days'),
('Kemi Adebayor',     'Adebayor Family Office',       'kemi@adebayorfo.com',        '+234 814 234 5678', '45 Banana Island Road',     'Lagos',         '101232','Finance',      'Network',      'Family office. High-value annual contract.', 'won',         'active', 31000000, 0,  NOW()-INTERVAL '4 days'),
('Musa Aliyu',        'Northern Agro Allied',         'musa.aliyu@northernagro.ng', '+234 706 345 6789', 'Plot 12, NNPC Road',        'Kaduna',        '800101','Agriculture',  'Cold Outreach','Exploring partnership on crop exports.',       'contacted',   'active', 0,        0,  NOW()-INTERVAL '30 days'),
('Blessing Okonkwo',  'Eagle Eye Media',              'blessing@eagleeye.ng',       '+234 805 456 7890', '17 Isaac John Street',      'Lagos',         '101233','Media',        'Instagram',    'Media & PR agency. Monthly social retainer.','won',         'active', 4100000,  1,  NOW()-INTERVAL '6 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. TRANSACTIONS
-- Verified columns: amount, type, category, date, description, created_by
-- No check constraints on type/category
-- ============================================================
INSERT INTO public.transactions (amount, type, category, date, description, created_by) VALUES
(4500000,  'income',  'Retainer',       '2026-01-05', 'Monthly Retainer — TechFlow Nigeria Ltd',         'System'),
(12500000, 'income',  'Invoice',        '2026-01-15', 'Invoice INV-011026 — Olatunji & Sons Consulting', 'System'),
(3200000,  'income',  'Invoice',        '2026-01-22', 'Invoice INV-011026B — Federal Polytechnic Bida',  'System'),
(4500000,  'income',  'Retainer',       '2026-02-05', 'Monthly Retainer — TechFlow Nigeria Ltd',         'System'),
(6750000,  'income',  'Invoice',        '2026-02-12', 'Invoice INV-021026 — Olawale & Partners Law',     'System'),
(8750000,  'income',  'Invoice',        '2026-02-20', 'Invoice INV-021026B — Meridian Logistics',        'System'),
(4500000,  'income',  'Retainer',       '2026-03-05', 'Monthly Retainer — TechFlow Nigeria Ltd',         'System'),
(5500000,  'income',  'Invoice',        '2026-03-10', 'Invoice INV-031026 — GreenBridge Capital',        'System'),
(9800000,  'income',  'Invoice',        '2026-03-18', 'Invoice INV-031026B — Swift Deliveries NG',       'System'),
(4100000,  'income',  'Retainer',       '2026-03-25', 'Monthly Retainer — Eagle Eye Media',              'System'),
(8500000,  'expense', 'Payroll',        '2026-01-28', 'Payroll — Engineering Team (Jan 2026)',            'System'),
(4200000,  'expense', 'Payroll',        '2026-01-28', 'Payroll — Operations Team (Jan 2026)',             'System'),
(3500000,  'expense', 'Facilities',     '2026-01-01', 'WeWork Office Space — January 2026',               'System'),
(1200000,  'expense', 'Infrastructure', '2026-01-01', 'AWS Enterprise Hosting — January 2026',            'System'),
(850000,   'expense', 'Software',       '2026-01-01', 'Google Workspace (50 seats)',                      'System'),
(95000,    'expense', 'Software',       '2026-01-10', 'Slack Enterprise Grid',                            'System'),
(8500000,  'expense', 'Payroll',        '2026-02-28', 'Payroll — Engineering Team (Feb 2026)',            'System'),
(4200000,  'expense', 'Payroll',        '2026-02-28', 'Payroll — Operations Team (Feb 2026)',             'System'),
(3500000,  'expense', 'Facilities',     '2026-02-01', 'WeWork Office Space — February 2026',              'System'),
(1200000,  'expense', 'Infrastructure', '2026-02-01', 'AWS Enterprise Hosting — February 2026',           'System'),
(2000000,  'expense', 'Marketing',      '2026-02-14', 'Q1 Marketing Campaign — Meta Ads',                 'System'),
(8500000,  'expense', 'Payroll',        '2026-03-28', 'Payroll — Engineering Team (Mar 2026)',            'System'),
(4200000,  'expense', 'Payroll',        '2026-03-28', 'Payroll — Operations Team (Mar 2026)',             'System'),
(3500000,  'expense', 'Facilities',     '2026-03-01', 'WeWork Office Space — March 2026',                 'System'),
(1200000,  'expense', 'Infrastructure', '2026-03-01', 'AWS Enterprise Hosting — March 2026',              'System'),
(8500000,  'expense', 'Payroll',        '2026-04-28', 'Payroll — Engineering Team (Apr 2026)',            'System'),
(4200000,  'expense', 'Payroll',        '2026-04-28', 'Payroll — Operations Team (Apr 2026)',             'System'),
(3500000,  'expense', 'Facilities',     '2026-04-01', 'WeWork Office Space — April 2026',                 'System'),
(1200000,  'expense', 'Infrastructure', '2026-04-01', 'AWS Enterprise Hosting — April 2026',              'System'),
(4500000,  'income',  'Retainer',       '2026-04-05', 'Monthly Retainer — TechFlow Nigeria Ltd',          'System'),
(8500000,  'expense', 'Payroll',        '2026-05-28', 'Payroll — Engineering Team (May 2026)',             'System')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. DOCUMENTS
-- Verified columns: name, type, size, url, folder_id, created_by, department
-- NOTE: NO 'description' column exists in this table
-- ============================================================
INSERT INTO public.documents (name, type, size, url, department, created_by) VALUES
('INV-011026 — Olatunji & Sons.pdf',      'pdf',   '245KB', '#inv-011026',  'Finance',    'System'),
('INV-021026 — Olawale & Partners.pdf',   'pdf',   '237KB', '#inv-021026',  'Finance',    'System'),
('INV-031026 — GreenBridge Capital.pdf',  'pdf',   '251KB', '#inv-031026',  'Finance',    'System'),
('WB230326 — Swift Deliveries.pdf',       'pdf',   '134KB', '#wb-230326',   'Operations', 'System'),
('WB150226 — Meridian Logistics.pdf',     'pdf',   '128KB', '#wb-150226',   'Operations', 'System'),
('Employee Handbook 2026.pdf',            'pdf',   '4.2MB', '#hr-handbook', 'HR',         'System'),
('Onboarding Checklist.pdf',              'pdf',   '980KB', '#hr-onboard',  'HR',         'System'),
('Code of Conduct.pdf',                   'pdf',   '1.1MB', '#hr-coc',      'HR',         'System'),
('Anti-Harassment Policy.pdf',            'pdf',   '890KB', '#hr-ahp',      'HR',         'System'),
('Leave Allowance Policy.pdf',            'pdf',   '750KB', '#pol-leave',   'HR',         'System'),
('Data Protection & NDPR Compliance.pdf', 'pdf',   '2.3MB', '#pol-ndpr',    'Compliance', 'System'),
('IT Security Guidelines.pdf',            'pdf',   '1.5MB', '#pol-it',      'IT',         'System'),
('Remote Work Policy.pdf',                'pdf',   '680KB', '#pol-remote',  'HR',         'System'),
('REDtech Brand Guidelines v3.pdf',       'pdf',   '18MB',  '#brand-guide', 'Marketing',  'System'),
('Annual Budget Template 2026.xlsx',      'excel', '1.2MB', '#fin-budget',  'Finance',    'System'),
('Q1 2026 Financial Report.pdf',          'pdf',   '3.8MB', '#fin-q1',      'Finance',    'System'),
('Performance Review Framework.pdf',      'pdf',   '1.9MB', '#hr-perf',     'HR',         'System'),
('Logo Suite (All Formats).zip',          'other', '45MB',  '#brand-logo',  'Marketing',  'System')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. TASKS
-- Verified columns: title, description, assigned_to,
--   client_id, due_date, status, priority, department
-- No check constraints on status/priority
-- ============================================================
INSERT INTO public.tasks (title, description, assigned_to, due_date, status, priority, department) VALUES
('Prepare Q2 Financial Forecast',         'Collate Q1 actuals and project forward to Q2.',               'Adebayo Okonkwo', '2026-04-15', 'in-progress', 'high',   'Finance'),
('Client Onboarding — TechFlow Nigeria',  'Complete KYC, contract signing and system access.',            'Ngozi Eze',       '2026-04-10', 'in-progress', 'high',   'Operations'),
('Update Employee Handbook',              'Incorporate 2026 policy updates from HR committee.',           'Chioma Kalu',     '2026-04-30', 'todo',        'medium', 'HR'),
('Renew AWS Enterprise Subscription',     'Process PO and confirm 2026 contract extension.',              'David Olatunji',  '2026-04-01', 'completed',   'high',   'IT'),
('Social Media Content Calendar — April', 'Draft and schedule 20 posts across LinkedIn, IG, Twitter.',   'Sola Bello',      '2026-03-31', 'completed',   'medium', 'Marketing'),
('Quarterly Tax Filing — Q1 2026',        'File Q1 PAYE and VAT returns with accountant.',               'Adebayo Okonkwo', '2026-04-21', 'todo',        'high',   'Finance'),
('Design New Service Deck for Clients',   'Create pitch deck for the new logistics analytics offering.',  'Sola Bello',      '2026-04-20', 'in-progress', 'medium', 'Marketing'),
('Fleet Maintenance Scheduling',          'Book all vehicles for service before the April run.',           'Musa Danjuma',    '2026-04-05', 'todo',        'medium', 'Operations'),
('Payroll Processing — March 2026',       'Confirm all timesheet data and process March payroll.',        'Chioma Kalu',     '2026-03-28', 'completed',   'high',   'HR'),
('Interview Panel — Tech Lead Role',      'Schedule and run 3 senior engineering interviews.',            'David Olatunji',  '2026-04-12', 'todo',        'medium', 'IT'),
('Client Report — GreenBridge Capital',   'Prepare monthly performance and spend report.',                'Ngozi Eze',       '2026-04-08', 'in-progress', 'high',   'Operations'),
('Update CRM with Q1 Client Data',        'Ensure all deals, contact dates and notes are current.',       'Ngozi Eze',       '2026-04-04', 'todo',        'low',    'Sales')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. LEAVE REQUESTS
-- Verified columns: employee_id, leave_type, start_date,
--   end_date, reason, status, approved_by
-- No check constraints
-- ============================================================
INSERT INTO public.leave_requests (employee_id, leave_type, start_date, end_date, reason, status, approved_by) VALUES
('Ngozi Eze',      'Annual Leave',  '2026-04-14', '2026-04-18', 'Family trip to Abuja',               'approved', 'Adebayo Okonkwo'),
('Sola Bello',     'Sick Leave',    '2026-03-20', '2026-03-22', 'Fever and malaria',                  'approved', 'Adebayo Okonkwo'),
('Musa Danjuma',   'Annual Leave',  '2026-05-05', '2026-05-09', 'Eid-el-Fitri extended break',        'pending',   NULL),
('Chioma Kalu',    'Study Leave',   '2026-04-28', '2026-05-02', 'CIPM professional exam preparation', 'pending',   NULL),
('David Olatunji', 'Compassionate', '2026-03-10', '2026-03-12', 'Bereavement — family loss',          'approved', 'Adebayo Okonkwo'),
('Ngozi Eze',      'Annual Leave',  '2026-06-02', '2026-06-06', 'Summer holiday',                     'pending',   NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. SOCIAL POSTS
-- Verified columns: content, platform, status, scheduled_date,
--   likes, shares, comments, created_by
-- No check constraints
-- ============================================================
INSERT INTO public.social_posts (content, platform, status, scheduled_date, likes, shares, comments, created_by) VALUES
('REDtech Africa just onboarded our 12th enterprise client this quarter. The future of Nigerian tech is here. #REDtechAfrica #TechNG',          'LinkedIn',  'published', NOW()-INTERVAL '5 days',  284, 47,  23, 'System'),
('Happy Workers Day to every hardworking Nigerian! At REDtech, our people are our biggest asset. #WorkersDay #Nigeria',                          'Twitter',   'published', NOW()-INTERVAL '20 days', 512, 89,  61, 'System'),
('From Lagos to Port Harcourt — powering businesses with smarter systems. Book a free consultation today. #REDtechAfrica #BusinessNG',           'Instagram', 'published', NOW()-INTERVAL '10 days', 731, 112, 44, 'System'),
('Our Q1 2026 numbers are in — revenue up 38% YoY. New cities. New clients. New energy.',                                                        'LinkedIn',  'scheduled', NOW()+INTERVAL '2 days',  0,   0,   0,  'System'),
('Thinking of automating your invoicing, payroll or client management? Let us show you what REDtech can do. DM us!',                            'Instagram', 'draft',     NULL,                      0,   0,   0,  'Adebayo Okonkwo'),
('Independence Day is around the corner — here''s to 65+ years of resilience, innovation and progress. #NaijaAt65 #OctoberFirst',               'Twitter',   'draft',     NULL,                      0,   0,   0,  'Sola Bello')
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFY — row counts across all seeded tables
-- ============================================================
SELECT 'clients'       AS table_name, COUNT(*) AS rows FROM public.clients
UNION ALL SELECT 'transactions',      COUNT(*) FROM public.transactions
UNION ALL SELECT 'documents',         COUNT(*) FROM public.documents
UNION ALL SELECT 'tasks',             COUNT(*) FROM public.tasks
UNION ALL SELECT 'leave_requests',    COUNT(*) FROM public.leave_requests
UNION ALL SELECT 'social_posts',      COUNT(*) FROM public.social_posts
ORDER BY table_name;
