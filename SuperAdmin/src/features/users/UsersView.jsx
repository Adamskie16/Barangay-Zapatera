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
} from 'lucide-react';
import ActionModal from '../../components/ActionModal';
import { validateEmail, sanitizeInput, unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { supabase, supabaseAdmin, signUpUserWithoutPersistSession, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';

const SAMPLE_SITIOS = [
  'Sitio Zapatera Proper',
  'Sitio Zapatera Central',
  'Sitio Lower Zapatera',
  'Sitio Riverside',
  'Sitio San Roque',
  'Sitio Manga',
  'Sitio Sto. Niño',
  'Sitio Kawayan',
  'Sitio Mabolo Border',
  'Sitio Centro',
];

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];

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


export default function UsersView({ onSaveUser, onDeleteUser, currentUser, isDarkMode }) {
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
          enriched = { ...enriched, ...dbProfile };
        }
      } catch (err) {
        console.warn('Notice: Error fetching full resident profile:', err);
      }
    }

    // 2. Fetch and merge resident signup credentials from local storage
    try {
      const stored = localStorage.getItem('zapatera_residents_db');
      if (stored) {
        const residents = JSON.parse(stored);
        if (Array.isArray(residents)) {
          const match = residents.find(
            (r) => (r.email && r.email.toLowerCase() === (user.email || '').toLowerCase().trim()) ||
                   (r.id && r.id === user.id)
          );
          if (match) {
            enriched = {
              ...match,
              ...enriched,
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
        }
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

            await supabase.from('activity_logs').insert({
              user_email: currentUser?.email || 'superadmin@zapatera.gov.ph',
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

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    birth_date: '',
    civil_status: 'Single',
    voter_status: 'Registered Voter',
    sitio: 'Sitio Zapatera Proper',
    role: 'resident',
    phone: '',
    address: 'Sitio Zapatera Proper, Barangay Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: '',
    is_active: true,
    password: '',
    confirm_password: '',
  });

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
      if (field === 'sitio' && prev.role === 'resident') {
        updated.address = `${value}, Barangay Zapatera, Cebu City`;
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
            if (localMatch) {
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
      console.warn('Notice: Supabase users fetch error:', err);
    }

    setUsersList([]);
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
      // Administrator Profile Information
      if (!formData.full_name || !formData.full_name.trim()) {
        errors.full_name = 'Administrator Full Name is required.';
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
  function handleFormSubmit(e) {
    e.preventDefault();

    const isValid = validateProvisionForm();
    if (!isValid) {
      return;
    }

    const cleanMI = (formData.middle_initial || '').trim().toUpperCase().replace(/\.$/, '');
    const cleanLast = (formData.last_name || '').trim();
    const cleanFirst = (formData.first_name || '').trim();
    const computedFullName = formData.role === 'resident' && (cleanLast || cleanFirst)
      ? `${cleanLast}, ${cleanFirst}${cleanMI ? ' ' + cleanMI + '.' : ''}`
      : sanitizeInput(formData.full_name);

    const payload = {
      email: sanitizeInput(formData.email.toLowerCase().trim()),
      full_name: computedFullName,
      first_name: cleanFirst || null,
      middle_initial: cleanMI || null,
      last_name: cleanLast || null,
      birth_date: formData.birth_date || null,
      civil_status: formData.civil_status || 'Single',
      voter_status: formData.voter_status || 'Registered Voter',
      sitio: formData.sitio || 'Sitio Zapatera Proper',
      role: formData.role, // 'admin' or 'resident'
      phone: sanitizeInput(formData.phone),
      address: sanitizeInput(formData.address || `${formData.sitio || 'Barangay Zapatera'}, Cebu City`),
      id_type: sanitizeInput(formData.id_type || (formData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay ID')),
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
  async function handleSaveExecute() {
    if (!savePasswordInput.trim() || !pendingUserPayload) return;
    setSaveAuthError('');

    const isPasswordValid = await verifyLoggedInPassword(savePasswordInput);
    if (!isPasswordValid) {
      setSaveAuthError('Security Verification Failed: Incorrect logged-in account password.');
      return;
    }

    setIsSaving(true);
    setIsProcessing(true);
    setProcessingTitle(editingId ? 'Updating User Account...' : 'Creating New Account...');
    setProcessingMessage('Verifying credentials & saving user profile to database...');

    try {
      if (isSupabaseConfigured()) {
        if (editingId) {
          const { error } = await supabase
            .from('profiles')
            .update(pendingUserPayload)
            .eq('id', editingId);

          if (error) {
            console.error('Supabase profile update error:', error);
          }
        } else {
          // CREATE NEW ACCOUNT IN SUPABASE AUTH + PUBLIC.PROFILES
          let assignedId = null;

          if (supabaseAdmin) {
            try {
              const { data: adminCreated, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
                email: pendingUserPayload.email,
                password: formData.password || 'password123',
                email_confirm: true,
                user_metadata: {
                  full_name: pendingUserPayload.full_name,
                  role: pendingUserPayload.role,
                  phone: pendingUserPayload.phone,
                },
              });
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
                role: pendingUserPayload.role,
                phone: pendingUserPayload.phone,
              },
            });
            if (res?.id) {
              assignedId = res.id;
            }
          }

          const newId = assignedId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`);
          const { error } = await supabase.from('profiles').upsert(
            [
              {
                id: newId,
                ...pendingUserPayload,
                created_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'email' }
          );

          if (error) {
            console.error('Supabase profile insert/upsert error:', error);
          }
        }
      }
    } catch (err) {
      console.error('Supabase users write notice:', err);
    }

    if (onSaveUser) {
      onSaveUser({
        id: editingId || undefined,
        ...pendingUserPayload,
        password: formData.password || 'password123',
      });
    }

    if (pendingUserPayload.role === 'resident') {
      try {
        const storedDb = localStorage.getItem('zapatera_residents_db');
        let residents = storedDb ? JSON.parse(storedDb) : [];
        if (!Array.isArray(residents)) residents = [];
        const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
        const existingIdx = residents.findIndex((r) => (r.email && r.email.toLowerCase() === cleanEmail) || (editingId && r.id === editingId));
        const residentEntry = {
          id: editingId || assignedId || `res-${Date.now()}`,
          ...pendingUserPayload,
          password: formData.password || (existingIdx >= 0 ? residents[existingIdx].password : 'password123'),
        };
        if (existingIdx >= 0) {
          residents[existingIdx] = { ...residents[existingIdx], ...residentEntry };
        } else {
          residents.unshift(residentEntry);
        }
        localStorage.setItem('zapatera_residents_db', JSON.stringify(residents));
      } catch (e) {
        console.warn('Notice: localStorage zapatera_residents_db update error:', e);
      }
    }

    if (pendingUserPayload.role === 'super_admin' || pendingUserPayload.role === 'superadmin') {
      try {
        const storedSAs = localStorage.getItem('zapatera_super_admins_db');
        let superAdmins = storedSAs ? JSON.parse(storedSAs) : [];
        if (!Array.isArray(superAdmins)) superAdmins = [];
        const cleanEmail = pendingUserPayload.email.toLowerCase().trim();
        const existingIdx = superAdmins.findIndex((s) => (s.email && s.email.toLowerCase() === cleanEmail) || (editingId && s.id === editingId));
        const saEntry = {
          id: editingId || assignedId || `sa-${Date.now()}`,
          ...pendingUserPayload,
          role: 'super_admin',
          password: formData.password || (existingIdx >= 0 ? superAdmins[existingIdx].password : 'password123'),
        };
        if (existingIdx >= 0) {
          superAdmins[existingIdx] = { ...superAdmins[existingIdx], ...saEntry };
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
    const isNew = !editingId;

    setIsSaveSecurityModalOpen(false);
    setEditingId(null);
    setIsModalOpen(false);
    setPendingUserPayload(null);
    setSavePasswordInput('');
    setIsSaving(false);
    setIsProcessing(false);
    fetchUsers();

    setActionModal({
      isOpen: true,
      type: 'success',
      title: isNew ? 'Account Created' : 'Account Updated',
      message: isNew
        ? `The ${roleTitle} account for "${savedName}" (${savedEmail}) has been created successfully.`
        : `The profile details for "${savedName}" (${savedEmail}) were updated successfully.`,
      buttonText: 'Done',
      onClose: () => setActionModal({ isOpen: false }),
    });
  }

  // 3. EDIT USER SELECTION
  function handleEdit(user) {
    setEditingId(user.id);
    setFieldErrors({});
    setFormGeneralError('');
    setShowProvisionPassword(false);
    setShowProvisionConfirmPassword(false);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      first_name: user.first_name || '',
      middle_initial: user.middle_initial || '',
      last_name: user.last_name || '',
      birth_date: user.birth_date || user.birthdate || '',
      civil_status: user.civil_status || 'Single',
      voter_status: user.voter_status || 'Registered Voter',
      sitio: user.sitio || 'Sitio Zapatera Proper',
      role: user.role === 'super_admin' || user.role === 'superadmin' ? 'super_admin' : (user.role || 'resident'),
      phone: user.phone || '',
      address: user.address || 'Barangay Zapatera, Cebu City',
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

  async function handleDeleteExecute() {
    if (!deletingUser || !adminPasswordInput.trim()) return;
    setDeleteAuthError('');

    const isPasswordValid = await verifyLoggedInPassword(adminPasswordInput);
    if (!isPasswordValid) {
      setDeleteAuthError('Security Verification Failed: Incorrect logged-in account password.');
      return;
    }

    setDeleting(true);
    setIsProcessing(true);
    setProcessingTitle('Removing User Account...');
    setProcessingMessage(`Deleting profile record for ${deletingUser?.email || 'user'}...`);

    const id = deletingUser.id;
    const email = deletingUser.email;
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (supabaseAdmin && isUuid) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(id);
          } catch (admErr) {
            console.warn('Supabase Admin auth delete notice:', admErr);
          }
        }

        if (isUuid) {
          try {
            await supabase.rpc('delete_user_by_id', { user_id: id });
          } catch (rErr) {
            // RPC not created yet
          }
        }

        if (cleanEmail) {
          try {
            await supabase.rpc('delete_user_by_email', { user_email: cleanEmail });
          } catch (rErr) {
            // RPC not created yet
          }
        }

        if (isUuid) {
          const { error: idDelErr } = await supabase.from('profiles').delete().eq('id', id);
          if (idDelErr) {
            console.warn('Supabase profiles delete by ID notice:', idDelErr.message);
          }
        }

        if (cleanEmail) {
          const { error: emailDelErr } = await supabase
            .from('profiles')
            .delete()
            .eq('email', cleanEmail);
          if (emailDelErr) {
            console.warn('Supabase profiles delete by email notice:', emailDelErr.message);
          }
        }
      }

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

    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setAdminPasswordInput('');
    setDeleteAuthError('');
    setSearch('');
    setDeleting(false);
    setIsProcessing(false);
    fetchUsers();
  }

  const openCreateModal = () => {
    setEditingId(null);
    setFieldErrors({});
    setFormGeneralError('');
    setShowProvisionPassword(false);
    setShowProvisionConfirmPassword(false);
    setFormData({
      email: '',
      full_name: '',
      first_name: '',
      middle_initial: '',
      last_name: '',
      birth_date: '',
      civil_status: 'Single',
      voter_status: 'Registered Voter',
      sitio: 'Sitio Zapatera Proper',
      role: 'resident', // Default creation role: Resident User
      phone: '',
      address: 'Sitio Zapatera Proper, Barangay Zapatera, Cebu City',
      id_type: 'Government ID',
      id_number: '',
      is_active: true,
      password: '',
      confirm_password: '',
    });
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

  const handleExecuteSecurityAction = async () => {
    if (!securityActionPassword.trim() || !securityActionTargetUser) return;
    setSecurityActionError('');

    const isValid = await verifyLoggedInPassword(securityActionPassword);
    if (!isValid) {
      setSecurityActionError('Security Authorization Failed: Incorrect administrator password.');
      return;
    }

    setActionProcessing(true);
    const targetEmail = securityActionTargetUser.email;
    const adminEmail = currentUser?.email || 'superadmin@zapatera.gov.ph';

    try {
      if (securityActionType === 'unlock') {
        await unlockUserAccount(targetEmail, adminEmail);
      } else {
        await lockUserAccount(targetEmail, adminEmail, 'SuperAdmin Manual Lockout');
      }

      await fetchUsers();
    } catch (err) {
      console.warn('Security action error:', err);
    } finally {
      setActionProcessing(false);
      setIsSecurityActionModalOpen(false);
      setSecurityActionTargetUser(null);
      setSecurityActionPassword('');
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

    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedStatus } : u))
    );
    fetchUsers();
  };

  const filteredUsers = usersList.filter((u) => {
    const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3 || u.is_active === false || (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true');
    const matchesRole =
      filterRole === 'all'
        ? true
        : filterRole === 'locked'
        ? isLocked
        : filterRole === 'super_admin'
        ? u.role === 'super_admin' || u.role === 'superadmin'
        : u.role === filterRole;

    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id_number?.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, pageSize]);

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
    <div className="space-y-6">
      {/* Full-Screen Processing Loading Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{processingTitle || 'Processing Action...'}</h3>
              <p className="text-xs text-slate-500 mt-1">{processingMessage || 'Synchronizing user data with database...'}</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          <h2 className="text-xl font-bold">User Account Management & Security</h2>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Create credentials, monitor 3-attempt account lockouts, and authorize unlock actions for Barangay Staff & Residents.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Refresh Account Data"
          >
            <Loader2 className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/20 transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Account</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'super_admin', label: 'Super Admin' },
            { id: 'admin', label: 'Admin' },
            { id: 'treasurer', label: 'Treasurer' },
            { id: 'resident', label: 'Resident' },
            { id: 'locked', label: 'Locked Out (3 Failures)' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRole(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
                filterRole === r.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            id="user_account_search_query"
            name="user_account_search_query"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account name or email..."
            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-2xl border shadow-xs overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
              }`}>
                <th
                  onClick={() => handleSort('full_name')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>User Identity</span>
                    {sortKey === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    {sortKey === 'role' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact & Location</span>
                    {sortKey === 'phone' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('is_locked')}
                  className="px-6 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Security & Lock Status</span>
                    {sortKey === 'is_locked' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={isDarkMode} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No accounts found matching your search filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3 || u.is_active === false || (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true');
                  const failedCount = isLocked ? Math.max(u.failed_attempts || 0, 3) : (u.failed_attempts || 0);

                  return (
                    <tr key={u.id || u.email} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar
                            src={u.avatar_url}
                            name={u.full_name || u.email}
                            role={u.role}
                            size="md"
                            isDarkMode={isDarkMode}
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{u.full_name || 'Unnamed Account'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : u.role === 'treasurer' ? 'success' : 'active'}>
                            {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Barangay Admin' : u.role === 'treasurer' ? 'Barangay Treasurer' : 'Resident'}
                          </Badge>
                          {u.role === 'resident' && (
                            isUserRegisteredVoter(u) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <Vote className="w-3 h-3" /> Registered Voter
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                <Vote className="w-3 h-3 opacity-60" /> Non-Voter
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 space-y-0.5 text-[11px]">
                        <p className="text-slate-600 dark:text-slate-300">{u.phone || 'No phone registered'}</p>
                        <p className="text-slate-400 truncate max-w-xs">{u.address || 'Barangay Zapatera, Cebu City'}</p>
                      </td>

                      <td className="px-6 py-4">
                        {isLocked ? (
                          <div className="flex flex-col space-y-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                              <Lock className="w-3 h-3" />
                              <span>Locked ({failedCount}/3 Failed)</span>
                            </span>
                            {u.locked_at && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(u.locked_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active (Secure)</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Account Security & Telemetry Profile */}
                          <button
                            onClick={() => handleOpenViewModal(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="View Account Security, Telemetry & Sessions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isLocked ? (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              title="Unlock Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock Account</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLockUser(u)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Lock Account"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Account Credentials"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(u)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* 10-Row Pagination Footer */}
        {totalEntries > 0 && (
          <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              <span>Showing</span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{startIndex}</span>
              <span>to</span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{endIndex}</span>
              <span>of</span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalEntries}</span>
              <span>accounts</span>

              <div className="ml-4 flex items-center gap-1.5">
                <span className="text-[11px] opacity-70">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 border rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                  }`}
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
                className={`px-2.5 py-1.5 border rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
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
                        : isDarkMode
                        ? 'border border-slate-800 text-slate-300 hover:bg-slate-800'
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
                className={`px-2.5 py-1.5 border rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Security Verification - Save/Create Account Modal */}
      <Modal
        isOpen={isSaveSecurityModalOpen}
        onClose={() => {
          setIsSaveSecurityModalOpen(false);
          setSavePasswordInput('');
          setSaveAuthError('');
          setIsModalOpen(true);
        }}
        title={`Security Verification - ${editingId ? 'Update' : 'Create'} Account`}
        darkMode={isDarkMode}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-100">{editingId ? 'Authorize Account Update' : 'Authorize Account Creation'}</p>
              <p className="text-xs text-blue-300 mt-1">
                Please confirm your logged-in account password to authorize {editingId ? 'updating' : 'creating'} access credentials for{' '}
                <strong className="text-white">{formData.full_name || 'Account User'}</strong> (
                <span className="font-mono text-blue-200">{formData.email || 'N/A'}</span>).
              </p>
            </div>
          </div>

          {saveAuthError && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{saveAuthError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
            <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Account Password (Required to Authorize)
            </label>
            <div className="relative">
              <input
                type={showSavePassword ? 'text' : 'password'}
                name="save_security_password"
                autoComplete="current-password"
                required
                autoFocus
                value={savePasswordInput}
                onChange={(e) => {
                  setSavePasswordInput(e.target.value);
                  setSaveAuthError('');
                }}
                placeholder="Enter your logged-in account password"
                className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowSavePassword(!showSavePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showSavePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsSaveSecurityModalOpen(false);
                setSavePasswordInput('');
                setSaveAuthError('');
                setIsModalOpen(true);
              }}
              className={`px-4 py-2 font-medium rounded-lg cursor-pointer ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || !savePasswordInput.trim()}
              onClick={handleSaveExecute}
              className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-900/20 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Authorize & Save</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Dedicated Security Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAdminPasswordInput('');
          setDeleteAuthError('');
        }}
        title="Security Verification - Delete Account"
        darkMode={isDarkMode}
      >
        {deletingUser && (
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isDarkMode ? 'bg-rose-950/30 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Authorize Permanent Account Deletion</p>
                <p className="text-xs opacity-90 mt-1">
                  You are requesting to permanently delete the account for{' '}
                  <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{deletingUser.full_name || 'Selected User'}</strong> (
                  <span className="font-mono">{deletingUser.email || 'N/A'}</span>).
                  Please verify your logged-in administrator password to authorize this action.
                </p>
              </div>
            </div>

            {deleteAuthError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{deleteAuthError}</span>
              </div>
            )}

            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Administrator Password (Required)
              </label>
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  name="delete_security_password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setDeleteAuthError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && adminPasswordInput.trim() && !deleting) {
                      e.preventDefault();
                      handleDeleteExecute();
                    }
                  }}
                  placeholder="Enter your administrator password"
                  className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-rose-500 font-mono text-xs ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className={`pt-3 border-t flex items-center justify-end space-x-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAdminPasswordInput('');
                  setDeleteAuthError('');
                }}
                className={`px-4 py-2 font-medium rounded-lg cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || !adminPasswordInput.trim()}
                onClick={handleDeleteExecute}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md shadow-rose-900/20 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize & Delete</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dedicated Security Verification - Unlock / Lock Account Modal */}
      <Modal
        isOpen={isSecurityActionModalOpen}
        onClose={() => {
          setIsSecurityActionModalOpen(false);
          setSecurityActionPassword('');
          setSecurityActionError('');
          setSecurityActionTargetUser(null);
        }}
        title={`Security Verification - ${securityActionType === 'unlock' ? 'Unlock Account' : 'Lock Account'}`}
        darkMode={isDarkMode}
      >
        {securityActionTargetUser && (
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
              securityActionType === 'unlock'
                ? isDarkMode ? 'bg-blue-950/30 border-blue-800/60 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                : isDarkMode ? 'bg-rose-950/30 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">
                  {securityActionType === 'unlock' ? 'Authorize Account Unlock' : 'Authorize Account Lockout'}
                </p>
                <p className="text-xs opacity-90 mt-1">
                  You are requesting to {securityActionType === 'unlock' ? 'unlock' : 'lock'} the account for{' '}
                  <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{securityActionTargetUser.full_name || 'User'}</strong> (
                  <span className="font-mono">{securityActionTargetUser.email}</span>).
                  Please verify your logged-in administrator password to authorize this action.
                </p>
              </div>
            </div>

            {securityActionError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{securityActionError}</span>
              </div>
            )}

            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Administrator Password (Required)
              </label>
              <div className="relative">
                <input
                  type={showSecurityActionPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={securityActionPassword}
                  onChange={(e) => {
                    setSecurityActionPassword(e.target.value);
                    setSecurityActionError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && securityActionPassword.trim()) {
                      e.preventDefault();
                      handleExecuteSecurityAction();
                    }
                  }}
                  placeholder="Enter your administrator password"
                  className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecurityActionPassword(!showSecurityActionPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showSecurityActionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={actionProcessing}
                onClick={() => {
                  setIsSecurityActionModalOpen(false);
                  setSecurityActionPassword('');
                  setSecurityActionError('');
                  setSecurityActionTargetUser(null);
                }}
                className={`px-4 py-2 font-medium rounded-lg cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing || !securityActionPassword.trim()}
                onClick={handleExecuteSecurityAction}
                className={`px-4 py-2 font-semibold text-white rounded-lg shadow-md disabled:opacity-50 flex items-center space-x-2 cursor-pointer ${
                  securityActionType === 'unlock'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                }`}
              >
                {actionProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{securityActionType === 'unlock' ? 'Authorize & Unlock' : 'Authorize & Lock'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CRUD Account Provision Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit User Profile & Role' : 'Create New Account'}
        darkMode={isDarkMode}
      >
        <form onSubmit={handleFormSubmit} noValidate className="space-y-4 text-xs">
          {formGeneralError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 flex items-start space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{formGeneralError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">
              Account Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role === 'superadmin' ? 'super_admin' : formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="super_admin">Super Administrator</option>
              <option value="admin">Barangay Admin</option>
              <option value="treasurer">Barangay Treasurer</option>
              <option value="resident">Resident User</option>
            </select>
          </div>

          {formData.role === 'resident' ? (
            <>
              {/* 1. Full Name Information (Mirroring Resident Sign-up) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  1. Full Name Information *
                </span>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dela Cruz"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.last_name
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    {fieldErrors.last_name && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.last_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.first_name
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    {fieldErrors.first_name && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.first_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">
                      M.I. (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="M."
                      value={formData.middle_initial}
                      onChange={(e) => handleFieldChange('middle_initial', e.target.value)}
                      className={`w-full px-2 py-2 text-xs text-center border rounded-lg focus:ring-2 font-bold ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                </div>

                {(formData.last_name || formData.first_name) && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Formatted Full Name:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                      {formData.last_name.trim() || '[Last]'}, {formData.first_name.trim() || '[First]'}
                      {formData.middle_initial?.trim()
                        ? ` ${formData.middle_initial.trim().toUpperCase().replace(/\.$/, '')}.`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Personal Status & Birth Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  2. Personal Status & Birth Details *
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birth_date}
                      onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.birth_date
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    {fieldErrors.birth_date && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.birth_date}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Civil Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.civil_status}
                      onChange={(e) => handleFieldChange('civil_status', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.civil_status
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    >
                      {CIVIL_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.civil_status && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.civil_status}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Barangay Zapatera Residency & Location */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  3. Barangay Zapatera Residency & Location *
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Select Sitio <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sitio}
                      onChange={(e) => handleFieldChange('sitio', e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.sitio
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    >
                      {SAMPLE_SITIOS.map((sitio) => (
                        <option key={sitio} value={sitio}>
                          {sitio}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.sitio && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.sitio}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Complete Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="e.g. Sitio Zapatera Proper, Cebu City"
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                        fieldErrors.address
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    {fieldErrors.address && (
                      <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldErrors.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Registered Voter Identifier Selection */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      Voter Registration Status <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFieldChange('voter_status', 'Registered Voter')}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.voter_status === 'Registered Voter'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Yes (Registered Voter)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('voter_status', 'Not Registered Voter')}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.voter_status === 'Not Registered Voter'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <Vote className="w-3.5 h-3.5 opacity-60" />
                      <span>No (Non-Voter)</span>
                    </button>
                  </div>
                  {fieldErrors.voter_status && (
                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.voter_status}</span>
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Administrator Profile Information */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Administrator Credentials *
                </span>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Administrator Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    placeholder="e.g. Juan De La Cruz"
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                      fieldErrors.full_name
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                    }`}
                  />
                  {fieldErrors.full_name && (
                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.full_name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Office / Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="e.g. Barangay Zapatera Hall, Cebu City"
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Contact Details Section */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Contact & Login Details *
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Gmail / Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  disabled={!!editingId}
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 font-mono ${
                    fieldErrors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="09171234567"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 font-mono ${
                    fieldErrors.phone
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.phone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Password & Security Section (Only for New Account Provisioning) */}
          {!editingId && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                Password & Security Credentials *
              </span>

              {/* Strong Password Requirements Checklist (Live indicators matching Resident signup) */}
              <div className="p-2.5 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/60 rounded-lg space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-1.5 font-bold text-blue-600 dark:text-blue-300">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Strong Password Criteria (Required):</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength.hasLength
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {passwordStrength.hasLength ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-red-500" />
                    )}
                    <span>At least 8 characters</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength.hasUpper
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {passwordStrength.hasUpper ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-red-500" />
                    )}
                    <span>1 Uppercase (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength.hasLower
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {passwordStrength.hasLower ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-red-500" />
                    )}
                    <span>1 Lowercase (a-z)</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength.hasNumber
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {passwordStrength.hasNumber ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-red-500" />
                    )}
                    <span>1 Number (0-9)</span>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ${
                      passwordStrength.hasSpecial
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {passwordStrength.hasSpecial ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <X className="w-3 h-3 text-red-500" />
                    )}
                    <span>1 Special symbol (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              {/* Password and Password Confirmation Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProvisionPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Create password"
                      className={`w-full pl-3 pr-9 py-2 text-xs border rounded-lg focus:ring-2 font-mono ${
                        fieldErrors.password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProvisionPassword(!showProvisionPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showProvisionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProvisionConfirmPassword ? 'text' : 'password'}
                      value={formData.confirm_password}
                      onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-3 pr-9 py-2 text-xs border rounded-lg focus:ring-2 font-mono ${
                        fieldErrors.confirm_password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:ring-blue-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProvisionConfirmPassword(!showProvisionConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showProvisionConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirm_password && (
                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.confirm_password}</span>
                    </p>
                  )}
                </div>
              </div>

              {formData.confirm_password && (
                <div className="text-[11px]">
                  {passwordsMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Passwords match</span>
                    </span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400 flex items-center gap-1 font-semibold">
                      <X className="w-3.5 h-3.5" />
                      <span>Passwords do not match</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Proceed to Security Authorization</span>
            </button>
          </div>
        </form>
      </Modal>

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
          darkMode={isDarkMode}
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
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  isDarkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-gradient-to-r from-blue-50/80 to-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3.5">
                    <UserAvatar
                      src={viewingUser.avatar_url}
                      name={cleanFullName}
                      role={viewingUser.role}
                      size="lg"
                      isDarkMode={isDarkMode}
                      showStatus={true}
                      isLocked={viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
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
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isVoter
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                              : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Vote className={`w-3.5 h-3.5 ${isVoter ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                          {isVoter ? 'Registered Voter' : 'Non-Voter'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span>{viewingUser.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
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
                    <span className="text-[11px] text-slate-400">
                      Registered: {formatDate(viewingUser.created_at || new Date().toISOString())}
                    </span>
                  </div>
                </div>

                {/* ONE Single Clean Personal Information Card */}
                <div className={`p-5 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-blue-500" />
                      <span>Personal Information & Resident Credentials</span>
                    </h5>
                    <span className="text-[11px] font-semibold text-slate-400">Barangay Zapatera Records</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">First Name</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {first || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Middle Initial</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {mi ? `${mi}.` : 'None / Not Provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Last Name</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {last || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-500" /> Date of Birth
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {birthDateFormatted || 'Not recorded'}
                        {age !== null && <span className="text-slate-500 font-normal ml-1">({age} yrs old)</span>}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Civil Status</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {viewingUser.civil_status || 'Single'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Vote className="w-3 h-3 text-blue-500" /> Voter Status
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isVoter
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {isVoter ? 'Registered Voter' : 'Non-Voter'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Sitio / Area
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {viewingUser.sitio || 'Sitio Zapatera Proper'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Complete Residential Address
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {viewingUser.address || viewingUser.complete_address || `${viewingUser.sitio || 'Barangay Zapatera'}, Cebu City`}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-500" /> Contact Number
                      </span>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {viewingUser.phone || viewingUser.contact_number || 'None provided'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-500" /> Email Address
                      </span>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {viewingUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? (
                      <button
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleUnlockUser(viewingUser);
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Authorize Unlock Account</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleLockUser(viewingUser);
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                    className={`px-5 py-2 font-bold rounded-xl text-xs transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
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
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
