// Resident/src/core/portalData.ts
import { DocumentType, BarangayAnnouncement, BarangayConfig, ResidentNotification, DocumentRequest } from '../types';

export const OFFICIAL_DOC_TYPES: DocumentType[] = [];

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
