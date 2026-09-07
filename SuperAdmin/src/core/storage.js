// SuperAdmin/src/core/storage.js
// Data Service & Storage Engine with Supabase & Offline Synchronization

import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  SUPER_ADMINS: 'zapatera_super_admins_db',
  DOC_TYPES: 'zapatera_doc_types_db',
  REQUESTS: 'zapatera_requests_db',
  EVENTS: 'zapatera_events_db',
  NEWS: 'zapatera_news_db',
  CONFIG: 'zapatera_config_db',
  LOGS: 'zapatera_logs_db',
  NOTIFICATIONS: 'zapatera_notifications_db',
  SESSION: 'zapatera_superadmin_session',
};

// Seed Initial Super Admin Data
const INITIAL_SUPER_ADMINS = [
  {
    id: 'sa-000',
    email: 'mardee131@gmail.com',
    full_name: 'Mardee (Super Admin)',
    first_name: 'Mardee',
    last_name: 'Admin',
    middle_initial: 'M',
    role: 'super_admin',
    phone: '09171234567',
    address: 'Barangay Hall, Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: 'SA-00001',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'sa-001',
    email: 'superadmin@zapatera.gov.ph',
    full_name: 'Hon. Executive Officer',
    first_name: 'Executive',
    last_name: 'Officer',
    middle_initial: 'H',
    role: 'super_admin',
    phone: '09171234567',
    address: 'Barangay Hall, Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: 'SA-99081',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-01').toISOString(),
  }
];

const INITIAL_DOC_TYPES = [
  {
    id: 'dt-001',
    code: 'BC-01',
    title: 'Barangay Clearance',
    description: 'Official certification for employment, postal ID, bank requirement, or legal purposes.',
    fee: 50.00,
    processing_days: 1,
    requirements: ['Valid Government-Issued ID', 'Proof of Residency / Utility Bill', '1x1 or 2x2 Photo'],
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'dt-002',
    code: 'CI-02',
    title: 'Certificate of Indigency',
    description: 'Free certificate issued for medical assistance, scholarship, or financial aid.',
    fee: 0.00,
    processing_days: 1,
    requirements: ['Barangay ID or Voter Certificate', 'Certificate of Non-Filing / Low Income Statement'],
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
  }
];

const INITIAL_REQUESTS = [
  {
    id: 'req-101',
    tracking_number: 'BZ-2026-9041',
    resident_id: 'usr-003',
    resident_name: 'Juan Dela Cruz',
    resident_email: 'resident@gmail.com',
    resident_phone: '0917-555-0199',
    resident_address: '142 Sikatuna St., Sitio Upper Zapatera, Cebu City',
    document_type_id: 'dt-001',
    document_title: 'Barangay Clearance',
    fee: 50.00,
    purpose: 'Local Employment Application',
    requirements_attached: ['Government_ID_Front.jpg', 'Electric_Bill_Jan2026.pdf'],
    pickup_date: '2026-09-08',
    pickup_time_slot: '3:00 PM - 3:30 PM',
    status: 'under_review',
    notes: 'Uploaded ID verified against resident record.',
    rejection_reason: '',
    processed_by: 'Maria Santos',
    created_at: new Date('2026-07-20T10:30:00').toISOString(),
    updated_at: new Date('2026-07-21T09:15:00').toISOString(),
  }
];

const INITIAL_EVENTS = [];

const INITIAL_CONFIG = {
  barangay_name: 'Barangay Zapatera',
  municipality: 'Cebu City',
  province: 'Cebu',
  seal_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
  office_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
  contact_email: 'info@barangayzapatera.gov.ph',
  contact_phone: '(032) 253-1234',
  doc_prefix: 'BRGY-2026',
  auto_notify: true,
  updated_at: new Date().toISOString(),
};

const INITIAL_NEWS = [
  {
    id: 'news-1',
    title: 'FREE Medical, Dental Mission & Health Clearance Day',
    category: 'Public Advisory',
    description: 'Barangay Zapatera Health Center will conduct free medical consultations, dental extractions, and health certificates at the Barangay Gym.',
    content: 'The Barangay Council of Zapatera, in partnership with Cebu City Health Department, cordially invites all registered residents to the Annual Community Health & Wellness Caravan.\n\nServices Offered:\n• Free Doctor Consultations & Prescription Medicines\n• Free Dental Checkup & Tooth Extraction (Limited to first 100 residents)\n• Blood Pressure & Blood Sugar Screening\n• Free Barangay Health Clearance for Students & Senior Citizens\n• Flu Vaccinations for Elderly (60 years old and above)\n\nLocation: Barangay Zapatera Multi-Purpose Gymnasium\nDate & Time: Friday, September 12, 2026 | 8:00 AM – 3:00 PM\nPlease bring your Barangay ID or valid ID showing Zapatera residency.',
    banner_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    location: 'Barangay Zapatera Gymnasium',
    author: 'Committee on Health & Sanitation',
    is_important: true,
    is_emergency: false,
    is_published: true,
    target_audience: 'residents',
    created_at: new Date('2026-07-15T08:00:00').toISOString(),
  },
  {
    id: 'news-2',
    title: 'URGENT: Scheduled Power Interruption Advisory (Sept 9, 2026)',
    category: 'Maintenance',
    description: 'VECO scheduled maintenance and pole relocation along Rahmann Street and Sitio San Roque from 8:00 AM to 1:00 PM.',
    content: 'Visayan Electric Company (VECO) has notified the Barangay Administration regarding scheduled preventive maintenance and transformer replacement along Rahmann St., Sitio San Roque, and Sitio Riverside.\n\nAffected Areas:\n1. Rahmann Street (entire stretch)\n2. Sitio San Roque\n3. Sitio Riverside near Creek Area\n\nBarangay Hall operations will remain functional through generator power for document pickups and emergency services. Residents are advised to charge essential devices beforehand.',
    banner_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
    location: 'Sitio San Roque & Rahmann St.',
    author: 'Barangay Emergency Operations Center',
    is_important: false,
    is_emergency: true,
    is_published: true,
    target_audience: 'all',
    created_at: new Date('2026-07-18T10:30:00').toISOString(),
  },
  {
    id: 'news-3',
    title: 'Digital Document Portal Release: Online 30-Minute Appointments',
    category: 'Government Services',
    description: 'Residents can now request clearances and certificates online and schedule express pickup times without waiting in queue.',
    content: 'Welcome to the newly launched Barangay Zapatera Resident Digital Portal!\n\nUnder Resolution No. 2026-48, the Barangay Council has implemented a modern digital document system to speed up government transactions.\n\nKey Features:\n• File document requests 24/7 from your phone or computer.\n• Choose exact 30-minute appointment intervals for express collection.\n• Real-time SMS and email tracking updates.\n• Zero queuing at the Barangay Hall lobby.\n\nFor technical assistance or feedback, visit the Barangay Help Desk or email zapatera.cebucity@gmail.com.',
    banner_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80',
    location: 'Barangay Zapatera Portal',
    author: 'Office of the Barangay Captain',
    is_important: true,
    is_emergency: false,
    is_published: true,
    target_audience: 'residents',
    created_at: new Date('2026-07-01T09:00:00').toISOString(),
  }
];

const INITIAL_LOGS = [];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    user_id: 'usr-003',
    role_target: null,
    title: 'Request Under Review',
    message: 'Your request for Barangay Clearance (BZ-2026-9041) is currently being processed by admin.',
    type: 'info',
    is_read: false,
    created_at: new Date('2026-07-21T09:15:00').toISOString(),
  }
];

// Helper to initialize local storage
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS)) {
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(INITIAL_SUPER_ADMINS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOC_TYPES)) {
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(INITIAL_DOC_TYPES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NEWS)) {
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(INITIAL_NEWS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  }
};

initializeStorage();

// Storage Service Class
export const StorageService = {
  // PROFILES / USERS (Directly maps to public.profiles)
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS) || '[]');
    } catch {
      return INITIAL_SUPER_ADMINS;
    }
  },

  getUsersAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getUsers();
  },

  saveUser: async (user) => {
    const users = StorageService.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id || (u.email && u.email.toLowerCase() === (user.email || '').toLowerCase()));
    let saved = { ...user };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
      saved = users[existingIndex];
    } else {
      saved.id = saved.id || `usr-${Date.now()}`;
      saved.created_at = new Date().toISOString();
      users.push(saved);
    }
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(users));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id);
        const profilePayload = {
          email: saved.email,
          full_name: saved.full_name,
          role: saved.role || 'resident',
          phone: saved.phone || '',
          address: saved.address || '',
          id_type: saved.id_type || '',
          id_number: saved.id_number || '',
          is_active: saved.is_active !== false,
          updated_at: new Date().toISOString(),
        };

        if (isUuid) {
          profilePayload.id = saved.id;
          await supabase.from('profiles').upsert(profilePayload);
        } else {
          await supabase.from('profiles').upsert(profilePayload, { onConflict: 'email' });
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Edited User Account' : 'Created User Account',
      feature: 'User Account Management',
      details: `User: ${saved.full_name || saved.email} (${saved.email}), Role: ${saved.role || 'resident'}`,
      level: 'info',
    });

    return saved;
  },

  deleteUser: async (userId) => {
    let users = StorageService.getUsers();
    const target = users.find((u) => u.id === userId);
    users = users.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(users));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (isUuid) {
          await supabase.from('profiles').delete().eq('id', userId);
        } else if (target && target.email) {
          await supabase.from('profiles').delete().eq('email', target.email);
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Deleted User Account',
      feature: 'User Account Management',
      details: `Deleted user account for ${target ? target.email : userId}`,
      level: 'danger',
    });
  },

  // DOCUMENT TYPES (Templates & Requirements)
  getDocTypes: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOC_TYPES) || '[]');
    } catch {
      return INITIAL_DOC_TYPES;
    }
  },

  getDocTypesAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('document_types')
          .select('*')
          .order('title', { ascending: true });

        if (data && !error && data.length > 0) {
          const formatted = data.map((d) => ({
            id: d.id,
            code: d.code,
            title: d.title,
            description: d.description,
            fee: Number(d.fee) || 0,
            processing_days: Number(d.processing_days) || 1,
            requirements: Array.isArray(d.requirements)
              ? d.requirements
              : typeof d.requirements === 'string'
              ? JSON.parse(d.requirements)
              : [],
            is_active: d.is_active !== false,
            created_at: d.created_at,
          }));
          localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(formatted));
          return formatted;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getDocTypes();
  },

  saveDocType: async (docType) => {
    const docTypes = StorageService.getDocTypes();
    const existingIndex = docTypes.findIndex((d) => d.id === docType.id || d.code === docType.code);
    let updatedDoc = { ...docType };

    if (existingIndex >= 0) {
      docTypes[existingIndex] = { ...docTypes[existingIndex], ...docType };
      updatedDoc = docTypes[existingIndex];
    } else {
      updatedDoc.id = updatedDoc.id || `dt-${Date.now()}`;
      updatedDoc.created_at = new Date().toISOString();
      docTypes.push(updatedDoc);
    }
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedDoc.id);
        const payload = {
          code: updatedDoc.code,
          title: updatedDoc.title,
          description: updatedDoc.description || '',
          fee: parseFloat(updatedDoc.fee) || 0,
          processing_days: parseInt(updatedDoc.processing_days) || 1,
          requirements: Array.isArray(updatedDoc.requirements) ? updatedDoc.requirements : [],
          is_active: updatedDoc.is_active !== false,
          updated_at: new Date().toISOString(),
        };

        if (isUuid) {
          payload.id = updatedDoc.id;
        }
        await supabase.from('document_types').upsert(payload, { onConflict: 'code' });
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Edited Document Info' : 'Created Document Info',
      feature: 'Document Info Management',
      details: `Title: ${updatedDoc.title}, Code: ${updatedDoc.code}, Fee: ₱${updatedDoc.fee}`,
      level: 'info',
    });

    return updatedDoc;
  },

  deleteDocType: async (docTypeId) => {
    let docTypes = StorageService.getDocTypes();
    const target = docTypes.find((d) => d.id === docTypeId);
    docTypes = docTypes.filter((d) => d.id !== docTypeId);
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docTypeId);
        if (isUuid) {
          await supabase.from('document_types').delete().eq('id', docTypeId);
        } else if (target && target.code) {
          await supabase.from('document_types').delete().eq('code', target.code);
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Deleted Document Info',
      feature: 'Document Info Management',
      details: `Deleted document type "${target ? target.title : docTypeId}"`,
      level: 'danger',
    });
  },

  // DOCUMENT REQUESTS (Shared across Resident, Admin, SuperAdmin)
  getRequests: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REQUESTS) || '[]');
    } catch {
      return INITIAL_REQUESTS;
    }
  },

  getRequestsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('document_requests')
          .select(`
            *,
            profiles:resident_id (
              id, email, full_name, first_name, last_name, phone, address, sitio, birthdate, age, civil_status, voter_status, id_type, id_number, avatar_url
            ),
            document_types:document_type_id (
              id, title, code, fee, processing_days, requirements
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const normalized = data.map((req) => ({
            ...req,
            resident_name: req.profiles?.full_name || req.resident_name || 'Resident',
            resident_email: req.profiles?.email || req.resident_email,
            resident_phone: req.profiles?.phone || req.resident_phone,
            resident_address: req.profiles?.address || req.profiles?.sitio || req.resident_address,
            document_title: req.document_types?.title || req.document_title || 'Barangay Document',
            fee: req.document_types?.fee !== undefined ? req.document_types.fee : req.fee,
          }));

          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getRequests();
  },

  saveRequest: async (req, adminUser) => {
    const requests = StorageService.getRequests();
    const existingIndex = requests.findIndex((r) => r.id === req.id || r.tracking_number === req.tracking_number);
    req.updated_at = new Date().toISOString();

    if (existingIndex >= 0) {
      requests[existingIndex] = { ...requests[existingIndex], ...req };
    } else {
      req.id = req.id || `req-${Date.now()}`;
      req.created_at = req.created_at || new Date().toISOString();
      requests.unshift(req);
    }
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.id);
        const adminId = adminUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminUser.id) ? adminUser.id : null;

        const payload = {
          status: req.status,
          notes: req.notes || '',
          rejection_reason: req.rejection_reason || '',
          pickup_date: req.pickup_date || null,
          pickup_time_slot: req.pickup_time_slot || null,
          processed_by: adminId,
          updated_at: new Date().toISOString(),
        };

        if (req.status === 'approved' || req.status === 'ready_for_pickup') {
          payload.approved_at = req.approved_at || new Date().toISOString();
        }
        if (req.status === 'completed' || req.status === 'issued') {
          payload.issued_at = req.issued_at || new Date().toISOString();
        }

        if (isUuid) {
          await supabase.from('document_requests').update(payload).eq('id', req.id);
        } else if (req.tracking_number) {
          await supabase.from('document_requests').update(payload).eq('tracking_number', req.tracking_number);
        }

        // Create resident notification
        const residentId = req.resident_id || req.profiles?.id;
        const isResidentUuid = residentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(residentId);
        
        let notifTitle = 'Application Status Updated';
        let notifMsg = `Your request ${req.tracking_number || ''} status is now: ${req.status}.`;
        let notifType = 'info';

        if (req.status === 'under_review' || req.status === 'processing') {
          notifTitle = 'Request Under Review 📄';
          notifMsg = `Your ${req.document_title || 'document request'} (Ref: ${req.tracking_number}) is being processed.`;
          notifType = 'status_update';
        } else if (req.status === 'approved' || req.status === 'ready_for_pickup') {
          notifTitle = 'Document Ready for Pickup! 🎉';
          notifMsg = `Your ${req.document_title || 'document'} is ready for pickup on ${req.pickup_date || 'your scheduled date'} (${req.pickup_time_slot || 'Window 2'}).`;
          notifType = 'ready_pickup';
        } else if (req.status === 'completed' || req.status === 'issued') {
          notifTitle = 'Document Released & Completed ✅';
          notifMsg = `Your ${req.document_title || 'document'} (Ref: ${req.tracking_number}) has been released.`;
          notifType = 'success';
        } else if (req.status === 'declined' || req.status === 'rejected') {
          notifTitle = 'Request Attention Required ⚠️';
          notifMsg = `Your request was returned: ${req.rejection_reason || 'Please check requirements or contact Barangay Hall.'}`;
          notifType = 'warning';
        }

        if (isResidentUuid) {
          await supabase.from('notifications').insert([{
            user_id: residentId,
            title: notifTitle,
            message: notifMsg,
            type: notifType,
            link_tab: 'requests',
            is_read: false,
            created_at: new Date().toISOString()
          }]);
        }
      }
    } catch {
      // Handled silently
    }

    StorageService.addLog({
      user_email: adminUser?.email || 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? `Request Status Updated (${req.status})` : 'New Document Requested',
      feature: 'Document Request',
      details: `Tracking Number: ${req.tracking_number}, Resident: ${req.resident_name || req.resident_email}, Status: ${req.status}`,
      level: 'info',
    });

    return req;
  },

  // EVENTS & ANNOUNCEMENTS
  getEvents: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    } catch {
      return INITIAL_EVENTS;
    }
  },

  getEventsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('events')
          .select('*, profiles:created_by(full_name, email)')
          .order('event_date', { ascending: true });

        if (data && !error && data.length > 0) {
          const formatted = data.map((evt) => ({
            ...evt,
            created_by_name: evt.profiles?.full_name || evt.profiles?.email || evt.created_by_name || 'Super Admin',
          }));
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(formatted));
          return formatted;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getEvents();
  },

  saveEvent: async (event) => {
    const events = StorageService.getEvents();
    const existingIndex = events.findIndex((e) => e.id === event.id);
    let saved = { ...event };

    if (existingIndex >= 0) {
      events[existingIndex] = { ...events[existingIndex], ...event };
      saved = events[existingIndex];
    } else {
      saved.id = saved.id || `evt-${Date.now()}`;
      saved.created_at = new Date().toISOString();
      events.unshift(saved);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        
        let profileId = isUuid(saved.created_by) ? saved.created_by : null;
        if (!profileId && (saved.created_by_email || saved.created_by_name)) {
          const emailToFind = saved.created_by_email || (saved.created_by_name?.includes('@') ? saved.created_by_name : null);
          if (emailToFind) {
            const { data: p } = await supabase.from('profiles').select('id').eq('email', emailToFind).maybeSingle();
            if (p?.id) profileId = p.id;
          }
        }

        const payload = {
          title: saved.title,
          description: saved.description,
          event_date: saved.event_date,
          location: saved.location,
          target_audience: saved.target_audience || 'all',
          image_url: saved.image_url,
          status: saved.status || 'upcoming',
          created_by: profileId,
          updated_at: new Date().toISOString(),
        };

        if (isUuid(saved.id)) {
          payload.id = saved.id;
          await supabase.from('events').upsert(payload);
        } else {
          const { data } = await supabase.from('events').insert([payload]).select();
          if (data && data[0]) {
            saved.id = data[0].id;
          }
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: saved.created_by_email || saved.created_by_name || 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Updated Barangay Event' : 'Posted New Barangay Event',
      feature: 'Event Information Management',
      details: `Title: ${saved.title}, Date: ${saved.event_date}, Venue: ${saved.location}`,
      level: 'info',
    });

    return saved;
  },

  deleteEvent: async (eventId) => {
    let events = StorageService.getEvents();
    const target = events.find((e) => e.id === eventId);
    events = events.filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
        if (isUuid) {
          await supabase.from('events').delete().eq('id', eventId);
        } else if (target) {
          await supabase.from('events').delete().eq('title', target.title);
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: (target && (target.created_by_email || target.created_by_name)) || 'superadmin@zapatera.gov.ph',
      action: 'Deleted Barangay Event',
      feature: 'Barangay Events',
      details: `Deleted event "${target ? target.title : eventId}"`,
      level: 'danger',
    });
  },

  // NEWS & ANNOUNCEMENTS (Maps to public.news and public.events)
  getNews: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NEWS) || '[]');
    } catch {
      return INITIAL_NEWS;
    }
  },

  getNewsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getNews();
  },

  saveNews: async (newsItem, adminUser) => {
    const news = StorageService.getNews();
    const existingIndex = news.findIndex((n) => n.id === newsItem.id);
    let saved = { ...newsItem };

    if (existingIndex >= 0) {
      news[existingIndex] = { ...news[existingIndex], ...newsItem };
      saved = news[existingIndex];
    } else {
      saved.id = saved.id || `news-${Date.now()}`;
      saved.created_at = new Date().toISOString();
      news.unshift(saved);
    }
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const adminId = adminUser?.id && isUuid(adminUser.id) ? adminUser.id : (isUuid(saved.created_by) ? saved.created_by : null);

        const payload = {
          title: saved.title,
          category: saved.category || 'Public Advisory',
          description: saved.description,
          content: saved.content || saved.description,
          banner_url: saved.banner_url || null,
          location: saved.location || 'Barangay Zapatera, Cebu City',
          author: saved.author || adminUser?.full_name || 'Office of the Super Admin',
          is_important: !!saved.is_important,
          is_emergency: !!saved.is_emergency,
          is_published: saved.is_published !== false,
          target_audience: saved.target_audience || 'all',
          created_by: adminId,
          updated_at: new Date().toISOString(),
        };

        if (isUuid(saved.id)) {
          payload.id = saved.id;
          await supabase.from('news').upsert(payload);
        } else {
          const { data } = await supabase.from('news').insert([payload]).select();
          if (data && data[0]) {
            saved.id = data[0].id;
          }
        }
      }
    } catch {
      // Handled silently
    }

    StorageService.addLog({
      user_email: adminUser?.email || 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Updated News Bulletin' : 'Published News Announcement',
      feature: 'News & Announcements',
      details: `Title: ${saved.title}, Category: ${saved.category}, Urgent: ${saved.is_emergency ? 'Yes' : 'No'}`,
      level: saved.is_emergency ? 'warning' : 'info',
    });

    return saved;
  },

  deleteNews: async (newsId) => {
    let news = StorageService.getNews();
    const target = news.find((n) => n.id === newsId);
    news = news.filter((n) => n.id !== newsId);
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newsId);
        if (isUuid) {
          await supabase.from('news').delete().eq('id', newsId);
        } else if (target) {
          await supabase.from('news').delete().eq('title', target.title);
        }
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Deleted News Bulletin',
      feature: 'News & Announcements',
      details: `Deleted bulletin "${target ? target.title : newsId}"`,
      level: 'danger',
    });
  },

  // SYSTEM CONFIG
  getConfig: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(INITIAL_CONFIG));
    } catch {
      return INITIAL_CONFIG;
    }
  },

  getConfigAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('system_config').select('*').eq('id', 1).maybeSingle();
        if (data && !error) {
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getConfig();
  },

  saveConfig: async (config) => {
    const updated = { ...config, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('system_config').upsert({ id: 1, ...updated });
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Updated System Configuration',
      feature: 'System Config',
      details: `Barangay: ${updated.barangay_name}, Office Hours: ${updated.office_hours}`,
      level: 'info',
    });

    return updated;
  },

  // NOTIFICATIONS
  getNotifications: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  getNotificationsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getNotifications();
  },

  addNotification: async (notif) => {
    const notifs = StorageService.getNotifications();
    const newEntry = {
      id: `notif-${Date.now()}`,
      created_at: new Date().toISOString(),
      is_read: false,
      ...notif,
    };
    notifs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('notifications').insert([{
          user_id: notif.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notif.user_id) ? notif.user_id : null,
          role_target: notif.role_target || 'all',
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          link_tab: notif.link_tab || 'requests',
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      }
    } catch {
      // Handled
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Broadcasted Notification',
      feature: 'Notifications',
      details: `Title: ${notif.title}, Target: ${notif.role_target || 'user'}`,
      level: 'info',
    });

    return newEntry;
  },

  // AUDIT LOGS
  getLogs: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    } catch {
      return INITIAL_LOGS;
    }
  },

  getLogsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getLogs();
  },

  addLog: async (log) => {
    const logs = StorageService.getLogs();
    const newEntry = {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...log,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 100)));

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          user_id: log.user_id || null,
          user_email: log.user_email || 'superadmin@zapatera.gov.ph',
          action: log.action || 'Super Admin Action',
          feature: log.feature || 'General',
          details: log.details || '',
          level: log.level || 'info',
          created_at: new Date().toISOString(),
        };
        await supabase.from('activity_logs').insert([payload]);
      } catch {
        // Handled silently
      }
    }
    return newEntry;
  },

  getCurrentUser: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return null;
  },

  setCurrentUser: (user) => {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    }
  },
};
