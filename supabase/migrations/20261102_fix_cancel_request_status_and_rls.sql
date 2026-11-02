-- ============================================================================
-- MIGRATION: Fix Cancel Request 400 Error (Status Constraint & Resident RLS)
-- ============================================================================

-- 1. Ensure rejection_reason and notes columns exist on public.document_requests
ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Drop any restrictive status CHECK constraint on public.document_requests
DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.document_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

-- 3. Add an inclusive status CHECK constraint supporting declined & cancelled
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (
    LOWER(status) IN (
      'pending',
      'under_review',
      'processing',
      'approved',
      'ready_for_pickup',
      'issued',
      'completed',
      'declined',
      'rejected',
      'cancelled'
    )
  );

-- 4. Ensure Residents can UPDATE their own document_requests (Cancel / Resubmit)
DROP POLICY IF EXISTS "Residents can update own requests" ON public.document_requests;
CREATE POLICY "Residents can update own requests"
  ON public.document_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = resident_id)
  WITH CHECK (auth.uid() = resident_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
