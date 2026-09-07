-- Migration: 20260907_create_news_table.sql
-- Description: Creates public.news table for Barangay Zapatera Bulletins, Advisories, and News Announcements.

CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Public Advisory', -- 'Emergency', 'Public Advisory', 'Government Services', 'Community', 'Events', 'Maintenance'
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    banner_url TEXT,
    location TEXT DEFAULT 'Barangay Zapatera, Cebu City',
    author TEXT DEFAULT 'Barangay Administration',
    is_important BOOLEAN NOT NULL DEFAULT false,
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT true,
    target_audience TEXT NOT NULL DEFAULT 'residents', -- 'all', 'residents', 'admins'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick searching and sorting
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);
CREATE INDEX IF NOT EXISTS idx_news_is_emergency ON public.news(is_emergency);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "News Read All" ON public.news;
CREATE POLICY "News Read All" ON public.news FOR SELECT USING (true);

DROP POLICY IF EXISTS "News Insert All" ON public.news;
CREATE POLICY "News Insert All" ON public.news FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "News Update All" ON public.news;
CREATE POLICY "News Update All" ON public.news FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "News Delete All" ON public.news;
CREATE POLICY "News Delete All" ON public.news FOR DELETE USING (true);
