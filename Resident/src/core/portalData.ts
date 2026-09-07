// Resident/src/core/portalData.ts
import { DocumentType, BarangayAnnouncement, BarangayConfig, ResidentNotification, DocumentRequest } from '../types';

export const OFFICIAL_DOC_TYPES: DocumentType[] = [
  {
    id: 'dt-001',
    code: 'BC-01',
    title: 'Barangay Clearance',
    category: 'Clearance',
    description: 'Official clearance issued to certify good standing, no pending barangay complaints, and residency for employment, bank, or ID applications.',
    fee: 50.0,
    processing_days: 1,
    validity: '6 Months',
    icon: 'ShieldCheck',
    requirements: [
      'Valid Government-Issued Photo ID (e.g. PhilID, UMID, Driver License, Passport)',
      'Proof of Residency (Billing statement, Barangay ID, or Landlord Statement)',
      'Recent 2x2 ID Photo (White background)',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Valid Government-Issued Photo ID', description: 'Clear photo or PDF of PhilID, UMID, Driver License, or Passport', is_required: true },
      { id: 'req-2', name: 'Proof of Residency / Billing Statement', description: 'Electricity, water bill, or landlord statement dated within last 3 months', is_required: true },
      { id: 'req-3', name: 'Recent 2x2 ID Photo', description: 'Recent photo with plain white background', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-002',
    code: 'CR-02',
    title: 'Certificate of Residency',
    category: 'Certificate',
    description: 'Official certification certifying that the resident is an active and registered inhabitant residing within Barangay Zapatera.',
    fee: 30.0,
    processing_days: 1,
    validity: '6 Months',
    icon: 'Home',
    requirements: [
      'Valid Photo Identification (Government ID or School/Company ID)',
      'Sitio Leader Endorsement or Household Census Verification',
      'Proof of Billing Address in Barangay Zapatera',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Valid Photo ID', description: 'Government, Company, or Student ID', is_required: true },
      { id: 'req-2', name: 'Sitio Leader Endorsement / Census Record', description: 'Sitio certificate or household registration record', is_required: true },
      { id: 'req-3', name: 'Proof of Billing Address', description: 'Utility bill under resident or family name', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-003',
    code: 'CI-03',
    title: 'Certificate of Indigency',
    category: 'Indigency',
    description: 'Issued free of charge for underprivileged families applying for medical assistance, hospital discounts, DSWD grants, or scholarships.',
    fee: 0.0,
    processing_days: 1,
    validity: '3 Months',
    icon: 'HeartHandshake',
    requirements: [
      'Valid Government Photo ID or Barangay ID',
      'Affidavit of Low Income / DSWD 4Ps ID or Sitio Endorsement',
      'Hospital Clinical Abstract or Medical Request (for medical aid)',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Valid Photo ID / Barangay ID', description: 'Proof of identity', is_required: true },
      { id: 'req-2', name: 'Affidavit of Low Income / Sitio Endorsement', description: 'Certifies income status below threshold', is_required: true },
      { id: 'req-3', name: 'Medical/Hospital Request Slip', description: 'Only if applying for medical or hospitalization assistance', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-004',
    code: 'BC-04',
    title: 'Barangay Certificate (General)',
    category: 'General',
    description: 'Multi-purpose barangay certificate for Senior Citizen benefits, Solo Parent registration, bank loan applications, or travel authority.',
    fee: 50.0,
    processing_days: 1,
    validity: '6 Months',
    icon: 'FileText',
    requirements: [
      'Valid Government Photo ID',
      'Proof of Residence in Barangay Zapatera',
      'Specific Program Documentation (e.g. Birth Certificate for Solo Parent)',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Valid Government Photo ID', description: 'Valid government ID card', is_required: true },
      { id: 'req-2', name: 'Proof of Residence in Barangay Zapatera', description: 'Barangay ID or utility bill', is_required: true },
      { id: 'req-3', name: 'Supporting Program Documents', description: 'Relevant documents matching your purpose', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-005',
    code: 'BB-05',
    title: 'Barangay Business Clearance',
    category: 'Permit',
    description: 'Required clearance for new business permit applications or annual renewals of commercial establishments operating within the barangay.',
    fee: 150.0,
    processing_days: 2,
    validity: '1 Year',
    icon: 'Briefcase',
    requirements: [
      'DTI Business Name Registration or SEC Certificate',
      'Contract of Lease or Land Title of Business Location',
      'Previous Year Barangay Business Clearance (for renewals)',
      'Government ID of Business Owner / Authorized Representative',
    ],
    requirement_items: [
      { id: 'req-1', name: 'DTI / SEC Certificate of Registration', description: 'Official business registration document', is_required: true },
      { id: 'req-2', name: 'Contract of Lease / Title of Property', description: 'Proof of commercial space location in Zapatera', is_required: true },
      { id: 'req-3', name: 'Valid ID of Owner / Signatory', description: 'Government ID of registered owner', is_required: true },
      { id: 'req-4', name: 'Previous Clearance (For Renewal)', description: 'Copy of last year clearance if renewing', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-006',
    code: 'CG-06',
    title: 'Certificate of Good Moral Character',
    category: 'Certificate',
    description: 'Certifies resident has no adverse record or pending blotter complaints in the Lupong Tagapamayapa, for employment or international travel.',
    fee: 50.0,
    processing_days: 1,
    validity: '6 Months',
    icon: 'Award',
    requirements: [
      'Valid Government Photo ID',
      'Barangay ID or Proof of 1+ Year Residency in Zapatera',
      'Barangay Peace & Order / Lupon Blotter Clearance Verification',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Valid Government Photo ID', description: 'PhilID, Passport, or License', is_required: true },
      { id: 'req-2', name: 'Barangay ID / Residency Record', description: 'Proof of at least 1 year residence', is_required: true },
      { id: 'req-3', name: 'Lupon / Peace & Order Verification Note', description: 'Endorsement from Barangay Secretary or Tanod', is_required: false },
    ],
    is_active: true,
  },
  {
    id: 'dt-007',
    code: 'FT-07',
    title: 'First-Time Jobseeker Certificate (RA 11261)',
    category: 'Clearance',
    description: 'Waives government document fees under Republic Act 11261 for Filipino youth and residents entering the workforce for the first time.',
    fee: 0.0,
    processing_days: 1,
    validity: '1 Year (One-Time Availment)',
    icon: 'Sparkles',
    requirements: [
      'Signed First-Time Jobseeker Oath of Undertaking',
      'Diploma, Transcript of Records, or High School Certificate',
      'Valid Government Photo ID or School ID',
    ],
    requirement_items: [
      { id: 'req-1', name: 'Signed Oath of Undertaking (RA 11261)', description: 'Standard sworn oath form available at barangay', is_required: true },
      { id: 'req-2', name: 'Diploma or School Completion Record', description: 'Proof of recent graduation or job seeking status', is_required: true },
      { id: 'req-3', name: 'Valid Photo ID', description: 'School ID or Postal ID', is_required: true },
    ],
    is_active: true,
  },
];

export const DEFAULT_BARANGAY_CONFIG: BarangayConfig = {
  barangay_name: 'Barangay Zapatera',
  municipality: 'Cebu City',
  province: 'Cebu',
  hall_address: 'Zapatera Barangay Hall, Rahmann St., Barangay Zapatera, Cebu City 6000',
  seal_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
  office_hours: 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)',
  contact_email: 'zapatera.cebucity@gmail.com',
  contact_phone: '(032) 255-4819 / 0917-819-2026',
  emergency_hotline: '911 / (032) 255-1111 (Barangay Patrol)',
  doc_prefix: 'BRGY-2026',
  auto_notify: true,
  updated_at: new Date().toISOString(),
};

export const SAMPLE_ANNOUNCEMENTS: BarangayAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'FREE Medical, Dental Mission & Health Clearance Day',
    category: 'Public Advisory',
    date: 'September 12, 2026',
    description: 'Barangay Zapatera Health Center will conduct free medical consultations, dental extractions, and health certificates at the Barangay Gym.',
    content: `The Barangay Council of Zapatera, in partnership with Cebu City Health Department, cordially invites all registered residents to the Annual Community Health & Wellness Caravan.

Services Offered:
• Free Doctor Consultations & Prescription Medicines
• Free Dental Checkup & Tooth Extraction (Limited to first 100 residents)
• Blood Pressure & Blood Sugar Screening
• Free Barangay Health Clearance for Students & Senior Citizens
• Flu Vaccinations for Elderly (60 years old and above)

Location: Barangay Zapatera Multi-Purpose Gymnasium
Date & Time: Friday, September 12, 2026 | 8:00 AM – 3:00 PM
Please bring your Barangay ID or valid ID showing Zapatera residency.`,
    location: 'Barangay Zapatera Gymnasium',
    author: 'Committee on Health & Sanitation',
    is_important: true,
    is_emergency: false,
    banner_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  },
  {
    id: 'ann-2',
    title: 'URGENT: Scheduled Power Interruption Advisory (Sept 9, 2026)',
    category: 'Maintenance',
    date: 'September 9, 2026',
    description: 'VECO scheduled maintenance and pole relocation along Rahmann Street and Sitio San Roque from 8:00 AM to 1:00 PM.',
    content: `Visayan Electric Company (VECO) has notified the Barangay Administration regarding scheduled preventive maintenance and transformer replacement along Rahmann St., Sitio San Roque, and Sitio Riverside.

Affected Areas:
1. Rahmann Street (entire stretch)
2. Sitio San Roque
3. Sitio Riverside near Creek Area

Barangay Hall operations will remain functional through generator power for document pickups and emergency services. Residents are advised to charge essential devices beforehand.`,
    location: 'Sitio San Roque & Rahmann St.',
    author: 'Barangay Emergency Operations Center',
    is_important: false,
    is_emergency: true,
    banner_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
  },
  {
    id: 'ann-3',
    title: 'Digital Document Portal Release: Online 30-Minute Appointments',
    category: 'Government Services',
    date: 'September 1, 2026',
    description: 'Residents can now request clearances and certificates online and schedule express pickup times without waiting in queue.',
    content: `Welcome to the newly launched Barangay Zapatera Resident Digital Portal! 

Under Resolution No. 2026-48, the Barangay Council has implemented a modern digital document system to speed up government transactions.

Key Features:
• File document requests 24/7 from your phone or computer.
• Choose exact 30-minute appointment intervals for express collection.
• Real-time SMS and email tracking updates.
• Zero queuing at the Barangay Hall lobby.

For technical assistance or feedback, visit the Barangay Help Desk or email zapatera.cebucity@gmail.com.`,
    location: 'Barangay Zapatera Portal',
    author: 'Office of the Barangay Captain',
    is_important: true,
    is_emergency: false,
    banner_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80',
  },
  {
    id: 'ann-4',
    title: 'Youth Sports Fest & Inter-Sitio Basketball Tournament',
    category: 'Events',
    date: 'September 20, 2026',
    description: 'SK Zapatera officially opens registrations for the 2026 Inter-Sitio Basketball and Volleyball League.',
    content: `Sangguniang Kabataan of Barangay Zapatera invites all youth aged 15-24 to participate in the 2026 Annual Inter-Sitio Sports Fest.

Categories:
• Men's Basketball (Junior & Senior Divisions)
• Women's Volleyball
• E-Sports (Mobile Legends Tournament)

Registration Forms are available at the SK Office or through your respective Sitio Youth Leaders until September 15, 2026.`,
    location: 'Barangay Covered Court',
    author: 'Sangguniang Kabataan Council',
    is_important: false,
    is_emergency: false,
    banner_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  },
  {
    id: 'ann-5',
    title: 'Community Clean-Up & Anti-Dengue Misting Schedule',
    category: 'Community',
    date: 'September 15, 2026',
    description: 'Weekly Oplan Kontra Dengue fogging and synchronized cleanup across all 8 sitios in Barangay Zapatera.',
    content: `In line with public health preventative measures against dengue, the Barangay Health Committee will conduct fogging and drainage cleaning.

Schedule:
• Morning (6:00 AM - 9:00 AM): Sitio Upper Zapatera, Sitio Lower Zapatera, Sitio Ramos
• Afternoon (3:00 PM - 6:00 PM): Sitio Riverside, Sitio Central, Sitio Kamagong

Please cover food containers and keep pets safe indoors during misting operations.`,
    location: 'All Sitios in Barangay Zapatera',
    author: 'Sanitation & Environment Taskforce',
    is_important: false,
    is_emergency: false,
    banner_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&q=80',
  },
];

export const APPOINTMENT_TIME_SLOTS = [
  '08:00 AM – 08:30 AM',
  '08:30 AM – 09:00 AM',
  '09:00 AM – 09:30 AM',
  '09:30 AM – 10:00 AM',
  '10:00 AM – 10:30 AM',
  '10:30 AM – 11:00 AM',
  '11:00 AM – 11:30 AM',
  '01:00 PM – 01:30 PM',
  '01:30 PM – 02:00 PM',
  '02:00 PM – 02:30 PM',
  '02:30 PM – 03:00 PM',
  '03:00 PM – 03:30 PM',
  '03:30 PM – 04:00 PM',
  '04:00 PM – 04:30 PM',
  '04:30 PM – 05:00 PM',
];

export const SAMPLE_SAMPLE_REQUESTS: DocumentRequest[] = [
  {
    id: 'req-sample-01',
    tracking_number: 'BRGY-2026-004128',
    resident_id: 'res-sample',
    resident_name: 'Juan Dela Cruz',
    resident_email: 'juan.delacruz@gmail.com',
    resident_phone: '0917-555-1234',
    resident_address: 'House #42, Sitio Zapatera Proper, Barangay Zapatera',
    document_type_id: 'dt-001',
    document_title: 'Barangay Clearance',
    fee: 50.0,
    purpose: 'Local Employment Application at Cebu IT Park',
    requirements_attached: [
      'Valid Government-Issued Photo ID',
      'Proof of Residency / Billing Statement',
    ],
    uploaded_files: [
      { requirement_name: 'Valid Government-Issued Photo ID', file_name: 'PhilID_Front_Back.pdf', file_type: 'application/pdf', file_size: '1.2 MB', status: 'verified' },
      { requirement_name: 'Proof of Residency / Billing Statement', file_name: 'VECO_Electric_Bill_July2026.jpg', file_type: 'image/jpeg', file_size: '840 KB', status: 'verified' },
    ],
    pickup_date: '2026-09-08',
    pickup_time_slot: '09:00 AM – 09:30 AM',
    status: 'ready_for_pickup',
    pickup_location: 'Express Window 2, Barangay Hall Lobby, Rahmann St.',
    pickup_instructions: 'Please bring your original Valid Government ID and the exact fee of ₱50.00. Present your Request Tracking Code at Window 2.',
    timeline: [
      { status: 'pending', label: 'Request Submitted', description: 'Request received and logged into barangay queue.', timestamp: 'Sep 6, 2026 • 08:30 AM', is_completed: true, is_current: false },
      { status: 'under_review', label: 'Under Review', description: 'Resident verification and record clearance validated.', timestamp: 'Sep 6, 2026 • 10:15 AM', is_completed: true, is_current: false },
      { status: 'processing', label: 'Processing & Printing', description: 'Document printed, dry-sealed, and signed by Barangay Captain.', timestamp: 'Sep 6, 2026 • 02:40 PM', is_completed: true, is_current: false },
      { status: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Official clearance ready at Window 2 for your selected time slot.', timestamp: 'Sep 7, 2026 • 08:00 AM', is_completed: true, is_current: true },
      { status: 'completed', label: 'Completed', description: 'Document claimed by resident.', timestamp: 'Pending Pickup', is_completed: false, is_current: false },
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'req-sample-02',
    tracking_number: 'BRGY-2026-003890',
    resident_id: 'res-sample',
    resident_name: 'Juan Dela Cruz',
    resident_email: 'juan.delacruz@gmail.com',
    resident_phone: '0917-555-1234',
    resident_address: 'House #42, Sitio Zapatera Proper, Barangay Zapatera',
    document_type_id: 'dt-002',
    document_title: 'Certificate of Residency',
    fee: 30.0,
    purpose: 'Bank Account Opening (BDO Fuente Osmeña)',
    requirements_attached: [
      'Valid Photo Identification',
      'Sitio Leader Endorsement',
    ],
    uploaded_files: [
      { requirement_name: 'Valid Photo Identification', file_name: 'Driver_License_Juan.jpg', file_type: 'image/jpeg', file_size: '950 KB', status: 'verified' },
    ],
    pickup_date: '2026-08-20',
    pickup_time_slot: '01:30 PM – 02:00 PM',
    status: 'completed',
    completed_at: '2026-08-20T14:10:00Z',
    pickup_location: 'Express Window 1, Barangay Hall Lobby',
    timeline: [
      { status: 'pending', label: 'Request Submitted', description: 'Submitted online.', timestamp: 'Aug 19, 2026 • 09:10 AM', is_completed: true, is_current: false },
      { status: 'under_review', label: 'Under Review', description: 'Verified by Records Clerk.', timestamp: 'Aug 19, 2026 • 11:20 AM', is_completed: true, is_current: false },
      { status: 'processing', label: 'Processing & Printing', description: 'Issued with Official Seal.', timestamp: 'Aug 19, 2026 • 03:00 PM', is_completed: true, is_current: false },
      { status: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Ready at Window 1.', timestamp: 'Aug 20, 2026 • 08:30 AM', is_completed: true, is_current: false },
      { status: 'completed', label: 'Completed', description: 'Claimed and signed by resident.', timestamp: 'Aug 20, 2026 • 01:45 PM', is_completed: true, is_current: true },
    ],
    created_at: new Date(Date.now() - 1728000000).toISOString(),
  },
];
