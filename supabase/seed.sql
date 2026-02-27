-- Seed Finance Transactions
INSERT INTO transactions (amount, "type", category, "date", description, created_by) VALUES
(450000, 'revenue', 'Consulting', '2026-02-01', 'Q1 Strategy Planning', 'David Ogundepo'),
(280000, 'revenue', 'Development', '2026-02-05', 'App MVP Delivery', 'Dolapo'),
(150000, 'expense', 'Operations', '2026-02-10', 'Office Rent & Utilities', 'Ayomide'),
(85000, 'expense', 'Marketing', '2026-02-12', 'Social Media Ad Spend', 'Olu'),
(520000, 'revenue', 'Consulting', '2026-02-15', 'System Architecture Review', 'David Ogundepo'),
(30000, 'expense', 'Software', '2026-02-18', 'Cloud Hosting Subscriptions', 'Ayomide');

-- Seed Documents
INSERT INTO documents (name, "type", size, url, created_by) VALUES
('Q1_Financial_Report.pdf', 'pdf', '2.4 MB', '#', 'Dolapo'),
('Employee_Onboarding_Template.docx', 'docx', '1.1 MB', '#', 'Olu'),
('Client_A_Architecture_Diagram.png', 'image', '4.5 MB', '#', 'David Ogundepo'),
('2026_Marketing_Strategy.pdf', 'pdf', '3.8 MB', '#', 'Ayomide'),
('Meeting_Notes_Feb_15.docx', 'docx', '0.5 MB', '#', 'Olu');

-- Seed Operations Metrics (Mocking the last 7 days)
INSERT INTO ops_metrics (deliveries, issues, "date", created_by) VALUES
(24, 2, '2026-02-21', 'Ayomide'),
(35, 1, '2026-02-22', 'Ayomide'),
(28, 3, '2026-02-23', 'Ayomide'),
(42, 0, '2026-02-24', 'Ayomide'),
(38, 4, '2026-02-25', 'Ayomide'),
(15, 1, '2026-02-26', 'Ayomide'),
(5, 0, '2026-02-27', 'Ayomide');

-- Seed Social Media Posts
INSERT INTO social_posts (content, platform, status, scheduled_date, likes, shares, comments, created_by) VALUES
('Just launched our new System Automations platform! 🚀 #TechAfrica', 'Twitter', 'published', '2026-02-25 09:00:00+00', 145, 32, 18, 'Olu'),
('5 ways to automate your business processes and save 20 hours a week.', 'LinkedIn', 'published', '2026-02-26 10:30:00+00', 312, 85, 42, 'Dolapo'),
('Join us for a free webinar on cloud infrastructure scaling.', 'LinkedIn', 'scheduled', '2026-03-01 14:00:00+00', 0, 0, 0, 'Olu'),
('Behind the scenes at REDtech HQ today! 📸 #CompanyCulture', 'Instagram', 'draft', NULL, 0, 0, 0, 'Ayomide');
