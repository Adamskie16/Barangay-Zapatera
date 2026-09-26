-- Migration: 20260927_remove_template_avatar_defaults.sql
-- Description: Removes template image defaults on new user profiles and resets existing template URLs to NULL
-- so that user initials badges display seamlessly across all portals (Superadmin, Admin, AccountManagement, Resident).

-- 1. Update the handle_new_user_profile trigger function to never set template images
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role user_role;
    raw_role_str TEXT;
    gen_username TEXT;
BEGIN
    raw_role_str := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role',
        'resident'
    ));

    IF raw_role_str = 'super_admin' THEN
        assigned_role := 'super_admin';
    ELSIF raw_role_str = 'admin' THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := 'resident';
    END IF;

    gen_username := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    ));

    BEGIN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            username,
            role,
            phone,
            address,
            id_type,
            id_number,
            avatar_url,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', 'Resident User'),
            gen_username,
            assigned_role,
            COALESCE(NEW.raw_user_meta_data->>'phone', '09170000000'),
            COALESCE(NEW.raw_user_meta_data->>'address', 'Barangay Zapatera, Cebu City'),
            COALESCE(NEW.raw_user_meta_data->>'id_type', 'Barangay ID'),
            COALESCE(NEW.raw_user_meta_data->>'id_number', 'BZ-RESIDENT'),
            NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            id_type = EXCLUDED.id_type,
            id_number = EXCLUDED.id_number,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user_profile notice: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clear out any legacy template / stock photo URLs from existing profiles
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url LIKE '%photo-1472099645785%'
   OR avatar_url LIKE '%photo-1534528741775%'
   OR avatar_url LIKE '%default-avatar%'
   OR avatar_url LIKE '%default_avatar%'
   OR avatar_url LIKE '%placeholder%'
   OR avatar_url LIKE '%silhouette%'
   OR avatar_url LIKE '%user-template%'
   OR avatar_url LIKE '%avatar-template%'
   OR avatar_url LIKE '%anonymous%';
