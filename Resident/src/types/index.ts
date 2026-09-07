// Resident/src/types/index.ts

export type UserRole = 'resident' | 'admin' | 'superadmin';

export interface ResidentNotificationPreferences {
  push: boolean;
  sms: boolean;
  email: boolean;
}

export interface ResidentUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  birthdate?: string;
  age?: number;
  civil_status?: 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Separated' | string;
  sitio?: string;
  voter_status?: 'Registered Voter' | 'Non-Registered Voter' | string;
  role: UserRole;
  phone?: string;
  address?: string;
  id_type?: string;
  id_number?: string;
  is_active?: boolean;
  failed_attempts?: number;
  is_locked?: boolean;
  biometric_enabled?: boolean;
  two_factor_enabled?: boolean;
  notification_preferences?: ResidentNotificationPreferences;
  created_at?: string;
}

export interface DocumentRequirementItem {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
}

export interface DocumentType {
  id: string;
  code: string;
  title: string;
  category?: 'Clearance' | 'Certificate' | 'Permit' | 'Indigency' | 'General';
  description: string;
  fee: number;
  processing_days: number;
  validity?: string;
  requirements: string[];
  requirement_items?: DocumentRequirementItem[];
  icon?: string;
  is_active: boolean;
  created_at?: string;
}

export type RequestStatus =
  | 'pending'
  | 'under_review'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected';

export interface UploadedRequirementFile {
  requirement_name: string;
  file_name: string;
  file_type: 'image/jpeg' | 'image/png' | 'application/pdf' | string;
  file_size?: string;
  file_url?: string;
  status: 'uploaded' | 'pending' | 'verified';
}

export interface RequestTimelineEvent {
  status: RequestStatus;
  label: string;
  description: string;
  timestamp: string;
  is_completed: boolean;
  is_current: boolean;
}

export interface DocumentRequest {
  id: string;
  tracking_number: string;
  resident_id: string;
  resident_name: string;
  resident_email: string;
  resident_phone?: string;
  resident_address?: string;
  document_type_id: string;
  document_title: string;
  fee: number;
  purpose: string;
  requirements_attached: string[];
  uploaded_files?: UploadedRequirementFile[];
  pickup_date: string;
  pickup_time_slot: string;
  status: RequestStatus;
  notes?: string;
  rejection_reason?: string;
  rejected_at?: string;
  required_action?: string;
  processed_by?: string;
  approved_at?: string;
  ready_at?: string;
  completed_at?: string;
  pickup_location?: string;
  pickup_instructions?: string;
  timeline?: RequestTimelineEvent[];
  created_at: string;
  updated_at?: string;
}

export type AnnouncementCategory =
  | 'Community'
  | 'Emergency'
  | 'Public Advisory'
  | 'Events'
  | 'Government Services'
  | 'Maintenance';

export interface BarangayAnnouncement {
  id: string;
  title: string;
  category: AnnouncementCategory;
  date: string;
  description: string;
  content: string;
  banner_url?: string;
  location?: string;
  author?: string;
  is_important?: boolean;
  is_emergency?: boolean;
  created_at?: string;
}

export interface BarangayEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  target_audience: 'all' | 'residents' | 'officials' | string;
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | string;
  created_by?: string;
  created_at?: string;
}

export interface BarangayConfig {
  barangay_name: string;
  municipality: string;
  province: string;
  hall_address?: string;
  seal_url?: string;
  office_hours?: string;
  contact_email?: string;
  contact_phone?: string;
  emergency_hotline?: string;
  doc_prefix?: string;
  auto_notify?: boolean;
  updated_at?: string;
}

export interface ResidentNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'status_update' | 'ready_pickup' | 'rejected' | 'announcement' | 'security' | 'system';
  is_read: boolean;
  link_tab?: 'home' | 'documents' | 'requests' | 'announcements' | 'profile';
  link_id?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  role_target?: string | null;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}
