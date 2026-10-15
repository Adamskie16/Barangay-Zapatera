-- ==============================================================================
-- Migration: 20261015_add_archive_and_soft_delete_system.sql
-- Description: Centralized Archive & Trash Management Soft-Deletion Architecture
-- Adds is_archived, deleted_at, deleted_by to news, profiles, and document_requests.
-- ==============================================================================

-- 1. EXTEND PUBLIC.NEWS (Announcements & Bulletins)
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT NULL;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_news_is_archived ON public.news(is_archived);
CREATE INDEX IF NOT EXISTS idx_news_deleted_at ON public.news(deleted_at);
CREATE INDEX IF NOT EXISTS idx_news_expires_at ON public.news(expires_at);

-- 2. EXTEND PUBLIC.PROFILES (User Accounts)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_archived ON public.profiles(is_archived);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- 3. EXTEND PUBLIC.DOCUMENT_REQUESTS (Clearance & Permit Requests)
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_doc_requests_is_archived ON public.document_requests(is_archived);
CREATE INDEX IF NOT EXISTS idx_doc_requests_deleted_at ON public.document_requests(deleted_at);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR ARCHIVED DATA ACCESS
-- Only Admins and Superadmins have access to inspect and restore soft-deleted rows.

-- News table RLS update
DROP POLICY IF EXISTS "News Select Policy" ON public.news;
CREATE POLICY "News Select Policy" ON public.news
    FOR SELECT USING (
        is_archived = false
        OR (
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
            )
        )
    );

-- Profiles table RLS update
DROP POLICY IF EXISTS "Profiles Archive Read Policy" ON public.profiles;
CREATE POLICY "Profiles Archive Read Policy" ON public.profiles
    FOR SELECT USING (
        is_archived = false
        OR (
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
            )
        )
    );

-- Document Requests RLS update
DROP POLICY IF EXISTS "Document Requests Archive Read Policy" ON public.document_requests;
CREATE POLICY "Document Requests Archive Read Policy" ON public.document_requests
    FOR SELECT USING (
        is_archived = false
        OR (
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
            )
        )
    );

-- 5. POSTGRES HELPER FUNCTIONS FOR SOFT-DELETE & RESTORATION

-- Function to soft-delete an announcement
CREATE OR REPLACE FUNCTION public.archive_announcement(announcement_id UUID, actor_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.news
    SET is_archived = true,
        deleted_at = NOW(),
        deleted_by = actor_id
    WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an announcement
CREATE OR REPLACE FUNCTION public.restore_announcement(announcement_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.news
    SET is_archived = false,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft-delete a user profile
CREATE OR REPLACE FUNCTION public.archive_profile(target_user_id UUID, actor_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_archived = true,
        is_active = false,
        deleted_at = NOW(),
        deleted_by = actor_id
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a user profile
CREATE OR REPLACE FUNCTION public.restore_profile(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_archived = false,
        is_active = true,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft-delete an approved document request
CREATE OR REPLACE FUNCTION public.archive_document_request(request_id UUID, actor_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.document_requests
    SET is_archived = true,
        deleted_at = NOW(),
        deleted_by = actor_id
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an approved document request
CREATE OR REPLACE FUNCTION public.restore_document_request(request_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.document_requests
    SET is_archived = false,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
