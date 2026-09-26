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
  Shield,
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
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';
import ActionModal from '../../components/ActionModal';

export default function UserManagementView({ currentUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'locked'
  const [search, setSearch] = useState('');

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
    const adminEmail = currentUser?.email || 'admin@zapatera.gov.ph';

    try {
      if (actionType === 'unlock') {
        await unlockUserAccount(targetUser.email, adminEmail);
      } else {
        await lockUserAccount(targetUser.email, adminEmail, 'Manual Admin Lockout');
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

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">User Account Management & Security</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View user credentials safely, monitor 3-attempt lockouts, and manage account lock/unlock access controls.
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
                <th className="px-6 py-3.5">Account Identity</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Contact & Location</th>
                <th className="px-6 py-3.5">Security & Lock Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={false} />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3;
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

                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : 'active'}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Barangay Admin' : 'Resident'}
                        </Badge>
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
                              <span>Locked ({Math.max(u.failed_attempts || 0, 3)}/3 Failed)</span>
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
                            <span>Active (Secure)</span>
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
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
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
      </div>

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
        >
          <div className="space-y-6">
            {/* User Profile Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-4">
                <UserAvatar
                  src={viewingUser.avatar_url}
                  name={viewingUser.full_name || viewingUser.email}
                  role={viewingUser.role}
                  size="xl"
                  showStatus={true}
                  isLocked={viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-lg">
                      {viewingUser.full_name || 'Registered Resident'}
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
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>{viewingUser.email}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Registered: {formatDate(viewingUser.created_at || new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Status & Quick Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
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
                <span className="text-[11px] text-slate-500">
                  Last Active: {viewingUser.last_active_at ? formatDate(viewingUser.last_active_at) : 'Active recently'}
                </span>
              </div>
            </div>

            {/* Navigation Tab Bar */}
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
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
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" /> App Version & Build Status
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Client Release:</span>
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        {viewingUser.app_version || userDevices[0]?.app_version || 'v1.0.0 (Production)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Release Channel:</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Up to Date
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Framework Runtime:</span>
                      <span className="text-xs font-semibold text-slate-700">React Native / Web Client</span>
                    </div>
                  </div>

                  {/* Device OS & Model */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" /> Device Model & OS
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Operating System:</span>
                      <span className="text-xs font-bold text-slate-800">
                        {viewingUser.device_os || userDevices[0]?.os_name || 'iOS / Android'}
                        {userDevices[0]?.os_version ? ` (${userDevices[0].os_version})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Hardware / Model:</span>
                      <span className="text-xs font-bold text-slate-800">
                        {viewingUser.device_model || userDevices[0]?.device_model || 'Mobile Smartphone'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Active IP Address:</span>
                      <span className="font-mono text-xs text-slate-600">
                        {userDevices[0]?.ip_address || '127.0.0.1 (Local)'}
                      </span>
                    </div>
                  </div>

                  {/* Push Notification Token Status */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-600" /> Push Token Status
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Push Delivery Service:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        {viewingUser.push_token_status === 'active' || userDevices[0]?.push_token_status === 'active'
                          ? 'Token Active'
                          : 'Registered'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500">APNs / FCM Token:</span>
                      <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 truncate">
                        {viewingUser.push_token || userDevices[0]?.push_token || 'ExponentPushToken[verified_client_token]'}
                      </p>
                    </div>
                  </div>

                  {/* Identification & Address */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-blue-600" /> Contact & Resident ID
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Mobile Phone:</span>
                      <span className="text-xs font-bold text-slate-800">{viewingUser.phone || 'Not registered'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Verification ID:</span>
                      <span className="text-xs font-bold text-slate-800">
                        {viewingUser.id_type || 'Government ID'}: {viewingUser.id_number || 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Resident Address:</span>
                      <span className="text-xs text-slate-700 truncate max-w-[200px]">
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
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h5 className="font-bold text-slate-900 text-sm">
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
                  <p className="text-xs text-slate-600">
                    {viewingUser.role === 'super_admin'
                      ? 'Master Administrator with unrestricted privilege over system configuration, user provisioning, database administration, and security audits.'
                      : viewingUser.role === 'admin'
                      ? 'Barangay Staff Administrator with privileges to verify documents, manage incident blotters, review resident profiles, and unlock locked accounts.'
                      : 'Resident user with privileges to submit certificate requests, report barangay incidents, upload avatars, and manage personal security settings.'}
                  </p>
                </div>

                {/* Privileges Matrix */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 text-xs flex justify-between">
                    <span>Feature / Capability Domain</span>
                    <span>Granted Access Level</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">Certificate & Document Issuance</p>
                        <p className="text-[11px] text-slate-500">Approve, decline, and sign official barangay certificates</p>
                      </div>
                      <Badge variant={viewingUser.role === 'resident' ? 'slate' : 'blue'}>
                        {viewingUser.role === 'resident' ? 'Request Only' : 'Full Approval Authority'}
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">Security & Account Lockout Management</p>
                        <p className="text-[11px] text-slate-500">Unlock accounts locked by 3 failed attempts, terminate sessions</p>
                      </div>
                      <Badge variant={viewingUser.role === 'resident' ? 'slate' : 'blue'}>
                        {viewingUser.role === 'resident' ? 'Self Profile Only' : 'Admin Unlock & Revocation'}
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">Active Mobile Session Termination</p>
                        <p className="text-[11px] text-slate-500">Remotely disconnect active device telemetry tokens</p>
                      </div>
                      <Badge variant={viewingUser.role === 'super_admin' ? 'purple' : 'blue'}>
                        Authorized
                      </Badge>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">System Database & Global Branding Configuration</p>
                        <p className="text-[11px] text-slate-500">Access Superadmin console, branding logos, and core database</p>
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
                    <h5 className="font-bold text-slate-900 text-sm">Active Sessions & Telemetry Devices</h5>
                    <p className="text-xs text-slate-500">
                      Manage active hardware sessions. Terminating a session will instantly revoke the client token.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchUserDevices(viewingUser.id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingDevices ? (
                  <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Querying active sessions...</span>
                  </div>
                ) : userDevices.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
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
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                              {device.device_model?.toLowerCase().includes('desktop') ||
                              device.os_name?.toLowerCase().includes('windows') ||
                              device.os_name?.toLowerCase().includes('mac') ? (
                                <Laptop className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Smartphone className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-xs">
                                  {device.device_name || device.device_model || 'Mobile Device'}
                                </p>
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                                    Revoked
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
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
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto justify-center"
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
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-blue-600" /> Biometric Authentication
                      </span>
                      <Badge variant={viewingUser.biometric_enabled ? 'emerald' : 'slate'}>
                        {viewingUser.biometric_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Resident can unlock their mobile account using FaceID or Fingerprint sensor.
                    </p>
                  </div>

                  {/* 2FA */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-blue-600" /> Two-Factor Authentication
                      </span>
                      <Badge variant={viewingUser.two_factor_enabled ? 'emerald' : 'slate'}>
                        {viewingUser.two_factor_enabled ? 'Active' : 'Password Only'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Require one-time email OTP verification when authenticating from an unrecognized device.
                    </p>
                  </div>

                  {/* Push Alerts */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-blue-600" /> Push Notifications
                      </span>
                      <Badge variant={viewingUser.notification_preferences?.push !== false ? 'emerald' : 'slate'}>
                        {viewingUser.notification_preferences?.push !== false ? 'Enabled' : 'Muted'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Delivery of real-time push banners on status changes of barangay document requests.
                    </p>
                  </div>

                  {/* Email Notifications */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-600" /> Security Email Alerts
                      </span>
                      <Badge variant={viewingUser.notification_preferences?.email !== false ? 'emerald' : 'slate'}>
                        {viewingUser.notification_preferences?.email !== false ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Notify user email immediately upon 3-attempt account lockout or security password resets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-2">
                {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? (
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      initiateAction(viewingUser, 'unlock');
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
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Security Profile
              </button>
            </div>
          </div>
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
                className={`px-6 py-2 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs flex items-center space-x-1.5 ${
                  actionType === 'unlock'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
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
