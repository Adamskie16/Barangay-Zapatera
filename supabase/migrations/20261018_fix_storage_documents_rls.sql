-- =============================================================================
-- Migration: Fix Storage RLS Policies for 'documents' bucket
-- =============================================================================
-- Problem:
-- Resident uploads fail with:
--   "StorageApiError: new row violates row-level security policy" (HTTP 400 Bad Request)
-- Cause:
--   The storage.objects table has Row-Level Security (RLS) enabled, but lacks
--   an INSERT policy permitting residents (authenticated or public/anon) to upload
--   files into the 'documents' bucket.
--
-- How to apply this fix:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/qzmxwxmtuzoanwevftnd
-- 2. Go to the "SQL Editor" in the left sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- =============================================================================

-- Step 1: Ensure 'documents' bucket exists and is public with generous size limit & open mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'documents', 
    'documents', 
    true, 
    20971520, -- 20 MB file size limit
    NULL      -- NULL allows all document & image MIME types without rejection
  )
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = NULL;

-- Step 2: Ensure Row Level Security is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Clean up all legacy / restrictive / dashboard-generated policies for 'documents'
DROP POLICY IF EXISTS "Resident Read Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Upload Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Update Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Delete Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage All Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Read Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Documents" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Step 4: Create Permissive Policies for 'documents' bucket (INSERT, SELECT, UPDATE, DELETE)

-- 4.1 Allow Upload (INSERT): Allows residents & applicants to upload requirement files
CREATE POLICY "Allow Upload Documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'documents'
);

-- 4.2 Allow View/Download (SELECT): Allows viewing submitted requirement files
CREATE POLICY "Allow All Read Documents"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'documents'
);

-- 4.3 Allow Update (UPDATE): Required for upsert operations
CREATE POLICY "Allow Update Documents"
ON storage.objects FOR UPDATE
TO public
USING (
    bucket_id = 'documents'
)
WITH CHECK (
    bucket_id = 'documents'
);

-- 4.4 Allow Delete (DELETE): Allows removing old/replaced requirement files
CREATE POLICY "Allow Delete Documents"
ON storage.objects FOR DELETE
TO public
USING (
    bucket_id = 'documents'
);

-- Step 5: Ensure 'file_attachments' table RLS permits inserts
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'file_attachments') THEN
        DROP POLICY IF EXISTS "Allow All Insert Attachments" ON public.file_attachments;
        DROP POLICY IF EXISTS "Allow All Select Attachments" ON public.file_attachments;
        
        CREATE POLICY "Allow All Insert Attachments"
        ON public.file_attachments FOR INSERT
        TO public
        WITH CHECK (true);

        CREATE POLICY "Allow All Select Attachments"
        ON public.file_attachments FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;
