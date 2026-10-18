-- Migration: 20261019_add_resubmission_tracking.sql
-- Enables resident request resubmission workflow after decline
-- Mutates the existing request and resets status back to 'pending'

ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS is_resubmitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resubmission_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS previous_decline_reason TEXT DEFAULT NULL;

-- Comment for schema documentation
COMMENT ON COLUMN public.document_requests.is_resubmitted IS 'True if resident resubmitted this request after being declined';
COMMENT ON COLUMN public.document_requests.resubmitted_at IS 'Timestamp of the latest resident resubmission';
COMMENT ON COLUMN public.document_requests.resubmission_count IS 'Total number of times this request was resubmitted';
COMMENT ON COLUMN public.document_requests.resubmission_notes IS 'Compliance explanation or notes provided by resident upon resubmission';
COMMENT ON COLUMN public.document_requests.previous_decline_reason IS 'The reason why this request was previously declined by staff';

-- Ensure Realtime publication includes document_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'document_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
  END IF;
END $$;
