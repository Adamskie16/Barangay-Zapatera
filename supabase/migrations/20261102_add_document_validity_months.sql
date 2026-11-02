-- ============================================================================
-- MIGRATION: Add Validity Period (Months) to Document Service Catalog
-- Target Table: public.document_types
-- Purpose: Allows SuperAdmin & Admin to configure how many months a certificate
--          or clearance is valid upon issuance, and displays it on Resident Portal.
-- ============================================================================

BEGIN;

-- 1. Add validity_months and validity columns to public.document_types
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS validity_months INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS validity TEXT NOT NULL DEFAULT '6 Months from issuance';

-- 2. Backfill existing rows so validity_months and validity text are consistent
UPDATE public.document_types
SET
  validity_months = COALESCE(
    NULLIF(validity_months, 0),
    NULLIF(regexp_replace(COALESCE(validity, ''), '[^0-9]', '', 'g'), '')::INTEGER,
    6
  ),
  validity = CASE
    WHEN COALESCE(
      NULLIF(validity_months, 0),
      NULLIF(regexp_replace(COALESCE(validity, ''), '[^0-9]', '', 'g'), '')::INTEGER,
      6
    ) = 1 THEN '1 Month from issuance'
    ELSE COALESCE(
      NULLIF(validity_months, 0),
      NULLIF(regexp_replace(COALESCE(validity, ''), '[^0-9]', '', 'g'), '')::INTEGER,
      6
    )::TEXT || ' Months from issuance'
  END;

-- 3. Trigger function to automatically keep validity_months and validity text in sync
CREATE OR REPLACE FUNCTION public.fn_sync_document_type_validity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_months INTEGER;
BEGIN
  v_months := COALESCE(
    NULLIF(NEW.validity_months, 0),
    NULLIF(regexp_replace(COALESCE(NEW.validity, ''), '[^0-9]', '', 'g'), '')::INTEGER,
    6
  );

  IF v_months < 1 THEN
    v_months := 1;
  END IF;

  NEW.validity_months := v_months;
  NEW.validity := CASE
    WHEN v_months = 1 THEN '1 Month from issuance'
    ELSE v_months::TEXT || ' Months from issuance'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_document_type_validity ON public.document_types;
CREATE TRIGGER trg_sync_document_type_validity
  BEFORE INSERT OR UPDATE ON public.document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_document_type_validity();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

