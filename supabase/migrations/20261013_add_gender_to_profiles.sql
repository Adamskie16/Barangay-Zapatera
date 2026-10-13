-- ============================================================================
-- Migration: Add Gender, Age, and Administrator Credentials to Profiles
-- Barangay Zapatera Digital Information Management System
-- File: 20261013_add_gender_to_profiles.sql
-- ============================================================================

-- 1. Ensure columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_initial TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_status TEXT DEFAULT 'Single';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;

-- 2. Populate age for existing profiles if birth_date is present
UPDATE public.profiles
SET age = DATE_PART('year', AGE(CURRENT_DATE, birth_date))::INTEGER
WHERE birth_date IS NOT NULL AND (age IS NULL OR age = 0);

-- 3. Update the handle_new_user_profile trigger function
-- Automatically extracts first_name, last_name, middle_initial, gender, age, 
-- office, position, and role (super_admin, admin, treasurer, resident) from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role TEXT;
    raw_role_str TEXT;
    gen_username TEXT;
    computed_age INTEGER;
    parsed_birth_date DATE;
BEGIN
    raw_role_str := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role',
        'resident'
    ));

    IF raw_role_str IN ('super_admin', 'superadmin') THEN
        assigned_role := 'super_admin';
    ELSIF raw_role_str = 'treasurer' THEN
        assigned_role := 'treasurer';
    ELSIF raw_role_str = 'admin' THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := 'resident';
    END IF;

    gen_username := LOWER(COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    ));

    -- Parse birth date if provided in metadata
    IF (NEW.raw_user_meta_data->>'birth_date') IS NOT NULL AND (NEW.raw_user_meta_data->>'birth_date') != '' THEN
        BEGIN
            parsed_birth_date := (NEW.raw_user_meta_data->>'birth_date')::DATE;
        EXCEPTION WHEN OTHERS THEN
            parsed_birth_date := NULL;
        END;
    END IF;

    -- Compute or extract age
    IF (NEW.raw_user_meta_data->>'age') IS NOT NULL AND (NEW.raw_user_meta_data->>'age') != '' THEN
        BEGIN
            computed_age := (NEW.raw_user_meta_data->>'age')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            computed_age := NULL;
        END;
    ELSIF parsed_birth_date IS NOT NULL THEN
        computed_age := DATE_PART('year', AGE(CURRENT_DATE, parsed_birth_date))::INTEGER;
    END IF;

    BEGIN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            first_name,
            middle_initial,
            last_name,
            gender,
            age,
            birth_date,
            civil_status,
            username,
            role,
            phone,
            address,
            office,
            position,
            id_type,
            id_number,
            avatar_url,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NULLIF(TRIM(CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name')), ''),
                NEW.raw_user_meta_data->>'display_name',
                'System User'
            ),
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'middle_initial',
            NEW.raw_user_meta_data->>'last_name',
            NEW.raw_user_meta_data->>'gender',
            computed_age,
            parsed_birth_date,
            COALESCE(NEW.raw_user_meta_data->>'civil_status', 'Single'),
            gen_username,
            assigned_role::user_role_enum,
            COALESCE(NEW.raw_user_meta_data->>'phone', '09170000000'),
            COALESCE(NEW.raw_user_meta_data->>'address', 'Barangay Zapatera, Cebu City'),
            NEW.raw_user_meta_data->>'office',
            NEW.raw_user_meta_data->>'position',
            COALESCE(NEW.raw_user_meta_data->>'id_type', 'Barangay ID'),
            COALESCE(NEW.raw_user_meta_data->>'id_number', 'BZ-AUTH'),
            NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
            middle_initial = COALESCE(EXCLUDED.middle_initial, public.profiles.middle_initial),
            last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
            gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
            age = COALESCE(EXCLUDED.age, public.profiles.age),
            birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
            civil_status = COALESCE(EXCLUDED.civil_status, public.profiles.civil_status),
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            office = COALESCE(EXCLUDED.office, public.profiles.office),
            position = COALESCE(EXCLUDED.position, public.profiles.position),
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user_profile notice: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
