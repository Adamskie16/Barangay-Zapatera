-- Migration: 20260907_create_login_designs_cms.sql
-- Description: Creates public.login_designs table for the Login Design Content Management System (CMS)

CREATE TABLE IF NOT EXISTS public.login_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    badge TEXT DEFAULT 'Barangay Administration',
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_portal TEXT NOT NULL DEFAULT 'all', -- 'all', 'super_admin', 'admin'
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick query
CREATE INDEX IF NOT EXISTS idx_login_designs_is_active ON public.login_designs(is_active);
CREATE INDEX IF NOT EXISTS idx_login_designs_target ON public.login_designs(target_portal);
CREATE INDEX IF NOT EXISTS idx_login_designs_created_at ON public.login_designs(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.login_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Login Designs Read All" ON public.login_designs;
CREATE POLICY "Login Designs Read All" ON public.login_designs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Login Designs Insert All" ON public.login_designs;
CREATE POLICY "Login Designs Insert All" ON public.login_designs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Login Designs Update All" ON public.login_designs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Login Designs Delete All" ON public.login_designs FOR DELETE USING (true);

-- Seed Initial Default Login Designs if empty
INSERT INTO public.login_designs (id, title, badge, description, image_url, target_portal, is_active)
VALUES 
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Barangay Zapatera Executive Portal',
    'Executive Administration',
    'Restricted executive interface for complete system governance, administrative user provisioning, and secure document records.',
    '/auth-bg.jpg',
    'all',
    true
),
(
    'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
    'Barangay Zapatera Administrative Management',
    'Barangay Administration',
    'Secure administrative access for managing resident records, document requests, event issuances, and community services.',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&q=80',
    'admin',
    false
)
ON CONFLICT (id) DO NOTHING;
