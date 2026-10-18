-- ==============================================================================
-- Migration: 20261019_add_archive_to_activity_logs.sql
-- Description: Adds soft-delete and archive functionality to public.activity_logs
-- Supports forward-to-archive, restore, and permanent purge from SuperAdmin Archive & Trash
-- ==============================================================================

-- 1. EXTEND PUBLIC.ACTIVITY_LOGS
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_is_archived ON public.activity_logs(is_archived);
CREATE INDEX IF NOT EXISTS idx_activity_logs_deleted_at ON public.activity_logs(deleted_at);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. SELECT POLICY
DROP POLICY IF EXISTS "Activity Logs Select Policy" ON public.activity_logs;
CREATE POLICY "Activity Logs Select Policy" ON public.activity_logs
    FOR SELECT USING (
        is_archived = false
        OR auth.uid() IS NOT NULL
    );

-- 4. UPDATE POLICY (Allows soft-deleting and restoring logs)
DROP POLICY IF EXISTS "Activity Logs Update Policy" ON public.activity_logs;
CREATE POLICY "Activity Logs Update Policy" ON public.activity_logs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );

-- 5. DELETE POLICY (Allows permanent purge from Archive & Trash)
DROP POLICY IF EXISTS "Activity Logs Delete Policy" ON public.activity_logs;
CREATE POLICY "Activity Logs Delete Policy" ON public.activity_logs
    FOR DELETE USING (
        auth.uid() IS NOT NULL
    );

-- 6. POSTGRES HELPER FUNCTIONS FOR ACTIVITY LOG SOFT-DELETE & RESTORATION

CREATE OR REPLACE FUNCTION public.archive_activity_log(p_log_id UUID, p_actor_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.activity_logs
    SET is_archived = true,
        deleted_at = NOW(),
        deleted_by = p_actor_id
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.restore_activity_log(p_log_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.activity_logs
    SET is_archived = false,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
