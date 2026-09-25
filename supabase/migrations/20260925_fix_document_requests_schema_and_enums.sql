-- ==============================================================================
-- SUPABASE MIGRATION: Fix Document Requests Schema, Enums, and Columns
-- Ensures smooth Admin processing, Review & Verification, and Resident Tracking
-- ==============================================================================

-- 1. Ensure all lifecycle and resident tracking columns exist on public.document_requests
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS years_in_barangay INTEGER DEFAULT 0;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS resident_name TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS resident_phone TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS resident_address TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS resident_birth_date DATE;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS civil_status TEXT DEFAULT 'Single';

-- 2. Ensure lifecycle timestamp & decline reason columns exist
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;

-- 3. Ensure profiles table has years_in_barangay
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_in_barangay INTEGER DEFAULT 0;

-- 4. Convert status column to TEXT with check constraint or update enum to prevent 400 Bad Request
DO $$
BEGIN
    -- If status is using an enum that lacks values, alter column type to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_requests' 
          AND column_name = 'status' 
          AND data_type = 'USER-DEFINED'
    ) THEN
        ALTER TABLE public.document_requests ALTER COLUMN status TYPE TEXT;
    END IF;
END $$;

-- 5. Add clean check constraint for valid document request statuses
ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS doc_requests_status_check;
ALTER TABLE public.document_requests ADD CONSTRAINT doc_requests_status_check 
    CHECK (status IN ('pending', 'under_review', 'processing', 'approved', 'ready_for_pickup', 'completed', 'issued', 'declined', 'rejected'));

-- 6. Add performance indexes for real-time tracking
CREATE INDEX IF NOT EXISTS idx_doc_requests_resident_status ON public.document_requests(resident_id, status);
CREATE INDEX IF NOT EXISTS idx_doc_requests_tracking_num ON public.document_requests(tracking_number);

-- 7. Grant proper permissions
GRANT ALL ON public.document_requests TO authenticated;
GRANT ALL ON public.document_requests TO service_role;
