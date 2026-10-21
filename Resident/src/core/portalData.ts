// Resident/src/core/portalData.ts
import { DocumentType, BarangayAnnouncement, BarangayConfig, ResidentNotification, DocumentRequest } from '../types';

export const OFFICIAL_DOC_TYPES: DocumentType[] = [
  {
    id: 'dt-001',
    code: 'BC-01',
    title: 'Barangay Clearance',
    category: 'Clearance',
    description: 'Official certificate certifying good standing and no negative record in Barangay Zapatera. Used for job applications, business permits, and government transactions.',
    fee: 50,
    processing_days: 1,
    validity: '6 Months from issuance',
    requirements: [
      'Valid Government-Issued ID (PhilSys / Driver\'s License / Passport / UMID)',
      'Proof of Residency (Utility Bill / Lease Contract / Certificate of Tenancy)',
      'Community Tax Certificate (Cedula)',
      '2x2 Colored ID Photo (Recent, White Background)',
    ],
    is_active: true,
  },
  {
    id: 'dt-002',
    code: 'BC-02',
    title: 'Certificate of Residency',
    category: 'Certificate',
    description: 'Official proof that you live in Barangay Zapatera, Cebu City. Needed for COMELEC, bank accounts, and government IDs.',
    fee: 50,
    processing_days: 1,
    validity: '6 Months from issuance',
    requirements: [
      'Valid Government-Issued ID',
      'Proof of Residency (Electric, Water, or Internet Bill or Landlord Certification)',
      'Community Tax Certificate (Cedula)',
    ],
    is_active: true,
  },
  {
    id: 'dt-003',
    code: 'BC-03',
    title: 'Certificate of Indigency',
    category: 'Indigency',
    description: 'Official certificate for low-income residents. Free of charge for DSWD, Malasakit Center, medical assistance, legal aid, and school fee discounts.',
    fee: 0,
    processing_days: 1,
    validity: '3 Months from issuance',
    requirements: [
      'Valid Government-Issued ID or Student ID',
      'Proof of Low Income or Sitio / Purok Leader Certification',
      'Hospital Clinical Abstract or Bill (If applying for Medical Assistance)',
    ],
    is_active: true,
  },
  {
    id: 'dt-004',
    code: 'BC-04',
    title: 'Certificate of Good Moral Character',
    category: 'Certificate',
    description: 'Certificate showing good moral character. Needed for scholarship applications, college admissions, board exams, and job requirements.',
    fee: 50,
    processing_days: 1,
    validity: '6 Months from issuance',
    requirements: [
      'Valid Government-Issued ID or School ID',
      'Barangay Clearance (Current / Previous Year)',
      'Proof of Residency in Barangay Zapatera',
    ],
    is_active: true,
  },
  {
    id: 'dt-005',
    code: 'BC-05',
    title: 'First Time Jobseeker Certificate',
    category: 'Certificate',
    description: 'Under the First Time Jobseekers Act (RA 11261), this certificate gives first-time job hunters free barangay documents.',
    fee: 0,
    processing_days: 1,
    validity: '1 Year from issuance (One-time grant)',
    requirements: [
      'Valid Government-Issued ID or School ID with PSA Birth Certificate',
      'Signed Oath of Undertaking (First Time Jobseeker Form)',
      'Proof of Residency (Minimum 6 months in Barangay Zapatera)',
      '2x2 Colored ID Photo',
    ],
    is_active: true,
  },
  {
    id: 'dt-006',
    code: 'BC-06',
    title: 'Barangay Business Clearance',
    category: 'Permit',
    description: 'Required clearance for applying or renewing a Mayor’s Business Permit in Cebu City. Confirms your business meets barangay standards.',
    fee: 150,
    processing_days: 2,
    validity: 'Valid until December 31 of current fiscal year',
    requirements: [
      'Valid Government-Issued ID of Business Owner / Authorized Rep',
      'DTI or SEC Business Name Registration Certificate',
      'Contract of Lease or Proof of Commercial Property Ownership',
      'Previous Year Barangay Business Clearance (For Renewal)',
      'Community Tax Certificate (Cedula)',
    ],
    is_active: true,
  },
];

export const DEFAULT_BARANGAY_CONFIG: BarangayConfig = {
  barangay_name: 'Barangay Zapatera',
  municipality: 'Cebu City',
  province: 'Cebu',
  hall_address: '197 D. Jakosalem St., Cebu City',
  seal_url: '/zapatera_seal.png',
  logo_url: '/zapatera_seal.png',
  punong_barangay: 'HON. DAVID M. AGRAVANTE',
  signatory_title: 'Punong Barangay',
  office_hours: 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)',
  contact_email: 'zapatera.lnb24@gmail.com',
  contact_phone: '(032) 503-6465',
  emergency_hotline: '911 / (032) 503-6465 (Barangay Patrol)',
  doc_prefix: 'BRGY-2026',
  auto_notify: true,
  updated_at: new Date().toISOString(),
};

export const APPOINTMENT_TIME_SLOTS: string[] = [
  '8:00 AM - 8:30 AM',
  '8:30 AM - 9:00 AM',
  '9:00 AM - 9:30 AM',
  '9:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '11:00 AM - 11:30 AM',
  '1:00 PM - 1:30 PM',
  '1:30 PM - 2:00 PM',
  '2:00 PM - 2:30 PM',
  '2:30 PM - 3:00 PM',
  '3:00 PM - 3:30 PM',
  '3:30 PM - 4:00 PM',
  '4:00 PM - 4:30 PM',
];

export const SAMPLE_ANNOUNCEMENTS: BarangayAnnouncement[] = [];

export const SAMPLE_REQUESTS: DocumentRequest[] = [];

export const SAMPLE_NOTIFICATIONS: ResidentNotification[] = [];
