-- ============================================================================
-- MIGRATION: Sync Document Fee with Processing Fee & Remove Zeroed Variable Fees
-- ============================================================================

-- 1. Ensure optional template & fee columns exist on public.document_types
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS is_variable_fee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validity_months INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS validity TEXT DEFAULT '6 Months from issuance',
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS template_title TEXT,
  ADD COLUMN IF NOT EXISTS template_body TEXT,
  ADD COLUMN IF NOT EXISTS doc_stamps NUMERIC(10, 2) DEFAULT 30.00;

-- 2. Ensure Business Permit / Business Clearance in document_types has its Processing Fee (₱500.00) when fee was 0
UPDATE public.document_types
SET fee = 500.00,
    updated_at = NOW()
WHERE (COALESCE(fee, 0) <= 0)
  AND (
    LOWER(COALESCE(title, '')) LIKE '%business%'
    OR LOWER(COALESCE(code, '')) LIKE '%bus%'
  );

-- 3. Sync existing document_requests.fee with the matching document_types.fee when request fee is 0
UPDATE public.document_requests dr
SET fee = dt.fee,
    updated_at = NOW()
FROM public.document_types dt
WHERE dr.document_type_id = dt.id
  AND COALESCE(dr.fee, 0) <= 0
  AND COALESCE(dt.fee, 0) > 0;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
