-- Create public bucket for generated PDFs (invoices/waybills/partnerships)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-docs', 'generated-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (so anyone with the URL can open the PDF)
DO $$ BEGIN
  CREATE POLICY "Generated docs are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'generated-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload anywhere in the bucket
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload generated docs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update generated docs"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete generated docs"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;