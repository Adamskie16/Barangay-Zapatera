-- ============================================================================
-- Migration: Add 'treasurer' Role and Strict Financial Auditing RBAC Policies
-- Barangay Zapatera Digital Information Management System
-- ============================================================================

-- 1. Update user_role_enum to include 'treasurer'
DO $$ 
BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'treasurer';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ensure profiles table check constraint supports 'treasurer'
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role::text IN ('super_admin', 'superadmin', 'admin', 'resident', 'treasurer', 'accountmanagement', 'staff'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable RLS on document_requests if not already enabled
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Treasurer can SELECT all document requests for revenue auditing
DROP POLICY IF EXISTS "treasurer_select_document_requests" ON public.document_requests;
CREATE POLICY "treasurer_select_document_requests" 
ON public.document_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role::text IN ('treasurer', 'admin', 'super_admin', 'superadmin')
    )
);

-- 5. RLS Policy: Treasurer CANNOT INSERT, UPDATE, or DELETE document requests
-- Only admin and super_admin are permitted to update or delete request statuses
DROP POLICY IF EXISTS "admin_superadmin_modify_document_requests" ON public.document_requests;
CREATE POLICY "admin_superadmin_modify_document_requests"
ON public.document_requests
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role::text IN ('admin', 'super_admin', 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role::text IN ('admin', 'super_admin', 'superadmin')
    )
);

-- 6. RLS Policy: Ensure profiles SELECT is clean without infinite recursion
DROP POLICY IF EXISTS "treasurer_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
CREATE POLICY "Public Profiles Read"
ON public.profiles
FOR SELECT
USING (true);

-- 7. RLS Policy: Document types can be read by everyone authenticated including treasurer
DROP POLICY IF EXISTS "authenticated_read_document_types" ON public.document_types;
CREATE POLICY "authenticated_read_document_types"
ON public.document_types
FOR SELECT
TO authenticated
USING (true);

-- End of migration
