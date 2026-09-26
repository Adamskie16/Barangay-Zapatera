// SuperAdmin/src/features/users/UsersView.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
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
} from 'lucide-react';
import ActionModal from '../../components/ActionModal';
import { validateEmail, sanitizeInput, unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { supabase, supabaseAdmin, signUpUserWithoutPersistSession, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';

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

  const handleOpenViewModal = (user) => {
    setViewingUser(user);
    setModalActiveTab('telemetry');
    setIsViewModalOpen(true);
    fetchUserDevices(user.id);
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
    role: 'admin', // Default to Barangay Admin creation
    phone: '',
    address: 'Barangay Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: '',
    is_active: true,
    password: '',
  });

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

        if (!error && supaProfiles) {
          const seenEmails = new Set();
          const uniqueProfiles = [];

          for (const p of supaProfiles) {
            const cleanEmail = (p.email || '').toLowerCase().trim();
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

  // Handle Main Form Submission -> Trigger Dedicated Security Modal
  function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const payload = {
      email: sanitizeInput(formData.email),
      full_name: sanitizeInput(formData.full_name),
      role: formData.role, // 'admin' or 'resident'
      phone: sanitizeInput(formData.phone),
      address: sanitizeInput(formData.address),
      id_type: sanitizeInput(formData.id_type),
      id_number: sanitizeInput(formData.id_number),
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
    setProcessingTitle(editingId ? 'Updating User Account...' : 'Provisioning New Account...');
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsSaveSecurityModalOpen(false);
    setEditingId(null);
    setIsModalOpen(false);
    setPendingUserPayload(null);
    setSavePasswordInput('');
    setIsSaving(false);
    setIsProcessing(false);
    fetchUsers();
  }

  // 3. EDIT USER SELECTION
  function handleEdit(user) {
    setEditingId(user.id);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role === 'super_admin' ? 'admin' : (user.role || 'admin'),
      phone: user.phone || '',
      address: user.address || 'Barangay Zapatera, Cebu City',
      id_type: user.id_type || 'Government ID',
      id_number: user.id_number || '',
      is_active: user.is_active !== false,
      password: '',
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
    setFormData({
      email: '',
      full_name: '',
      role: 'admin', // Default creation role: Barangay Admin
      phone: '',
      address: 'Barangay Zapatera, Cebu City',
      id_type: 'Government ID',
      id_number: '',
      is_active: true,
      password: 'password123',
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
        : u.role === filterRole;

    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id_number?.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

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
            Provision credentials, monitor 3-attempt account lockouts, and authorize unlock actions for Barangay Staff & Residents.
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
            <span>Provision New Account</span>
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
                <th className="px-6 py-3.5">User Identity</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Contact & Location</th>
                <th className="px-6 py-3.5">Security & Lock Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={isDarkMode} />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No accounts found matching your search filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3 || u.is_active === false || (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true');
                  const failedCount = isLocked ? Math.max(u.failed_attempts || 0, 3) : (u.failed_attempts || 0);

                  return (
                    <tr key={u.id || u.email} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-700'
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || 'User avatar'}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{ display: u.avatar_url ? 'none' : 'flex' }}
                            className={`w-9 h-9 rounded-full items-center justify-center font-bold text-xs ${
                              u.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                : u.role === 'admin'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{u.full_name || 'Unnamed Account'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : 'active'}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Barangay Admin' : 'Resident'}
                        </Badge>
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
        title={`Security Verification - ${editingId ? 'Update' : 'Provision'} Account`}
        darkMode={isDarkMode}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-100">{editingId ? 'Authorize Account Update' : 'Authorize Account Provisioning'}</p>
              <p className="text-xs text-blue-300 mt-1">
                Please confirm your logged-in account password to authorize {editingId ? 'updating' : 'provisioning'} access credentials for{' '}
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
            <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-rose-100">Permanent Account Deletion</p>
                <p className="text-xs text-rose-300 mt-1">
                  Are you sure you want to permanently delete the account for{' '}
                  <strong className="text-white">{deletingUser.full_name || 'Selected User'}</strong> (
                  <span className="font-mono text-rose-200">{deletingUser.email || 'N/A'}</span>)?
                </p>
              </div>
            </div>

            {deleteAuthError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{deleteAuthError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
              <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>
                <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Account Password (Required to Delete)
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
                  placeholder="Enter your logged-in account password"
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

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
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
        title={editingId ? 'Edit User Profile & Role' : 'Provision New Account'}
        darkMode={isDarkMode}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold mb-1">Email Address</label>
            <input
              type="email"
              required
              disabled={!!editingId}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. resident@zapatera.gov.ph"
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
              }`}
            />
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-bold mb-1">Account Default Password</label>
              <input
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="e.g. password123"
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Juan De La Cruz"
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Role Type</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                }`}
              >
                <option value="admin">Barangay Admin</option>
                <option value="resident">Resident User</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0917XXXXXXX"
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
              }`}
            />
          </div>

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

      {/* Safe Credentials & Account Security View Modal */}
      {isViewModalOpen && viewingUser && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          title="User Account Security & Device Profile"
          maxWidth="max-w-4xl"
          darkMode={isDarkMode}
        >
          <div className="space-y-6">
            {/* User Profile Header Card */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs transition-colors ${
              isDarkMode
                ? 'bg-gradient-to-br from-slate-900 to-blue-950/40 border-slate-800'
                : 'bg-gradient-to-br from-slate-50 to-blue-50/40 border-slate-200'
            }`}>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {viewingUser.avatar_url ? (
                    <img
                      src={viewingUser.avatar_url}
                      alt={viewingUser.full_name || 'Profile'}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md ring-2 ring-blue-500/20"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    style={{ display: viewingUser.avatar_url ? 'none' : 'flex' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl items-center justify-center shadow-md ring-2 ring-blue-500/20"
                  >
                    {(viewingUser.full_name || viewingUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                      isDarkMode ? 'border-slate-900' : 'border-white'
                    } ${
                      viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    title={viewingUser.is_locked ? 'Locked' : 'Active'}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">
                      {viewingUser.full_name || 'Registered Account'}
                    </h4>
                    <Badge
                      variant={
                        viewingUser.role === 'super_admin'
                          ? 'purple'
                          : viewingUser.role === 'admin'
                          ? 'blue'
                          : 'active'
                      }
                    >
                      {viewingUser.role === 'super_admin'
                        ? 'Super Admin'
                        : viewingUser.role === 'admin'
                        ? 'Barangay Admin'
                        : 'Resident'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    <span>{viewingUser.email}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Registered: {formatDate(viewingUser.created_at || new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Status & Quick Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3
                      ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-0.5" />
                      <span>Locked ({Math.max(viewingUser.failed_attempts || 0, 3)}/3 Failed)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 mr-0.5" />
                      <span>Account Active</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Last Active: {viewingUser.last_active_at ? formatDate(viewingUser.last_active_at) : 'Active recently'}
                </span>
              </div>
            </div>

            {/* Navigation Tab Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
              {[
                { id: 'telemetry', label: 'App Management', icon: Smartphone },
                { id: 'roles', label: 'Roles & Privileges', icon: ShieldCheck },
                { id: 'devices', label: `Login Sessions (${userDevices.length})`, icon: Laptop },
                { id: 'settings', label: 'Security & Preferences', icon: Sliders },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = modalActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: App Management Data */}
            {modalActiveTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Release Build & Version */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" /> App Version & Build Status
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Client Release:</span>
                      <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-blue-300' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        {viewingUser.app_version || userDevices[0]?.app_version || 'v1.0.0 (Production)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Release Channel:</span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Up to Date
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Framework Runtime:</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">React Native / Web Client</span>
                    </div>
                  </div>

                  {/* Device OS & Model */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Device Model & OS
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Operating System:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {viewingUser.device_os || userDevices[0]?.os_name || 'iOS / Android'}
                        {userDevices[0]?.os_version ? ` (${userDevices[0].os_version})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Hardware / Model:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {viewingUser.device_model || userDevices[0]?.device_model || 'Mobile Smartphone'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Active IP Address:</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {userDevices[0]?.ip_address || '127.0.0.1 (Local)'}
                      </span>
                    </div>
                  </div>

                  {/* Push Notification Token Status */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-500" /> Push Token Status
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Push Delivery Service:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" />
                        {viewingUser.push_token_status === 'active' || userDevices[0]?.push_token_status === 'active'
                          ? 'Token Active'
                          : 'Registered'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">APNs / FCM Token:</span>
                      <p className={`font-mono text-[10px] p-2 rounded-lg border truncate ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                        {viewingUser.push_token || userDevices[0]?.push_token || 'ExponentPushToken[verified_client_token]'}
                      </p>
                    </div>
                  </div>

                  {/* Identification & Address */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-blue-500" /> Contact & Resident ID
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Mobile Phone:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{viewingUser.phone || 'Not registered'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Verification ID:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {viewingUser.id_type || 'Government ID'}: {viewingUser.id_number || 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Resident Address:</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {viewingUser.address || 'Barangay Zapatera, Cebu City'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: User Roles & Permissions */}
            {modalActiveTab === 'roles' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                        Assigned Role:{' '}
                        {viewingUser.role === 'super_admin'
                          ? 'Super Admin'
                          : viewingUser.role === 'admin'
                          ? 'Barangay Admin'
                          : 'Resident User'}
                      </h5>
                    </div>
                    <Badge
                      variant={
                        viewingUser.role === 'super_admin'
                          ? 'purple'
                          : viewingUser.role === 'admin'
                          ? 'blue'
                          : 'active'
                      }
                    >
                      {viewingUser.role === 'super_admin'
                        ? 'Master Authority'
                        : viewingUser.role === 'admin'
                        ? 'Barangay Staff'
                        : 'Resident Client'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {viewingUser.role === 'super_admin'
                      ? 'Master Administrator with unrestricted privilege over system configuration, user provisioning, database administration, and security audits.'
                      : viewingUser.role === 'admin'
                      ? 'Barangay Staff Administrator with privileges to verify documents, manage incident blotters, review resident profiles, and unlock locked accounts.'
                      : 'Resident user with privileges to submit certificate requests, report barangay incidents, upload avatars, and manage personal security settings.'}
                  </p>
                </div>

                {/* Privileges Matrix */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 text-xs flex justify-between">
                    <span>Feature / Capability Domain</span>
                    <span>Granted Access Level</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Certificate & Document Issuance</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Approve, decline, and sign official barangay certificates</p>
                      </div>
                      <Badge variant={viewingUser.role === 'resident' ? 'slate' : 'blue'}>
                        {viewingUser.role === 'resident' ? 'Request Only' : 'Full Approval Authority'}
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Security & Account Lockout Management</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Unlock accounts locked by 3 failed attempts, terminate sessions</p>
                      </div>
                      <Badge variant={viewingUser.role === 'resident' ? 'slate' : 'blue'}>
                        {viewingUser.role === 'resident' ? 'Self Profile Only' : 'Admin Unlock & Revocation'}
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Active Mobile Session Termination</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Remotely disconnect active device telemetry tokens</p>
                      </div>
                      <Badge variant={viewingUser.role === 'super_admin' ? 'purple' : 'blue'}>
                        Authorized
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">System Database & Global Branding Configuration</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Access Superadmin console, branding logos, and core database</p>
                      </div>
                      <Badge variant={viewingUser.role === 'super_admin' ? 'purple' : 'slate'}>
                        {viewingUser.role === 'super_admin' ? 'Superadmin Only' : 'Restricted'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Login Sessions & Active Device Termination */}
            {modalActiveTab === 'devices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Active Sessions & Telemetry Devices</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Manage active hardware sessions. Terminating a session will instantly revoke the client token.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchUserDevices(viewingUser.id)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingDevices ? (
                  <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Querying active sessions...</span>
                  </div>
                ) : userDevices.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-xs">No active device sessions found</p>
                    <p className="text-[11px] mt-1">This user currently has no registered device tokens.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {userDevices.map((device) => {
                      const isActive = device.is_active !== false;
                      return (
                        <div
                          key={device.id || device.device_id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                            }`}>
                              {device.device_model?.toLowerCase().includes('desktop') ||
                              device.os_name?.toLowerCase().includes('windows') ||
                              device.os_name?.toLowerCase().includes('mac') ? (
                                <Laptop className="w-5 h-5 text-blue-500" />
                              ) : (
                                <Smartphone className="w-5 h-5 text-blue-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 dark:text-white text-xs">
                                  {device.device_name || device.device_model || 'Mobile Device'}
                                </p>
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Revoked
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {device.os_name || 'OS'} {device.os_version || ''} • Build v{device.app_version || '1.0.0'} • IP: {device.ip_address || '127.0.0.1'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Last Login: {formatDate(device.last_login_at || new Date().toISOString())}
                              </p>
                            </div>
                          </div>

                          <div>
                            {isActive ? (
                              <button
                                onClick={() => handleTerminateDeviceSession(device)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto justify-center"
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>Terminate Session</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Access Revoked</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: App Settings & Preferences */}
            {modalActiveTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Biometric */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-blue-500" /> Biometric Authentication
                      </span>
                      <Badge variant={viewingUser.biometric_enabled ? 'emerald' : 'slate'}>
                        {viewingUser.biometric_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Resident can unlock their mobile account using FaceID or Fingerprint sensor.
                    </p>
                  </div>

                  {/* 2FA */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-blue-500" /> Two-Factor Authentication
                      </span>
                      <Badge variant={viewingUser.two_factor_enabled ? 'emerald' : 'slate'}>
                        {viewingUser.two_factor_enabled ? 'Active' : 'Password Only'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Require one-time email OTP verification when authenticating from an unrecognized device.
                    </p>
                  </div>

                  {/* Push Alerts */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-blue-500" /> Push Notifications
                      </span>
                      <Badge variant={viewingUser.notification_preferences?.push !== false ? 'emerald' : 'slate'}>
                        {viewingUser.notification_preferences?.push !== false ? 'Enabled' : 'Muted'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Delivery of real-time push banners on status changes of barangay document requests.
                    </p>
                  </div>

                  {/* Email Notifications */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-500" /> Security Email Alerts
                      </span>
                      <Badge variant={viewingUser.notification_preferences?.email !== false ? 'emerald' : 'slate'}>
                        {viewingUser.notification_preferences?.email !== false ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Notify user email immediately upon 3-attempt account lockout or security password resets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
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
                Close Security Profile
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
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
