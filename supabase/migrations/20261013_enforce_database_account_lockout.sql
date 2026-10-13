-- Migration: 20261013_enforce_database_account_lockout.sql
-- Description: Adds failed_login_attempts, is_locked, locked_at, unlocked_at, unlocked_by to public.profiles.
-- Implements secure PostgreSQL SECURITY DEFINER functions for account lockout and administrative unlock.

-- 1. Ensure required columns on public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES public.profiles(id) DEFAULT NULL;

-- 2. Synchronize existing failed_attempts with failed_login_attempts
UPDATE public.profiles 
SET failed_login_attempts = failed_attempts
WHERE failed_login_attempts = 0 AND failed_attempts > 0;

UPDATE public.profiles 
SET failed_attempts = failed_login_attempts
WHERE failed_attempts = 0 AND failed_login_attempts > 0;

-- 3. Bi-directional sync trigger between failed_login_attempts and failed_attempts
CREATE OR REPLACE FUNCTION public.sync_profile_lockout_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Row Level Tamper Proofing: Non-admins cannot alter their own lockout/security columns directly
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF COALESCE(public.get_auth_role(), 'resident') NOT IN ('super_admin', 'admin') THEN
      NEW.is_locked := OLD.is_locked;
      NEW.failed_login_attempts := OLD.failed_login_attempts;
      NEW.failed_attempts := OLD.failed_attempts;
      NEW.locked_at := OLD.locked_at;
      NEW.unlocked_at := OLD.unlocked_at;
      NEW.unlocked_by := OLD.unlocked_by;
    END IF;
  END IF;

  IF NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts THEN
    NEW.failed_attempts := NEW.failed_login_attempts;
  ELSIF NEW.failed_attempts IS DISTINCT FROM OLD.failed_attempts THEN
    NEW.failed_login_attempts := NEW.failed_attempts;
  END IF;

  IF NEW.is_locked = TRUE AND (OLD.is_locked = FALSE OR OLD.is_locked IS NULL) THEN
    IF NEW.locked_at IS NULL THEN
      NEW.locked_at := NOW();
    END IF;
  END IF;

  IF NEW.is_locked = FALSE AND OLD.is_locked = TRUE THEN
    NEW.failed_login_attempts := 0;
    NEW.failed_attempts := 0;
    NEW.locked_at := NULL;
    IF NEW.unlocked_at IS NULL THEN
      NEW.unlocked_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_lockout_fields ON public.profiles;
CREATE TRIGGER trg_sync_profile_lockout_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_lockout_fields();

-- 4. Check account lockout status (SECURITY DEFINER - Never leak user existence)
CREATE OR REPLACE FUNCTION public.check_account_lockout(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(user_email));
  prof RECORD;
BEGIN
  SELECT id, is_locked, failed_login_attempts, failed_attempts, is_active, locked_at
  INTO prof
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = clean_email
  LIMIT 1;

  IF NOT FOUND THEN
    -- Return false to avoid leaking user existence
    RETURN jsonb_build_object('is_locked', false, 'locked_at', NULL);
  END IF;

  IF prof.is_locked = TRUE OR COALESCE(prof.failed_login_attempts, prof.failed_attempts, 0) >= 3 OR prof.is_active = FALSE THEN
    RETURN jsonb_build_object('is_locked', true, 'locked_at', prof.locked_at);
  END IF;

  RETURN jsonb_build_object('is_locked', false, 'locked_at', NULL);
END;
$$;

-- 5. Record failed login attempt (SECURITY DEFINER)
-- Increments failed_login_attempts. If >= 3, sets is_locked = TRUE and locked_at = NOW()
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(user_email));
  prof RECORD;
  new_count INT;
  is_now_locked BOOLEAN;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  SELECT id, failed_login_attempts, failed_attempts, is_locked, full_name, role
  INTO prof
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = clean_email
  LIMIT 1;

  IF NOT FOUND THEN
    -- Return generic response without leaking user non-existence
    RETURN jsonb_build_object('success', false, 'is_locked', false, 'attempts', 1);
  END IF;

  new_count := COALESCE(prof.failed_login_attempts, prof.failed_attempts, 0) + 1;
  is_now_locked := (new_count >= 3);

  UPDATE public.profiles
  SET 
    failed_login_attempts = new_count,
    failed_attempts = new_count,
    is_locked = is_now_locked,
    locked_at = CASE WHEN is_now_locked THEN now_ts ELSE prof.locked_at END,
    updated_at = now_ts
  WHERE id = prof.id;

  IF is_now_locked THEN
    INSERT INTO public.account_unlock_requests (
      user_id, email, full_name, role, status, failed_attempts, locked_at, created_at
    )
    VALUES (
      prof.id, clean_email, prof.full_name, prof.role::TEXT, 'pending', new_count, now_ts, now_ts
    )
    ON CONFLICT (email) DO UPDATE 
    SET 
      status = 'pending',
      failed_attempts = new_count,
      locked_at = now_ts,
      created_at = now_ts;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_locked', is_now_locked,
    'attempts', new_count,
    'remaining', GREATEST(0, 3 - new_count)
  );
END;
$$;

-- 6. Reset account lockout on successful login (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reset_account_lockout(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(user_email));
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.profiles
  SET 
    failed_login_attempts = 0,
    failed_attempts = 0,
    updated_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email AND is_locked = FALSE;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Administrative Unlock Account (SECURITY DEFINER)
-- Sets is_locked = FALSE, failed_login_attempts = 0, unlocked_at = NOW(), unlocked_by = admin_id
CREATE OR REPLACE FUNCTION public.admin_unlock_account(
  target_user_email TEXT,
  admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(target_user_email));
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.profiles
  SET 
    is_locked = FALSE,
    failed_login_attempts = 0,
    failed_attempts = 0,
    locked_at = NULL,
    unlocked_at = now_ts,
    unlocked_by = admin_user_id,
    is_active = TRUE,
    updated_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email;

  -- Remove or resolve pending unlock requests
  DELETE FROM public.account_unlock_requests
  WHERE LOWER(TRIM(email)) = clean_email;

  RETURN jsonb_build_object('success', true, 'message', 'Account successfully unlocked');
END;
$$;

-- 8. Administrative Lock Account (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_lock_account(
  target_user_email TEXT,
  admin_user_id UUID DEFAULT NULL,
  lock_reason TEXT DEFAULT 'Manual Admin Lockout'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := LOWER(TRIM(target_user_email));
  prof RECORD;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  SELECT id, full_name, role INTO prof FROM public.profiles WHERE LOWER(TRIM(email)) = clean_email LIMIT 1;
  
  UPDATE public.profiles
  SET 
    is_locked = TRUE,
    failed_login_attempts = 3,
    failed_attempts = 3,
    locked_at = now_ts,
    is_active = FALSE,
    updated_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email;

  IF FOUND AND prof.id IS NOT NULL THEN
    INSERT INTO public.account_unlock_requests (
      user_id, email, full_name, role, status, failed_attempts, locked_at, created_at
    )
    VALUES (
      prof.id, clean_email, prof.full_name, prof.role::TEXT, 'pending', 3, now_ts, now_ts
    )
    ON CONFLICT (email) DO UPDATE 
    SET status = 'pending', failed_attempts = 3, locked_at = now_ts;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Account successfully locked');
END;
$$;

-- 9. Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.check_account_lockout(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_account_lockout(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlock_account(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_lock_account(TEXT, UUID, TEXT) TO anon, authenticated, service_role;
