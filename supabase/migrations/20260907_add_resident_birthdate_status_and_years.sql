-- ==============================================================================
-- Migration: Add Date of Birth, Civil Status, and Years in Barangay
-- For Barangay Zapatera Management System (Profiles & Document Requests)
-- ==============================================================================

-- 1. ADD RESIDENT FIELDS TO public.profiles TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_status TEXT DEFAULT 'Single';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_in_barangay INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_initial TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sitio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voter_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;

-- 2. ADD RESIDENCY & APPOINTMENT COLUMNS TO public.document_requests TABLE
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS resident_birth_date DATE;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS years_in_barangay INTEGER;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_date TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_time_slot TEXT;

-- 3. REFRESH SCHEMA CACHE & PERMISSIONS
NOTIFY pgrst, 'reload schema';
