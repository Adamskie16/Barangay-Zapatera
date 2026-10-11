-- ==============================================================================
-- Migration: 20261007_document_pickup_email_notifications.sql
-- Description: Supports automated transactional email notifications for document pickup,
--              audit logging table, and status tracking columns.
-- ==============================================================================

-- 1. Ensure public.document_requests has notification tracking columns
ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS email_notification_status TEXT DEFAULT 'pending';

-- 2. Create Transactional Email Audit Log Table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.document_requests(id) ON DELETE SET NULL,
    tracking_number TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'simulated'
    provider TEXT NOT NULL DEFAULT 'resend', -- 'resend', 'brevo', 'sendgrid', 'simulation'
    provider_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking ON public.email_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_requests_notified_at ON public.document_requests(notified_at);

-- 4. Enable Row Level Security on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Admins View Email Logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service Role Manage Email Logs" ON public.email_logs;

-- Policy: Admins & Superadmins can view email audit logs
CREATE POLICY "Admins View Email Logs"
ON public.email_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    )
);

-- Policy: Allow service role (Edge Functions) full insert and manage rights
CREATE POLICY "Service Role Manage Email Logs"
ON public.email_logs
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 5. Helpful Comments
COMMENT ON TABLE public.email_logs IS 'Audit ledger of all transactional document pickup emails dispatched by Supabase Edge Functions.';
COMMENT ON COLUMN public.document_requests.notified_at IS 'Timestamp when the resident was sent an official ready-for-pickup email notification.';
COMMENT ON COLUMN public.document_requests.email_notification_status IS 'Current status of the pickup email: pending, sent, failed, or simulated.';
