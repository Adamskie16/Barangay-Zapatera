// SuperAdmin/src/features/users/UsersView.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import UserAvatar from '../../components/UserAvatar';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Key,
  Shield,
  Trash2,
  Edit2,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Laptop,
  Radio,
  Power,
  KeyRound,
  Bell,
  Fingerprint,
  Sliders,
  Check,
  Activity,
  Info,
  Vote,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
} from 'lucide-react';
import ActionModal from '../../components/ActionModal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';
import { validateEmail, sanitizeInput, unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { supabase, supabaseAdmin, signUpUserWithoutPersistSession, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';

const SAMPLE_SITIOS = [
  'Caimito',
  'Bayabas',
  'Sab-ah',
  'Lemonsito',
  'Nangka',
  'Mangga',
  'Green Mosque',
  'Riverside',
];

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export function checkPasswordStrength(password = '') {
  const p = password || '';
  return {
    hasLength: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[@$!%*?&!#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  };
}

export function isStrongPassword(password = '') {
  const s = checkPasswordStrength(password);
  return s.hasLength && s.hasUpper && s.hasLower && s.hasNumber && s.hasSpecial;
}


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


export default function UsersView({ users = [], onSaveUser, onDeleteUser, currentUser, isDarkMode = false }) {
  const [usersList, setUsersList] = useState(() => (Array.isArray(users) && users.length > 0 ? users : StorageService.getUsers()));
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'locked'
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'resident' | 'admin' | 'treasurer' | 'super_admin'
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Security Verification Modal State (Save/Create/Edit)
  const [isSaveSecurityModalOpen, setIsSaveSecurityModalOpen] = useState(false);
  const [pendingUserPayload, setPendingUserPayload] = useState(null);
  const [savePasswordInput, setSavePasswordInput] = useState('');
  const [showSavePassword, setShowSavePassword] = useState(false);
  const [saveAuthError, setSaveAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Password Security Authorization State
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [deleteAuthError, setDeleteAuthError] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Dedicated Security Verification for Unlock / Lock Action
  const [isSecurityActionModalOpen, setIsSecurityActionModalOpen] = useState(false);
  const [securityActionType, setSecurityActionType] = useState('unlock');
  const [securityActionTargetUser, setSecurityActionTargetUser] = useState(null);
  const [securityActionPassword, setSecurityActionPassword] = useState('');
  const [securityActionError, setSecurityActionError] = useState('');
  const [showSecurityActionPassword, setShowSecurityActionPassword] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Credentials / Security & Device Profile Modal State
  const [viewingUser, setViewingUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [userDevices, setUserDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('telemetry');

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
    } catch (e) { }

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

            await supabase.from('activity_logs').insert({
              user_email: currentUser?.email || StorageService.getCurrentUser()?.email || 'mardee131@gmail.com',
              action: `Terminated Device Session: ${device.device_name || device.device_id}`,
              feature: 'User Account Security',
              details: `Revoked session for user ${viewingUser.email} on ${device.device_name || device.device_id}`,
              level: 'warning',
            });
          }

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

  // Processing Loading Overlay State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTitle, setProcessingTitle] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');

  const INITIAL_USER_FORM = {
    email: '',
    full_name: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    gender: 'Male',
    age: '',
    birth_date: '',
    civil_status: 'Single',
    voter_status: 'Registered Voter',
    sitio: 'Sitio Zapatera Proper',
    role: 'admin',
    phone: '',
    address: 'Barangay Zapatera Hall, Cebu City',
    office: 'Barangay Zapatera Hall, Cebu City',
    position: 'Barangay Admin',
    id_type: 'Government ID',
    id_number: '',
    is_active: true,
    password: '',
    confirm_password: '',
  };

  const clearForm = () => {
    setFormData(INITIAL_USER_FORM);
    setFieldErrors({});
    setFormGeneralError('');
    setShowProvisionPassword(false);
    setShowProvisionConfirmPassword(false);
    setEditingId(null);
    setEditingUser(null);
    setPendingUserPayload(null);
    setSavePasswordInput('');
    setSaveAuthError('');
  };

  const [formData, setFormData] = useState(INITIAL_USER_FORM);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formGeneralError, setFormGeneralError] = useState('');
  const [showProvisionPassword, setShowProvisionPassword] = useState(false);
  const [showProvisionConfirmPassword, setShowProvisionConfirmPassword] = useState(false);

  const passwordStrength = checkPasswordStrength(formData.password);
  const passwordsMatch = Boolean(
    formData.password && formData.confirm_password && formData.password === formData.confirm_password
  );

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'role') {
        if (value === 'resident' && (!prev.address || prev.address.includes('Hall'))) {
          updated.address = 'Sitio Zapatera Proper, Barangay Zapatera, Cebu City';
        } else if (value !== 'resident' && (!prev.address || prev.address.includes('Proper'))) {
          updated.address = 'Barangay Zapatera Hall, Cebu City';
        }
      }
      if (field === 'sitio' && prev.role === 'resident') {
        updated.address = `${value}, Barangay Zapatera, Cebu City`;
      }
      if (field === 'birth_date') {
        const computedAge = calculateAge(value);
        if (computedAge !== null) {
          updated.age = computedAge.toString();
        }
      }
      return updated;
    });

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formGeneralError) {
      setFormGeneralError('');
    }
  };

  async function verifyLoggedInPassword(inputPassword) {
    if (!inputPassword) return false;

    const session =
      currentUser ||
      (typeof StorageService !== 'undefined' && StorageService.getCurrentUser ? StorageService.getCurrentUser() : null) ||
      JSON.parse(
        localStorage.getItem('zapatera_superadmin_session') ||
        localStorage.getItem('zapatera_admin_session') ||
        localStorage.getItem('zapatera_account_mgmt_session') ||
        localStorage.getItem('zapatera_resident_session') ||
        'null'
      );
    const loggedInEmail = (session?.email || '').trim().toLowerCase();
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

  // 1. FETCH ALL PROFILES DIRECTLY FROM SUPABASE & REAL-TIME AUTO-REFRESH
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

  async function fetchUsers(showLoading = false) {
    if (showLoading) setLoadingUsers(true);

    try {
      if (isSupabaseConfigured()) {
        const { data: supaProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Notice: Supabase profiles query error in UsersView:', error.message || error);
        }

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

        let localAccounts = [];
        try {
          const storedRes = JSON.parse(localStorage.getItem('zapatera_residents_db') || '[]');
          const storedAdm = JSON.parse(localStorage.getItem('zapatera_admins_db') || '[]');
          const storedSA = JSON.parse(localStorage.getItem('zapatera_super_admins_db') || '[]');
          if (Array.isArray(storedRes)) localAccounts.push(...storedRes);
          if (Array.isArray(storedAdm)) localAccounts.push(...storedAdm);
          if (Array.isArray(storedSA)) localAccounts.push(...storedSA);
        } catch (e) { }

        const deletedAccountsSet = new Set();
        try {
          const delList = JSON.parse(localStorage.getItem('zapatera_deleted_accounts') || '[]');
          if (Array.isArray(delList)) {
            delList.forEach((d) => {
              if (d.email) deletedAccountsSet.add(d.email.toLowerCase().trim());
              if (d.id) deletedAccountsSet.add(String(d.id).trim());
            });
          }
          const arcList = JSON.parse(localStorage.getItem('zapatera_users_archive_db') || '[]');
          if (Array.isArray(arcList)) {
            arcList.forEach((d) => {
              if (d.email) deletedAccountsSet.add(d.email.toLowerCase().trim());
              if (d.id) deletedAccountsSet.add(String(d.id).trim());
            });
          }
        } catch (_) { }

        if (!error && supaProfiles) {
          const seenEmails = new Set();
          const uniqueProfiles = [];

          for (const p of supaProfiles) {
            const cleanEmail = (p.email || '').toLowerCase().trim();
            const pId = p.id ? String(p.id).trim() : '';

            // Strictly filter out accounts marked as archived or soft-deleted in Supabase
            if (p.is_archived === true || p.deleted_at != null) {
              continue;
            }

            // If account is active in Supabase, ensure it is not blocked by stale browser localStorage deletion caches
            if (deletedAccountsSet.has(cleanEmail) || deletedAccountsSet.has(pId)) {
              deletedAccountsSet.delete(cleanEmail);
              deletedAccountsSet.delete(pId);
              try {
                const delList = JSON.parse(localStorage.getItem('zapatera_deleted_accounts') || '[]');
                if (Array.isArray(delList)) {
                  const cleaned = delList.filter((d) => (d.email || d).toLowerCase() !== cleanEmail && String(d.id || '') !== pId);
                  localStorage.setItem('zapatera_deleted_accounts', JSON.stringify(cleaned));
                }
              } catch (_) { }
            }

            const localMatch = localAccounts.find(
              (la) => (la.email && la.email.toLowerCase() === cleanEmail) || (la.id && la.id === p.id)
            );
            if (localMatch) {
              if (p.role === 'resident') {
                p.first_name = p.first_name || localMatch.first_name;
                p.last_name = p.last_name || localMatch.last_name;
                p.middle_initial = p.middle_initial || localMatch.middle_initial;
                p.birth_date = p.birth_date || localMatch.birth_date || localMatch.birthdate;
                p.civil_status = p.civil_status || localMatch.civil_status;
                p.sitio = p.sitio || localMatch.sitio;
                p.voter_status = p.voter_status || localMatch.voter_status;
                p.phone = p.phone || localMatch.phone;
                p.address = p.address || localMatch.address;
              }
              p.created_at = p.created_at || localMatch.created_at;
              p.updated_at = p.updated_at || localMatch.updated_at;
              p.last_edited_at = p.last_edited_at || localMatch.last_edited_at;
            }
            if (p.role !== 'resident') {
              p.voter_status = null;
              p.sitio = null;
            }
            if (!cleanEmail || seenEmails.has(cleanEmail)) continue;
            seenEmails.add(cleanEmail);

            const hasPendingUnlock = lockedEmailMap.has(cleanEmail);
            const isLocked = p.is_locked || (p.failed_attempts || 0) >= 3 || hasPendingUnlock;

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
      console.warn('Notice: Supabase users fetch error:', err);
    }

    // Fallback if Supabase fetch failed or returned error
    const fallbackList = (Array.isArray(users) && users.length > 0) ? users : StorageService.getUsers();
    const activeFallback = (fallbackList || []).filter((u) => {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      const uId = u.id ? String(u.id).trim() : '';
      return u.is_archived !== true && !u.deleted_at;
    });
    setUsersList(activeFallback);
    setLoadingUsers(false);
  }

  // Validate Account Provision Form (Resident sign up functionality with field-level alerts)
  const validateProvisionForm = () => {
    const errors = {};
    setFormGeneralError('');

    // Common: Email Address validation
    const emailVal = (formData.email || '').trim().toLowerCase();
    if (!emailVal) {
      errors.email = 'Email address is required.';
    } else if (!validateEmail(emailVal)) {
      errors.email = 'Please enter a valid email address (e.g. resident@gmail.com).';
    } else if (!editingId && !editingUser && users.some((u) => u.email && u.email.toLowerCase().trim() === emailVal)) {
      errors.email = 'This Gmail address has already been used for an existing account.';
    }

    // Common: Phone Number validation
    const phoneVal = (formData.phone || '').trim();
    if (!phoneVal) {
      errors.phone = 'Mobile Phone number is required.';
    } else {
      const cleanPhone = phoneVal.replace(/[\s-]/g, '');
      if (!/^(09|\+639)\d{9}$/.test(cleanPhone)) {
        errors.phone = 'Please enter a valid 11-digit mobile number (e.g. 09171234567).';
      }
    }

    if (formData.role === 'resident') {
      // 1. Full Name Information (Last Name & First Name required, M.I. is strictly optional)
      if (!formData.last_name || !formData.last_name.trim()) {
        errors.last_name = 'Last Name is required.';
      }
      if (!formData.first_name || !formData.first_name.trim()) {
        errors.first_name = 'First Name is required.';
      }
      // Middle initial is strictly optional! No error check and no error alert.

      // 2. Personal Status & Birth Details
      if (!formData.birth_date || !formData.birth_date.trim()) {
        errors.birth_date = 'Date of Birth is required.';
      }
      if (!formData.civil_status || !formData.civil_status.trim()) {
        errors.civil_status = 'Civil Status is required.';
      }

      // 3. Sitio, Complete Address & Voter Status
      if (!formData.sitio || !formData.sitio.trim()) {
        errors.sitio = 'Sitio selection is required.';
      }
      if (!formData.address || !formData.address.trim()) {
        errors.address = 'Complete Address is required.';
      }
      if (!formData.voter_status || !formData.voter_status.trim()) {
        errors.voter_status = 'Voter Registration Status is required.';
      }
    } else {
      // Administrator / Super Admin / Treasurer Profile Information
      if (!formData.first_name || !formData.first_name.trim()) {
        errors.first_name = 'First Name is required.';
      }
      if (!formData.last_name || !formData.last_name.trim()) {
        errors.last_name = 'Last Name is required.';
      }
      if (!formData.gender || !formData.gender.trim()) {
        errors.gender = 'Gender selection is required.';
      }
      const ageNum = parseInt(formData.age, 10);
      if (!formData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        errors.age = 'Please enter a valid age (18 or older).';
      }
      if (!formData.address || !formData.address.trim()) {
        errors.address = 'Office / Address is required.';
      }
    }

    // 4. Strong Password & Confirm Password (only for new account provisioning)
    if (!editingId) {
      if (!formData.password || !formData.password.trim()) {
        errors.password = 'Password is required.';
      } else if (!isStrongPassword(formData.password)) {
        errors.password = 'Password must meet all 5 strong criteria below.';
      }

      if (!formData.confirm_password || !formData.confirm_password.trim()) {
        errors.confirm_password = 'Confirm Password is required.';
      } else if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormGeneralError('Please resolve all highlighted field alerts before proceeding.');
      return false;
    }
    return true;
  };

  // Handle Main Form Submission -> Trigger Dedicated Security Modal
  async function handleFormSubmit(e) {
    e.preventDefault();

    const isValid = validateProvisionForm();
    if (!isValid) {
      return;
    }

    const cleanEmail = sanitizeInput((formData.email || '').toLowerCase().trim());
    const isNew = !editingId && !editingUser;

    // Check if Gmail / Email is already in use
    if (isNew) {
      const emailInUseInState = users.some(
        (u) => u.email && u.email.toLowerCase().trim() === cleanEmail
      );

      const emailInUseInLocalDbs = (() => {
        try {
          const residents = JSON.parse(localStorage.getItem('zapatera_residents_db') || '[]');
          const admins = JSON.parse(localStorage.getItem('zapatera_admins_db') || '[]');
          const superAdmins = JSON.parse(localStorage.getItem('zapatera_super_admins_db') || '[]');
          return (
            (Array.isArray(residents) && residents.some((r) => r.email && r.email.toLowerCase().trim() === cleanEmail)) ||
            (Array.isArray(admins) && admins.some((a) => a.email && a.email.toLowerCase().trim() === cleanEmail)) ||
            (Array.isArray(superAdmins) && superAdmins.some((s) => s.email && s.email.toLowerCase().trim() === cleanEmail))
          );
        } catch {
          return false;
        }
      })();

      if (emailInUseInState || emailInUseInLocalDbs) {
        setActionModal({
          isOpen: true,
          type: 'error',
          title: 'Gmail / Email Already in Use',
          message: `The email address "${formData.email.trim()}" has already been used for an existing account. Please enter a different Gmail or email address to create this account.`,
          buttonText: 'OK',
          onClose: () => setActionModal({ isOpen: false }),
        });
        return;
      }

      // Check against Supabase profiles table
      if (isSupabaseConfigured()) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (existingProfile) {
            setActionModal({
              isOpen: true,
              type: 'error',
              title: 'Gmail / Email Already in Use',
              message: `The email address "${formData.email.trim()}" has already been registered in the database for "${existingProfile.full_name || existingProfile.email}". Please enter a different Gmail address.`,
              buttonText: 'OK',
              onClose: () => setActionModal({ isOpen: false }),
            });
            return;
          }
        } catch (chkErr) {
          console.warn('Supabase email uniqueness check notice:', chkErr);
        }
      }
    } else {
      const targetId = editingId || editingUser?.id;
      const emailConflict = users.some(
        (u) => u.id !== targetId && u.email && u.email.toLowerCase().trim() === cleanEmail
      );
      if (emailConflict) {
        setActionModal({
          isOpen: true,
          type: 'error',
          title: 'Gmail / Email Already in Use',
          message: `The email address "${formData.email.trim()}" is already registered to another account. Please choose a different Gmail address.`,
          buttonText: 'OK',
          onClose: () => setActionModal({ isOpen: false }),
        });
        return;
      }
    }

    const cleanMI = (formData.middle_initial || '').trim().toUpperCase().replace(/\.$/, '');
    const cleanLast = (formData.last_name || '').trim();
    const cleanFirst = (formData.first_name || '').trim();
    const computedFullName = (cleanLast && cleanFirst)
      ? `${cleanLast}, ${cleanFirst}${cleanMI ? ' ' + cleanMI + '.' : ''}`
      : sanitizeInput(formData.full_name || `${cleanFirst} ${cleanLast}`.trim());

    const ageNum = formData.age ? parseInt(formData.age, 10) : (calculateAge(formData.birth_date) || null);

    const payload = {
      email: cleanEmail,
      full_name: computedFullName,
      first_name: cleanFirst || null,
      middle_initial: cleanMI || null,
      last_name: cleanLast || null,
      gender: formData.gender || 'Male',
      age: ageNum,
      birth_date: formData.birth_date || null,
      civil_status: formData.civil_status || 'Single',
      voter_status: formData.role === 'resident' ? (formData.voter_status || 'Registered Voter') : null,
      sitio: formData.role === 'resident' ? (formData.sitio || 'Sitio Zapatera Proper') : null,
      role: formData.role, // 'admin', 'super_admin', 'treasurer', or 'resident'
      phone: sanitizeInput(formData.phone),
      address: sanitizeInput(formData.address || (formData.role === 'resident' ? `${formData.sitio || 'Barangay Zapatera'}, Cebu City` : 'Barangay Zapatera Hall, Cebu City')),
      office: sanitizeInput(formData.office || formData.address || 'Barangay Zapatera Hall, Cebu City'),
      position: sanitizeInput(formData.position || (formData.role === 'super_admin' ? 'Super Administrator' : formData.role === 'treasurer' ? 'Barangay Treasurer' : formData.role === 'admin' ? 'Barangay Admin' : 'Resident User')),
      id_type: sanitizeInput(formData.id_type || (formData.role === 'resident' ? (formData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay ID') : 'Official Government ID')),
      id_number: sanitizeInput(formData.id_number || `BZ-${Date.now().toString().slice(-6)}`),
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    };

    setPendingUserPayload(payload);
    setSavePasswordInput('');
    setSaveAuthError('');
    setShowSavePassword(false);
    setIsModalOpen(false);
    setIsSaveSecurityModalOpen(true);
  }

  // Execute Save after Password Authorization in Dedicated Security Modal
  async function handleSaveExecute(skipPasswordCheck = false) {
    if (!pendingUserPayload) return;
    setSaveAuthError('');

    if (!skipPasswordCheck) {
      if (!savePasswordInput.trim()) return;
      const isPasswordValid = await verifyLoggedInPassword(savePasswordInput);
      if (!isPasswordValid) {
        setSaveAuthError('Security Verification Failed: Incorrect logged-in account password.');
        return;
      }
    }

    setIsSaving(true);
    setIsProcessing(true);
    setProcessingTitle(editingId ? 'Updating User Account...' : 'Creating New Account...');
    setProcessingMessage('Verifying credentials & saving user profile to database...');

    let assignedId = editingId || editingUser?.id || null;

    try {
      if (isSupabaseConfigured()) {
        if (editingId || editingUser) {
          const updatePayload = {
            ...pendingUserPayload,
            updated_at: new Date().toISOString(),
          };
          // Explicitly delete created_at so editing NEVER alters or overwrites the registration date
          delete updatePayload.created_at;

          const targetId = editingId || editingUser?.id;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
          let updateQuery = supabase.from('profiles').update(updatePayload);
          if (isUuid) {
            updateQuery = updateQuery.eq('id', targetId);
          } else {
            updateQuery = updateQuery.eq('email', pendingUserPayload.email);
          }
          const { error } = await updateQuery;

          if (error) {
            console.error('Supabase profile update error:', error);
          }
        } else {
          // CREATE NEW ACCOUNT IN SUPABASE AUTH + PUBLIC.PROFILES
          assignedId = null;

          if (supabaseAdmin) {
            try {
              const { data: adminCreated, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
                email: pendingUserPayload.email,
                password: formData.password || 'password123',
                email_confirm: true,
                user_metadata: {
                  full_name: pendingUserPayload.full_name,
                  first_name: pendingUserPayload.first_name,
                  middle_initial: pendingUserPayload.middle_initial,
                  last_name: pendingUserPayload.last_name,
                  gender: pendingUserPayload.gender,
                  age: pendingUserPayload.age,
                  birth_date: pendingUserPayload.birth_date,
                  civil_status: pendingUserPayload.civil_status,
                  office: pendingUserPayload.office,
                  position: pendingUserPayload.position,
                  role: pendingUserPayload.role,
                  phone: pendingUserPayload.phone,
                },
              });
              if (adminErr) {
                const errMsg = (adminErr.message || '').toLowerCase();
                if (errMsg.includes('already') || errMsg.includes('exists') || adminErr.status === 422) {
                  setIsSaveSecurityModalOpen(false);
                  setIsSaving(false);
                  setIsProcessing(false);
                  setActionModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Gmail / Email Already in Use',
                    message: `The Gmail address "${pendingUserPayload.email}" has already been registered in the system. Please use a different Gmail address.`,
                    buttonText: 'OK',
                    onClose: () => setActionModal({ isOpen: false }),
                  });
                  return;
                }
              }
              if (!adminErr && adminCreated?.user?.id) {
                assignedId = adminCreated.user.id;
              }
            } catch (aErr) {
              console.warn('supabaseAdmin createUser notice:', aErr);
            }
          }

          if (!assignedId) {
            const res = await signUpUserWithoutPersistSession({
              email: pendingUserPayload.email,
              password: formData.password || 'password123',
              metadata: {
                full_name: pendingUserPayload.full_name,
                first_name: pendingUserPayload.first_name,
                middle_initial: pendingUserPayload.middle_initial,
                last_name: pendingUserPayload.last_name,
                gender: pendingUserPayload.gender,
                age: pendingUserPayload.age,
                birth_date: pendingUserPayload.birth_date,
                civil_status: pendingUserPayload.civil_status,
                office: pendingUserPayload.office,
                position: pendingUserPayload.position,
                role: pendingUserPayload.role,
                phone: pendingUserPayload.phone,
              },
            });
            if (res?.error) {
              const errMsg = (res.error.message || '').toLowerCase();
              if (errMsg.includes('already') || errMsg.includes('exists')) {
                setIsSaveSecurityModalOpen(false);
                setIsSaving(false);
                setIsProcessing(false);
                setActionModal({
                  isOpen: true,
                  type: 'error',
                  title: 'Gmail / Email Already in Use',
                  message: `The Gmail address "${pendingUserPayload.email}" has already been registered in the system. Please use a different Gmail address.`,
                  buttonText: 'OK',
                  onClose: () => setActionModal({ isOpen: false }),
                });
                return;
              }
            }
            if (res?.id) {
              assignedId = res.id;
            }
          }

          const newId = assignedId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`);
          assignedId = newId;
          const { error } = await supabase.from('profiles').upsert(
            [
              {
                id: newId,
                ...pendingUserPayload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'email' }
          );

          if (error) {
            console.error('Supabase profile insert/upsert error:', error);
            const errStr = (error.message || '').toLowerCase();
            if (errStr.includes('already') || errStr.includes('unique') || error.code === '23505') {
              setIsSaveSecurityModalOpen(false);
              setIsSaving(false);
              setIsProcessing(false);
              setActionModal({
                isOpen: true,
                type: 'error',
                title: 'Gmail / Email Already in Use',
                message: `The Gmail address "${pendingUserPayload.email}" has already been registered in the database. Please use a different Gmail address.`,
                buttonText: 'OK',
                onClose: () => setActionModal({ isOpen: false }),
              });
              return;
            }
          }
        }
      }
    } catch (err) {
      console.error('Supabase users write notice:', err);
    }

    const nowIso = new Date().toISOString();

    if (onSaveUser) {
      onSaveUser({
        id: editingId || editingUser?.id || assignedId || undefined,
        ...pendingUserPayload,
        created_at: editingUser?.created_at,
        updated_at: nowIso,
        last_edited_at: (editingId || editingUser) ? nowIso : undefined,
        password: formData.password || 'password123',
      });
    }

    if (pendingUserPayload.role === 'resident') {
      try {
        const storedDb = localStorage.getItem('zapatera_residents_db');
        let residents = storedDb ? JSON.parse(storedDb) : [];
        if (!Array.isArray(residents)) residents = [];
        const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
        const existingIdx = residents.findIndex(
          (r) => (r.email && r.email.toLowerCase() === cleanEmail) ||
            (editingId && r.id === editingId) ||
            (editingUser?.id && r.id === editingUser.id)
        );
        const originalCreatedAt = (existingIdx >= 0 ? residents[existingIdx].created_at : null) || editingUser?.created_at;

        const residentEntry = {
          id: editingId || editingUser?.id || assignedId || (existingIdx >= 0 ? residents[existingIdx].id : `res-${Date.now()}`),
          ...pendingUserPayload,
          created_at: originalCreatedAt || (existingIdx >= 0 ? residents[existingIdx].created_at : nowIso) || nowIso,
          updated_at: nowIso,
          last_edited_at: (existingIdx >= 0 || editingId || editingUser) ? nowIso : undefined,
          password: formData.password || (existingIdx >= 0 ? residents[existingIdx].password : 'password123'),
        };
        if (existingIdx >= 0) {
          residents[existingIdx] = { ...residents[existingIdx], ...residentEntry, created_at: residents[existingIdx].created_at || residentEntry.created_at };
        } else {
          residents.unshift(residentEntry);
        }
        localStorage.setItem('zapatera_residents_db', JSON.stringify(residents));
      } catch (e) {
        console.warn('Notice: localStorage zapatera_residents_db update error:', e);
      }
    } else {
      try {
        const storedDb = localStorage.getItem('zapatera_residents_db');
        if (storedDb) {
          let residents = JSON.parse(storedDb);
          if (Array.isArray(residents)) {
            const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
            const filtered = residents.filter(
              (r) => (r.email && r.email.toLowerCase() !== cleanEmail) && (!editingId || r.id !== editingId) && (!editingUser?.id || r.id !== editingUser.id)
            );
            localStorage.setItem('zapatera_residents_db', JSON.stringify(filtered));
          }
        }
      } catch (e) { }
    }

    if (pendingUserPayload.role === 'admin' || pendingUserPayload.role === 'treasurer') {
      try {
        const storedAdmins = localStorage.getItem('zapatera_admins_db');
        let admins = storedAdmins ? JSON.parse(storedAdmins) : [];
        if (!Array.isArray(admins)) admins = [];
        const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
        const existingIdx = admins.findIndex(
          (a) => (a.email && a.email.toLowerCase() === cleanEmail) ||
            (editingId && a.id === editingId) ||
            (editingUser?.id && a.id === editingUser.id)
        );
        const originalCreatedAt = (existingIdx >= 0 ? admins[existingIdx].created_at : null) || editingUser?.created_at;

        const adminEntry = {
          id: editingId || editingUser?.id || assignedId || (existingIdx >= 0 ? admins[existingIdx].id : `adm-${Date.now()}`),
          ...pendingUserPayload,
          created_at: originalCreatedAt || (existingIdx >= 0 ? admins[existingIdx].created_at : nowIso) || nowIso,
          updated_at: nowIso,
          last_edited_at: (existingIdx >= 0 || editingId || editingUser) ? nowIso : undefined,
          password: formData.password || (existingIdx >= 0 ? admins[existingIdx].password : 'password123'),
        };
        if (existingIdx >= 0) {
          admins[existingIdx] = { ...admins[existingIdx], ...adminEntry, created_at: admins[existingIdx].created_at || adminEntry.created_at };
        } else {
          admins.unshift(adminEntry);
        }
        localStorage.setItem('zapatera_admins_db', JSON.stringify(admins));
      } catch (e) {
        console.warn('Notice: localStorage zapatera_admins_db update error:', e);
      }
    }

    if (pendingUserPayload.role === 'super_admin' || pendingUserPayload.role === 'superadmin') {
      try {
        const storedSAs = localStorage.getItem('zapatera_super_admins_db');
        let superAdmins = storedSAs ? JSON.parse(storedSAs) : [];
        if (!Array.isArray(superAdmins)) superAdmins = [];
        const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
        const existingIdx = superAdmins.findIndex(
          (s) => (s.email && s.email.toLowerCase() === cleanEmail) ||
            (editingId && s.id === editingId) ||
            (editingUser?.id && s.id === editingUser.id)
        );
        const originalCreatedAt = (existingIdx >= 0 ? superAdmins[existingIdx].created_at : null) || editingUser?.created_at;

        const saEntry = {
          id: editingId || editingUser?.id || assignedId || (existingIdx >= 0 ? superAdmins[existingIdx].id : `sa-${Date.now()}`),
          ...pendingUserPayload,
          role: 'super_admin',
          created_at: originalCreatedAt || (existingIdx >= 0 ? superAdmins[existingIdx].created_at : nowIso) || nowIso,
          updated_at: nowIso,
          last_edited_at: (existingIdx >= 0 || editingId || editingUser) ? nowIso : undefined,
          password: formData.password || (existingIdx >= 0 ? superAdmins[existingIdx].password : 'password123'),
        };
        if (existingIdx >= 0) {
          superAdmins[existingIdx] = { ...superAdmins[existingIdx], ...saEntry, created_at: superAdmins[existingIdx].created_at || saEntry.created_at };
        } else {
          superAdmins.unshift(saEntry);
        }
        localStorage.setItem('zapatera_super_admins_db', JSON.stringify(superAdmins));
      } catch (e) {
        console.warn('Notice: localStorage zapatera_super_admins_db update error:', e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const savedEmail = pendingUserPayload.email;
    const savedName = pendingUserPayload.full_name || pendingUserPayload.email;
    const roleTitle =
      pendingUserPayload.role === 'super_admin' || pendingUserPayload.role === 'superadmin'
        ? 'Super Administrator'
        : pendingUserPayload.role === 'admin'
          ? 'Barangay Admin'
          : pendingUserPayload.role === 'treasurer'
            ? 'Barangay Treasurer'
            : 'Resident';
    const isNew = !editingId && !editingUser;

    setIsSaveSecurityModalOpen(false);
    setIsModalOpen(false);
    clearForm();
    setIsSaving(false);
    setIsProcessing(false);
    fetchUsers();

    setActionModal({
      isOpen: true,
      type: 'success',
      title: isNew ? 'Account Created Successfully' : 'Account Updated Successfully',
      message: isNew
        ? `The new ${roleTitle} account for "${savedName}" (${savedEmail}) has been created successfully.`
        : `The profile details for "${savedName}" (${savedEmail}) were updated successfully.`,
      buttonText: 'Done',
      onClose: () => setActionModal({ isOpen: false }),
    });
  }

  // 3. EDIT USER SELECTION
  function handleEdit(user) {
    setEditingId(user.id);
    setEditingUser(user);
    setFieldErrors({});
    setFormGeneralError('');
    setShowProvisionPassword(false);
    setShowProvisionConfirmPassword(false);
    const nameParts = getResidentNameParts(user);
    const userAge = user.age || calculateAge(user.birth_date || user.birthdate) || '';

    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      first_name: user.first_name || nameParts.first || '',
      middle_initial: user.middle_initial || nameParts.mi || '',
      last_name: user.last_name || nameParts.last || '',
      gender: user.gender || 'Male',
      age: userAge ? userAge.toString() : '',
      birth_date: user.birth_date || user.birthdate || '',
      civil_status: user.civil_status || 'Single',
      voter_status: user.voter_status || 'Registered Voter',
      sitio: user.sitio || 'Sitio Zapatera Proper',
      role: user.role === 'superadmin' ? 'super_admin' : (user.role || 'admin'),
      phone: user.phone || '',
      address: user.address || (user.office || 'Barangay Zapatera Hall, Cebu City'),
      office: user.office || user.address || 'Barangay Zapatera Hall, Cebu City',
      position: user.position || '',
      id_type: user.id_type || 'Government ID',
      id_number: user.id_number || '',
      is_active: user.is_active !== false,
      password: '',
      confirm_password: '',
    });
    setIsModalOpen(true);
  }

  // 4. DELETE USER CONFIRMATION & EXECUTION
  const confirmDelete = (userOrId) => {
    const targetUser = typeof userOrId === 'object' ? userOrId : usersList.find((u) => u.id === userOrId);
    setDeletingUser(targetUser || { id: userOrId });
    setAdminPasswordInput('');
    setDeleteAuthError('');
    setShowDeletePassword(false);
    setIsDeleteModalOpen(true);
  };

  async function handleDeleteExecute(skipPasswordCheck = false) {
    if (!deletingUser) return;
    setDeleteAuthError('');

    if (!skipPasswordCheck) {
      if (!adminPasswordInput.trim()) return;
      const isPasswordValid = await verifyLoggedInPassword(adminPasswordInput);
      if (!isPasswordValid) {
        setDeleteAuthError('Security Verification Failed: Incorrect logged-in account password.');
        return;
      }
    }

    setDeleting(true);
    setIsProcessing(true);
    setProcessingTitle('Removing User Account...');
    setProcessingMessage(`Deleting profile record for ${deletingUser?.email || 'user'}...`);

    const id = deletingUser.id;
    const email = deletingUser.email;
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      // Soft-delete to Archive & Trash Management recycling bin
      await StorageService.archiveUser(id, currentUser, deletingUser);

      // Record deletion in localStorage for cross-tab and login prevention
      if (typeof localStorage !== 'undefined') {
        try {
          const existingDeleted = JSON.parse(localStorage.getItem('zapatera_deleted_accounts') || '[]');
          const updatedDeleted = Array.isArray(existingDeleted) ? existingDeleted : [];
          if (!updatedDeleted.some((d) => (d.email || d).toLowerCase() === cleanEmail)) {
            updatedDeleted.push({ id, email: cleanEmail, deleted_at: new Date().toISOString() });
            localStorage.setItem('zapatera_deleted_accounts', JSON.stringify(updatedDeleted));
          }
          localStorage.setItem('zapatera_account_deleted_event', JSON.stringify({ userId: id, email: cleanEmail, time: Date.now() }));

          const storedDb = localStorage.getItem('zapatera_residents_db');
          if (storedDb) {
            const resList = JSON.parse(storedDb);
            if (Array.isArray(resList)) {
              localStorage.setItem('zapatera_residents_db', JSON.stringify(resList.filter((r) => r.id !== id && (r.email || '').toLowerCase() !== cleanEmail)));
            }
          }
        } catch (storageErr) {
          console.warn('Storage sync error on delete:', storageErr);
        }
      }

      // Broadcast immediately across browser tabs
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('zapatera_security_channel');
          bc.postMessage({ type: 'ACCOUNT_DELETED', userId: id, email: cleanEmail, time: Date.now() });
          setTimeout(() => bc.close(), 1000);
        }
      } catch (bcErr) {
        console.warn('BroadcastChannel notice:', bcErr);
      }

      // Broadcast through Supabase Realtime channel
      if (isSupabaseConfigured()) {
        try {
          const rChannel = supabase.channel('zapatera_account_security_broadcast');
          rChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              rChannel.send({
                type: 'broadcast',
                event: 'ACCOUNT_DELETED',
                payload: { userId: id, email: cleanEmail, time: Date.now() },
              });
              setTimeout(() => supabase.removeChannel(rChannel), 2000);
            }
          });
        } catch {
          // Handled
        }
      }
    } catch (err) {
      console.warn('Supabase delete user exception:', err);
    }

    if (onDeleteUser) {
      onDeleteUser(id);
    }

    const targetName = deletingUser?.full_name || deletingUser?.email || 'User Account';
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setAdminPasswordInput('');
    setDeleteAuthError('');
    setSearch('');
    setDeleting(false);
    setIsProcessing(false);
    await fetchUsers();

    setActionModal({
      isOpen: true,
      type: 'success',
      title: 'User Account Archived',
      message: `The user account for "${targetName}" has been successfully forwarded to Archive & Trash.`,
      buttonText: 'OK',
      onClose: () => setActionModal({ isOpen: false }),
    });
  }

  const openCreateModal = () => {
    clearForm();
    setIsModalOpen(true);
  };

  const handleUnlockUser = (user) => {
    setSecurityActionTargetUser(user);
    setSecurityActionType('unlock');
    setSecurityActionPassword('');
    setSecurityActionError('');
    setShowSecurityActionPassword(false);
    setIsSecurityActionModalOpen(true);
  };

  const handleLockUser = (user) => {
    setSecurityActionTargetUser(user);
    setSecurityActionType('lock');
    setSecurityActionPassword('');
    setSecurityActionError('');
    setShowSecurityActionPassword(false);
    setIsSecurityActionModalOpen(true);
  };

  const handleExecuteSecurityAction = async (skipPasswordCheck = false) => {
    if (!securityActionTargetUser) return;
    setSecurityActionError('');

    if (!skipPasswordCheck) {
      if (!securityActionPassword.trim()) return;
      const isValid = await verifyLoggedInPassword(securityActionPassword);
      if (!isValid) {
        setSecurityActionError('Security Authorization Failed: Incorrect administrator password.');
        return;
      }
    }

    setActionProcessing(true);
    const targetEmail = securityActionTargetUser.email;
    const adminId = currentUser?.id || StorageService.getCurrentUser()?.id || currentUser?.email || 'mardee131@gmail.com';
    const adminEmail = currentUser?.email || StorageService.getCurrentUser()?.email || 'mardee131@gmail.com';

    try {
      if (securityActionType === 'unlock') {
        await unlockUserAccount(targetEmail, adminId);
      } else {
        await lockUserAccount(targetEmail, adminId, 'SuperAdmin Manual Lockout');
      }

      StorageService.addLog({
        user_email: adminEmail,
        action: securityActionType === 'unlock' ? 'Unlocked User Account' : 'Locked User Account',
        feature: 'User Account Security',
        details: `${securityActionType === 'unlock' ? 'Manually unlocked' : 'Manually locked'} account for ${targetEmail}`,
        level: securityActionType === 'unlock' ? 'info' : 'warning',
      });

      await fetchUsers();

      setActionProcessing(false);
      setIsSecurityActionModalOpen(false);
      setSecurityActionTargetUser(null);
      setSecurityActionPassword('');

      setActionModal({
        isOpen: true,
        type: 'success',
        title: securityActionType === 'unlock' ? 'Account Unlocked' : 'Account Locked',
        message: securityActionType === 'unlock'
          ? `The user account for "${targetEmail}" has been unlocked and restored to active login status.`
          : `The user account for "${targetEmail}" has been locked and access has been restricted.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.warn('Security action error:', err);
      setActionProcessing(false);
      setActionModal({
        isOpen: true,
        type: 'danger',
        title: 'Action Failed',
        message: err?.message || 'Could not perform the account security action. Please try again.',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    }
  };

  const toggleUserStatus = async (user) => {
    const updatedStatus = !user.is_active;
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('profiles')
          .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Supabase status toggle notice:', err);
    }

    StorageService.addLog({
      user_email: currentUser?.email || StorageService.getCurrentUser()?.email,
      action: updatedStatus ? 'Activated User Account' : 'Deactivated User Account',
      feature: 'User Account Management',
      details: `${updatedStatus ? 'Activated' : 'Deactivated'} account for ${user.full_name || user.email} (${user.email})`,
      level: updatedStatus ? 'info' : 'warning',
    });

    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedStatus } : u))
    );
    fetchUsers();
  };

  const isAccountLocked = (u) =>
    Boolean(
      u.is_locked ||
      (u.failed_login_attempts || 0) >= 3 ||
      (u.failed_attempts || 0) >= 3 ||
      u.is_active === false ||
      (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true')
    );

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

  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      {/* Full-Screen Processing Loading Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-[#3b5bfd]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{processingTitle || 'Processing Action...'}</h3>
              <p className="text-xs text-slate-500 mt-1">{processingMessage || 'Synchronizing user data with database...'}</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#3b5bfd] h-full w-2/3 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

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
            Provision new accounts, filter by role or lock state, and manage security lockouts across Barangay Zapatera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalAccountsCount} Registered Accounts</span>
          </div>
          <button
            type="button"
            onClick={() => fetchUsers(true)}
            disabled={loadingUsers}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-full text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3b5bfd] ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all shrink-0 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New Account</span>
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
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01] ${filterStatus === 'all' && filterRole === 'all' ? 'ring-4 ring-offset-2 ring-sky-400' : ''
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
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01] ${filterStatus === 'active' ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
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
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48] shadow-rose-500/15 hover:scale-[1.01] ${filterStatus === 'locked' ? 'ring-4 ring-offset-2 ring-rose-400' : ''
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
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${filterRole === 'resident' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
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
                className={`appearance-none pl-9 pr-9 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none ${filterStatus !== 'all'
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
                className={`appearance-none pl-9 pr-9 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none ${filterRole !== 'all'
                  ? 'bg-blue-50/90 text-[#3b5bfd] border-blue-200 shadow-2xs'
                  : 'bg-[#f4f7fb] text-slate-700 border-transparent hover:bg-slate-200/70'
                  }`}
              >
                <option value="all">All Roles ({totalAccountsCount})</option>
                <option value="resident">Resident ({residentAccountsCount})</option>
                <option value="admin">Barangay Admin ({adminAccountsCount})</option>
                <option value="treasurer">Barangay Treasurer ({treasurerAccountsCount})</option>
                <option value="super_admin">Super Admin ({superAdminAccountsCount})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Reset Filters Pill */}
            {hasActiveFilters && (
              <button
                type="button"
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
              id="user_account_search_query"
              name="user_account_search_query"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, or address..."
              className="w-full pl-9 pr-8 py-2.5 text-xs font-medium bg-[#f4f7fb] border border-transparent focus:border-blue-200 focus:bg-white rounded-full text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
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
                            <p className="font-extrabold text-slate-900 truncate max-w-[200px]">{u.full_name || 'Unnamed Account'}</p>
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
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${isUserRegisteredVoter(u)
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
                        <div className="inline-flex items-center justify-end space-x-1.5">
                          {/* View Account Information */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(u)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 rounded-full text-xs font-bold transition-colors cursor-pointer"
                            title="View Account Details & Sign-in Info"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleUnlockUser(u)}
                              className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-xs shadow-blue-500/20 cursor-pointer active:scale-95"
                              title="Unlock Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLockUser(u)}
                              className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors cursor-pointer"
                              title="Lock Account"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEdit(u)}
                            className="p-2 text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                            title="Edit Account Credentials"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmDelete(u)}
                            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Circular Pagination Footer */}
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
                type="button"
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
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${safeCurrentPage === pageNum
                      ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-[#f4f7fb]'
                      }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                type="button"
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

      {/* Dedicated Security Verification - Save/Create Account Modal */}
      <SecurityVerificationModal
        isOpen={isSaveSecurityModalOpen}
        onClose={() => {
          setIsSaveSecurityModalOpen(false);
          setSavePasswordInput('');
          setSaveAuthError('');
          setIsModalOpen(true);
        }}
        onVerified={() => handleSaveExecute(true)}
        currentUser={currentUser}
        targetUser={pendingUserPayload}
        title={`Security Verification: ${editingId ? 'Update' : 'Create'} Account`}
        message={`Please confirm your administrator password to authorize ${editingId ? 'updating' : 'creating'} this user account.`}
        confirmText={editingId ? 'Verify & Update' : 'Verify & Create'}
        isDestructive={false}
        isDarkMode={false}
      />

      {/* Dedicated Security Delete Modal */}
      <SecurityVerificationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAdminPasswordInput('');
          setDeleteAuthError('');
          setDeletingUser(null);
        }}
        onVerified={() => handleDeleteExecute(true)}
        currentUser={currentUser}
        targetUser={deletingUser}
        title="Archive User Account"
        message="Are you sure you want to archive this user account? It will be moved to Archive & Trash where authorized administrators can restore it. Enter your password to confirm."
        confirmText="Verify & Archive"
        isDestructive={true}
        isDarkMode={false}
      />

      {/* Dedicated Security Verification - Unlock / Lock Account Modal */}
      <SecurityVerificationModal
        isOpen={isSecurityActionModalOpen}
        onClose={() => {
          setIsSecurityActionModalOpen(false);
          setSecurityActionPassword('');
          setSecurityActionError('');
          setSecurityActionTargetUser(null);
        }}
        onVerified={() => handleExecuteSecurityAction(true)}
        currentUser={currentUser}
        targetUser={securityActionTargetUser}
        title={securityActionType === 'unlock' ? 'Authorize Account Unlock' : 'Authorize Account Lock'}
        message={`Confirm your administrator password to ${securityActionType === 'unlock' ? 'unlock' : 'lock'} this account and adjust access permissions.`}
        confirmText={securityActionType === 'unlock' ? 'Verify & Unlock' : 'Verify & Lock'}
        isDestructive={securityActionType === 'lock'}
        isDarkMode={false}
      />

      {/* CRUD Account Provision Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          clearForm();
        }}
        title={(editingId || editingUser) ? 'Edit User Profile & Role' : 'Create New Account'}
        subtitle="Configure official credentials, personal details, and role permissions"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} noValidate className="space-y-4 text-xs">
          {formGeneralError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-start space-x-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{formGeneralError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Account Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.role === 'superadmin' ? 'super_admin' : formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:border-[#3b5bfd] font-bold text-slate-800 outline-none cursor-pointer transition-all"
            >
              <option value="super_admin">Super Administrator</option>
              <option value="admin">Barangay Admin</option>
              <option value="treasurer">Barangay Treasurer</option>
              <option value="resident">Resident User</option>
            </select>
          </div>

          {formData.role === 'resident' ? (
            <>
              {/* 1. Full Name Information */}
              <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
                <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
                  1. Full Name Information *
                </span>
                <div className="grid grid-cols-5 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dela Cruz"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none transition-all ${fieldErrors.last_name
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.last_name && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.last_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none transition-all ${fieldErrors.first_name
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.first_name && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.first_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      M.I. (Opt.)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="M."
                      value={formData.middle_initial}
                      onChange={(e) => handleFieldChange('middle_initial', e.target.value)}
                      className="w-full px-2 py-2 text-xs text-center bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-[#3b5bfd] outline-none"
                    />
                  </div>
                </div>

                {(formData.last_name || formData.first_name) && (
                  <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Formatted Full Name:</span>
                    <span className="font-extrabold text-[#3b5bfd] font-mono">
                      {formData.last_name.trim() || '[Last]'}, {formData.first_name.trim() || '[First]'}
                      {formData.middle_initial?.trim()
                        ? ` ${formData.middle_initial.trim().toUpperCase().replace(/\.$/, '')}.`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Personal Status & Birth Details */}
              <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
                <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
                  2. Personal Status & Birth Details *
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birth_date}
                      onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl outline-none ${fieldErrors.birth_date
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.birth_date && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.birth_date}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Auto / e.g. 28"
                      value={formData.age}
                      onChange={(e) => handleFieldChange('age', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:border-[#3b5bfd] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.gender || 'Male'}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#3b5bfd] outline-none cursor-pointer"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Civil Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.civil_status || 'Single'}
                      onChange={(e) => handleFieldChange('civil_status', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none cursor-pointer ${fieldErrors.civil_status
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    >
                      {CIVIL_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.civil_status && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.civil_status}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Barangay Zapatera Residency & Location */}
              <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
                <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
                  3. Barangay Zapatera Residency & Location *
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Sitio <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.sitio}
                      onChange={(e) => handleFieldChange('sitio', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none cursor-pointer ${fieldErrors.sitio
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    >
                      {SAMPLE_SITIOS.map((sitio) => (
                        <option key={sitio} value={sitio}>
                          {sitio}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.sitio && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.sitio}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Complete Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="e.g. Sitio Zapatera Proper, Cebu City"
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none ${fieldErrors.address
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.address && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Registered Voter Identifier Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-[#3b5bfd]" />
                    <span>
                      Voter Registration Status <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleFieldChange('voter_status', 'Registered Voter')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${formData.voter_status === 'Registered Voter'
                        ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:text-[#3b5bfd]'
                        }`}
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Yes (Registered Voter)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('voter_status', 'Not Registered Voter')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${formData.voter_status === 'Not Registered Voter'
                        ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:text-[#3b5bfd]'
                        }`}
                    >
                      <Vote className="w-3.5 h-3.5 opacity-60" />
                      <span>No (Non-Voter)</span>
                    </button>
                  </div>
                  {fieldErrors.voter_status && (
                    <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.voter_status}</span>
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Administrator / Super Admin / Treasurer Profile Information */}
              <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
                <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
                  {formData.role === 'super_admin'
                    ? 'Super Administrator Credentials *'
                    : formData.role === 'treasurer'
                      ? 'Barangay Treasurer Credentials *'
                      : 'Barangay Admin Credentials *'}
                </span>

                {/* 1. Name Information (First Name, M.I., Last Name) */}
                <div className="grid grid-cols-5 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none ${fieldErrors.first_name
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.first_name && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.first_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      M.I. (Opt.)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="D."
                      value={formData.middle_initial}
                      onChange={(e) => handleFieldChange('middle_initial', e.target.value)}
                      className="w-full px-2 py-2 text-xs text-center bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-[#3b5bfd] outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dela Cruz"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none ${fieldErrors.last_name
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.last_name && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.last_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Formatted Full Name Preview */}
                {(formData.first_name || formData.last_name) && (
                  <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Formatted Official Name:</span>
                    <span className="font-extrabold text-[#3b5bfd] font-mono">
                      {formData.last_name.trim() || '[Last]'}, {formData.first_name.trim() || '[First]'}
                      {formData.middle_initial?.trim()
                        ? ` ${formData.middle_initial.trim().toUpperCase().replace(/\.$/, '')}.`
                        : ''}
                    </span>
                  </div>
                )}

                {/* 2. Personal Credentials: Date of Birth, Age, Gender, Civil Status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birth_date}
                      onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#3b5bfd] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="120"
                      placeholder="e.g. 35"
                      value={formData.age}
                      onChange={(e) => handleFieldChange('age', e.target.value)}
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl font-mono outline-none ${fieldErrors.age
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    {fieldErrors.age && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.age}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.gender || 'Male'}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl outline-none cursor-pointer ${fieldErrors.gender
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.gender && (
                      <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.gender}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Civil Status</label>
                    <select
                      value={formData.civil_status || 'Single'}
                      onChange={(e) => handleFieldChange('civil_status', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#3b5bfd] outline-none cursor-pointer"
                    >
                      {CIVIL_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Office & Official Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office / Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="e.g. Barangay Zapatera Hall, Cebu City"
                    className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none ${fieldErrors.address
                      ? 'border-rose-500'
                      : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                      }`}
                  />
                  {fieldErrors.address && (
                    <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Contact Details Section */}
          <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
            <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
              Contact & Login Details *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gmail / Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  disabled={!!editingId}
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl font-mono outline-none disabled:opacity-60 ${fieldErrors.email
                    ? 'border-rose-500'
                    : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                    }`}
                />
                {fieldErrors.email && (
                  <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="09171234567"
                  className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl font-mono outline-none ${fieldErrors.phone
                    ? 'border-rose-500'
                    : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                    }`}
                />
                {fieldErrors.phone && (
                  <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.phone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Password & Security Section (Only for New Account Provisioning) */}
          {!editingId && (
            <div className="p-4 bg-[#f4f7fb] rounded-[22px] border border-slate-200/70 space-y-3">
              <span className="text-[10px] font-extrabold text-[#3b5bfd] uppercase tracking-wider block">
                Password & Security Credentials *
              </span>

              {/* Strong Password Requirements Checklist */}
              <div className="p-3 bg-white border border-blue-100 rounded-2xl space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-1.5 font-extrabold text-[#3b5bfd]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Strong Password Criteria (Required):</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {[
                    { ok: passwordStrength.hasLength, label: 'At least 8 characters' },
                    { ok: passwordStrength.hasUpper, label: '1 Uppercase (A-Z)' },
                    { ok: passwordStrength.hasLower, label: '1 Lowercase (a-z)' },
                    { ok: passwordStrength.hasNumber, label: '1 Number (0-9)' },
                    { ok: passwordStrength.hasSpecial, label: '1 Special symbol (!@#$%^&*)' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center space-x-1 ${item.ok ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                        }`}
                    >
                      {item.ok ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3 h-3 text-rose-400 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Password and Password Confirmation Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProvisionPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Create password"
                      className={`w-full pl-3.5 pr-9 py-2 text-xs bg-white border rounded-xl font-mono outline-none ${fieldErrors.password
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProvisionPassword(!showProvisionPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showProvisionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProvisionConfirmPassword ? 'text' : 'password'}
                      value={formData.confirm_password}
                      onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-3.5 pr-9 py-2 text-xs bg-white border rounded-xl font-mono outline-none ${fieldErrors.confirm_password
                        ? 'border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#3b5bfd]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProvisionConfirmPassword(!showProvisionConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showProvisionConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirm_password && (
                    <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.confirm_password}</span>
                    </p>
                  )}
                </div>
              </div>

              {formData.confirm_password && (
                <div className="text-[11px]">
                  {passwordsMatch ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Passwords match</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1 font-bold">
                      <X className="w-3.5 h-3.5" />
                      <span>Passwords do not match</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                clearForm();
              }}
              className="px-5 py-2.5 font-bold text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 rounded-full cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 font-bold text-white bg-[#3b5bfd] hover:bg-blue-700 rounded-full shadow-sm shadow-blue-500/25 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Proceed to Authorization</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Simplified & Organized Resident / Official Credentials Modal */}
      {isViewModalOpen && viewingUser && (
        <Modal
          isOpen={isViewModalOpen && !!viewingUser}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          title="Account Profile & Credentials"
          subtitle="Verified citizen or official identity and security status"
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
                            viewingUser.role === 'super_admin' || viewingUser.role === 'superadmin'
                              ? 'purple'
                              : viewingUser.role === 'admin'
                                ? 'blue'
                                : viewingUser.role === 'treasurer'
                                  ? 'success'
                                  : 'active'
                          }
                        >
                          {viewingUser.role === 'super_admin' || viewingUser.role === 'superadmin'
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${isLocked
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
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isVoter
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
                      <MapPin className="w-3 h-3 text-emerald-600" /> Residential / Office Address
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
                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleUnlockUser(viewingUser);
                        }}
                        className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm shadow-blue-500/25 cursor-pointer active:scale-95"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock Account</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleLockUser(viewingUser);
                        }}
                        className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Account</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingUser;
                        setIsViewModalOpen(false);
                        handleEdit(target);
                      }}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#f4f7fb] hover:bg-blue-50 text-slate-700 hover:text-[#3b5bfd] rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  <button
                    type="button"
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

