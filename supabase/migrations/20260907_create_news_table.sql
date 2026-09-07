-- Migration: 20260907_create_news_table.sql
-- Description: Creates public.news table for Barangay Zapatera Bulletins, Advisories, and News Announcements.

CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Public Advisory', -- 'Emergency', 'Public Advisory', 'Government Services', 'Community', 'Events', 'Maintenance'
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    banner_url TEXT,
    location TEXT DEFAULT 'Barangay Zapatera, Cebu City',
    author TEXT DEFAULT 'Barangay Administration',
    is_important BOOLEAN NOT NULL DEFAULT false,
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT true,
    target_audience TEXT NOT NULL DEFAULT 'residents', -- 'all', 'residents', 'admins'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick searching and sorting
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);
CREATE INDEX IF NOT EXISTS idx_news_is_emergency ON public.news(is_emergency);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "News Read All" ON public.news;
CREATE POLICY "News Read All" ON public.news FOR SELECT USING (true);

DROP POLICY IF EXISTS "News Insert All" ON public.news;
CREATE POLICY "News Insert All" ON public.news FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "News Update All" ON public.news;
CREATE POLICY "News Update All" ON public.news FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "News Delete All" ON public.news;
CREATE POLICY "News Delete All" ON public.news FOR DELETE USING (true);

-- Seed Initial News Bulletins
INSERT INTO public.news (title, category, description, content, banner_url, location, author, is_important, is_emergency, is_published, target_audience)
VALUES
  (
    'FREE Medical, Dental Mission & Health Clearance Day',
    'Public Advisory',
    'Barangay Zapatera Health Center will conduct free medical consultations, dental extractions, and health certificates at the Barangay Gym.',
    'The Barangay Council of Zapatera, in partnership with Cebu City Health Department, cordially invites all registered residents to the Annual Community Health & Wellness Caravan.\n\nServices Offered:\n• Free Doctor Consultations & Prescription Medicines\n• Free Dental Checkup & Tooth Extraction (Limited to first 100 residents)\n• Blood Pressure & Blood Sugar Screening\n• Free Barangay Health Clearance for Students & Senior Citizens\n• Flu Vaccinations for Elderly (60 years old and above)\n\nLocation: Barangay Zapatera Multi-Purpose Gymnasium\nDate & Time: Friday, September 12, 2026 | 8:00 AM – 3:00 PM\nPlease bring your Barangay ID or valid ID showing Zapatera residency.',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    'Barangay Zapatera Gymnasium',
    'Committee on Health & Sanitation',
    true,
    false,
    true,
    'residents'
  ),
  (
    'URGENT: Scheduled Power Interruption Advisory (Sept 9, 2026)',
    'Maintenance',
    'VECO scheduled maintenance and pole relocation along Rahmann Street and Sitio San Roque from 8:00 AM to 1:00 PM.',
    'Visayan Electric Company (VECO) has notified the Barangay Administration regarding scheduled preventive maintenance and transformer replacement along Rahmann St., Sitio San Roque, and Sitio Riverside.\n\nAffected Areas:\n1. Rahmann Street (entire stretch)\n2. Sitio San Roque\n3. Sitio Riverside near Creek Area\n\nBarangay Hall operations will remain functional through generator power for document pickups and emergency services. Residents are advised to charge essential devices beforehand.',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
    'Sitio San Roque & Rahmann St.',
    'Barangay Emergency Operations Center',
    false,
    true,
    true,
    'all'
  ),
  (
    'Digital Document Portal Release: Online 30-Minute Appointments',
    'Government Services',
    'Residents can now request clearances and certificates online and schedule express pickup times without waiting in queue.',
    'Welcome to the newly launched Barangay Zapatera Resident Digital Portal!\n\nUnder Resolution No. 2026-48, the Barangay Council has implemented a modern digital document system to speed up government transactions.\n\nKey Features:\n• File document requests 24/7 from your phone or computer.\n• Choose exact 30-minute appointment intervals for express collection.\n• Real-time SMS and email tracking updates.\n• Zero queuing at the Barangay Hall lobby.\n\nFor technical assistance or feedback, visit the Barangay Help Desk or email zapatera.cebucity@gmail.com.',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80',
    'Barangay Zapatera Portal',
    'Office of the Barangay Captain',
    true,
    false,
    true,
    'residents'
  ),
  (
    'Youth Sports Fest & Inter-Sitio Basketball Tournament',
    'Events',
    'Annual Sangguniang Kabataan (SK) Inter-Sitio Basketball & Volleyball League opens this coming September 20 at the Barangay Complex.',
    'The Sangguniang Kabataan of Barangay Zapatera is pleased to announce the opening of the 2026 Inter-Sitio Youth Sports Fest.\n\nTournament Divisions:\n• Juniors Basketball (15–18 yrs old)\n• Seniors Basketball (19–25 yrs old)\n• Women''s Volleyball Open\n\nOpening ceremony and parade starts at 4:00 PM on Sunday, September 20. Team rosters must be submitted to the SK Office on or before September 15.',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    'Barangay Sports Complex',
    'Sangguniang Kabataan (SK)',
    false,
    false,
    true,
    'residents'
  )
ON CONFLICT DO NOTHING;
