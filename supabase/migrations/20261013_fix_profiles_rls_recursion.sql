-- ============================================================================
-- Migration: Fix RLS Infinite Recursion on public.profiles & Related Tables
-- Barangay Zapatera Digital Information Management System
-- ============================================================================

-- 1. Helper Function: Extract user role without RLS recursion
-- SECURITY DEFINER runs as database owner and bypasses RLS
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

-- Also update existing helper function
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    u_role text;
BEGIN
    SELECT role::text INTO u_role
    FROM public.profiles
    WHERE id = user_id;
    RETURN u_role IN ('super_admin', 'superadmin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop all conflicting policies on public.profiles that trigger recursion
DROP POLICY IF EXISTS "treasurer_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin Admin Profile All" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;

-- 3. Create non-recursive clean SELECT policy for public.profiles
CREATE POLICY "Public Profiles Read" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 4. Clean up UPDATE / INSERT / DELETE policies on public.profiles
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" 
ON public.profiles 
FOR UPDATE 
USING (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('super_admin', 'superadmin', 'admin')
)
WITH CHECK (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('super_admin', 'superadmin', 'admin')
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
    public.get_auth_role() IN ('super_admin', 'superadmin', 'admin') 
    OR auth.uid() IS NULL
);

-- 5. Fix document_requests policies to use get_auth_role()
DROP POLICY IF EXISTS "treasurer_select_document_requests" ON public.document_requests;
DROP POLICY IF EXISTS "admin_superadmin_modify_document_requests" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Read Own Requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admin All Requests" ON public.document_requests;

CREATE POLICY "document_requests_select_policy" 
ON public.document_requests 
FOR SELECT 
USING (
    resident_id = auth.uid() 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('treasurer', 'admin', 'super_admin', 'superadmin')
);

CREATE POLICY "document_requests_modify_policy" 
ON public.document_requests 
FOR ALL 
USING (
    public.get_auth_role() IN ('admin', 'super_admin', 'superadmin')
    OR auth.uid() IS NULL
)
WITH CHECK (
    public.get_auth_role() IN ('admin', 'super_admin', 'superadmin')
    OR auth.uid() IS NULL
);

-- 6. Fix events policies so event fetches with profile joins never fail
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
    public.get_auth_role() IN ('admin', 'super_admin', 'superadmin')
    OR auth.uid() IS NULL
);
