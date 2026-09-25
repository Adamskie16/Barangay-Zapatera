-- =============================================================================
-- Migration: Complete Supabase Storage Setup & File Attachments Tracking
-- Description:
-- 1. Creates storage buckets 'documents' (private) and 'public_assets' (public).
-- 2. Sets up Row Level Security (RLS) policies on storage.objects.
-- 3. Creates public.file_attachments table for persistent metadata & audit tracking.
-- =============================================================================

-- 1. Create Storage Buckets (Safe idempotent upsert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'documents', 
    'documents', 
    false, 
    10485760, -- 10 MB limit
    ARRAY[
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'public_assets', 
    'public_assets', 
    true, 
    5242880, -- 5 MB limit
    ARRAY[
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'image/svg+xml'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for 'documents' (Private Bucket)
-- Folder structure: {user_id}/requests/{request_id}/{filename}

DROP POLICY IF EXISTS "Resident Read Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Upload Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Update Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Resident Delete Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage All Documents" ON storage.objects;

-- SELECT: Residents can only access files inside their own user_id directory; Admins can access all
CREATE POLICY "Resident Read Own Documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- INSERT: Residents can only upload to their own user_id directory
CREATE POLICY "Resident Upload Own Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- UPDATE: Residents can only update files in their own folder
CREATE POLICY "Resident Update Own Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin_or_superadmin(auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- DELETE: Residents can only delete files in their own folder
CREATE POLICY "Resident Delete Own Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- 3. Storage RLS Policies for 'public_assets' (Public Read, Controlled Write)
-- Folder structure: avatars/{user_id}/{filename} or announcements/{filename}

DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
DROP POLICY IF EXISTS "Users Upload Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Avatar" ON storage.objects;

-- SELECT: Public can view assets
CREATE POLICY "Public Read Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public_assets');

-- INSERT: Users can upload avatars in avatars/{user_id}/*; Admins can upload any asset
CREATE POLICY "Users Upload Own Avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'public_assets' AND (
        ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- UPDATE: Users can update their own avatars; Admins can update any asset
CREATE POLICY "Users Update Own Avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'public_assets' AND (
        ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.is_admin_or_superadmin(auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'public_assets' AND (
        ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- DELETE: Users can delete their own avatars; Admins can delete any asset
CREATE POLICY "Users Delete Own Avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'public_assets' AND (
        ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.is_admin_or_superadmin(auth.uid())
    )
);

-- 4. Create public.file_attachments table for persistent metadata & indexing
CREATE TABLE IF NOT EXISTS public.file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_id UUID REFERENCES public.document_requests(id) ON DELETE SET NULL,
    bucket TEXT NOT NULL DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    requirement_name TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_user ON public.file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_req ON public.file_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_path ON public.file_attachments(storage_path);

ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Users Insert Own Attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Users Update Own Attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Users Delete Own Attachments" ON public.file_attachments;

CREATE POLICY "Users Read Own Attachments"
ON public.file_attachments FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Users Insert Own Attachments"
ON public.file_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Users Update Own Attachments"
ON public.file_attachments FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Users Delete Own Attachments"
ON public.file_attachments FOR DELETE
USING (auth.uid() = user_id OR public.is_admin_or_superadmin(auth.uid()));
