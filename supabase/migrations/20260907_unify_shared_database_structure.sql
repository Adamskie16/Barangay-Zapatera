-- Migration: 20260907_unify_shared_database_structure.sql
-- Description: Unifies Resident, Admin, and Super Admin modules through one consistent database structure.
-- Ensures profiles is authoritative source of truth, document_requests references profiles and document_types,
-- notifications are user-targeted, and all RLS policies allow seamless operations across portals.

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. UNIFIED PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    middle_initial TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'resident',
    phone TEXT,
    address TEXT,
    sitio TEXT,
    birthdate TEXT,
    age INT,
    civil_status TEXT,
    voter_status TEXT,
    id_type TEXT,
    id_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_attempts INT NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all necessary columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_initial TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sitio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voter_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. DOCUMENT TYPES TABLE (Standard Templates, Requirements, & Fees)
CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    processing_days INTEGER NOT NULL DEFAULT 1,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCUMENT REQUESTS TABLE (Shared between Resident, Admin, and SuperAdmin)
CREATE TABLE IF NOT EXISTS public.document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT UNIQUE NOT NULL,
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL,
    requirements_attached JSONB DEFAULT '[]'::jsonb,
    uploaded_files JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    pickup_date TEXT,
    pickup_time_slot TEXT,
    pickup_location TEXT DEFAULT 'Express Window 2, Barangay Hall Lobby, Rahmann St.',
    pickup_instructions TEXT,
    notes TEXT,
    rejection_reason TEXT,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all necessary columns exist on public.document_requests
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_date TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_time_slot TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_location TEXT DEFAULT 'Express Window 2, Barangay Hall Lobby, Rahmann St.';
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. EVENTS & ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTIFICATIONS TABLE (Targeted to Specific Users)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_target TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    link_tab TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_tab TEXT;

-- 6. SYSTEM CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.system_config (
    id INT PRIMARY KEY DEFAULT 1,
    barangay_name TEXT NOT NULL DEFAULT 'Barangay Zapatera',
    municipality TEXT NOT NULL DEFAULT 'Cebu City',
    province TEXT NOT NULL DEFAULT 'Cebu',
    seal_url TEXT DEFAULT 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
    office_hours TEXT DEFAULT 'Mon - Fri: 8:00 AM - 5:00 PM',
    contact_email TEXT DEFAULT 'info@barangayzapatera.gov.ph',
    contact_phone TEXT DEFAULT '(032) 253-1234',
    doc_prefix TEXT DEFAULT 'BRGY-2026',
    auto_notify BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default system config if not exists
INSERT INTO public.system_config (id, barangay_name, municipality, province, doc_prefix)
VALUES (1, 'Barangay Zapatera', 'Cebu City', 'Cebu', 'BRGY-2026')
ON CONFLICT (id) DO NOTHING;

-- 7. ACTIVITY LOGS TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    feature TEXT NOT NULL,
    details TEXT,
    level TEXT NOT NULL DEFAULT 'info',
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_doc_requests_resident ON public.document_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_status ON public.document_requests(status);
CREATE INDEX IF NOT EXISTS idx_doc_requests_tracking ON public.document_requests(tracking_number);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function for checking admin/super_admin privileges
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;
CREATE POLICY "Allow public select on profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on profiles" ON public.profiles;
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin delete on profiles" ON public.profiles;
CREATE POLICY "Allow admin delete on profiles" ON public.profiles FOR DELETE USING (true);

-- Document Types Policies
DROP POLICY IF EXISTS "Doc Types Read All" ON public.document_types;
CREATE POLICY "Doc Types Read All" ON public.document_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Doc Types Manage All" ON public.document_types;
CREATE POLICY "Doc Types Manage All" ON public.document_types FOR ALL USING (true) WITH CHECK (true);

-- Document Requests Policies
DROP POLICY IF EXISTS "Document Requests Select All" ON public.document_requests;
CREATE POLICY "Document Requests Select All" ON public.document_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Document Requests Insert All" ON public.document_requests;
CREATE POLICY "Document Requests Insert All" ON public.document_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Document Requests Update All" ON public.document_requests;
CREATE POLICY "Document Requests Update All" ON public.document_requests FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Document Requests Delete All" ON public.document_requests;
CREATE POLICY "Document Requests Delete All" ON public.document_requests FOR DELETE USING (true);

-- Events Policies
DROP POLICY IF EXISTS "Events Read All" ON public.events;
CREATE POLICY "Events Read All" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Events Manage All" ON public.events;
CREATE POLICY "Events Manage All" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Notifications Select All" ON public.notifications;
CREATE POLICY "Notifications Select All" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Notifications Insert All" ON public.notifications;
CREATE POLICY "Notifications Insert All" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications Update All" ON public.notifications;
CREATE POLICY "Notifications Update All" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications Delete All" ON public.notifications;
CREATE POLICY "Notifications Delete All" ON public.notifications FOR DELETE USING (true);

-- System Config Policies
DROP POLICY IF EXISTS "Config Read All" ON public.system_config;
CREATE POLICY "Config Read All" ON public.system_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Config Manage All" ON public.system_config;
CREATE POLICY "Config Manage All" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- Activity Logs Policies
DROP POLICY IF EXISTS "Activity Logs Read All" ON public.activity_logs;
CREATE POLICY "Activity Logs Read All" ON public.activity_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Activity Logs Insert All" ON public.activity_logs;
CREATE POLICY "Activity Logs Insert All" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- 10. SEED DEFAULT DOCUMENT TYPES
INSERT INTO public.document_types (code, title, description, fee, processing_days, requirements, is_active)
VALUES
  ('BC-01', 'Barangay Clearance', 'Official certification for employment, postal ID, bank requirement, or local business clearance.', 50.00, 1, '["Valid Government-Issued ID", "Proof of Billing / Residency Verification", "1x1 or 2x2 Photo"]'::jsonb, true),
  ('CI-02', 'Certificate of Indigency', 'Free certification for medical assistance (DSWD/Malasakit), scholarship, public attorney, or hospital billing.', 0.00, 1, '["Barangay ID or Voter Certificate", "Certificate of Non-Filing / Low Income Statement"]'::jsonb, true),
  ('CR-03', 'Certificate of Residency', 'Proof of continuous residence within Barangay Zapatera for bank accounts, passport, school, or NBI.', 30.00, 1, '["Valid Government Photo ID", "Landlord Statement or Latest Utility Bill"]'::jsonb, true),
  ('BP-04', 'Barangay Business Permit', 'Local commercial permit required for operating businesses within Barangay Zapatera jurisdiction.', 250.00, 3, '["DTI / SEC Registration Certificate", "Commercial Space Lease Contract", "Fire Safety Inspection Certificate"]'::jsonb, true),
  ('GC-05', 'Certificate of Good Moral Character', 'Official attestation of good moral standing and clean barangay record for scholarships or employment.', 50.00, 1, '["Valid Government ID", "Barangay Records Clearance Check"]'::jsonb, true),
  ('BC-06', 'Barangay Blotter Certification', 'Official copy/certification of filed incident or blotter entry for legal and police purposes.', 100.00, 2, '["Complainant Government ID", "Incident Case Reference Number"]'::jsonb, true)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  fee = EXCLUDED.fee,
  processing_days = EXCLUDED.processing_days,
  requirements = EXCLUDED.requirements;
