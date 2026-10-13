-- ============================================================================
-- Migration: Enable Treasurer Payment Collections and Official Receipts
-- Barangay Zapatera Digital Information Management System
-- ============================================================================

-- 1. Ensure all payment columns exist on public.document_requests
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS or_number TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS waived_reason TEXT;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS is_waived BOOLEAN DEFAULT false;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS amount_paid NUMERIC;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS treasurer_notes TEXT;

-- 2. Allow treasurer to UPDATE document requests (for recording payments, OR, fee updates)
DROP POLICY IF EXISTS "treasurer_update_document_payments" ON public.document_requests;
CREATE POLICY "treasurer_update_document_payments"
ON public.document_requests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role::text IN ('treasurer', 'admin', 'super_admin', 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role::text IN ('treasurer', 'admin', 'super_admin', 'superadmin')
    )
);

-- 3. Ensure profiles role check allows treasurer
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role::text IN ('super_admin', 'superadmin', 'admin', 'resident', 'treasurer', 'accountmanagement', 'staff'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
