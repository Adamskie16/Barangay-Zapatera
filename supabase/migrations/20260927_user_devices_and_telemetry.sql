-- =============================================================================
-- Migration: 20260927_user_devices_and_telemetry.sql
-- Description:
-- 1. Creates public.user_devices table for tracking login sessions and active devices.
-- 2. Adds telemetry and push token columns to public.profiles.
-- 3. Ensures dedicated 'avatars' storage bucket and robust RLS policies.
-- 4. Establishes RLS policies for user device session tracking and termination.
-- =============================================================================

-- 1. Telemetry and App Management columns on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT '1.0.0';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_os TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token_status TEXT DEFAULT 'unregistered';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"push": true, "sms": true, "email": true}'::jsonb;

-- 2. User Devices & Login Sessions Table
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_model TEXT,
    os_name TEXT,
    os_version TEXT,
    app_version TEXT DEFAULT '1.0.0',
    push_token TEXT,
    push_token_status TEXT DEFAULT 'active', -- 'active', 'denied', 'unregistered'
    is_active BOOLEAN NOT NULL DEFAULT true,
    ip_address TEXT DEFAULT '127.0.0.1',
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON public.user_devices(is_active);

-- Enable RLS on user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users Insert Own Devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users Update Own Devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users Delete Own Devices" ON public.user_devices;
DROP POLICY IF EXISTS "Admin Manage All Devices" ON public.user_devices;

-- SELECT: Users can read their own devices; Admins and Superadmins can read all
CREATE POLICY "Users Read Own Devices"
ON public.user_devices FOR SELECT
USING (
    auth.uid() = user_id 
    OR public.is_admin_or_superadmin(auth.uid()) 
    OR auth.uid() IS NULL
);

-- INSERT: Users can register/upsert their device sessions
CREATE POLICY "Users Insert Own Devices"
ON public.user_devices FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin_or_superadmin(auth.uid()) 
    OR auth.uid() IS NULL
);

-- UPDATE: Users can update their own device session; Admins & Superadmins can terminate sessions
CREATE POLICY "Users Update Own Devices"
ON public.user_devices FOR UPDATE
USING (
    auth.uid() = user_id 
    OR public.is_admin_or_superadmin(auth.uid()) 
    OR auth.uid() IS NULL
)
WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin_or_superadmin(auth.uid()) 
    OR auth.uid() IS NULL
);

-- DELETE: Users can remove devices; Admins can delete devices
CREATE POLICY "Users Delete Own Devices"
ON public.user_devices FOR DELETE
USING (
    auth.uid() = user_id 
    OR public.is_admin_or_superadmin(auth.uid())
);

-- 3. Dedicated 'avatars' Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for 'avatars' bucket
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Avatars" ON storage.objects;

CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users Upload Avatars"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users Update Avatars"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users Delete Avatars"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'avatars');
