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

            try {
              const currentSession = StorageService.getCurrentUser() || {};
              StorageService.setCurrentUser({ ...currentSession, ...loadedProfile });
            } catch (e) {}
          } else if (isMounted) {
            // Local fallback
            setProfile({
              id: currentUser?.id || 'treasurer-id',
              email: currentUser?.email || 'treasurer@zapatera.gov.ph',
              role: currentUser?.role || 'treasurer',
              full_name: currentUser?.full_name || 'HON. MA. LOURDES S. RAMOS',
              username: currentUser?.username || 'treasurer',
              phone: currentUser?.phone || '(032) 503-6465',
              gender: currentUser?.gender || '',
              age: currentUser?.age || '',
              address: currentUser?.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City',
              avatar_url: currentUser?.avatar_url || '',
              created_at: currentUser?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else if (isMounted) {
          const session = StorageService.getCurrentUser() || currentUser || {};
          setProfile({
            id: session.id || 'treasurer-id',
            email: session.email || 'treasurer@zapatera.gov.ph',
            role: session.role || 'treasurer',
            full_name: session.full_name || 'HON. MA. LOURDES S. RAMOS',
            username: session.username || 'treasurer',
            phone: session.phone || '(032) 503-6465',
            gender: session.gender || '',
            age: session.age || '',
            address: session.address || 'Barangay Zapatera Hall, 197 D. Jakosalem St., Cebu City',
            avatar_url: session.avatar_url || '',
            created_at: session.created_at || new Date().toISOString(),
            updated_at: session.updated_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrCreateProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // -------------------------------------------------------------
  // PASSWORD VERIFICATION LOGIC FOR SAVING PROFILE
  // -------------------------------------------------------------
  async function verifyLoggedInPassword(inputPassword) {
    if (!inputPassword) return false;

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

  const handleAvatarFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadTreasurerAvatar(profile.id || currentUser?.id || 'treasurer', file);
      if (result.success && result.url) {
        setProfile((prev) => ({ ...prev, avatar_url: result.url }));
        showNotification('Avatar photo uploaded successfully. Click "Save Profile Changes" to authorize and commit.');
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setProfile((prev) => ({ ...prev, avatar_url: uploadEvent.target.result }));
          showNotification('Avatar photo preview loaded. Click "Save Profile Changes" to authorize and commit.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProfile((prev) => ({ ...prev, avatar_url: uploadEvent.target.result }));
        showNotification('Avatar photo preview loaded. Click "Save Profile Changes" to authorize and commit.');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Treasurer Profile & Security Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-12">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-2xl shadow-lg border flex items-center justify-between text-xs font-semibold transition-all transform duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : toast.type === 'info'
              ? 'bg-blue-950/90 text-blue-200 border-blue-800'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-slate-400 hover:text-white text-xs ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Profile Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 relative z-10">
          {/* Avatar Preview & Upload */}
          <div className="relative group shrink-0">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.full_name || profile.username || profile.email}
              role={profile.role || 'treasurer'}
              size="2xl"
              className="w-24 h-24 rounded-2xl text-2xl font-bold border-2 border-blue-400/40 shadow-xl"
            />

            <label
              className="absolute -bottom-1 -right-1 p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-xs font-bold shadow-lg cursor-pointer transition-transform hover:scale-105"
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

          {/* User Info Overview */}
          <div className="text-center sm:text-left space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
              <h1 className="text-2xl font-black tracking-tight text-white">{profile.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 inline-flex items-center self-center sm:self-auto">
                <ShieldCheck className="w-3 h-3 mr-1 text-blue-400" />
                {getRoleBadgeLabel(profile.role)}
              </span>
            </div>

            <p className="text-xs text-blue-300 font-mono">@{profile.username || 'treasurer'}</p>
            <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start pt-0.5">
              <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <span>{profile.email}</span>
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 border-t border-slate-800/80 mt-3 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-blue-400" />
                  Member Since: <strong className="ml-1 text-slate-200">{formatDate(profile.created_at)}</strong>
                </span>
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Last Updated: <strong className="ml-1 text-slate-200">{formatDate(profile.updated_at)}</strong>
                </span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                  title="Sign out of your session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Profile Details & Official Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your name, contact phone, gender, and profile photo. Synchronizes directly with the database.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Official Profile
          </span>
        </div>

        <form onSubmit={handleInitiateSaveProfile} className="space-y-6">
          {/* Read-Only Email & Account Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Email (Read-Only)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={profile.email}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Designated Role (Read-Only)
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={getRoleBadgeLabel(profile.role)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 text-blue-800 cursor-not-allowed"
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-mono border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Contact Phone & Gender & Age */}
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Assigned Office / Hall Address */}
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Avatar Image URL & Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Profile Photo (Upload or URL)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://... or upload an image file"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
              <label
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                title="Upload Image from your device"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{uploadingAvatar ? 'Uploading…' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={handleAvatarFileSelected}
                />
              </label>
            </div>
            {profile.avatar_url && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={profile.avatar_url}
                  alt="Avatar preview"
                  className="w-7 h-7 rounded-full object-cover border border-blue-500/40"
                />
                <span className="text-[11px] text-slate-500">Avatar Photo Preview</span>
              </div>
            )}
          </div>

          {/* Form Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
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

      {/* Security Settings & Password Section */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center">
              <Key className="w-4 h-4 text-amber-500 mr-2" />
              <span>Security Settings & Password Authentication</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your account password. Changes synchronize with the database and your active session.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Security Control
          </span>
        </div>

        {passwordError && (
          <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Current Password *
            </label>
            <div className="relative max-w-md">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                name="account_current_pass"
                autoComplete="current-password"
                value={securityForm.currentPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                placeholder="Enter your existing account password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  name="account_new_pass"
                  autoComplete="new-password"
                  value={securityForm.newPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                  placeholder="Minimum 8 strong characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  name="account_confirm_pass"
                  autoComplete="new-password"
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                  placeholder="Re-type new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Real-Time Strong Password Validation Checklist */}
          {securityForm.newPassword && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 max-w-2xl text-xs space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Password Strength Requirements:
                </span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                  [
                    securityForm.newPassword.length >= 8,
                    /[A-Z]/.test(securityForm.newPassword),
                    /[a-z]/.test(securityForm.newPassword),
                    /[0-9]/.test(securityForm.newPassword),
                    /[^A-Za-z0-9]/.test(securityForm.newPassword)
                  ].filter(Boolean).length === 5
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : [
                        securityForm.newPassword.length >= 8,
                        /[A-Z]/.test(securityForm.newPassword),
                        /[a-z]/.test(securityForm.newPassword),
                        /[0-9]/.test(securityForm.newPassword),
                        /[^A-Za-z0-9]/.test(securityForm.newPassword)
                      ].filter(Boolean).length >= 3
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-rose-100 text-rose-700 border border-rose-300'
                }`}>
                  {[
                    securityForm.newPassword.length >= 8,
                    /[A-Z]/.test(securityForm.newPassword),
                    /[a-z]/.test(securityForm.newPassword),
                    /[0-9]/.test(securityForm.newPassword),
                    /[^A-Za-z0-9]/.test(securityForm.newPassword)
                  ].filter(Boolean).length === 5 ? 'Strong Password' : 'Incomplete'}
                </span>
              </div>

              {/* Progress bar */}
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
                      : [
                          securityForm.newPassword.length >= 8,
                          /[A-Z]/.test(securityForm.newPassword),
                          /[a-z]/.test(securityForm.newPassword),
                          /[0-9]/.test(securityForm.newPassword),
                          /[^A-Za-z0-9]/.test(securityForm.newPassword)
                        ].filter(Boolean).length >= 3
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className={`flex items-center space-x-1.5 ${securityForm.newPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  {securityForm.newPassword.length >= 8 ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[A-Z]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  {/[A-Z]/.test(securityForm.newPassword) ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[a-z]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  {/[a-z]/.test(securityForm.newPassword) ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[0-9]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  {/[0-9]/.test(securityForm.newPassword) ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span>At least one number (0-9)</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[^A-Za-z0-9]/.test(securityForm.newPassword) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  {/[^A-Za-z0-9]/.test(securityForm.newPassword) ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  <span>At least one special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={updatingPassword}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 flex items-center space-x-2 transition-all cursor-pointer"
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

      {/* Active Session & Device Sign Out Card (Dedicated Sign Out for Mobile & Desktop) */}
      {onLogout && (
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Account Session</h3>
                <p className="text-xs mt-0.5 text-slate-500">
                  Signed in as <span className="font-mono font-semibold text-slate-700">{profile.email}</span>. You can safely sign out of your account on this device.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Profile</span>
            </button>
          </div>
        </div>
      )}

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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-950">Authorize Profile Changes</p>
              <p className="text-xs text-blue-800 mt-1">
                Please enter your logged-in account password to verify your credentials and authorize your profile updates.
              </p>
            </div>
          </div>

          {securityError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{securityError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block font-bold text-xs flex items-center text-blue-900">
              <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Account Password (Required to Authorize)
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
                placeholder="Enter your logged-in account password"
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-white text-slate-900"
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
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isVerifyingPassword || !securityPassword.trim()}
              onClick={handleConfirmSaveProfile}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize & Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
