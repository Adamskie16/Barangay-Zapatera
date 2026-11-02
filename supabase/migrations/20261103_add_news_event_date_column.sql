-- ==============================================================================
-- Migration: 20261103_add_news_event_date_column.sql
-- Description:
-- 1. Ensures 'event_date' column exists on public.news (TIMESTAMPTZ NULL)
-- 2. Ensures public.events allows event_date TIMESTAMPTZ NULL
-- 3. Reloads PostgREST schema cache
-- ==============================================================================

-- 1. Ensure event_date exists on public.news
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ DEFAULT NULL;

-- 2. Allow event_date on public.events to be optional/nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'event_date' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.events ALTER COLUMN event_date DROP NOT NULL;
  END IF;
END $$;

-- 3. Create index for fast date querying on bulletin schedules
CREATE INDEX IF NOT EXISTS idx_news_event_date ON public.news(event_date);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
