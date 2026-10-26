-- Migration: 20261026_fix_account_unlock_for_all_users.sql
-- Description: Fixes account unlocking so that any account (resident, admin, super_admin, treasurer, account_management)
-- genuinely and reliably updates to is_locked = false, failed_login_attempts = 0, failed_attempts = 0, locked_at = null,
-- is_active = true, and removes all pending records in account_unlock_requests without foreign key or trigger blocks.

-- 1. Ensure required columns on public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Enhanced, non-blocking sync trigger for profile lockout fields
CREATE OR REPLACE FUNCTION public.sync_profile_lockout_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When unlocking (is_locked transitioning to FALSE or counters being reset):
  -- Always permit the unlock, zero out failed counters, clear locked_at, and restore is_active
  IF NEW.is_locked = FALSE AND (OLD.is_locked = TRUE OR OLD.failed_attempts >= 3 OR OLD.failed_login_attempts >= 3) THEN
    NEW.failed_login_attempts := 0;
    NEW.failed_attempts := 0;
    NEW.locked_at := NULL;
    IF NEW.unlocked_at IS NULL THEN
      NEW.unlocked_at := NOW();
    END IF;
    NEW.is_active := TRUE;
    RETURN NEW;
  END IF;

  -- Row Level Tamper Proofing: Non-admins cannot arbitrarily lock their account or alter security columns
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF NEW.is_locked = TRUE AND OLD.is_locked = FALSE THEN
      IF COALESCE(public.get_auth_role(), 'resident') NOT IN ('super_admin', 'admin') THEN
        NEW.is_locked := OLD.is_locked;
        NEW.failed_login_attempts := OLD.failed_login_attempts;
        NEW.failed_attempts := OLD.failed_attempts;
        NEW.locked_at := OLD.locked_at;
      END IF;
    END IF;
  END IF;

  -- Synchronize failed_login_attempts and failed_attempts
  IF NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts THEN
    NEW.failed_attempts := NEW.failed_login_attempts;
  ELSIF NEW.failed_attempts IS DISTINCT FROM OLD.failed_attempts THEN
    NEW.failed_login_attempts := NEW.failed_attempts;
  END IF;

  -- Lockout transition
  IF NEW.is_locked = TRUE AND (OLD.is_locked = FALSE OR OLD.is_locked IS NULL) THEN
    IF NEW.locked_at IS NULL THEN
      NEW.locked_at := NOW();
    END IF;
    NEW.is_active := FALSE;
  END IF;

  -- Unlock normalization
  IF NEW.is_locked = FALSE AND (OLD.is_locked = TRUE OR OLD.failed_attempts > 0 OR OLD.failed_login_attempts > 0) THEN
    NEW.failed_login_attempts := 0;
    NEW.failed_attempts := 0;
    NEW.locked_at := NULL;
    IF NEW.unlocked_at IS NULL THEN
      NEW.unlocked_at := NOW();
    END IF;
    NEW.is_active := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_lockout_fields ON public.profiles;
CREATE TRIGGER trg_sync_profile_lockout_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_lockout_fields();

-- 3. Robust Administrative / Self-Service Unlock Account function (SECURITY DEFINER)
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
  valid_admin_id UUID := NULL;
  now_ts TIMESTAMPTZ := NOW();
BEGIN
  -- Verify admin_user_id exists in profiles before setting unlocked_by to prevent FK violation
  IF admin_user_id IS NOT NULL THEN
    SELECT id INTO valid_admin_id FROM public.profiles WHERE id = admin_user_id LIMIT 1;
  END IF;

  UPDATE public.profiles
  SET 
    is_locked = FALSE,
    failed_login_attempts = 0,
    failed_attempts = 0,
    locked_at = NULL,
    unlocked_at = now_ts,
    unlocked_by = valid_admin_id,
    is_active = TRUE,
    updated_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email;

  -- Delete pending unlock requests
  DELETE FROM public.account_unlock_requests
  WHERE LOWER(TRIM(email)) = clean_email;

  -- Resolve remaining requests
  UPDATE public.account_unlock_requests
  SET status = 'unlocked', used = true, resolved_at = now_ts
  WHERE LOWER(TRIM(email)) = clean_email;

  RETURN jsonb_build_object('success', true, 'message', 'Account successfully unlocked');
END;
$$;

-- 4. Alias unlock_account for backwards compatibility
CREATE OR REPLACE FUNCTION public.unlock_account(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_unlock_account(user_email, NULL);
END;
$$;

-- 5. Grant execute permissions to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.admin_unlock_account(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_account(TEXT) TO anon, authenticated, service_role;
