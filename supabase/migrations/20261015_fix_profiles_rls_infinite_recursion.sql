-- ==============================================================================
-- Migration: 20261015_fix_profiles_rls_infinite_recursion.sql
-- Description: Fix 500 Internal Server Error (42P17 - Infinite Recursion on public.profiles)
-- Caused by "Profiles Archive Read Policy" querying public.profiles inside its own USING expression.
-- ==============================================================================

-- 1. Helper Function: Non-recursive Role Lookup using SECURITY DEFINER
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

-- 2. Drop the recursive policies on public.profiles
DROP POLICY IF EXISTS "Profiles Archive Read Policy" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "treasurer_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin Admin Profile All" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;

-- 3. Re-create clean non-recursive SELECT policy on public.profiles
CREATE POLICY "Public Profiles Read" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 4. Clean SELECT policy for public.news using get_auth_role() to avoid recursion
DROP POLICY IF EXISTS "News Select Policy" ON public.news;

CREATE POLICY "News Select Policy" ON public.news
FOR SELECT USING (
    is_archived = false
    OR public.get_auth_role() IN ('admin', 'super_admin')
);

-- 5. Clean SELECT policy for public.document_requests using get_auth_role() to avoid recursion
DROP POLICY IF EXISTS "Document Requests Archive Read Policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_select_policy" ON public.document_requests;

CREATE POLICY "document_requests_select_policy" 
ON public.document_requests 
FOR SELECT 
USING (
    resident_id = auth.uid() 
    OR auth.uid() IS NULL 
    OR public.get_auth_role() IN ('treasurer', 'admin', 'super_admin')
);
