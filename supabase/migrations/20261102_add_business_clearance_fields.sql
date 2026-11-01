-- Migration: 20261102_add_business_clearance_fields.sql
-- Description: Adds business clearance official entity variables and fee assessment columns to document_requests table

DO $$
BEGIN
  -- 1. Commercial & Business Entity Variables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'business_name') THEN
    ALTER TABLE public.document_requests ADD COLUMN business_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'permittee_name') THEN
    ALTER TABLE public.document_requests ADD COLUMN permittee_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'business_address') THEN
    ALTER TABLE public.document_requests ADD COLUMN business_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'nature_of_business') THEN
    ALTER TABLE public.document_requests ADD COLUMN nature_of_business TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'contact_number') THEN
    ALTER TABLE public.document_requests ADD COLUMN contact_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'capital_invested') THEN
    ALTER TABLE public.document_requests ADD COLUMN capital_invested TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'gross_sales') THEN
    ALTER TABLE public.document_requests ADD COLUMN gross_sales TEXT;
  END IF;

  -- 2. Fee Assessment & Official Receipt (O.R.) Columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'or_number') THEN
    ALTER TABLE public.document_requests ADD COLUMN or_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'doc_stamps') THEN
    ALTER TABLE public.document_requests ADD COLUMN doc_stamps NUMERIC DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'fee_assessed') THEN
    ALTER TABLE public.document_requests ADD COLUMN fee_assessed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_requests' AND column_name = 'claimed_fee') THEN
    ALTER TABLE public.document_requests ADD COLUMN claimed_fee NUMERIC;
  END IF;

END $$;
