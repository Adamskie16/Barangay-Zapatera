-- ============================================================================
-- Complete Migration: Fix RLS Infinite Recursion & Enforce Exact Roles
-- Roles: 'super_admin' | 'admin' | 'resident' | 'treasurer'
-- ============================================================================

-- 1. Ensure user_role_enum has all 4 required roles
DO $$ 
BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'super_admin';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'resident';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'treasurer';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Normalize any legacy roles before applying check constraint
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE role::text = 'superadmin';

-- 3. Strict Check Constraint on profiles table: only these 4 roles allowed
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role::text IN ('super_admin', 'admin', 'resident', 'treasurer'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Helper Function: Extract user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role::text INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    u_role text;
BEGIN
    SELECT role::text INTO u_role
    FROM public.profiles
    WHERE id = user_id;
    RETURN u_role IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 5. Drop all recursive/conflicting policies on public.profiles
DROP POLICY IF EXISTS "treasurer_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin Admin Profile All" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;

-- 6. Clean non-recursive SELECT policy for public.profiles
CREATE POLICY "Public Profiles Read" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 7. Clean UPDATE, INSERT, and DELETE policies on public.profiles
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" 
ON public.profiles 
FOR UPDATE 
USING (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('super_admin', 'admin')
)
WITH CHECK (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "Public Profiles Insert" ON public.profiles;
CREATE POLICY "Public Profiles Insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public Profiles Delete" ON public.profiles;
CREATE POLICY "Public Profiles Delete" 
ON public.profiles 
FOR DELETE 
USING (
    public.get_auth_role() IN ('super_admin', 'admin') 
    OR auth.uid() IS NULL
);

-- 8. Fix document_requests policies (Resident create/read own, Treasurer read all, Admin manage)
DROP POLICY IF EXISTS "treasurer_select_document_requests" ON public.document_requests;
DROP POLICY IF EXISTS "admin_superadmin_modify_document_requests" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Read Own Requests" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Create Request" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Update Own Request" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Delete Own Request" ON public.document_requests;
DROP POLICY IF EXISTS "Admin All Requests" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_select_policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_modify_policy" ON public.document_requests;

CREATE POLICY "document_requests_select_policy" 
ON public.document_requests 
FOR SELECT 
USING (
    resident_id = auth.uid() 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('treasurer', 'admin', 'super_admin')
);

CREATE POLICY "document_requests_modify_policy" 
ON public.document_requests 
FOR ALL 
USING (
    public.get_auth_role() IN ('admin', 'super_admin')
    OR auth.uid() IS NULL
)
WITH CHECK (
    public.get_auth_role() IN ('admin', 'super_admin')
    OR auth.uid() IS NULL
);

-- 9. Fix events policies so event fetches with profiles joins succeed
DROP POLICY IF EXISTS "Events Read All" ON public.events;
DROP POLICY IF EXISTS "Events Admin Manage" ON public.events;

CREATE POLICY "Events Read All" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Events Admin Manage" 
ON public.events 
FOR ALL 
USING (
    public.get_auth_role() IN ('admin', 'super_admin')
    OR auth.uid() IS NULL
);

-- 10. Document Types readable by everyone including Treasurer
DROP POLICY IF EXISTS "authenticated_read_document_types" ON public.document_types;
DROP POLICY IF EXISTS "Doc Types Read All" ON public.document_types;
CREATE POLICY "Doc Types Read All" 
ON public.document_types 
FOR SELECT 
USING (true);
