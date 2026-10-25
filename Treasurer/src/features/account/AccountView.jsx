// Treasurer/src/features/account/AccountView.jsx
import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Check,
  X,
  Upload,
  Receipt,
  MapPin,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { formatDate } from '../../core/security';
import { uploadTreasurerAvatar } from '../../core/storageService';
import UserAvatar from '../../components/UserAvatar';
import Modal from '../../components/Modal';
import { AccountSkeleton } from '../../components/SkeletonLoader';

export default function AccountView({ currentUser, onProfileUpdated, onUserUpdated, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Security Verification Modal State for Saving Profile
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [showSecurityPassword, setShowSecurityPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Profile Form State
  const [profile, setProfile] = useState({
    id: currentUser?.id || '',
    email: currentUser?.email || '',
    role: currentUser?.role || 'treasurer',
    full_name: currentUser?.full_name || '',
    username: currentUser?.username || '',
    phone: currentUser?.phone || '',
    gender: currentUser?.gender || '',
    age: currentUser?.age || '',
    address: currentUser?.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City',
    avatar_url: currentUser?.avatar_url || '',
    created_at: currentUser?.created_at || new Date().toISOString(),
    updated_at: currentUser?.updated_at || new Date().toISOString(),
  });

  // Security / Password State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notification Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // -------------------------------------------------------------
  // READ / CREATE PROFILE FROM SUPABASE OR LOCAL ENGINE
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchOrCreateProfile = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured() && (currentUser?.id || currentUser?.email)) {
          let data = null;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser?.id);

          // 1. Query by UUID id if valid
          if (isUuid) {
            const { data: idData, error: idErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (!idErr && idData) {
              data = idData;
            }
          }

          // 2. Query by Email if not found by id
          if (!data && currentUser?.email) {
            const { data: emailData, error: emailErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', currentUser.email.toLowerCase().trim())
              .maybeSingle();

            if (!emailErr && emailData) {
              data = emailData;
            }
          }

          if (data && isMounted) {
            const loadedProfile = {
              id: data.id,
              email: data.email || currentUser?.email || 'treasurer@zapatera.gov.ph',
              role: data.role || currentUser?.role || 'treasurer',
              full_name: data.full_name || currentUser?.full_name || 'HON. MA. LOURDES S. RAMOS',
              username: data.username || currentUser?.username || (data.email || currentUser?.email)?.split('@')[0] || 'treasurer',
              phone: data.phone || currentUser?.phone || '(032) 503-6465',
              gender: data.gender || currentUser?.gender || '',
              age: data.age || currentUser?.age || '',
              address: data.address || currentUser?.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City',
              avatar_url: data.avatar_url || currentUser?.avatar_url || '',
              created_at: data.created_at || currentUser?.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
            };

            setProfile(loadedProfile);
            setLoading(false);
            return;
          }
        }

        // Fallback to local storage
        const localUser = StorageService.getCurrentUser() || currentUser;
        if (localUser && isMounted) {
          setProfile({
            id: localUser.id || 'treasurer',
            email: localUser.email || 'treasurer@zapatera.gov.ph',
            role: localUser.role || 'treasurer',
            full_name: localUser.full_name || 'HON. MA. LOURDES S. RAMOS',
            username: localUser.username || 'treasurer',
            phone: localUser.phone || '(032) 503-6465',
            gender: localUser.gender || '',
            age: localUser.age || '',
            address: localUser.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City',
            avatar_url: localUser.avatar_url || '',
            created_at: localUser.created_at || '2026-01-01T00:00:00.000Z',
            updated_at: localUser.updated_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Error reading profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrCreateProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Verify entered password against active session / Supabase
  async function verifyLoggedInPassword(inputPassword) {
    const session =
      currentUser ||
      StorageService.getCurrentUser() ||
      JSON.parse(
        localStorage.getItem('zapatera_treasurer_session') ||
        localStorage.getItem('zapatera_session_user') ||
        'null'
      );
    const loggedInEmail = (session?.email || profile?.email || '').trim().toLowerCase();
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
    } else {
      if (session?.password && session.password === inputPassword) return true;
    }
    return false;
  }

  const persistAvatarImmediately = async (avatarUrl) => {
    setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));

    const updatedUser = {
      ...(currentUser || {}),
      ...profile,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    StorageService.setCurrentUser(updatedUser);

    try {
      const sessionKeys = ['zapatera_treasurer_session', 'zapatera_session_user'];
      sessionKeys.forEach((k) => {
        const existing = JSON.parse(localStorage.getItem(k) || 'null');
        if (existing) {
          localStorage.setItem(k, JSON.stringify({ ...existing, avatar_url: avatarUrl }));
        }
      });
    } catch {}

    if (onProfileUpdated) onProfileUpdated(updatedUser);
    if (onUserUpdated) onUserUpdated(updatedUser);
  };

  const handleAvatarFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadTreasurerAvatar(profile.id || currentUser?.id || 'treasurer', file);
      if (result.success && result.url) {
        await persistAvatarImmediately(result.url);
        showNotification('Treasurer profile picture uploaded and updated across header and sidebar!');
      } else {
        const reader = new FileReader();
        reader.onload = async (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result;
          if (dataUrl) {
            await persistAvatarImmediately(dataUrl);
            showNotification('Treasurer profile picture loaded and updated across header and sidebar!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result;
        if (dataUrl) {
          await persistAvatarImmediately(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleInitiateSaveProfile = (e) => {
    e.preventDefault();
    if (!profile.full_name || !profile.email) {
      showNotification('Please fill in required profile fields (Full Name and Email).', 'error');
      return;
    }
    setSecurityPassword('');
    setSecurityError('');
    setShowSecurityPassword(false);
    setIsSecurityModalOpen(true);
  };

  const handleConfirmSaveProfile = async () => {
    if (!securityPassword.trim()) {
      setSecurityError('Please enter your logged-in account password.');
      return;
    }
    setIsVerifyingPassword(true);
    setSecurityError('');

    const isValid = await verifyLoggedInPassword(securityPassword);
    if (!isValid) {
      setSecurityError('Security Verification Failed: Incorrect logged-in account password.');
      setIsVerifyingPassword(false);
      return;
    }

    setIsVerifyingPassword(false);
    setIsSecurityModalOpen(false);
    setSecurityPassword('');

    await executeSaveProfile();
  };

  // -------------------------------------------------------------
  // UPDATE PROFILE EXECUTION (After Security Verification)
  // -------------------------------------------------------------
  const executeSaveProfile = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const ageVal = profile.age ? parseInt(profile.age, 10) : null;

    const updatedPayload = {
      ...profile,
      age: isNaN(ageVal) ? null : ageVal,
      updated_at: now,
    };

    try {
      // 1. Update Supabase `profiles` table & Auth User Metadata
      if (isSupabaseConfigured() && (currentUser?.id || profile?.id)) {
        const targetId = currentUser?.id || profile?.id;
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: targetId,
          email: profile.email.toLowerCase().trim(),
          role: profile.role || 'treasurer',
          full_name: profile.full_name,
          username: profile.username,
          phone: profile.phone,
          gender: profile.gender || null,
          age: isNaN(ageVal) ? null : ageVal,
          avatar_url: profile.avatar_url,
          updated_at: now,
        });

        if (profileErr) {
          console.warn('Supabase profile update warning:', profileErr);
        }

        try {
          await supabase.auth.updateUser({
            data: {
              full_name: profile.full_name,
              username: profile.username,
              phone: profile.phone,
              avatar_url: profile.avatar_url,
            },
          });
        } catch (metaErr) {
          console.warn('Supabase Auth user metadata update notice:', metaErr);
        }
      }

      // 2. Update local storage session
      const updatedUser = {
        ...(currentUser || {}),
        ...updatedPayload,
      };

      StorageService.setCurrentUser(updatedUser);

      // Sync active session keys
      try {
        const sessionKeys = ['zapatera_treasurer_session', 'zapatera_session_user'];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(
              k,
              JSON.stringify({
                ...existing,
                ...updatedPayload,
              })
            );
          }
        });
      } catch (e) {}

      setProfile(updatedPayload);

      StorageService.logActivity({
        action: 'Updated Profile Information',
        module: 'Treasury Account',
        details: `Updated personal treasury profile for ${updatedUser.full_name || updatedUser.email} (${updatedUser.email})`,
        performed_by: updatedUser.full_name || 'Barangay Treasurer',
      });

      if (onProfileUpdated) onProfileUpdated(updatedUser);
      if (onUserUpdated) onUserUpdated(updatedUser);
      showNotification('Profile updated successfully in system and database!');
    } catch (err) {
      console.error('Error updating profile:', err);
      showNotification('Failed to update profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // CHANGE PASSWORD HANDLER
  // -------------------------------------------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!securityForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    // Enforce strong password validation
    const pw = securityForm.newPassword || '';
    const hasMinLength = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

    if (!isPasswordStrong) {
      setPasswordError('New password must be strong: at least 8 characters and include uppercase, lowercase, a number, and a special character.');
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setUpdatingPassword(true);

    try {
      const userEmail = (currentUser?.email || profile?.email || '').trim().toLowerCase();

      // Verify current password with Supabase Auth
      if (isSupabaseConfigured() && userEmail) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: securityForm.currentPassword,
        });

        if (authErr || !authData?.user) {
          setPasswordError('Current password authentication failed. Please enter your correct password.');
          setUpdatingPassword(false);
          return;
        }
      }

      // Update password in Supabase Auth if configured
      if (isSupabaseConfigured()) {
        try {
          const { error: authErr } = await supabase.auth.updateUser({
            password: securityForm.newPassword,
          });
          if (authErr) {
            console.warn('Supabase Auth password update notice:', authErr.message);
          }
        } catch (sErr) {
          console.warn('Supabase Auth update exception:', sErr);
        }
      }

      // Update active session & storage with new password
      const updatedUser = {
        ...(currentUser || {}),
        password: securityForm.newPassword,
        updated_at: new Date().toISOString(),
      };

      StorageService.setCurrentUser(updatedUser);

      try {
        const sessionKeys = ['zapatera_treasurer_session', 'zapatera_session_user'];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(k, JSON.stringify({ ...existing, password: securityForm.newPassword }));
          }
        });
      } catch (e) {}

      StorageService.logActivity({
        action: 'Updated Security Password',
        module: 'Treasury Security',
        details: `Updated account security credentials/password for ${updatedUser.email}`,
        performed_by: updatedUser.full_name || 'Barangay Treasurer',
      });

      if (onProfileUpdated) onProfileUpdated(updatedUser);
      if (onUserUpdated) onUserUpdated(updatedUser);

      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Account security password updated successfully!');
      showNotification('Password updated successfully!');
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError('Failed to update account security password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getRoleBadgeLabel = (role) => {
    if (role === 'treasurer') return 'Barangay Treasurer';
    if (role === 'super_admin') return 'Super Administrator';
    if (role === 'admin') return 'Barangay Admin';
    return 'Barangay Official';
  };

  if (loading) {
    return <AccountSkeleton isDarkMode={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-2xl shadow-xs border flex items-center justify-between text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : toast.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {toast.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-slate-400 hover:text-slate-700 text-xs ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Colorful Gradient KPI Overview Cards matching Admin / SuperAdmin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Role */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#3b5bfd] via-[#4f6ef7] to-[#60a5fa] text-white shadow-[0_14px_30px_-12px_rgba(59,91,253,0.45)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Assigned Role
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {getRoleBadgeLabel(profile.role)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-mono">
              @{profile.username || 'treasurer'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Security */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#10b981] via-[#14b8a6] to-[#34d399] text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.45)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Security Status
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              Verified Active
            </h3>
            <p className="text-[11px] text-white/80 mt-1 truncate max-w-[180px]">
              {profile.email}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-md shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Member Since */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.45)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Member Since
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {formatDate(profile.created_at)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1">Barangay Treasury Desk</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Last Updated */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#f59e0b] via-[#f97316] to-[#fb923c] text-white shadow-[0_14px_30px_-12px_rgba(249,115,22,0.42)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Last Profile Sync
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {formatDate(profile.updated_at)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1">Cloud & Local Storage</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-amber-500 flex items-center justify-center shadow-md shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Settings Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Official Profile Details Form */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 sm:p-7 space-y-6">
            {/* Light Profile Identity Banner matching Admin */}
            <div className="p-5 rounded-[22px] bg-[#f4f7fb] border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group shrink-0">
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.full_name || profile.username || profile.email}
                  role={profile.role || 'treasurer'}
                  size="2xl"
                  isDarkMode={false}
                  className="w-20 h-20 rounded-2xl text-2xl font-extrabold border-2 border-white shadow-md"
                />
                <label
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#3b5bfd] hover:bg-blue-700 rounded-xl text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105"
                  title="Upload New Profile Picture"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarFileSelected}
                  />
                </label>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900 truncate">
                    {profile.full_name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#3b5bfd] border border-blue-200 inline-flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-[#3b5bfd]" />
                    {getRoleBadgeLabel(profile.role)}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-[#3b5bfd] mt-0.5">
                  @{profile.username || 'treasurer'}
                </p>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start mt-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleInitiateSaveProfile} className="space-y-4">
              {/* Read-Only System Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Email (System Locked)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={profile.email}
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-mono border border-slate-200 bg-[#f8fafc] text-slate-500 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assigned Role (System Locked)
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3b5bfd]" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={getRoleBadgeLabel(profile.role)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-bold border border-blue-200 bg-blue-50/50 text-[#3b5bfd] cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Hon. Ma. Lourdes S. Ramos"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="treasurer"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl text-xs font-mono border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Phone, Gender & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="(032) 503-6465"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={profile.gender || ''}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] transition-all cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={profile.age || ''}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    placeholder="e.g. 45"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] transition-all"
                  />
                </div>
              </div>

              {/* Office Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assigned Barangay Office
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={profile.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City'}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs border border-slate-200 bg-[#f8fafc] text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile…</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security / Password & Sign Out */}
        <div className="xl:col-span-5 space-y-6">
          {/* Security Credentials Card */}
          <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Security Credentials</h3>
                  <p className="text-[11px] text-slate-500">Update account password</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Encrypted
              </span>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    name="treasurer_current_pass"
                    autoComplete="current-password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    placeholder="Existing password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-mono border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    name="treasurer_new_pass"
                    autoComplete="new-password"
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-mono border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    name="treasurer_confirm_pass"
                    autoComplete="new-password"
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-mono border border-slate-200/90 text-slate-900 bg-[#f8fafc] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#3b5bfd] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Strength Requirements */}
              {securityForm.newPassword && (
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-[#f8fafc] text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Strength:</span>
                    <span className={
                      [
                        securityForm.newPassword.length >= 8,
                        /[A-Z]/.test(securityForm.newPassword),
                        /[a-z]/.test(securityForm.newPassword),
                        /[0-9]/.test(securityForm.newPassword),
                        /[^A-Za-z0-9]/.test(securityForm.newPassword)
                      ].filter(Boolean).length === 5
                        ? 'text-emerald-600 font-extrabold'
                        : 'text-amber-600 font-extrabold'
                    }>
                      {[
                        securityForm.newPassword.length >= 8,
                        /[A-Z]/.test(securityForm.newPassword),
                        /[a-z]/.test(securityForm.newPassword),
                        /[0-9]/.test(securityForm.newPassword),
                        /[^A-Za-z0-9]/.test(securityForm.newPassword)
                      ].filter(Boolean).length === 5 ? 'Strong Password' : 'Incomplete'}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        [
                          securityForm.newPassword.length >= 8,
                          /[A-Z]/.test(securityForm.newPassword),
                          /[a-z]/.test(securityForm.newPassword),
                          /[0-9]/.test(securityForm.newPassword),
                          /[^A-Za-z0-9]/.test(securityForm.newPassword)
                        ].filter(Boolean).length === 5
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${([
                          securityForm.newPassword.length >= 8,
                          /[A-Z]/.test(securityForm.newPassword),
                          /[a-z]/.test(securityForm.newPassword),
                          /[0-9]/.test(securityForm.newPassword),
                          /[^A-Za-z0-9]/.test(securityForm.newPassword)
                        ].filter(Boolean).length / 5) * 100}%`
                      }}
                    />
                  </div>

                  <div className="space-y-1 pt-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${securityForm.newPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      {securityForm.newPassword.length >= 8 ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      {/[A-Z]/.test(securityForm.newPassword) ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>Uppercase & lowercase letters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[0-9]/.test(securityForm.newPassword) && /[^A-Za-z0-9]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      {/[0-9]/.test(securityForm.newPassword) && /[^A-Za-z0-9]/.test(securityForm.newPassword) ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>Number and special character</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full py-2.5 px-4 bg-[#3b5bfd] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Update Account Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Active Session & Logout Card */}
          {onLogout && (
            <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Active Session</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                    {profile.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-bold rounded-full transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Verification Modal - Save Profile Changes */}
      <Modal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityPassword('');
          setSecurityError('');
        }}
        title="Security Verification - Authorize Profile Changes"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-blue-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-[#3b5bfd] shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm text-blue-950">Authorize Profile Changes</p>
              <p className="text-xs text-blue-800 mt-1">
                Please enter your logged-in account password to verify your identity and commit updates to the database.
              </p>
            </div>
          </div>

          {securityError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{securityError}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-slate-200 bg-[#f8fafc] space-y-2">
            <label className="block font-bold text-xs flex items-center text-slate-700">
              <Lock className="w-3.5 h-3.5 mr-1 text-[#3b5bfd]" />
              Logged-in Account Password
            </label>
            <div className="relative">
              <input
                type={showSecurityPassword ? 'text' : 'password'}
                required
                autoFocus
                value={securityPassword}
                onChange={(e) => {
                  setSecurityPassword(e.target.value);
                  setSecurityError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmSaveProfile();
                  }
                }}
                placeholder="Enter password"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-white text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsSecurityModalOpen(false);
                setSecurityPassword('');
                setSecurityError('');
              }}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isVerifyingPassword || !securityPassword.trim()}
              onClick={handleConfirmSaveProfile}
              className="px-5 py-2 bg-[#3b5bfd] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
