-- Migration: 20261003_realtime_news_and_notifications_sync.sql
-- Description: Ensures public.news and public.notifications are included in the supabase_realtime publication with REPLICA IDENTITY FULL for instant mobile push notifications.

-- 1. Ensure event_date exists on public.news
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;

-- 2. Ensure REPLICA IDENTITY FULL on public.news and public.notifications
ALTER TABLE public.news REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 3. Add public.news and public.notifications to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'news'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.news;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

COMMENT ON TABLE public.news IS 'Barangay bulletins and announcements broadcasted to resident mobile devices in real-time.';
COMMENT ON TABLE public.notifications IS 'Notifications dispatched to residents with real-time phone alerts.';
