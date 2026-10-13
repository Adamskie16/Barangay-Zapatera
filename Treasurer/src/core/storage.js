// Treasurer/src/core/storage.js
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  SESSION: 'zapatera_treasurer_session',
  REQUESTS: 'zapatera_requests_db',
  DOC_TYPES: 'zapatera_doc_types_db',
  CONFIG: 'zapatera_config_db',
  LOGIN_DESIGNS: 'zapatera_login_designs_db',
};

const DEFAULT_CONFIG = {
  barangay_name: 'Barangay Zapatera',
  municipality: 'Cebu City',
  province: 'Cebu',
  punong_barangay: 'HON. DAVID M. AGRAVANTE',
  signatory_title: 'Punong Barangay',
  treasurer_name: 'HON. MA. LOURDES S. RAMOS',
  treasurer_title: 'Barangay Treasurer',
  seal_url: '/zapatera_seal.png',
  hall_address: '197 D. Jakosalem St., Cebu City',
  office_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
  contact_email: 'zapatera.lnb24@gmail.com',
  contact_phone: '(032)503-6465',
  doc_prefix: 'BZ-2026',
  updated_at: new Date().toISOString(),
};

export const StorageService = {
  // SESSION MANAGEMENT
  getCurrentUser: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setCurrentUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        localStorage.setItem('zapatera_session_user', JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem('zapatera_session_user');
      }
    } catch (e) {
      console.warn('Failed to update session:', e);
    }
  },

  // CONFIGURATION
  getConfig: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_CONFIG;
  },

  getConfigAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('barangay_config')
          .select('*')
          .maybeSingle();

        if (!error && data) {
          const merged = { ...DEFAULT_CONFIG, ...data };
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
          return merged;
        }
      }
    } catch (err) {}
    return StorageService.getConfig();
  },

  // DOCUMENT TYPES (FEE SCHEDULE TEMPLATES) - READ-ONLY
  getDocTypes: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOC_TYPES) || '[]');
    } catch {
      return [];
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
    } catch (e) {}
    return StorageService.getDocTypes();
  },

  // DOCUMENT REQUESTS / FINANCIAL TRANSACTIONS - STRICTLY READ-ONLY
  getRequests: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REQUESTS) || '[]');
    } catch {
      return [];
    }
  },

  getRequestsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('document_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn('Supabase getRequestsAsync error:', err);
    }
    return StorageService.getRequests();
  },

  // REALTIME SUBSCRIPTION FOR FINANCIAL AUDIT UPDATES
  subscribeToRequests: (onUpdate) => {
    if (!isSupabaseConfigured()) return () => {};

    try {
      const channel = supabase
        .channel('treasurer_document_requests_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'document_requests' },
          async () => {
            const fresh = await StorageService.getRequestsAsync();
            if (typeof onUpdate === 'function') {
              onUpdate(fresh);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Failed to subscribe to requests:', e);
      return () => {};
    }
  },

  // LOGIN BRANDING ASSETS (Fetched from Account Management login_designs CMS & system_config)
  getLoginDesigns: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGIN_DESIGNS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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

  getActiveLoginDesignAsync: async (portal = 'treasurer') => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('login_designs')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });
        if (data && !error && data.length > 0) {
          const match = data.find((d) => d.target_portal === portal || d.target_portal === 'treasurer' || d.target_portal === 'all') || data[0];
          return match;
        }
      }
    } catch (e) {}
    const local = StorageService.getLoginDesigns();
    return local.find((d) => d.is_active && (d.target_portal === portal || d.target_portal === 'treasurer' || d.target_portal === 'all')) || local[0] || null;
  },

  getSupabaseLoginAssetsAsync: async (portal = 'treasurer') => {
    let pictureUrl = null;
    let sealUrl = null;
    let title = 'Treasury & Revenue Governance, Made Transparent.';
    let badge = 'Barangay Zapatera';
    let description = 'Audit municipal collections, verify clearance fee schedules, and track revenue disbursements through one secure municipal portal.';

    // 1. Try Supabase login_designs table (managed by Account Management)
    if (isSupabaseConfigured()) {
      try {
        const { data: designs, error: designErr } = await supabase
          .from('login_designs')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

        if (!designErr && designs && designs.length > 0) {
          const match = designs.find((d) => d.target_portal === portal || d.target_portal === 'treasurer' || d.target_portal === 'all') || designs[0];
          if (match) {
            if (match.image_url && match.image_url.trim()) {
              pictureUrl = match.image_url.trim();
            }
            if (match.title) title = match.title;
            if (match.badge) badge = match.badge;
            if (match.description) description = match.description;
          }
        }
      } catch (err) {
        console.warn('Failed to load active login design from Supabase:', err);
      }

      // 2. Fallback to system_config table
      try {
        const { data: cfg, error: cfgErr } = await supabase
          .from('system_config')
          .select('login_bg_url, seal_url, login_title, login_badge, login_description')
          .eq('id', 1)
          .maybeSingle();

        if (!cfgErr && cfg) {
          if (!pictureUrl && cfg.login_bg_url && cfg.login_bg_url.trim() && cfg.login_bg_url !== '/auth-bg.jpg') {
            pictureUrl = cfg.login_bg_url.trim();
          }
          if (cfg.seal_url && cfg.seal_url.trim()) {
            sealUrl = cfg.seal_url.trim();
          }
          if (!title && cfg.login_title) title = cfg.login_title;
          if (!badge && cfg.login_badge) badge = cfg.login_badge;
          if (!description && cfg.login_description) description = cfg.login_description;
        }
      } catch (err) {
        console.warn('Failed to load config from Supabase:', err);
      }

      // Resolve relative storage path to public URL
      if (pictureUrl && !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://') && !pictureUrl.startsWith('data:')) {
        const cleanPath = pictureUrl.replace(/^\/+/, '');
        try {
          const { data: publicUrlData } = supabase.storage.from('public_assets').getPublicUrl(cleanPath);
          if (publicUrlData?.publicUrl) {
            pictureUrl = publicUrlData.publicUrl;
          }
        } catch {}
      }
    }

    // 3. Fallback to localStorage zapatera_login_designs_db (synchronized from Account Management)
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGIN_DESIGNS);
      if (stored) {
        const localDesigns = JSON.parse(stored);
        if (Array.isArray(localDesigns) && localDesigns.length > 0) {
          const activeMatch = localDesigns.find((d) => d.is_active && (d.target_portal === portal || d.target_portal === 'treasurer' || d.target_portal === 'all'))
            || localDesigns.find((d) => d.is_active)
            || localDesigns[0];
          if (activeMatch) {
            if (!pictureUrl && activeMatch.image_url) pictureUrl = activeMatch.image_url;
            if (activeMatch.title) title = activeMatch.title;
            if (activeMatch.badge) badge = activeMatch.badge;
            if (activeMatch.description) description = activeMatch.description;
          }
        }
      }
    } catch {}

    return {
      pictureUrl,
      sealUrl: sealUrl || '/logo.png',
      title,
      badge,
      description,
    };
  },

  // FINANCIAL AUDIT COMPUTATIONS
  calculateFinancialMetrics: (requests = [], docTypes = []) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDateStr = now.toISOString().split('T')[0];

    // Helper to get fee for request
    const getRequestFee = (req) => {
      if (req.fee !== undefined && req.fee !== null) return Number(req.fee) || 0;
      if (req.amount !== undefined && req.amount !== null) return Number(req.amount) || 0;
      // Fallback matching against docType
      const match = docTypes.find((d) => d.id === req.document_type_id || d.code === req.document_type || d.title === req.document_type);
      return match ? Number(match.fee) || 0 : 0;
    };

    let totalRevenue = 0;
    let todayRevenue = 0;
    let thisMonthRevenue = 0;
    let paidCount = 0;
    let waivedCount = 0;
    let waivedAmount = 0;
    let unpaidCount = 0;
    let unpaidAmount = 0;

    const breakdownMap = {};

    requests.forEach((req) => {
      const fee = getRequestFee(req);
      const isPaid = req.payment_status === 'paid' || req.is_paid === true || req.status === 'released' || req.status === 'completed';
      const isWaived = req.payment_status === 'waived' || req.is_waived === true;
      const isUnpaid = !isPaid && !isWaived;

      const docName = req.document_type || req.document_name || req.doc_type_title || 'General Document';

      if (!breakdownMap[docName]) {
        breakdownMap[docName] = {
          name: docName,
          totalTransactions: 0,
          paidTransactions: 0,
          totalRevenue: 0,
        };
      }
      breakdownMap[docName].totalTransactions += 1;

      if (isPaid) {
        paidCount += 1;
        totalRevenue += fee;
        breakdownMap[docName].paidTransactions += 1;
        breakdownMap[docName].totalRevenue += fee;

        const reqDate = new Date(req.payment_date || req.created_at || now);
        if (reqDate.toISOString().split('T')[0] === todayDateStr) {
          todayRevenue += fee;
        }
        if (reqDate.getFullYear() === currentYear && reqDate.getMonth() === currentMonth) {
          thisMonthRevenue += fee;
        }
      } else if (isWaived) {
        waivedCount += 1;
        waivedAmount += fee;
      } else if (isUnpaid) {
        unpaidCount += 1;
        unpaidAmount += fee;
      }
    });

    const breakdownList = Object.values(breakdownMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      paidCount,
      waivedCount,
      waivedAmount,
      unpaidCount,
      unpaidAmount,
      totalTransactions: requests.length,
      breakdownList,
    };
  },
};
