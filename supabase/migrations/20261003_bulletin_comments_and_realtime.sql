-- Migration: 20261003_bulletin_comments_and_realtime.sql
-- Description: Real-time comments and threaded official replies on published announcements for Resident, Admin, and SuperAdmin

-- 1. Create bulletin_comments table
CREATE TABLE IF NOT EXISTS public.bulletin_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id TEXT NOT NULL,
    author_id TEXT,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'resident', -- 'resident', 'admin', 'super_admin'
    author_avatar TEXT,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.bulletin_comments(id) ON DELETE CASCADE,
    reply_to_name TEXT,
    is_official_response BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast real-time queries and threaded rendering
CREATE INDEX IF NOT EXISTS idx_bulletin_comments_news_id ON public.bulletin_comments(news_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_bulletin_comments_parent_id ON public.bulletin_comments(parent_id);

-- 3. Enable REPLICA IDENTITY FULL for instant realtime diffs
ALTER TABLE public.bulletin_comments REPLICA IDENTITY FULL;

-- 4. Add to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'bulletin_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bulletin_comments;
  END IF;
END $$;

-- 5. Row-level security (RLS)
ALTER TABLE public.bulletin_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to bulletin comments" ON public.bulletin_comments;
CREATE POLICY "Allow public read access to bulletin comments"
    ON public.bulletin_comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert to bulletin comments" ON public.bulletin_comments;
CREATE POLICY "Allow insert to bulletin comments"
    ON public.bulletin_comments FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update to bulletin comments" ON public.bulletin_comments;
CREATE POLICY "Allow update to bulletin comments"
    ON public.bulletin_comments FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete to bulletin comments" ON public.bulletin_comments;
CREATE POLICY "Allow delete to bulletin comments"
    ON public.bulletin_comments FOR DELETE
    USING (true);

COMMENT ON TABLE public.bulletin_comments IS 'Real-time resident inquiries and official admin responses on published bulletins.';

-- 6. Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
