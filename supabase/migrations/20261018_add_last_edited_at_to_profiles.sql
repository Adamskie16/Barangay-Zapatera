-- Migration: Add last_edited_at to public.profiles
-- Enables explicit tracking of account profile edits separate from registered date (created_at)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_edited_at IS 'Timestamp of the latest account profile edit';
