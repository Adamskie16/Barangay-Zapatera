-- ==============================================================================
-- Migration: Ensure system_config and profiles.birth_date for Document Generator
-- Run this in the Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure birth_date column exists in public.profiles
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Ensure template and fee columns exist in public.document_types
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'fixed';
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS is_variable_fee BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'standard';
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS template_title TEXT;
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS template_body TEXT;
ALTER TABLE IF EXISTS public.document_types ADD COLUMN IF NOT EXISTS doc_stamps NUMERIC(10, 2) DEFAULT 30.00;

-- 3. Create or update system_config table for official signatory and barangay metadata
CREATE TABLE IF NOT EXISTS public.system_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  barangay_name TEXT DEFAULT 'Barangay Zapatera',
  municipality TEXT DEFAULT 'Cebu City',
  province TEXT DEFAULT 'Cebu',
  punong_barangay TEXT DEFAULT 'HON. DAVID M. AGRAVANTE',
  signatory_title TEXT DEFAULT 'Punong Barangay',
  seal_url TEXT DEFAULT '/logo.png',
  hall_address TEXT DEFAULT '197 D. Jakosalem St., Cebu City',
  office_hours TEXT DEFAULT 'Mon - Fri: 8:00 AM - 5:00 PM',
  contact_email TEXT DEFAULT 'zapatera.lnb24@gmail.com',
  contact_phone TEXT DEFAULT '(032)503-6465',
  doc_prefix TEXT DEFAULT 'BRGY-2026',
  auto_notify BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist in system_config if table was created previously
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS punong_barangay TEXT DEFAULT 'HON. DAVID M. AGRAVANTE';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS signatory_title TEXT DEFAULT 'Punong Barangay';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS barangay_name TEXT DEFAULT 'Barangay Zapatera';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS municipality TEXT DEFAULT 'Cebu City';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'Cebu';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS hall_address TEXT DEFAULT '197 D. Jakosalem St., Cebu City';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS office_hours TEXT DEFAULT 'Mon - Fri: 8:00 AM - 5:00 PM';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'zapatera.lnb24@gmail.com';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '(032)503-6465';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS seal_url TEXT DEFAULT '/logo.png';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS doc_prefix TEXT DEFAULT 'BRGY-2026';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS auto_notify BOOLEAN DEFAULT true;
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Upsert default configuration row (id = 1) if not already present
INSERT INTO public.system_config (
  id,
  barangay_name,
  municipality,
  province,
  punong_barangay,
  signatory_title,
  hall_address,
  office_hours,
  contact_email,
  contact_phone,
  seal_url,
  doc_prefix,
  auto_notify,
  updated_at
) VALUES (
  1,
  'Barangay Zapatera',
  'Cebu City',
  'Cebu',
  'HON. DAVID M. AGRAVANTE',
  'Punong Barangay',
  '197 D. Jakosalem St., Cebu City',
  'Mon - Fri: 8:00 AM - 5:00 PM',
  'zapatera.lnb24@gmail.com',
  '(032)503-6465',
  '/logo.png',
  'BRGY-2026',
  true,
  now()
) ON CONFLICT (id) DO UPDATE SET
  punong_barangay = COALESCE(public.system_config.punong_barangay, EXCLUDED.punong_barangay),
  signatory_title = COALESCE(public.system_config.signatory_title, EXCLUDED.signatory_title),
  updated_at = now();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/authenticated) to read system configurations (for certificates, headers, info)
DROP POLICY IF EXISTS "Allow public read system_config" ON public.system_config;
CREATE POLICY "Allow public read system_config"
  ON public.system_config
  FOR SELECT
  USING (true);

-- Allow authenticated users with admin/superadmin roles to update system configurations
DROP POLICY IF EXISTS "Allow authenticated admin upsert system_config" ON public.system_config;
CREATE POLICY "Allow authenticated admin upsert system_config"
  ON public.system_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

