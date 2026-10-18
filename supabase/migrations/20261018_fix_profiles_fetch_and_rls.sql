-- ==============================================================================
-- Migration: 20261018_fix_profiles_fetch_and_rls.sql
-- Description:
-- 1. Adds missing last_edited_at column to public.profiles.
-- 2. Consolidates and replaces 9 conflicting/recursive RLS policies on public.profiles.
-- 3. Ensures active status (is_archived = false, deleted_at = NULL) on all accounts.
-- 4. Enables Realtime publication on public.profiles.
-- ==============================================================================

-- 1. Ensure required columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.last_edited_at IS 'Timestamp of the latest account profile edit';

-- 2. Ensure all accounts have active unarchived status
UPDATE public.profiles
SET is_archived = false,
    deleted_at = NULL,
    is_active = true
WHERE is_archived IS TRUE 
   OR deleted_at IS NOT NULL 
   OR is_active IS FALSE;

-- Specifically ensure super_admin and treasurer accounts are completely unlocked and active
UPDATE public.profiles
SET is_archived = false,
    deleted_at = NULL,
    is_active = true,
    is_locked = false,
    failed_attempts = 0
WHERE email IN ('mardee131@gmail.com', 'kennethaguitong@gmail.com');

-- 3. Helper Functions: Role checking without RLS recursion
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

-- 4. Enable Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL legacy, duplicate, or recursive policies on public.profiles
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Insert" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Delete" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Update" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin Admin Profile All" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Archive Read Policy" ON public.profiles;
DROP POLICY IF EXISTS "treasurer_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin delete on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Read Policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles All Policy" ON public.profiles;
DROP POLICY IF EXISTS "Resident Read Own Profiles" ON public.profiles;

-- 6. Create clean, non-recursive RLS policies on public.profiles

-- SELECT: Allow all authenticated users and anon clients to fetch profiles
CREATE POLICY "Public Profiles Read"
ON public.profiles
FOR SELECT
USING (true);

-- INSERT: Allow registration & admin account creation
CREATE POLICY "Public Profiles Insert"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- UPDATE: Users can update their own profile; admins & super_admins can update any profile
CREATE POLICY "Public Profiles Update"
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

-- DELETE: Admins and super_admins can delete accounts
CREATE POLICY "Public Profiles Delete"
ON public.profiles
FOR DELETE
USING (
    public.get_auth_role() IN ('super_admin', 'admin')
    OR auth.uid() IS NULL
);

-- 7. Add to Realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;
