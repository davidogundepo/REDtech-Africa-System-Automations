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
