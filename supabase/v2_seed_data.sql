-- REDtech System Automations V2 - Robust Mock Data Seeder
-- Run this in your Supabase SQL Editor AFTER you have created your first few users via the App.
-- This script safely grabs the first available User IDs to assign the mock data to them.

DO $$ 
DECLARE 
    first_user UUID;
    second_user UUID;
BEGIN
    -- Get two valid user IDs from the profiles table
    SELECT id INTO first_user FROM profiles LIMIT 1;
    SELECT id INTO second_user FROM profiles OFFSET 1 LIMIT 1;
    
    -- Fallback in case there is only one user
    IF second_user IS NULL THEN
        second_user := first_user;
    END IF;

    -- ONLY run if we have at least one user
    IF first_user IS NOT NULL THEN
        
        -- 1. SOCIAL POSTS MOCK DATA
        INSERT INTO social_posts (platform, content, status, scheduled_date, likes, comments, shares, created_by)
        VALUES 
            ('linkedin', 'We are thrilled to announce REDtech Automations V2! Check out the new features designed to streamline our operational workflows. #Tech #Africa #Innovation', 'published', NOW() - INTERVAL '2 days', 145, 12, 34, 'Admin'),
            ('instagram', 'Behind the scenes at REDtech HQ. Building the future, one deploy at a time. 🚀', 'published', NOW() - INTERVAL '5 days', 289, 45, 5, 'Admin'),
            ('twitter', 'Don''t miss our CEO''s keynote at the upcoming TechInAfrica summit next week. We''ll be sharing some big news!', 'scheduled', NOW() + INTERVAL '3 days', 0, 0, 0, 'Admin'),
            ('facebook', 'Join our growing team! We are looking for mid-level engineers to help scale our enterprise platforms. Link in bio.', 'draft', NOW(), 0, 0, 0, 'Admin')
        ON CONFLICT DO NOTHING;

        -- 2. CLIENTS (DEAL BOOK) MOCK DATA
        INSERT INTO clients (name, company, email, phone, industry, source, deal_status, assigned_to, last_contact_date, notes)
        VALUES 
            ('Michael Adeyemi', 'Fintech Solutions Ltd', 'michael@fintechsolutions.com', '+234 801 234 5678', 'Finance', 'referral', 'lead', first_user, NOW(), 'Interested in our enterprise operational software.'),
            ('Sarah Johnson', 'Global Logistics Partners', 's.johnson@glp.net', '+234 908 765 4321', 'Other', 'event', 'negotiation', first_user, NOW() - INTERVAL '1 day', 'Awaiting final sign-off on the proposal we sent last Tuesday. Looking good.'),
            ('Oluwaseun Balogun', 'NaijaTech Innovators', 'obalogun@naijatech.io', '+234 703 555 1234', 'Technology', 'website', 'won', second_user, NOW() - INTERVAL '10 days', 'Contract signed. Initial kickoff meeting completed. Onboarding phase started.'),
            ('Fatima Mohammed', 'Apex Real Estate', 'fatima.m@apexrealty.ng', '+234 812 999 8888', 'Real Estate', 'social', 'contacted', second_user, NOW() - INTERVAL '3 days', 'Requested a demo of the document management module.')
        ON CONFLICT DO NOTHING;

        -- 3. FINANCE TRANSACTIONS MOCK DATA
        INSERT INTO transactions (amount, type, category, date, description, created_by)
        VALUES
            (2500000, 'revenue', 'Retainer', CURRENT_DATE - INTERVAL '10 days', 'Monthly Retainer - Global Logistics', 'System Auto-Post'),
            (1500000, 'revenue', 'Project Milestone', CURRENT_DATE - INTERVAL '5 days', 'Q1 Automation Setup Kickoff', 'System Auto-Post'),
            (45000, 'expense', 'Software', CURRENT_DATE - INTERVAL '12 days', 'AWS Cloud Infrastructure (Monthly)', 'Admin'),
            (120000, 'expense', 'Operations', CURRENT_DATE - INTERVAL '2 days', 'Office Internet & Utilities', 'Admin'),
            (850000, 'expense', 'Payroll', CURRENT_DATE - INTERVAL '1 day', 'Contractor Payments Part 1', 'Admin')
        ON CONFLICT DO NOTHING;

        -- 4. TASKS MOCK DATA
        INSERT INTO tasks (title, description, status, priority, due_date, department, assigned_to_user_id)
        VALUES
            ('Review V2 Scope Document', 'Go through the final requirements for Phase 3 rollout.', 'completed', 'high', CURRENT_DATE - INTERVAL '1 day', 'Engineering', first_user),
            ('Prepare Q1 Finance Report', 'Aggregate all expenses and revenues for the board meeting.', 'in-progress', 'high', CURRENT_DATE + INTERVAL '2 days', 'Finance', first_user),
            ('Client Onboarding: NaijaTech', 'Setup new workspaces and permissions for the NaijaTech account.', 'todo', 'medium', CURRENT_DATE + INTERVAL '5 days', 'Operations', second_user),
            ('Design Social Media Assets', 'Create graphics for next weeks LinkedIn and Twitter push.', 'todo', 'low', CURRENT_DATE + INTERVAL '7 days', 'Marketing', second_user)
        ON CONFLICT DO NOTHING;
        
        -- 5. ATTENDANCE RECORDS (Recent mock data)
        INSERT INTO attendance_records (user_id, date, status, clock_in, clock_out, work_hours, notes)
        VALUES
            (first_user, CURRENT_DATE, 'present', NOW() - INTERVAL '8 hours', NOW(), 8.0, 'Working from office'),
            (first_user, CURRENT_DATE - INTERVAL '1 day', 'present', NOW() - INTERVAL '32 hours', NOW() - INTERVAL '24 hours', 8.0, 'Remote'),
            (second_user, CURRENT_DATE, 'late', NOW() - INTERVAL '7 hours', NULL, NULL, 'Traffic on the mainland')
        ON CONFLICT DO NOTHING;

    END IF;
END $$;
