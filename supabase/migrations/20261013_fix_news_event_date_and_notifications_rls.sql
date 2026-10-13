-- ==============================================================================
-- Migration: 20261013_fix_news_event_date_and_notifications_rls.sql
-- Description:
-- 1. Adds 'event_date' column to public.news if missing to prevent 400 Bad Request
-- 2. Ensures public.news has full CRUD RLS policies
-- 3. Ensures public.notifications has clean insert/select policies for broadcasts
-- 4. Reloads PostgREST schema cache
-- ==============================================================================

-- 1. Ensure event_date exists on public.news
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;

-- 2. Ensure public.news RLS policies allow reading and admin publishing
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "News Read All" ON public.news;
CREATE POLICY "News Read All" ON public.news FOR SELECT USING (true);

DROP POLICY IF EXISTS "News Insert All" ON public.news;
CREATE POLICY "News Insert All" ON public.news FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "News Update All" ON public.news;
CREATE POLICY "News Update All" ON public.news FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "News Delete All" ON public.news;
CREATE POLICY "News Delete All" ON public.news FOR DELETE USING (true);

-- 3. Ensure public.notifications has clean policies for system/admin broadcast inserts
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications Select All" ON public.notifications;
CREATE POLICY "Notifications Select All" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Notifications Insert All" ON public.notifications;
CREATE POLICY "Notifications Insert All" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications Update All" ON public.notifications;
CREATE POLICY "Notifications Update All" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications Delete All" ON public.notifications;
CREATE POLICY "Notifications Delete All" ON public.notifications FOR DELETE USING (true);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
