// Admin/src/features/users/UserManagementView.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import UserAvatar from '../../components/UserAvatar';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Calendar,
  Smartphone,
  Radio,
  Power,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Clock,
  Laptop,
  Bell,
  Fingerprint,
  Sliders,
  Check,
  Activity,
  Info,
  Vote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';
import ActionModal from '../../components/ActionModal';

export const isUserRegisteredVoter = (user) => {
  if (!user) return false;
  if (user.is_registered_voter === true) return true;
  if (user.is_registered_voter === false) return false;
  const status = String(user.voter_status || '').toLowerCase().trim();
  if (status.includes('not registered') || status.includes('non') || status === 'unregistered' || status === 'no' || status === 'false') {
    return false;
  }
  if (status.includes('registered') || status.includes('voter') || status === 'yes' || status === 'true') {
    return true;
  }
  const idType = String(user.id_type || '').toLowerCase().trim();
  if (idType.includes('voter')) return true;
  return false;
};

export const calculateAge = (birthDateStr) => {
  if (!birthDateStr) return null;
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const getResidentNameParts = (user) => {
  let first = (user?.first_name || '').trim();
  let mi = (user?.middle_initial || '').trim().replace(/\.$/, '');
  let last = (user?.last_name || '').trim();

  if ((!first || !last) && user?.full_name) {
    const fn = user.full_name.trim();
    if (fn.includes(',')) {
      const [lastPart, firstPart] = fn.split(',').map((s) => s.trim());
      last = last || lastPart;
      const tokens = (firstPart || '').split(/\s+/);
      if (tokens.length > 1 && tokens[tokens.length - 1].length <= 2) {
        mi = mi || tokens[tokens.length - 1].replace(/\.$/, '');
        first = first || tokens.slice(0, -1).join(' ');
      } else {
        first = first || firstPart;
      }
    } else {
      const tokens = fn.split(/\s+/);
      if (tokens.length === 1) {
        first = first || tokens[0];
      } else if (tokens.length === 2) {
        first = first || tokens[0];
        last = last || tokens[1];
      } else if (tokens.length >= 3) {
        const lastToken = tokens[tokens.length - 1];
        const secondLast = tokens[tokens.length - 2];
        if (secondLast.length <= 2) {
          first = first || tokens.slice(0, -2).join(' ');
          mi = mi || secondLast.replace(/\.$/, '');
          last = last || lastToken;
        } else {
          first = first || tokens.slice(0, -1).join(' ');
          last = last || lastToken;
        }
      }
    }
  }

  return { first, mi, last };
};


export default function UserManagementView({ currentUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'locked'
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'resident', 'admin', 'treasurer', 'super_admin'
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reusable Feedback / Confirmation ActionModal State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonText: 'OK',
    onConfirm: null,
    onClose: null,
    isDestructive: false,
    isLoading: false,
  });

  // Credentials Detail Modal State
  const [viewingUser, setViewingUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [userDevices, setUserDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('telemetry');

  const fetchUserDevices = async (userId) => {
    if (!userId) return;
    setLoadingDevices(true);
    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (isUuid) {
          const { data, error } = await supabase
            .from('user_devices')
            .select('*')
            .eq('user_id', userId)
            .order('last_login_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setUserDevices(data);
            setLoadingDevices(false);
            return;
          }
        }
      }
    } catch {
      // Handled
    }

    // Default dynamic device telemetry fallback
    try {
      const stored = localStorage.getItem(`zapatera_user_devices_${userId}`);
      if (stored) {
        setUserDevices(JSON.parse(stored));
      } else {
        setUserDevices([
          {
            id: `dev_${userId || 'current'}`,
            device_id: `dev_client_${userId?.substring(0, 6) || 'mobile'}`,
            device_name: 'Mobile Resident Client',
            device_model: 'Smartphone (Resident App)',
            os_name: 'iOS / Android',
            os_version: 'Current',
            app_version: '1.0.0',
            push_token: 'token_active_verified',
            push_token_status: 'active',
            is_active: true,
            ip_address: '127.0.0.1',
            last_login_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setUserDevices([]);
    }
    setLoadingDevices(false);
  };

  const handleOpenViewModal = async (user) => {
    if (!user) return;
    let enriched = { ...user };

    // 1. Fetch full profile from Supabase to guarantee all latest columns
    if (isSupabaseConfigured() && (user.id || user.email)) {
      try {
        let query = supabase.from('profiles').select('*');
        if (user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
          query = query.eq('id', user.id);
        } else if (user.email) {
          query = query.eq('email', user.email.toLowerCase().trim());
        }
        const { data: dbProfile } = await query.maybeSingle();
        if (dbProfile) {
          enriched = {
            ...enriched,
            ...dbProfile,
            created_at: dbProfile.created_at || enriched.created_at,
            updated_at: dbProfile.updated_at || enriched.updated_at,
            last_edited_at: dbProfile.last_edited_at || enriched.last_edited_at,
          };
        }
      } catch (err) {
        console.warn('Notice: Error fetching full resident profile:', err);
      }
    }

    // 2. Fetch and merge credentials from local storage (residents, admins, super_admins)
    try {
      const cleanEmail = (user.email || '').toLowerCase().trim();
      let match = null;

      // Check residents db
      const storedRes = localStorage.getItem('zapatera_residents_db');
      if (storedRes) {
        const residents = JSON.parse(storedRes);
        if (Array.isArray(residents)) {
          match = residents.find(
            (r) => (r.email && r.email.toLowerCase() === cleanEmail) || (r.id && r.id === user.id)
          );
        }
      }

      // If not found or user is admin/treasurer, check admins db
      if (!match) {
        const storedAdmins = localStorage.getItem('zapatera_admins_db');
        if (storedAdmins) {
          const admins = JSON.parse(storedAdmins);
          if (Array.isArray(admins)) {
            match = admins.find(
              (a) => (a.email && a.email.toLowerCase() === cleanEmail) || (a.id && a.id === user.id)
            );
          }
        }
      }

      // If still not found, check super admins db
      if (!match) {
        const storedSAs = localStorage.getItem('zapatera_super_admins_db');
        if (storedSAs) {
          const superAdmins = JSON.parse(storedSAs);
          if (Array.isArray(superAdmins)) {
            match = superAdmins.find(
              (s) => (s.email && s.email.toLowerCase() === cleanEmail) || (s.id && s.id === user.id)
            );
          }
        }
      }

      if (match) {
        enriched = {
          ...match,
          ...enriched,
          created_at: enriched.created_at || match.created_at,
          updated_at: enriched.updated_at || match.updated_at,
          last_edited_at: enriched.last_edited_at || match.last_edited_at,
          first_name: enriched.first_name || match.first_name,
          last_name: enriched.last_name || match.last_name,
          middle_initial: enriched.middle_initial || match.middle_initial,
          birth_date: enriched.birth_date || match.birth_date || match.birthdate,
          civil_status: enriched.civil_status || match.civil_status,
          sitio: enriched.sitio || match.sitio,
          voter_status: enriched.voter_status || match.voter_status,
          phone: enriched.phone || match.phone,
          address: enriched.address || match.address,
        };
      }
      if (enriched.role !== 'resident') {
        enriched.voter_status = null;
        enriched.sitio = null;
      }
    } catch (e) {}

    // 3. Fallback name parsing
    const nameParts = getResidentNameParts(enriched);
    enriched.first_name = enriched.first_name || nameParts.first;
    enriched.middle_initial = enriched.middle_initial || nameParts.mi;
    enriched.last_name = enriched.last_name || nameParts.last;

    setViewingUser(enriched);
    setIsViewModalOpen(true);
  };

  const handleTerminateDeviceSession = (device) => {
    if (!device || !viewingUser) return;

    setActionModal({
      isOpen: true,
      type: 'warning',
      title: 'Terminate Active Device Session?',
      message: `Are you sure you want to terminate the active session on "${device.device_name || device.device_model || 'this device'}"? The user will be immediately logged out of this device.`,
      confirmText: 'Terminate Session',
      cancelText: 'Keep Active',
      isDestructive: true,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isOpen: false }));
        try {
          if (isSupabaseConfigured() && device.id) {
            await supabase
              .from('user_devices')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('id', device.id);

            // Audit Log
            await supabase.from('activity_logs').insert({
              user_email: currentUser?.email || 'admin@zapatera.gov.ph',
              action: `Terminated Device Session: ${device.device_name || device.device_id}`,
              feature: 'User Account Security',
              details: `Revoked session for resident ${viewingUser.email} on ${device.device_name || device.device_id}`,
              level: 'warning',
            });
          }

          // Update local state
          setUserDevices((prev) =>
            prev.map((d) => (d.id === device.id ? { ...d, is_active: false } : d))
          );

          setActionModal({
            isOpen: true,
            type: 'success',
            title: 'Session Terminated Successfully',
            message: `The device session for ${device.device_name || 'this device'} has been revoked.`,
            buttonText: 'OK',
            onClose: () => setActionModal({ isOpen: false, title: '' }),
          });
        } catch {
          setActionModal({
            isOpen: true,
            type: 'error',
            title: 'Action Failed',
            message: 'Unable to terminate device session. Please try again.',
            buttonText: 'Close',
            onClose: () => setActionModal({ isOpen: false, title: '' }),
          });
        }
      },
      onClose: () => setActionModal({ isOpen: false, title: '' }),
    });
  };

  // Security Verification Modal State (Lock / Unlock Action)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [actionType, setActionType] = useState('unlock'); // 'unlock' or 'lock'
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) setLoadingUsers(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: supaProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Also fetch pending unlock requests to guarantee real-time locked status across all origins
        const { data: unlockRequests } = await supabase
          .from('account_unlock_requests')
          .select('*')
          .eq('status', 'pending');

        const lockedEmailMap = new Map();
        if (unlockRequests) {
          unlockRequests.forEach((req) => {
            const isExpired = req.expires_at && new Date(req.expires_at).getTime() < Date.now();
            if (req.email && !req.used && !isExpired) {
              lockedEmailMap.set(req.email.toLowerCase().trim(), req);
            }
          });
        }

        let localResidents = [];
        try {
          const storedRes = localStorage.getItem('zapatera_residents_db');
          if (storedRes) {
            const parsed = JSON.parse(storedRes);
            if (Array.isArray(parsed)) localResidents = parsed;
          }
        } catch (e) {}

        if (!error && supaProfiles) {
          const seenEmails = new Set();
          const uniqueProfiles = [];

          for (const p of supaProfiles) {
            const cleanEmail = (p.email || '').toLowerCase().trim();
            const localMatch = localResidents.find(
              (lr) => (lr.email && lr.email.toLowerCase() === cleanEmail) || (lr.id && lr.id === p.id)
            );
            if (localMatch && p.role === 'resident') {
              p.first_name = p.first_name || localMatch.first_name;
              p.last_name = p.last_name || localMatch.last_name;
              p.middle_initial = p.middle_initial || localMatch.middle_initial;
              p.birth_date = p.birth_date || localMatch.birth_date || localMatch.birthdate;
              p.civil_status = p.civil_status || localMatch.civil_status;
              p.sitio = p.sitio || localMatch.sitio;
              p.voter_status = p.voter_status || localMatch.voter_status;
              p.phone = p.phone || localMatch.phone;
              p.address = p.address || localMatch.address;
            } else if (p.role !== 'resident') {
              p.voter_status = null;
              p.sitio = null;
            }
            if (!cleanEmail || seenEmails.has(cleanEmail)) continue;
            seenEmails.add(cleanEmail);

            const hasPendingUnlock = lockedEmailMap.has(cleanEmail);
            const isExplicitlyUnlocked = p.is_locked === false && (p.failed_attempts || 0) < 3 && (p.failed_login_attempts || 0) < 3;
            const isLocked = isExplicitlyUnlocked ? false : (p.is_locked === true || (p.failed_attempts || 0) >= 3 || (p.failed_login_attempts || 0) >= 3 || hasPendingUnlock);

            if (isExplicitlyUnlocked && typeof localStorage !== 'undefined') {
              localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
              localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
              localStorage.removeItem(`zapatera_locked_${p.email}`);
              localStorage.removeItem(`zapatera_failed_${p.email}`);

              // Clean up local storage database caches as well
              ['zapatera_residents_db', 'zapatera_admins_db', 'zapatera_super_admins_db'].forEach((dbKey) => {
                try {
                  const stored = localStorage.getItem(dbKey);
                  if (stored) {
                    const list = JSON.parse(stored);
                    if (Array.isArray(list)) {
                      let changed = false;
                      const updated = list.map((item) => {
                        if (item.email && item.email.toLowerCase().trim() === cleanEmail) {
                          changed = true;
                          return { ...item, is_locked: false, is_active: true, failed_attempts: 0, failed_login_attempts: 0, locked_at: null };
                        }
                        return item;
                      });
                      if (changed) {
                        localStorage.setItem(dbKey, JSON.stringify(updated));
                      }
                    }
                  }
                } catch (_) {}
              });
            }

            uniqueProfiles.push({
              ...p,
              email: cleanEmail,
              is_locked: isLocked,
              is_active: !isLocked,
              failed_attempts: isLocked ? Math.max(p.failed_attempts || 0, 3) : 0,
              locked_at: isLocked ? (p.locked_at || (hasPendingUnlock ? lockedEmailMap.get(cleanEmail)?.locked_at : null)) : null,
            });
          }

          setUsersList(uniqueProfiles);
          setLoadingUsers(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Notice: Supabase profiles fetch error:', err);
    }
    setUsersList([]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers(true);

    // Auto-refresh every 3 seconds to catch lockout events live
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 3000);

    const handleFocus = () => fetchUsers(false);
    window.addEventListener('focus', handleFocus);

    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('zapatera_security_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_LOCKED' || event.data?.type === 'ACCOUNT_UNLOCKED') {
          fetchUsers(false);
        }
      };
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (channel) channel.close();
    };
  }, []);

  // Verify Admin Password
  async function verifyAdminPassword(inputPassword) {
    if (!inputPassword) return false;

    const loggedInUser =
      currentUser ||
      StorageService.getCurrentUser() ||
      JSON.parse(localStorage.getItem('zapatera_admin_session') || 'null');

    const loggedInEmail = (loggedInUser?.email || '').trim().toLowerCase();
    if (!loggedInEmail) return false;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loggedInEmail,
          password: inputPassword,
        });
        if (!error && data?.user) return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Open Security Modal for Lock / Unlock Action
  const initiateAction = (user, type) => {
    setTargetUser(user);
    setActionType(type);
    setAdminPassword('');
    setSecurityError('');
    setShowAdminPassword(false);
    setIsSecurityModalOpen(true);
  };

  // Execute Lock or Unlock Action after Password Authorization
  const handleExecuteSecurityAction = async () => {
    if (!adminPassword.trim() || !targetUser) return;
    setSecurityError('');

    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      setSecurityError('Security Authorization Failed: Incorrect admin password.');
      return;
    }

    setIsProcessing(true);
    const adminId = currentUser?.id || currentUser?.email || 'admin@zapatera.gov.ph';

    try {
      if (actionType === 'unlock') {
        await unlockUserAccount(targetUser.email, adminId, targetUser?.id);
      } else {
        await lockUserAccount(targetUser.email, adminId, 'Manual Admin Lockout');
      }

      await fetchUsers();
      setIsSecurityModalOpen(false);

      setActionModal({
        isOpen: true,
        type: 'success',
        title: actionType === 'unlock' ? 'Account Unlocked Successfully' : 'Account Locked Successfully',
        message: actionType === 'unlock'
          ? `Access has been restored for ${targetUser.full_name || targetUser.email}.`
          : `Account access has been locked for ${targetUser.full_name || targetUser.email}.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.warn('Security action error:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Action Failed',
        message: 'Something went wrong while updating the account status. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } finally {
      setIsProcessing(false);
      setTargetUser(null);
      setAdminPassword('');
    }
  };

  const isAccountLocked = (u) => {
    if (!u) return false;
    const cleanEmail = String(u.email || '').toLowerCase().trim();
    if (u.is_locked === false && (u.failed_attempts || 0) < 3 && (u.failed_login_attempts || 0) < 3) {
      if (typeof localStorage !== 'undefined' && cleanEmail) {
        localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
        localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
        localStorage.removeItem(`zapatera_locked_${u.email}`);
        localStorage.removeItem(`zapatera_failed_${u.email}`);
      }
      return false;
    }
    return Boolean(
      u.is_locked === true ||
        (u.failed_login_attempts || 0) >= 3 ||
        (u.failed_attempts || 0) >= 3
    );
  };

  const normalizeRole = (role) => {
    const r = String(role || 'resident').toLowerCase().trim();
    if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
    if (r === 'admin') return 'admin';
    if (r === 'treasurer') return 'treasurer';
    return 'resident';
  };

  const totalAccountsCount = usersList.length;
  const lockedAccountsCount = usersList.filter((u) => isAccountLocked(u)).length;
  const activeAccountsCount = Math.max(0, totalAccountsCount - lockedAccountsCount);
  const residentAccountsCount = usersList.filter((u) => normalizeRole(u.role) === 'resident').length;
  const adminAccountsCount = usersList.filter((u) => normalizeRole(u.role) === 'admin').length;
  const treasurerAccountsCount = usersList.filter((u) => normalizeRole(u.role) === 'treasurer').length;
  const superAdminAccountsCount = usersList.filter((u) => normalizeRole(u.role) === 'super_admin').length;
  const registeredVotersCount = usersList.filter(
    (u) => normalizeRole(u.role) === 'resident' && isUserRegisteredVoter(u)
  ).length;

  const filteredUsers = usersList.filter((u) => {
    const isLocked = isAccountLocked(u);
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'locked'
        ? isLocked
        : !isLocked;

    const userRole = normalizeRole(u.role);
    const matchesRole = filterRole === 'all' ? true : userRole === filterRole;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower) ||
      (u.id_number || '').toLowerCase().includes(searchLower) ||
      (u.address || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesRole && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterRole, pageSize]);

  const handleSort = (columnKey) => {
    if (!columnKey) return;
    if (sortKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortKey) return 0;
    let valA = a[sortKey];
    let valB = b[sortKey];
    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalEntries = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);
  const paginatedUsers = sortedUsers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const hasActiveFilters = filterStatus !== 'all' || filterRole !== 'all' || search.trim().length > 0;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <Users className="w-3.5 h-3.5" />
            <span>Identity & Access Control</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            User Account Management & Security
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Monitor resident and official accounts, filter by role or lock state, and manage security lockouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalAccountsCount} Registered Accounts</span>
          </div>
          <button
            onClick={() => fetchUsers(true)}
            disabled={loadingUsers}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>Sync Accounts</span>
          </button>
        </div>
      </div>

      {/* 4 Colorful Gradient KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Accounts */}
        <div
          onClick={() => {
            setFilterStatus('all');
            setFilterRole('all');
          }}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01] ${
            filterStatus === 'all' && filterRole === 'all' ? 'ring-4 ring-offset-2 ring-sky-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-[#0284c7]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              All Profiles
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{totalAccountsCount}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Total User Accounts</p>
            <p className="text-[11px] text-white/75 mt-1">
              {residentAccountsCount} residents • {totalAccountsCount - residentAccountsCount} staff
            </p>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01] ${
            filterStatus === 'active' ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              {totalAccountsCount > 0 ? `${Math.round((activeAccountsCount / totalAccountsCount) * 100)}% Active` : 'Active'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{activeAccountsCount}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Active Accounts</p>
            <p className="text-[11px] text-white/75 mt-1">Verified & unlocked access</p>
          </div>
        </div>

        {/* Card 3: Locked Out Accounts */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'locked' ? 'all' : 'locked')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48] shadow-rose-500/15 hover:scale-[1.01] ${
            filterStatus === 'locked' ? 'ring-4 ring-offset-2 ring-rose-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5 text-[#e11d48]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Security Guard
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{lockedAccountsCount}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Locked Out (3 Failures)</p>
            <p className="text-[11px] text-white/75 mt-1">Requires admin unlock review</p>
          </div>
        </div>

        {/* Card 4: Resident & Voter Breakdown */}
        <div
          onClick={() => setFilterRole(filterRole === 'resident' ? 'all' : 'resident')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${
            filterRole === 'resident' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Vote className="w-5 h-5 text-[#4f46e5]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Voter Registry
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{registeredVotersCount}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Registered Voters</p>
            <p className="text-[11px] text-white/75 mt-1">
              Out of {residentAccountsCount} resident accounts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card: Filter Bar + Table + Pagination */}
      <div className="bg-white rounded-[26px] border border-slate-100/80 shadow-xs overflow-hidden">
        {/* Filter Toolbar with Role Dropdown, Account Status Dropdown & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dropdown 1: Account Status Filter (All, Active Accounts, Locked Out) */}
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {filterStatus === 'locked' ? (
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                ) : filterStatus === 'active' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3b5bfd]" />
                )}
              </div>
              <select
                aria-label="Filter by Account Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`appearance-none pl-9 pr-9 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                  filterStatus !== 'all'
                    ? 'bg-blue-50/90 text-[#3b5bfd] border-blue-200 shadow-2xs'
                    : 'bg-[#f4f7fb] text-slate-700 border-transparent hover:bg-slate-200/70'
                }`}
              >
                <option value="all">All Account Status ({totalAccountsCount})</option>
                <option value="active">Active Accounts ({activeAccountsCount})</option>
                <option value="locked">Locked Out — 3 Failures ({lockedAccountsCount})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Dropdown 2: Role Filter (All Roles, Resident, Admin, Treasurer, Super Admin) */}
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center">
                <Filter className="w-3.5 h-3.5 text-[#3b5bfd]" />
              </div>
              <select
                aria-label="Filter by User Role"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`appearance-none pl-9 pr-9 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                  filterRole !== 'all'
                    ? 'bg-blue-50/90 text-[#3b5bfd] border-blue-200 shadow-2xs'
                    : 'bg-[#f4f7fb] text-slate-700 border-transparent hover:bg-slate-200/70'
                }`}
              >
                <option value="all">All Roles ({totalAccountsCount})</option>
                <option value="resident">Resident ({residentAccountsCount})</option>
                <option value="admin">Barangay Admin ({adminAccountsCount})</option>
                <option value="treasurer">Barangay Treasurer ({treasurerAccountsCount})</option>
                {superAdminAccountsCount > 0 && (
                  <option value="super_admin">Super Admin ({superAdminAccountsCount})</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Reset Filters Pill */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterRole('all');
                  setSearch('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="admin_user_mgmt_search"
              name="admin_user_mgmt_search"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, or address..."
              className="w-full pl-9 pr-8 py-2.5 text-xs font-medium bg-[#f4f7fb] border border-transparent focus:border-blue-200 focus:bg-white rounded-full text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => handleSort('full_name')}
                  className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>Account Identity</span>
                    {sortKey === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>Role & Voter Status</span>
                    {sortKey === 'role' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>Contact & Location</span>
                    {sortKey === 'phone' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('is_locked')}
                  className="px-5 py-3.5 whitespace-nowrap cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>Security & Lock Status</span>
                    {sortKey === 'is_locked' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </div>
                </th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={false} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No Matching User Accounts</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your Role or Account Status dropdown filters above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isLocked = isAccountLocked(u);
                  const roleNorm = normalizeRole(u.role);
                  return (
                    <tr key={u.id || u.email} className="hover:bg-[#f4f7fb]/60 transition-colors text-slate-700">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <UserAvatar
                            src={u.avatar_url}
                            name={u.full_name || u.email}
                            role={u.role}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate max-w-[200px]">{u.full_name || 'Resident Account'}</p>
                            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Badge
                            variant={
                              roleNorm === 'super_admin'
                                ? 'purple'
                                : roleNorm === 'admin'
                                ? 'blue'
                                : roleNorm === 'treasurer'
                                ? 'success'
                                : 'resident'
                            }
                          >
                            {roleNorm === 'super_admin'
                              ? 'Super Admin'
                              : roleNorm === 'admin'
                              ? 'Barangay Admin'
                              : roleNorm === 'treasurer'
                              ? 'Barangay Treasurer'
                              : 'Resident'}
                          </Badge>
                          {roleNorm === 'resident' && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                isUserRegisteredVoter(u)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-[#f4f7fb] text-slate-500 border border-slate-200/80'
                              }`}
                            >
                              <Vote className="w-2.5 h-2.5 shrink-0" />
                              <span>{isUserRegisteredVoter(u) ? 'Registered Voter' : 'Non-Voter'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 space-y-0.5 text-[11px]">
                        <p className="text-slate-700 font-semibold whitespace-nowrap">{u.phone || 'No phone registered'}</p>
                        <p className="text-slate-400 truncate max-w-[240px]">{u.address || 'Barangay Zapatera, Cebu City'}</p>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isLocked ? (
                          <div className="inline-flex flex-col space-y-1">
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>Locked — 3 Failed Attempts</span>
                            </span>
                            {u.locked_at && (
                              <span className="text-[10px] text-slate-400 font-mono pl-1">
                                Locked: {formatDate(u.locked_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 shrink-0" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end space-x-2">
                          {/* View Credentials */}
                          <button
                            onClick={() => handleOpenViewModal(u)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 rounded-full text-xs font-bold transition-colors cursor-pointer"
                            title="View Account Credentials Safely"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {/* Lock / Unlock Toggle Action */}
                          {isLocked ? (
                            <button
                              onClick={() => initiateAction(u, 'unlock')}
                              className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-xs shadow-blue-500/20 cursor-pointer active:scale-95"
                              title="Unlock Resident Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => initiateAction(u, 'lock')}
                              className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-full text-xs font-bold transition-all cursor-pointer"
                              title="Lock Account"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalEntries > 0 && (
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-500 font-medium">
              <span>Showing</span>
              <span className="font-extrabold text-slate-800">{startIndex}</span>
              <span>to</span>
              <span className="font-extrabold text-slate-800">{endIndex}</span>
              <span>of</span>
              <span className="font-extrabold text-slate-800">{totalEntries}</span>
              <span>accounts</span>

              <div className="ml-3 flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] font-semibold">Rows:</span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none pl-3 pr-7 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-[#f4f7fb]'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simplified & Organized Resident Credentials Modal */}
      {isViewModalOpen && viewingUser && (
        <Modal
          isOpen={isViewModalOpen && !!viewingUser}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          title="Account Profile & Credentials"
          subtitle="Verified resident identity and security status"
          maxWidth="max-w-xl"
        >
          {(() => {
            const isVoter = isUserRegisteredVoter(viewingUser);
            const { first, mi, last } = getResidentNameParts(viewingUser);
            const age = calculateAge(viewingUser.birth_date || viewingUser.birthdate);
            const birthDateFormatted = viewingUser.birth_date || viewingUser.birthdate
              ? formatDate(viewingUser.birth_date || viewingUser.birthdate)
              : null;
            const cleanFullName =
              viewingUser.full_name ||
              (last && first ? `${last}, ${first}${mi ? ' ' + mi + '.' : ''}` : viewingUser.email);
            const isLocked = isAccountLocked(viewingUser);
            const registeredDate =
              viewingUser.created_at || viewingUser.registered_at || viewingUser.date_registered;

            return (
              <div className="space-y-4">
                {/* Identity Banner */}
                <div className="p-4 rounded-[22px] bg-[#f4f7fb] border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <UserAvatar
                      src={viewingUser.avatar_url}
                      name={cleanFullName}
                      role={viewingUser.role}
                      size="lg"
                      showStatus={true}
                      isLocked={isLocked}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-base truncate">
                          {cleanFullName}
                        </h4>
                        <Badge
                          variant={
                            viewingUser.role === 'super_admin'
                              ? 'purple'
                              : viewingUser.role === 'admin'
                              ? 'blue'
                              : viewingUser.role === 'treasurer'
                              ? 'success'
                              : 'active'
                          }
                        >
                          {viewingUser.role === 'super_admin'
                            ? 'Super Admin'
                            : viewingUser.role === 'admin'
                            ? 'Barangay Admin'
                            : viewingUser.role === 'treasurer'
                            ? 'Barangay Treasurer'
                            : 'Resident'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                        <span className="truncate">{viewingUser.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                        isLocked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      )}
                    </span>
                    {registeredDate && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Joined {formatDate(registeredDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Organized 2-Column Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Full Name Breakdown
                    </span>
                    <p className="font-bold text-slate-800 mt-1">
                      {[first, mi ? `${mi}.` : '', last].filter(Boolean).join(' ') || cleanFullName}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#3b5bfd]" /> Date of Birth & Age
                    </span>
                    <p className="font-bold text-slate-800 mt-1">
                      {birthDateFormatted ? (
                        <>
                          {birthDateFormatted}
                          {(age !== null || viewingUser.age) && (
                            <span className="text-slate-400 font-semibold ml-1">
                              ({viewingUser.age || age} yrs)
                            </span>
                          )}
                        </>
                      ) : viewingUser.age ? (
                        `${viewingUser.age} years old`
                      ) : (
                        'Not recorded'
                      )}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Gender & Civil Status
                    </span>
                    <p className="font-bold text-slate-800 mt-1 capitalize">
                      {viewingUser.gender || 'Not specified'} • {viewingUser.civil_status || 'Single'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> Contact Number
                    </span>
                    <p className="font-mono font-bold text-slate-800 mt-1">
                      {viewingUser.phone || viewingUser.contact_number || 'None provided'}
                    </p>
                  </div>

                  {normalizeRole(viewingUser.role) === 'resident' && (
                    <>
                      <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Vote className="w-3 h-3 text-[#3b5bfd]" /> Voter Registration
                        </span>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isVoter
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isVoter ? 'Registered Voter' : 'Non-Voter'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" /> Sitio / Area
                        </span>
                        <p className="font-bold text-slate-800 mt-1">
                          {viewingUser.sitio || 'Sitio Zapatera Proper'}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2 p-3.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" /> Residential Address
                    </span>
                    <p className="font-bold text-slate-800 mt-1">
                      {viewingUser.address ||
                        viewingUser.complete_address ||
                        `${viewingUser.sitio || 'Barangay Zapatera'}, Cebu City`}
                    </p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {isLocked ? (
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        initiateAction(viewingUser, 'unlock');
                      }}
                      className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm shadow-blue-500/25 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock Account</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        initiateAction(viewingUser, 'lock');
                      }}
                      className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Account</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingUser(null);
                    }}
                    className="px-6 py-2.5 font-bold rounded-full text-xs transition-colors cursor-pointer bg-[#f4f7fb] hover:bg-slate-200/70 text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Simplified Security Password Authorization Modal */}
      {isSecurityModalOpen && targetUser && (
        <Modal
          isOpen={isSecurityModalOpen}
          onClose={() => {
            setIsSecurityModalOpen(false);
            setTargetUser(null);
            setAdminPassword('');
            setSecurityError('');
          }}
          title={actionType === 'unlock' ? 'Authorize Account Unlock' : 'Authorize Account Lockout'}
          subtitle="Admin password verification required"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                actionType === 'unlock'
                  ? 'bg-blue-50/70 border-blue-100 text-slate-700'
                  : 'bg-rose-50/70 border-rose-100 text-slate-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  actionType === 'unlock'
                    ? 'bg-[#3b5bfd] text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {actionType === 'unlock' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-extrabold text-slate-900">
                  {actionType === 'unlock' ? 'Restore Account Access' : 'Restrict Account Access'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  Confirm your admin password to {actionType === 'unlock' ? 'unlock' : 'lock'}{' '}
                  <span className="font-bold text-slate-800">{targetUser.full_name || targetUser.email}</span>.
                </p>
              </div>
            </div>

            {securityError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{securityError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full pl-4 pr-10 py-2.5 bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl text-xs font-medium text-slate-800 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSecurityModalOpen(false);
                  setTargetUser(null);
                  setAdminPassword('');
                  setSecurityError('');
                }}
                className="px-5 py-2.5 text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 font-bold rounded-full transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSecurityAction}
                disabled={isProcessing || !adminPassword.trim()}
                className={`px-6 py-2.5 text-white font-bold rounded-full transition-all shadow-sm cursor-pointer text-xs flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 ${
                  actionType === 'unlock'
                    ? 'bg-[#3b5bfd] hover:bg-blue-700 shadow-blue-500/25'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                }`}
              >
                {isProcessing && <Loader2 size={14} className="animate-spin" />}
                <span>{actionType === 'unlock' ? 'Authorize Unlock' : 'Authorize Lock'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Accessible Reusable Action Feedback Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose || (() => setActionModal({ isOpen: false }))}
        isDestructive={actionModal.isDestructive}
        isLoading={actionModal.isLoading}
      />
    </div>
  );
}
