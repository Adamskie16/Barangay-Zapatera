// Admin/src/core/storage.js
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  ADMINS: 'zapatera_admins_db',
  DOC_TYPES: 'zapatera_doc_types_db',
  REQUESTS: 'zapatera_requests_db',
  EVENTS: 'zapatera_events_db',
  NEWS: 'zapatera_news_db',
  CONFIG: 'zapatera_config_db',
  LOGS: 'zapatera_logs_db',
  NOTIFICATIONS: 'zapatera_notifications_db',
  SESSION: 'zapatera_admin_session',
};

// Default seed data for initial cache
const INITIAL_ADMINS = [
  {
    id: 'adm-000',
    email: 'mardee131@gmail.com',
    full_name: 'Mardee (Barangay Admin)',
    first_name: 'Mardee',
    last_name: 'Admin',
    middle_initial: 'M',
    role: 'admin',
    phone: '09171234567',
    address: 'Sitio Upper, Zapatera, Cebu City',
    id_type: 'Barangay ID',
    id_number: 'ADM-00001',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'adm-001',
    email: 'admin@zapatera.gov.ph',
    full_name: 'Maria Santos (Barangay Secretary)',
    first_name: 'Maria',
    last_name: 'Santos',
    middle_initial: 'G',
    role: 'admin',
    phone: '09187654321',
    address: 'Sitio Upper, Zapatera, Cebu City',
    id_type: 'Barangay ID',
    id_number: 'ADM-10492',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-05').toISOString(),
  }
];

const INITIAL_DOC_TYPES = [];

const INITIAL_REQUESTS = [];

const INITIAL_EVENTS = [];

const INITIAL_NEWS = [];

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
  login_bg_url: '/auth-bg.jpg',
  login_title: '',
  login_badge: '',
  login_description: '',
  updated_at: new Date().toISOString(),
};

const INITIAL_LOGS = [
  {
    id: 'log-001',
    user_email: 'admin@zapatera.gov.ph',
    action: 'Processed Request (Approved)',
    feature: 'Process Documents',
    details: 'Tracking: BZ-2026-8812, Status: approved',
    level: 'info',
    created_at: new Date('2026-07-21T14:20:00').toISOString(),
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    title: 'New Document Application Received',
    message: 'Resident Juan Dela Cruz submitted a Barangay Clearance request (BZ-2026-9041).',
    type: 'info',
    is_read: false,
    created_at: new Date('2026-07-20T10:30:00').toISOString(),
  }
];

const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
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

export const StorageService = {
  // PROFILES / USERS (Directly maps to public.profiles)
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMINS) || '[]');
    } catch {
      return INITIAL_ADMINS;
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
          localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(data));
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
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      user.id = user.id || `adm-${Date.now()}`;
      user.created_at = new Date().toISOString();
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(users));

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('profiles').upsert({
          ...user,
          updated_at: new Date().toISOString()
        });
      }
    } catch {
      // Ignore
    }

    return user;
  },

  // DOCUMENT TYPES (Directly maps to public.document_types)
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

        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(data));
          return data;
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
    let saved = { ...docType };

    if (existingIndex >= 0) {
      docTypes[existingIndex] = { ...docTypes[existingIndex], ...docType };
      saved = docTypes[existingIndex];
    } else {
      saved.created_at = new Date().toISOString();
      docTypes.push(saved);
    }
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id);
        const payload = {
          code: saved.code,
          title: saved.title,
          description: saved.description || '',
          fee: parseFloat(saved.fee) || 0,
          processing_days: parseInt(saved.processing_days) || 1,
          requirements: Array.isArray(saved.requirements) ? saved.requirements : [],
          is_active: saved.is_active !== false,
          updated_at: new Date().toISOString(),
        };
        if (isUuid) {
          payload.id = saved.id;
        }
        await supabase.from('document_types').upsert(payload, { onConflict: 'code' });
      }
    } catch {
      // handled
    }

    return saved;
  },

  deleteDocType: async (docTypeId) => {
    let docTypes = StorageService.getDocTypes();
    docTypes = docTypes.filter((d) => d.id !== docTypeId);
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docTypeId);
        if (isUuid) {
          await supabase.from('document_types').delete().eq('id', docTypeId);
        }
      }
    } catch {
      // handled
    }
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
        const { data: reqData, error: reqErr } = await supabase
          .from('document_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!reqErr && reqData && reqData.length > 0) {
          const [profilesRes, docTypesRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('document_types').select('*'),
          ]);

          const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
          const docTypesMap = new Map((docTypesRes.data || []).map((d) => [d.id, d]));

          const normalized = reqData.map((req) => {
            const profile = profilesMap.get(req.resident_id) || {};
            const docType = docTypesMap.get(req.document_type_id) || {};
            return {
              ...req,
              profiles: profile,
              document_types: docType,
              resident_name: profile.full_name || req.resident_name || 'Resident User',
              resident_email: profile.email || req.resident_email,
              resident_phone: profile.phone || req.resident_phone,
              resident_address: profile.address || profile.sitio || req.resident_address,
              document_title: docType.title || req.document_title || 'Barangay Document',
              fee: docType.fee !== undefined ? docType.fee : (req.fee || 0),
              pickup_date: req.pickup_date || 'To be scheduled',
              pickup_time_slot: req.pickup_time_slot || 'Regular Office Hours',
            };
          });

          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch {
      // fallback to local
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

    // Supabase update & targeted resident notification
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

        // Automatic user-specific Notification creation in public.notifications
        const residentId = req.resident_id || req.profiles?.id;
        const isResidentUuid = residentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(residentId);
        
        let notifTitle = 'Application Status Updated';
        let notifMsg = `Your request ${req.tracking_number || ''} status is now: ${req.status}.`;
        let notifType = 'info';

        if (req.status === 'under_review' || req.status === 'processing') {
          notifTitle = 'Request Under Review 📄';
          notifMsg = `Your ${req.document_title || 'document request'} (Ref: ${req.tracking_number}) is being processed by Barangay Admin.`;
          notifType = 'status_update';
        } else if (req.status === 'approved' || req.status === 'ready_for_pickup') {
          notifTitle = 'Document Ready for Pickup! 🎉';
          notifMsg = `Your ${req.document_title || 'document'} is ready for pickup on ${req.pickup_date || 'your scheduled date'} (${req.pickup_time_slot || 'Window 2'}).`;
          notifType = 'ready_pickup';
        } else if (req.status === 'completed' || req.status === 'issued') {
          notifTitle = 'Document Released & Completed ✅';
          notifMsg = `Your ${req.document_title || 'document'} (Ref: ${req.tracking_number}) has been released. Thank you!`;
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
      user_email: adminUser?.email || req.processed_by || 'admin@zapatera.gov.ph',
      action: existingIndex >= 0 ? `Updated Request Status (${req.status})` : 'New Request',
      feature: 'Process Documents',
      details: `Tracking: ${req.tracking_number}, Resident: ${req.resident_name || req.resident_email}, Status: ${req.status}`,
      level: req.status === 'declined' || req.status === 'rejected' ? 'warning' : 'info',
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
            created_by_name: evt.profiles?.full_name || evt.profiles?.email || evt.created_by_name || 'Admin',
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
      user_email: saved.created_by_email || saved.created_by_name || 'admin@zapatera.gov.ph',
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
  },

  getConfig: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(INITIAL_CONFIG));
    } catch {
      return INITIAL_CONFIG;
    }
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
          author: saved.author || adminUser?.full_name || 'Barangay Administration',
          is_important: !!saved.is_important,
          is_emergency: !!saved.is_emergency,
          is_published: saved.is_published !== false,
          target_audience: saved.target_audience || 'residents',
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
      user_email: adminUser?.email || 'admin@zapatera.gov.ph',
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
      user_email: 'admin@zapatera.gov.ph',
      action: 'Deleted News Bulletin',
      feature: 'News & Announcements',
      details: `Deleted bulletin "${target ? target.title : newsId}"`,
      level: 'danger',
    });
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

        if (!error && data && data.length > 0) {
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
          user_email: log.user_email || 'admin@zapatera.gov.ph',
          action: log.action || 'Admin Action',
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

  getNotifications: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
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

  // SECURITY & MFA LOGIC
  recordFailedAttempt: async (email) => {
    try {
      if (isSupabaseConfigured() && email) {
        await supabase.rpc('record_failed_login_attempt', { user_email: email });
      }
    } catch {
      // Handled silently
    }

    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email?.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      const user = users[userIndex];
      const failed = (user.failed_attempts || 0) + 1;
      user.failed_attempts = failed;
      if (failed >= 3) {
        user.is_locked = true;
        user.is_active = false;
        StorageService.addLog({
          user_email: user.email,
          action: 'ACCOUNT LOCKED OUT',
          feature: 'Security Lockdown',
          details: `Account locked due to 3 consecutive failed login attempts.`,
          level: 'danger',
        });
      }
      users[userIndex] = user;
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(users));
      return user;
    }
    return null;
  },

  resetFailedAttempts: async (email) => {
    try {
      if (isSupabaseConfigured() && email) {
        await supabase.rpc('reset_account_lockout', { user_email: email });
      }
    } catch {
      // Handled silently
    }

    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email?.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      users[userIndex].failed_attempts = 0;
      users[userIndex].is_locked = false;
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  unlockUser: async (email) => {
    try {
      if (isSupabaseConfigured() && email) {
        await supabase.rpc('reset_account_lockout', { user_email: email });
      }
    } catch {
      // Handled silently
    }

    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email?.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      users[userIndex].failed_attempts = 0;
      users[userIndex].is_locked = false;
      users[userIndex].is_active = true;
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(users));
      StorageService.addLog({
        user_email: email,
        action: 'ACCOUNT UNLOCKED',
        feature: 'User Management',
        details: `Account ${email} was unlocked by administrator.`,
        level: 'info',
      });
      return users[userIndex];
    }
    return null;
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
      user_email: 'admin@zapatera.gov.ph',
      action: 'Updated System Settings',
      feature: 'System Configuration',
      details: 'Updated global system parameters and login design settings.',
      level: 'info',
    });

    return updated;
  },
};
