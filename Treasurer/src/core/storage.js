// Treasurer/src/core/storage.js
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  SESSION: 'zapatera_treasurer_session',
  REQUESTS: 'zapatera_requests_db',
  DOC_TYPES: 'zapatera_doc_types_db',
  CONFIG: 'zapatera_config_db',
  LOGIN_DESIGNS: 'zapatera_login_designs_db',
  LOGS: 'zapatera_logs_db',
  NOTIFICATIONS: 'zapatera_notifications_db',
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
        if (typeof localStorage !== 'undefined') {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
              localStorage.removeItem(k);
            }
          });
        }
        if (isSupabaseConfigured()) {
          try {
            supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          } catch (_) {}
        }
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
        const { data: reqData, error: reqErr } = await supabase
          .from('document_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!reqErr && reqData) {
          const [profilesRes, docTypesRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('document_types').select('*'),
          ]);

          const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
          const docTypesMap = new Map((docTypesRes.data || []).map((d) => [d.id, d]));

          const normalized = reqData.map((req) => {
            const profile = profilesMap.get(req.resident_id) || {};
            const docType = docTypesMap.get(req.document_type_id) || {};

            // Resolve fee: prioritize amount_paid > 0, then req.fee > 0, then docType.fee, then notes
            let resolvedFee = 0;
            if (Number(req.amount_paid) > 0) {
              resolvedFee = Number(req.amount_paid);
            } else if (Number(req.fee) > 0) {
              resolvedFee = Number(req.fee);
            } else if (docType.fee !== undefined && Number(docType.fee) >= 0) {
              resolvedFee = Number(docType.fee);
            } else if (typeof req.notes === 'string') {
              const feeMatch = req.notes.match(/Fee:\s*₱?\s*([\d,]+(?:\.\d+)?)/i);
              if (feeMatch) {
                const parsed = parseFloat(feeMatch[1].replace(/,/g, ''));
                if (!isNaN(parsed)) resolvedFee = parsed;
              }
            }

            const docTitle = docType.title || req.document_title || req.document_type || 'Barangay Document';
            const residentName = profile.full_name || req.resident_name || req.full_name || 'Resident Account';

            return {
              ...req,
              profiles: profile,
              document_types: docType,
              resident_name: residentName,
              full_name: residentName,
              user_name: residentName,
              resident_email: profile.email || req.resident_email || '',
              resident_phone: req.resident_phone || profile.phone || req.phone || '',
              document_title: docTitle,
              document_type: docTitle,
              document_name: docTitle,
              fee: resolvedFee,
              amount: resolvedFee,
            };
          });

          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(normalized));
          return normalized;
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
      if (req.claimed_fee !== undefined && req.claimed_fee !== null && Number(req.claimed_fee) >= 0) return Number(req.claimed_fee);
      if (Number(req.amount_paid) > 0) return Number(req.amount_paid);
      if (Number(req.fee) > 0) return Number(req.fee);
      if (Number(req.amount) > 0) return Number(req.amount);

      // Match against docTypes
      const match = docTypes.find(
        (d) =>
          d.id === req.document_type_id ||
          d.code === req.document_type ||
          d.title === req.document_type ||
          d.title === req.document_title ||
          d.title === req.document_name
      );
      if (match && Number(match.fee) > 0) {
        return Number(match.fee);
      }

      // Match from notes string (e.g. "Fee: ₱50")
      if (typeof req.notes === 'string') {
        const feeMatch = req.notes.match(/Fee:\s*₱?\s*([\d,]+(?:\.\d+)?)/i);
        if (feeMatch) {
          const parsed = parseFloat(feeMatch[1].replace(/,/g, ''));
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }

      return Number(req.fee) || 0;
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
      const s = String(req.status || '').toLowerCase().trim();
      const isWaived = req.payment_status === 'waived' || req.is_waived === true;
      const isPaid = !isWaived && (
        req.payment_status === 'paid' ||
        req.is_paid === true ||
        s === 'released' ||
        s === 'completed' ||
        Boolean(req.is_claimed) ||
        (s === 'approved' && req.payment_status === 'paid')
      );
      const isDeclined = s === 'declined' || s === 'rejected';
      const isUnpaid = !isPaid && !isWaived && !isDeclined;

      const docName = req.document_title || req.document_type || req.document_name || req.doc_type_title || 'General Document';

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

        const reqDate = new Date(req.payment_date || req.issued_at || req.claimed_at || req.updated_at || req.created_at || now);
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

  // GENERATE SEQUENTIAL OR NUMBER (Official Receipt)
  generateNextOrNumber: (existingRequests = []) => {
    try {
      const allReqs = existingRequests.length > 0 ? existingRequests : StorageService.getRequests();
      let maxNum = 0;
      const currentYear = new Date().getFullYear();
      const prefix = `OR-${currentYear}-`;

      allReqs.forEach((r) => {
        const or = String(r.or_number || r.official_receipt_number || '').trim();
        if (or.startsWith(prefix)) {
          const numPart = parseInt(or.replace(prefix, ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });

      const nextNum = maxNum + 1;
      return `${prefix}${String(nextNum).padStart(4, '0')}`;
    } catch {
      return `OR-${new Date().getFullYear()}-0001`;
    }
  },

  // RECORD PAYMENT & ISSUE OFFICIAL RECEIPT
  recordPaymentAsync: async ({
    requestId,
    trackingNumber,
    amount,
    paymentMethod = 'cash',
    orNumber,
    notes = '',
    markCompleted = true,
  }) => {
    const now = new Date().toISOString();
    const finalOrNumber = orNumber || StorageService.generateNextOrNumber();
    const parsedAmount = Number(amount) || 0;

    // 1. Update localStorage
    const localRequests = StorageService.getRequests();
    let updatedRequest = null;

    const updatedRequests = localRequests.map((req) => {
      const match = (req.id && req.id === requestId) || (req.tracking_number && req.tracking_number === trackingNumber);
      if (match) {
        updatedRequest = {
          ...req,
          payment_status: 'paid',
          is_paid: true,
          fee: parsedAmount,
          amount_paid: parsedAmount,
          payment_method: paymentMethod,
          or_number: finalOrNumber,
          official_receipt_number: finalOrNumber,
          payment_date: now,
          treasurer_notes: notes,
          status: markCompleted ? 'completed' : (req.status || 'approved'),
          updated_at: now,
          ...(markCompleted
            ? {
                issued_at: req.issued_at || now,
                claimed_at: req.claimed_at || now,
                is_claimed: true,
              }
            : {}),
        };
        return updatedRequest;
      }
      return req;
    });

    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updatedRequests));

    // 2. Update Supabase if configured
    try {
      if (isSupabaseConfigured()) {
        const isUuid = requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
        const currentUser = StorageService.getCurrentUser();

        const payload = {
          payment_status: 'paid',
          is_paid: true,
          payment_method: paymentMethod,
          or_number: finalOrNumber,
          payment_date: now,
          fee: parsedAmount,
          updated_at: now,
        };

        if (markCompleted) {
          payload.status = 'completed';
          payload.issued_at = now;
          payload.claimed_at = now;
          payload.is_claimed = true;
        }

        let query = supabase.from('document_requests').update(payload);
        if (isUuid) {
          query = query.eq('id', requestId);
        } else if (trackingNumber) {
          query = query.eq('tracking_number', trackingNumber);
        }

        const { error } = await query;
        if (error) {
          console.warn('Supabase document_requests payment update note:', error);
          // Retry with core columns
          const minimalPayload = {
            payment_status: 'paid',
            is_paid: true,
            status: markCompleted ? 'completed' : 'approved',
            updated_at: now,
          };
          if (isUuid) {
            await supabase.from('document_requests').update(minimalPayload).eq('id', requestId);
          } else if (trackingNumber) {
            await supabase.from('document_requests').update(minimalPayload).eq('tracking_number', trackingNumber);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase recordPaymentAsync catch:', err);
    }

    // 3. Log Activity
    StorageService.logActivity({
      action: 'Recorded Payment',
      module: 'Treasury Collections',
      details: `Collected ₱${parsedAmount} (${paymentMethod.toUpperCase()}) for tracking #${trackingNumber || requestId} with OR No. ${finalOrNumber}.`,
    });

    return updatedRequest;
  },

  // WAIVE PAYMENT (Indigent, Senior, PWD, Student)
  waivePaymentAsync: async ({
    requestId,
    trackingNumber,
    reason = 'Indigent Resident',
    notes = '',
    markCompleted = true,
  }) => {
    const now = new Date().toISOString();

    // 1. Update localStorage
    const localRequests = StorageService.getRequests();
    let updatedRequest = null;

    const updatedRequests = localRequests.map((req) => {
      const match = (req.id && req.id === requestId) || (req.tracking_number && req.tracking_number === trackingNumber);
      if (match) {
        updatedRequest = {
          ...req,
          payment_status: 'waived',
          is_waived: true,
          waived_reason: reason,
          treasurer_notes: notes,
          status: markCompleted ? 'completed' : (req.status || 'approved'),
          updated_at: now,
          ...(markCompleted
            ? {
                issued_at: req.issued_at || now,
                claimed_at: req.claimed_at || now,
                is_claimed: true,
              }
            : {}),
        };
        return updatedRequest;
      }
      return req;
    });

    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updatedRequests));

    // 2. Update Supabase
    try {
      if (isSupabaseConfigured()) {
        const isUuid = requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);

        const payload = {
          payment_status: 'waived',
          is_waived: true,
          waived_reason: reason,
          updated_at: now,
        };

        if (markCompleted) {
          payload.status = 'completed';
          payload.is_claimed = true;
          payload.issued_at = now;
        }

        let query = supabase.from('document_requests').update(payload);
        if (isUuid) {
          query = query.eq('id', requestId);
        } else if (trackingNumber) {
          query = query.eq('tracking_number', trackingNumber);
        }

        const { error } = await query;
        if (error) {
          console.warn('Supabase document_requests waive update note:', error);
          const minPayload = {
            payment_status: 'waived',
            status: markCompleted ? 'completed' : 'approved',
            updated_at: now,
          };
          if (isUuid) {
            await supabase.from('document_requests').update(minPayload).eq('id', requestId);
          } else if (trackingNumber) {
            await supabase.from('document_requests').update(minPayload).eq('tracking_number', trackingNumber);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase waivePaymentAsync catch:', err);
    }

    // 3. Log Activity
    StorageService.logActivity({
      action: 'Waived Fee',
      module: 'Treasury Collections',
      details: `Waived fee for tracking #${trackingNumber || requestId}. Reason: ${reason}.`,
    });

    return updatedRequest;
  },

  // LOG ACTIVITY / AUDIT LOG
  logActivity: (activity) => {
    try {
      const currentUser = StorageService.getCurrentUser();
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
      const newEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        action: activity.action || 'Activity',
        module: activity.module || 'Treasury',
        details: activity.details || '',
        performed_by: activity.performed_by || currentUser?.full_name || 'Barangay Treasurer',
        role: 'treasurer',
      };
      logs.unshift(newEntry);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 500)));

      if (isSupabaseConfigured()) {
        supabase.from('audit_logs').insert([{
          action: newEntry.action,
          module: newEntry.module,
          details: newEntry.details,
          performed_by: currentUser?.id || null,
          role: 'treasurer',
          created_at: newEntry.created_at,
        }]).then(() => {}).catch(() => {});
      }
    } catch (e) {
      console.warn('logActivity warning:', e);
    }
  },

  // UPDATE TREASURER PROFILE
  updateProfileAsync: async (userData) => {
    const currentUser = StorageService.getCurrentUser() || {};
    const updated = {
      ...currentUser,
      ...userData,
      updated_at: new Date().toISOString(),
    };

    StorageService.setCurrentUser(updated);

    if (isSupabaseConfigured() && updated.id) {
      try {
        const payload = {
          full_name: updated.full_name,
          phone: updated.phone || null,
          gender: updated.gender || null,
          age: updated.age || null,
          updated_at: new Date().toISOString(),
        };
        if (updated.avatar_url) {
          payload.avatar_url = updated.avatar_url;
        }

        await supabase.from('profiles').update(payload).eq('id', updated.id);
      } catch (e) {
        console.warn('Profile update in Supabase warning:', e);
      }
    }

    return updated;
  },
};
