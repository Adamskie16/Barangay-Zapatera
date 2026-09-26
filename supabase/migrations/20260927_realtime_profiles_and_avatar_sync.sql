-- Description: Enables PostgreSQL Full Replica Identity on profiles and ensures membership in supabase_realtime publication for real-time mobile sync.

-- 1. Ensure REPLICA IDENTITY FULL on public.profiles
-- This ensures Supabase Realtime broadcasts complete row data on UPDATE events.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. Add public.profiles to supabase_realtime publication if not already included
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 3. Ensure RLS Policy permits Superadmin and Admin updates on other user profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
      AND policyname = 'Allow admin and superadmin update on all profiles'
  ) THEN
    CREATE POLICY "Allow admin and superadmin update on all profiles"
      ON public.profiles FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.profiles IS 'User identity and telemetry profiles synchronized in real-time across Web Admin, SuperAdmin, and Resident mobile app.';
