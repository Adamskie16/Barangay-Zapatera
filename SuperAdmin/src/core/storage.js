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
  LOGIN_DESIGNS: 'zapatera_login_designs_db',
  SESSION: 'zapatera_superadmin_session',
};

const DEFAULT_CONFIG = {
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

// Storage Service Class
export const StorageService = {
  // PROFILES / USERS (Directly maps to public.profiles)
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS) || '[]');
    } catch {
      return [];
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
              resident_name: profile.full_name || req.resident_name || 'Resident',
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

  // LOGIN DESIGNS CMS
  getLoginDesigns: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGIN_DESIGNS);
      return stored ? JSON.parse(stored) : INITIAL_LOGIN_DESIGNS;
    } catch {
      return INITIAL_LOGIN_DESIGNS;
    }
  },

  getLoginDesignsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('login_designs')
          .select('*')
          .order('created_at', { ascending: false });
        if (data && !error && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.LOGIN_DESIGNS, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('getLoginDesignsAsync fallback:', e);
    }
    return StorageService.getLoginDesigns();
  },

  getActiveLoginDesignAsync: async (portal = 'all') => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('login_designs')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });
        if (data && !error && data.length > 0) {
          const match = data.find((d) => d.target_portal === portal || d.target_portal === 'all') || data[0];
          return match;
        }
      }
    } catch (e) {}
    const local = StorageService.getLoginDesigns();
    return local.find((d) => d.is_active && (d.target_portal === portal || d.target_portal === 'all')) || local[0] || null;
  },

  createLoginDesign: async (design) => {
    const newEntry = {
      id: design.id || `ld-${Date.now()}`,
      title: design.title || 'Barangay Zapatera Portal',
      badge: design.badge || 'Barangay Administration',
      description: design.description || '',
      image_url: design.image_url || '/auth-bg.jpg',
      target_portal: design.target_portal || 'all',
      is_active: design.is_active || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const designs = StorageService.getLoginDesigns();
    if (newEntry.is_active) {
      designs.forEach((d) => {
        if (d.target_portal === newEntry.target_portal || newEntry.target_portal === 'all') {
          d.is_active = false;
        }
      });
    }
    designs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.LOGIN_DESIGNS, JSON.stringify(designs));

    if (isSupabaseConfigured()) {
      try {
        if (newEntry.is_active) {
          await supabase.from('login_designs').update({ is_active: false }).neq('id', newEntry.id);
        }
        await supabase.from('login_designs').insert([newEntry]);
      } catch (err) {
        console.warn('createLoginDesign supabase sync err:', err);
      }
    }

    StorageService.addLog({
      action: 'Created Login Design',
      feature: 'Login Design CMS',
      details: `Created new login design "${newEntry.title}"`,
      level: 'info',
    });

    return newEntry;
  },

  updateLoginDesign: async (id, updates) => {
    const designs = StorageService.getLoginDesigns();
    const index = designs.findIndex((d) => d.id === id);
    if (index >= 0) {
      const updated = {
        ...designs[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updated.is_active) {
        designs.forEach((d) => {
          if (d.id !== id && (d.target_portal === updated.target_portal || updated.target_portal === 'all')) {
            d.is_active = false;
          }
        });
      }

      designs[index] = updated;
      localStorage.setItem(STORAGE_KEYS.LOGIN_DESIGNS, JSON.stringify(designs));

      if (isSupabaseConfigured()) {
        try {
          if (updated.is_active) {
            await supabase.from('login_designs').update({ is_active: false }).neq('id', id);
          }
          await supabase.from('login_designs').update(updated).eq('id', id);
        } catch (err) {
          console.warn('updateLoginDesign supabase sync err:', err);
        }
      }

      StorageService.addLog({
        action: 'Updated Login Design',
        feature: 'Login Design CMS',
        details: `Updated login design "${updated.title}"`,
        level: 'info',
      });

      return updated;
    }
    return null;
  },

  setActiveLoginDesign: async (id, portal = 'all') => {
    const designs = StorageService.getLoginDesigns();
    let activated = null;
    designs.forEach((d) => {
      if (d.id === id) {
        d.is_active = true;
        d.updated_at = new Date().toISOString();
        activated = d;
      } else if (d.target_portal === portal || portal === 'all' || d.target_portal === 'all') {
        d.is_active = false;
      }
    });
    localStorage.setItem(STORAGE_KEYS.LOGIN_DESIGNS, JSON.stringify(designs));

    if (isSupabaseConfigured() && activated) {
      try {
        await supabase.from('login_designs').update({ is_active: false }).neq('id', id);
        await supabase.from('login_designs').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id);

        // Also update system_config table for fallback compatibility
        await supabase.from('system_config').upsert({
          id: 1,
          login_bg_url: activated.image_url,
          login_title: activated.title,
          login_badge: activated.badge,
          login_description: activated.description,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('setActiveLoginDesign supabase sync err:', err);
      }
    }

    StorageService.addLog({
      action: 'Activated Login Design',
      feature: 'Login Design CMS',
      details: `Activated login hero visual "${activated?.title || id}"`,
      level: 'info',
    });

    return activated;
  },

  deleteLoginDesign: async (id) => {
    const designs = StorageService.getLoginDesigns();
    const target = designs.find((d) => d.id === id);
    const filtered = designs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOGIN_DESIGNS, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('login_designs').delete().eq('id', id);
      } catch (err) {
        console.warn('deleteLoginDesign supabase sync err:', err);
      }
    }

    StorageService.addLog({
      action: 'Deleted Login Design',
      feature: 'Login Design CMS',
      details: `Deleted login design "${target?.title || id}"`,
      level: 'danger',
    });

    return true;
  },
};
