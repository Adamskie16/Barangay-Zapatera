-- =============================================================================
-- Migration: Fix Storage RLS Policies for 'documents' bucket
-- Description:
-- Resolves "StorageApiError: new row violates row-level security policy"
-- when residents upload requirement documents and valid IDs.
-- =============================================================================

-- Ensure 'documents' bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'documents', 
    'documents', 
    true, 
    15728640, -- 15 MB limit
    ARRAY[
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop any restrictive legacy policies on storage.objects for documents bucket
DROP POLICY IF EXISTS "Resident Read Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Upload Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Update Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Delete Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage All Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Read Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Documents" ON storage.objects;

-- Allow upload to 'documents' bucket for all applicants (authenticated & public)
CREATE POLICY "Allow Upload Documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'documents'
);

-- Allow reading files from 'documents' bucket
CREATE POLICY "Allow All Read Documents"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'documents'
);

-- Allow updating files in 'documents' bucket
CREATE POLICY "Allow Update Documents"
ON storage.objects FOR UPDATE
TO public
USING (
    bucket_id = 'documents'
)
WITH CHECK (
    bucket_id = 'documents'
);

-- Allow deleting files from 'documents' bucket
CREATE POLICY "Allow Delete Documents"
ON storage.objects FOR DELETE
TO public
USING (
    bucket_id = 'documents'
);
