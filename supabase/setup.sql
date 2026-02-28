-- Create transactions table for Finance Dashboard
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'revenue' or 'expense'
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_by TEXT, -- Stores the name of the staff member
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create documents table for Document Repository
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'pdf', 'docx', 'image', 'folder'
  size TEXT,
  url TEXT,
  folder_id UUID REFERENCES documents(id), -- For nested directories
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ops_metrics table for Operations Dashboard
CREATE TABLE ops_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliveries INTEGER NOT NULL DEFAULT 0,
  issues INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create social_posts table for Social Media Hub
CREATE TABLE social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL, -- 'draft', 'scheduled', 'published'
  scheduled_date TIMESTAMP WITH TIME ZONE,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we use an app-level shared password)
CREATE POLICY "Allow public all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow public all operations on documents" ON documents FOR ALL USING (true);
CREATE POLICY "Allow public all operations on ops_metrics" ON ops_metrics FOR ALL USING (true);
CREATE POLICY "Allow public all operations on social_posts" ON social_posts FOR ALL USING (true);

-- Create clients table for Client Directory
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  industry TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table for Task Tracker
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  client_id UUID REFERENCES clients(id),
  due_date DATE,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create leave_requests table for Leave Management
CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adding policies for Lovable's original tables so they work with our password Auth
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow public all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow public all operations on leave_requests" ON leave_requests FOR ALL USING (true);

-- Create a storage bucket for Document Repository files
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('documents', 'documents', true, 5242880) -- 5MB limit
ON CONFLICT (id) DO NOTHING;

-- Grant public access to the storage bucket
CREATE POLICY "Allow public uploads to documents bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow public reads from documents bucket" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Allow public deletes from documents bucket" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
CREATE POLICY "Allow public updates to documents bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'documents');
