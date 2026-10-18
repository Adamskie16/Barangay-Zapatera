-- ==============================================================================
-- MIGRATION: ADD VARIABLE PROCESSING FEE AND CLAIMED FEE COLLECTION TRACKING
-- File: supabase/migrations/20261019_add_variable_fee_and_claimed_fee.sql
-- Description:
--   1. Adds fee_type ('fixed' | 'variable') and is_variable_fee to public.document_types
--      to support document fees that depend upon claiming.
--   2. Adds claimed_fee, is_claimed, claimed_at, claimed_by_admin, and is_variable_fee
--      to public.document_requests so admins can input the total collected fee upon
--      document pickup, and reflect it in all document collections.
-- ==============================================================================

-- 1. UPDATE PUBLIC.DOCUMENT_TYPES
ALTER TABLE public.document_types 
ADD COLUMN IF NOT EXISTS fee_type TEXT NOT NULL DEFAULT 'fixed';

ALTER TABLE public.document_types 
ADD COLUMN IF NOT EXISTS is_variable_fee BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.document_types.fee_type IS 'Fee structure: fixed (standard amount) or variable (depends upon claim)';
COMMENT ON COLUMN public.document_types.is_variable_fee IS 'True if the document fee is variable and assessed upon release at barangay hall';

-- 2. UPDATE PUBLIC.DOCUMENT_REQUESTS
ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS claimed_by_admin TEXT DEFAULT NULL;

ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS claimed_fee NUMERIC(10, 2) DEFAULT NULL;

ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS is_variable_fee BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.document_requests.is_claimed IS 'Indicates whether the approved document has been officially claimed by the applicant';
COMMENT ON COLUMN public.document_requests.claimed_at IS 'Timestamp when the document was marked as claimed';
COMMENT ON COLUMN public.document_requests.claimed_by_admin IS 'Name/email of the barangay admin who processed the document release';
COMMENT ON COLUMN public.document_requests.claimed_fee IS 'Actual total fee collected by admin upon document claim (reflected in all fee collections)';
COMMENT ON COLUMN public.document_requests.is_variable_fee IS 'Flag copied from document type indicating variable fee upon claim';

-- 3. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_doc_requests_is_claimed ON public.document_requests(is_claimed);
CREATE INDEX IF NOT EXISTS idx_doc_requests_claimed_at ON public.document_requests(claimed_at);
CREATE INDEX IF NOT EXISTS idx_doc_types_fee_type ON public.document_types(fee_type);
