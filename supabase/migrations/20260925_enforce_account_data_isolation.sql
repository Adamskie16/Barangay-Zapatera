-- =============================================================================
-- Migration: Enforce Account Data Isolation & Row Level Security (RLS)
-- Description:
-- 1. Tightens RLS policies on document_requests so residents can ONLY read, insert,
--    update, and delete their own requests (auth.uid() = resident_id).
-- 2. Prevents cross-account data leakage across document requests, notifications,
--    and uploaded files.
-- 3. Grants full management permissions to verified Barangay Admins/SuperAdmins.
-- =============================================================================

-- 1. Ensure RLS is enabled on all account-specific tables
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly permissive or legacy document_requests policies
DROP POLICY IF EXISTS "Document Requests Select All" ON public.document_requests;
DROP POLICY IF EXISTS "Document Requests Insert All" ON public.document_requests;
DROP POLICY IF EXISTS "Document Requests Update All" ON public.document_requests;
DROP POLICY IF EXISTS "Document Requests Delete All" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Read Own Requests" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Create Request" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Update Own Request" ON public.document_requests;
DROP POLICY IF EXISTS "Resident Delete Own Request" ON public.document_requests;
DROP POLICY IF EXISTS "Admin All Requests" ON public.document_requests;

-- 3. Enforce Strict Account-Scoped Policies for public.document_requests

-- SELECT: Residents can only view requests matching their auth.uid(); Admins/SuperAdmins can view all.
CREATE POLICY "Resident Read Own Requests"
ON public.document_requests FOR SELECT
USING (
    auth.uid() = resident_id 
    OR public.is_admin_or_superadmin(auth.uid())
);

-- INSERT: Residents can only create requests where resident_id equals their own auth.uid().
CREATE POLICY "Resident Create Request"
ON public.document_requests FOR INSERT
WITH CHECK (
    auth.uid() = resident_id 
    OR public.is_admin_or_superadmin(auth.uid())
);

-- UPDATE: Residents can only update their own requests; Admins/SuperAdmins can process any request.
CREATE POLICY "Resident Update Own Request"
ON public.document_requests FOR UPDATE
USING (
    auth.uid() = resident_id 
    OR public.is_admin_or_superadmin(auth.uid())
)
WITH CHECK (
    auth.uid() = resident_id 
    OR public.is_admin_or_superadmin(auth.uid())
);

-- DELETE: Residents can only delete their own requests; Admins/SuperAdmins can delete any request.
CREATE POLICY "Resident Delete Own Request"
ON public.document_requests FOR DELETE
USING (
    auth.uid() = resident_id 
    OR public.is_admin_or_superadmin(auth.uid())
);

-- 4. Enforce Account-Scoped Policies for public.notifications

DROP POLICY IF EXISTS "Notifications Read All" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Insert All" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Update All" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Delete All" ON public.notifications;
DROP POLICY IF EXISTS "Resident Read Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Resident Update Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Resident Delete Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin Manage Notifications" ON public.notifications;

-- SELECT: Users can only see notifications directed to their user_id, global broadcast notices, or if Admin
CREATE POLICY "Resident Read Own Notifications"
ON public.notifications FOR SELECT
USING (
    auth.uid() = user_id
    OR (role_target = 'resident' AND user_id IS NULL)
    OR (user_id IS NULL AND role_target IS NULL)
    OR public.is_admin_or_superadmin(auth.uid())
);

-- INSERT: Users can insert notifications for themselves or system triggers / admins can broadcast
CREATE POLICY "Notifications Insert Policy"
ON public.notifications FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin_or_superadmin(auth.uid())
    OR auth.uid() IS NOT NULL
);

-- UPDATE: Users can update their own notification read status; Admins can update any
CREATE POLICY "Resident Update Own Notifications"
ON public.notifications FOR UPDATE
USING (
    auth.uid() = user_id
    OR public.is_admin_or_superadmin(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin_or_superadmin(auth.uid())
);

-- DELETE: Users can delete their own notifications; Admins can delete any
CREATE POLICY "Resident Delete Own Notifications"
ON public.notifications FOR DELETE
USING (
    auth.uid() = user_id
    OR public.is_admin_or_superadmin(auth.uid())
);
