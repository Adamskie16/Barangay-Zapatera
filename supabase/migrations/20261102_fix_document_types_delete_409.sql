-- Migration: 20261102_fix_document_types_delete_409.sql
-- Description:
--   Fixes HTTP 409 (Conflict) when deleting a row from public.document_types
--   by making document_requests.document_type_id nullable with ON DELETE SET NULL,
--   preserving historical document_title values via a BEFORE DELETE trigger,
--   and providing a safe_delete_document_type() RPC function.

-- 1. Ensure document_requests has a document_title column to preserve historical certificate names
ALTER TABLE public.document_requests
ADD COLUMN IF NOT EXISTS document_title TEXT;

-- Backfill document_title from document_types where currently null
UPDATE public.document_requests r
SET document_title = dt.title
FROM public.document_types dt
WHERE r.document_type_id = dt.id
  AND (r.document_title IS NULL OR LENGTH(TRIM(r.document_title)) = 0);

-- 2. Allow document_type_id to be NULL when a catalog document type is deleted
ALTER TABLE public.document_requests
ALTER COLUMN document_type_id DROP NOT NULL;

-- 3. Drop any existing restrictive foreign key constraint on document_requests.document_type_id
--    and replace it with ON DELETE SET NULL
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    FOR v_constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'document_requests'
          AND kcu.column_name = 'document_type_id'
    LOOP
        EXECUTE format('ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.document_requests
ADD CONSTRAINT document_requests_document_type_id_fkey
FOREIGN KEY (document_type_id)
REFERENCES public.document_types(id)
ON DELETE SET NULL;

-- 4. Create a BEFORE DELETE trigger on public.document_types so that deleting a document type
--    automatically preserves its title on existing document_requests and detaches the FK
CREATE OR REPLACE FUNCTION public.fn_before_delete_document_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.document_requests
    SET document_title = COALESCE(NULLIF(TRIM(document_title), ''), OLD.title),
        document_type_id = NULL,
        updated_at = NOW()
    WHERE document_type_id = OLD.id;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_before_delete_document_type ON public.document_types;
CREATE TRIGGER trg_before_delete_document_type
BEFORE DELETE ON public.document_types
FOR EACH ROW
EXECUTE FUNCTION public.fn_before_delete_document_type();

-- 5. Create an RPC helper to safely delete a document type by ID or code without 409 conflicts
DROP FUNCTION IF EXISTS public.safe_delete_document_type(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.safe_delete_document_type(
    p_doc_type_id UUID DEFAULT NULL,
    p_doc_code    TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_id    UUID;
    v_target_title TEXT;
BEGIN
    IF p_doc_type_id IS NOT NULL THEN
        SELECT id, title INTO v_target_id, v_target_title
        FROM public.document_types
        WHERE id = p_doc_type_id
        LIMIT 1;
    END IF;

    IF v_target_id IS NULL AND p_doc_code IS NOT NULL AND LENGTH(TRIM(p_doc_code)) > 0 THEN
        SELECT id, title INTO v_target_id, v_target_title
        FROM public.document_types
        WHERE LOWER(TRIM(code)) = LOWER(TRIM(p_doc_code))
        LIMIT 1;
    END IF;

    IF v_target_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Preserve document_title and nullify FK on any referencing requests
    UPDATE public.document_requests
    SET document_title = COALESCE(NULLIF(TRIM(document_title), ''), v_target_title),
        document_type_id = NULL,
        updated_at = NOW()
    WHERE document_type_id = v_target_id;

    -- Delete the document type
    DELETE FROM public.document_types
    WHERE id = v_target_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_document_type(UUID, TEXT) TO anon, authenticated, service_role;

