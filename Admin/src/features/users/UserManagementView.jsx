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
            if (req.email) {
              lockedEmailMap.set(req.email.toLowerCase(), req);
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
            const isLocked = p.is_locked || (p.failed_attempts || 0) >= 3 || p.is_active === false || hasPendingUnlock;

            uniqueProfiles.push({
              ...p,
              email: cleanEmail,
              is_locked: isLocked,
              is_active: !isLocked,
              failed_attempts: isLocked ? Math.max(p.failed_attempts || 0, 3) : (p.failed_attempts || 0),
              locked_at: p.locked_at || (hasPendingUnlock ? lockedEmailMap.get(cleanEmail)?.locked_at : null),
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
        await unlockUserAccount(targetUser.email, adminId);
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

  const filteredUsers = usersList.filter((u) => {
    const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3 || u.is_active === false || (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true');
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'locked'
        ? isLocked
        : !isLocked;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower) ||
      (u.id_number || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, pageSize]);

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

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Account Management & Security</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage user accounts, check login status, and unlock accounts.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loadingUsers}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          <span>Sync Accounts</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'active', label: 'Active Accounts' },
            { id: 'locked', label: 'Locked Out (3 Failures)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            id="admin_user_mgmt_search"
            name="admin_user_mgmt_search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => handleSort('full_name')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Account Identity</span>
                    {sortKey === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    {sortKey === 'role' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact & Location</span>
                    {sortKey === 'phone' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('is_locked')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Security & Lock Status</span>
                    {sortKey === 'is_locked' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={false} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isLocked = u.is_locked || (u.failed_login_attempts || 0) >= 3 || (u.failed_attempts || 0) >= 3;
                  return (
                    <tr key={u.id || u.email} className="hover:bg-slate-50/80 transition-colors text-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar
                            src={u.avatar_url}
                            name={u.full_name || u.email}
                            role={u.role}
                            size="md"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name || 'Resident Account'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 space-y-1">
                        <div>
                          <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : u.role === 'treasurer' ? 'success' : 'active'}>
                            {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Barangay Admin' : u.role === 'treasurer' ? 'Barangay Treasurer' : 'Resident'}
                          </Badge>
                        </div>
                        {u.role === 'resident' && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isUserRegisteredVoter(u)
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <Vote className="w-2.5 h-2.5" />
                            {isUserRegisteredVoter(u) ? 'Registered Voter' : 'Non-Voter'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 space-y-0.5 text-[11px]">
                        <p className="text-slate-600">{u.phone || 'No phone registered'}</p>
                        <p className="text-slate-400 truncate max-w-xs">{u.address || 'Barangay Zapatera, Cebu City'}</p>
                      </td>

                      <td className="px-6 py-4">
                        {isLocked ? (
                          <div className="inline-flex flex-col space-y-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3 mr-1" />
                              <span>Locked - 3 Failed Attempts</span>
                            </span>
                            {u.locked_at && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Locked: {formatDate(u.locked_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Credentials */}
                          <button
                            onClick={() => handleOpenViewModal(u)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Account Credentials Safely"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Lock / Unlock Toggle Action */}
                          {isLocked ? (
                            <button
                              onClick={() => initiateAction(u, 'unlock')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Unlock Resident Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => initiateAction(u, 'lock')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Lock Account"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Account</span>
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

        {/* 10-Row Pagination Footer */}
        {totalEntries > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span>Showing</span>
              <span className="font-bold text-slate-900">{startIndex}</span>
              <span>to</span>
              <span className="font-bold text-slate-900">{endIndex}</span>
              <span>of</span>
              <span className="font-bold text-slate-900">{totalEntries}</span>
              <span>accounts</span>

              <div className="ml-4 flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
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
                    className={`min-w-[32px] py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simple Resident Credentials View Modal - Single Personal Information Card */}
      {isViewModalOpen && viewingUser && (
        <Modal
          isOpen={isViewModalOpen && !!viewingUser}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          title="Resident Credentials"
          maxWidth="max-w-2xl"
        >
          {(() => {
            const isVoter = isUserRegisteredVoter(viewingUser);
            const { first, mi, last } = getResidentNameParts(viewingUser);
            const age = calculateAge(viewingUser.birth_date || viewingUser.birthdate);
            const birthDateFormatted = viewingUser.birth_date || viewingUser.birthdate
              ? formatDate(viewingUser.birth_date || viewingUser.birthdate)
              : null;
            const cleanFullName = viewingUser.full_name || (last && first ? `${last}, ${first}${mi ? ' ' + mi + '.' : ''}` : viewingUser.email);

            return (
              <div className="space-y-4">
                {/* Header Profile Identity */}
                <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-slate-50 border-slate-200">
                  <div className="flex items-center space-x-3.5">
                    <UserAvatar
                      src={viewingUser.avatar_url}
                      name={cleanFullName}
                      role={viewingUser.role}
                      size="lg"
                      showStatus={true}
                      isLocked={viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-base">
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
                        {viewingUser.role === 'resident' && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isVoter
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            <Vote className={`w-3.5 h-3.5 ${isVoter ? 'text-emerald-600' : 'text-slate-400'}`} />
                            {isVoter ? 'Registered Voter' : 'Non-Voter'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>{viewingUser.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? (
                        <>
                          <Lock className="w-3 h-3 mr-0.5" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-0.5" />
                          <span>Active</span>
                        </>
                      )}
                    </span>
                    {(() => {
                      const registeredDate = viewingUser.created_at || viewingUser.registered_at || viewingUser.date_registered;
                      const editDate = viewingUser.last_edited_at || viewingUser.updated_at;
                      const isEdited = Boolean(
                        viewingUser.last_edited_at ||
                        (editDate && registeredDate && (new Date(editDate).getTime() - new Date(registeredDate).getTime() > 2000))
                      );

                      return (
                        <div className="flex flex-col items-start sm:items-end gap-0.5 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            Registered: {registeredDate ? formatDate(registeredDate) : (editDate ? formatDate(editDate) : 'Not recorded')}
                          </span>
                          {isEdited && editDate && (
                            <span className="text-[11px] text-slate-400">
                              Latest Edit: {formatDate(editDate)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ONE Single Clean Personal Information Card */}
                <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-blue-600" />
                      <span>Personal Information & Resident Credentials</span>
                    </h5>
                    <span className="text-[11px] font-semibold text-slate-400">Barangay Zapatera Records</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">First Name</span>
                      <p className="font-semibold text-slate-800">
                        {first || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Middle Initial</span>
                      <p className="font-semibold text-slate-800">
                        {mi ? `${mi}.` : 'None / Not Provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Last Name</span>
                      <p className="font-semibold text-slate-800">
                        {last || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" /> Date of Birth & Age
                      </span>
                      <p className="font-semibold text-slate-800">
                        {birthDateFormatted ? (
                          <>
                            {birthDateFormatted}
                            {(age !== null || viewingUser.age) && (
                              <span className="text-slate-500 font-normal ml-1">({viewingUser.age || age} yrs old)</span>
                            )}
                          </>
                        ) : viewingUser.age ? (
                          `${viewingUser.age} years old`
                        ) : (
                          'Not recorded'
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Gender</span>
                      <p className="font-semibold text-slate-800 capitalize">
                        {viewingUser.gender || 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Civil Status</span>
                      <p className="font-semibold text-slate-800 capitalize">
                        {viewingUser.civil_status || 'Single'}
                      </p>
                    </div>

                    {viewingUser.role === 'resident' && (
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                          <Vote className="w-3 h-3 text-blue-600" /> Voter Status
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isVoter
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}>
                          {isVoter ? 'Registered Voter' : 'Non-Voter'}
                        </span>
                      </div>
                    )}

                    {viewingUser.role === 'resident' && (
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" /> Sitio / Area
                        </span>
                        <p className="font-semibold text-slate-800">
                          {viewingUser.sitio || 'Sitio Zapatera Proper'}
                        </p>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" /> Complete Residential Address
                      </span>
                      <p className="font-semibold text-slate-800">
                        {viewingUser.address || viewingUser.complete_address || `${viewingUser.sitio || 'Barangay Zapatera'}, Cebu City`}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> Contact Number
                      </span>
                      <p className="font-mono font-semibold text-slate-800">
                        {viewingUser.phone || viewingUser.contact_number || 'None provided'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-600" /> Email Address
                      </span>
                      <p className="font-mono font-semibold text-slate-800">
                        {viewingUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? (
                      <button
                        onClick={() => {
                          setIsViewModalOpen(false);
                          initiateAction(viewingUser, 'unlock');
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Authorize Unlock Account</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsViewModalOpen(false);
                          initiateAction(viewingUser, 'lock');
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock This Account</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingUser(null);
                    }}
                    className="px-5 py-2 font-bold rounded-xl text-xs transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Security Password Authorization Modal */}
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
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Verification Required</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  You are about to {actionType === 'unlock' ? 'unlock' : 'lock'} account access for{' '}
                  <span className="font-bold text-amber-950">{targetUser.full_name || targetUser.email}</span>.
                  Please confirm your logged-in Admin Password to proceed.
                </p>
              </div>
            </div>

            {securityError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {securityError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Logged-in Admin Password</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password to authorize..."
                  className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSecurityModalOpen(false);
                  setTargetUser(null);
                  setAdminPassword('');
                  setSecurityError('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSecurityAction}
                disabled={isProcessing || !adminPassword.trim()}
                className={`px-6 py-2 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs flex items-center space-x-1.5 active:scale-95 ${
                  actionType === 'unlock'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
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
