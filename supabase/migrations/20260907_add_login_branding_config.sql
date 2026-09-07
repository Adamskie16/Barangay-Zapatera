-- Migration: Add Login Page Hero Design & Picture Customization columns to system_config
-- Allows SuperAdmin and Admin to upload hero pictures, change title, badge, and description for the split login page.

ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS login_bg_url TEXT DEFAULT '/auth-bg.jpg',
ADD COLUMN IF NOT EXISTS login_title TEXT DEFAULT 'Barangay Zapatera Portal',
ADD COLUMN IF NOT EXISTS login_badge TEXT DEFAULT 'Barangay Administration',
ADD COLUMN IF NOT EXISTS login_description TEXT DEFAULT 'Secure administrative access for managing resident records, document requests, event issuances, and community services.';

-- Ensure id = 1 row exists with defaults
INSERT INTO public.system_config (id, barangay_name, municipality, province, seal_url, login_bg_url, login_title, login_badge, login_description)
VALUES (
    1,
    'Barangay Zapatera',
    'Cebu City',
    'Cebu',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
    '/auth-bg.jpg',
    'Barangay Zapatera Portal',
    'Barangay Administration',
    'Secure administrative access for managing resident records, document requests, event issuances, and community services.'
)
ON CONFLICT (id) DO UPDATE SET
    login_bg_url = COALESCE(public.system_config.login_bg_url, EXCLUDED.login_bg_url),
    login_title = COALESCE(public.system_config.login_title, EXCLUDED.login_title),
    login_badge = COALESCE(public.system_config.login_badge, EXCLUDED.login_badge),
    login_description = COALESCE(public.system_config.login_description, EXCLUDED.login_description);
