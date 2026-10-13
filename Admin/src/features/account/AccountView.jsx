// Admin/src/features/account/AccountView.jsx
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
  Trash2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Check,
  X,
  Upload,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { formatDate } from '../../core/security';
import { uploadAdminAvatar } from '../../core/storageService';
import ActionModal from '../../components/ActionModal';
import Modal from '../../components/Modal';
import UserAvatar from '../../components/UserAvatar';

export default function AccountView({ currentUser, onUserUpdated, onLogout, isDarkMode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Security Verification Modal State for Saving Profile
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [showSecurityPassword, setShowSecurityPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // ActionModal Feedback State
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

  // Profile Form State (Including Account Role)
  const [profile, setProfile] = useState({
    id: currentUser?.id || '',
    email: currentUser?.email || '',
    role: currentUser?.role || 'admin',
    full_name: currentUser?.full_name || '',
    username: currentUser?.username || '',
    phone: currentUser?.phone || '',
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

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

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

          if (data) {
            if (isMounted) {
              const loadedProfile = {
                id: data.id,
                email: data.email || currentUser.email || 'admin@zapatera.gov.ph',
                role: data.role || currentUser.role || 'admin',
                full_name: data.full_name || currentUser.full_name || 'Barangay Admin',
                username: data.username || currentUser.username || (data.email || currentUser.email)?.split('@')[0] || 'admin',
                phone: data.phone || currentUser.phone || '',
                address: data.address || currentUser.address || 'Barangay Zapatera, Cebu City',
                avatar_url: data.avatar_url || currentUser.avatar_url || '',
                created_at: data.created_at || currentUser.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
              };

              setProfile(loadedProfile);

              // Keep local session updated with latest profile fields
              try {
                const currentSession = StorageService.getCurrentUser() || {};
                StorageService.setCurrentUser({ ...currentSession, ...loadedProfile });
              } catch (e) {}
            }
          } else {
            const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser?.id);
            const newProfile = {
              email: (currentUser?.email || 'admin@zapatera.gov.ph').toLowerCase().trim(),
              role: currentUser?.role || 'admin',
              full_name: currentUser?.full_name || 'Barangay Staff Officer',
              username: currentUser?.username || (currentUser?.email || 'admin')?.split('@')[0] || 'admin',
              phone: currentUser?.phone || '09171234567',
              address: currentUser?.address || 'Barangay Zapatera, Cebu City',
              avatar_url: currentUser?.avatar_url || '',
              created_at: currentUser?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            if (isTargetUuid) {
              newProfile.id = currentUser.id;
            }

            const { data: upserted } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'email' }).select().maybeSingle();

            if (isMounted) {
              setProfile({
                ...newProfile,
                id: upserted?.id || newProfile.id || currentUser?.id,
              });
            }
          }
        } else {
          const users = StorageService.getUsers();
          const found = users.find((u) => u.id === currentUser?.id || u.email === currentUser?.email);
          if (found && isMounted) {
            setProfile({
              id: found.id,
              email: found.email || currentUser?.email || 'admin@zapatera.gov.ph',
              role: found.role || currentUser?.role || 'admin',
              full_name: found.full_name || currentUser?.full_name || 'Barangay Admin',
              username: found.username || currentUser?.username || 'admin',
              phone: found.phone || currentUser?.phone || '09171234567',
              avatar_url: found.avatar_url || currentUser?.avatar_url || '',
              created_at: found.created_at || new Date().toISOString(),
              updated_at: found.updated_at || new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        showNotification('Notice: Loaded profile from active session.', 'info');
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
      (typeof StorageService !== 'undefined' && StorageService.getCurrentUser ? StorageService.getCurrentUser() : null) ||
      JSON.parse(
        localStorage.getItem('zapatera_admin_session') ||
        localStorage.getItem('zapatera_superadmin_session') ||
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
      const result = await uploadAdminAvatar(profile.id || currentUser?.id || 'admin', file);
      if (result.success && result.url) {
        setProfile((prev) => ({ ...prev, avatar_url: result.url }));
        setActionModal({
          isOpen: true,
          type: 'success',
          title: 'Avatar Uploaded',
          message: 'Avatar image uploaded successfully. Click "Save Profile Changes" to authorize and commit.',
          buttonText: 'OK',
          onClose: () => setActionModal({ isOpen: false }),
        });
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setProfile((prev) => ({ ...prev, avatar_url: uploadEvent.target.result }));
          setActionModal({
            isOpen: true,
            type: 'info',
            title: 'Avatar Loaded',
            message: 'Avatar image loaded. Click "Save Profile Changes" to authorize and commit.',
            buttonText: 'OK',
            onClose: () => setActionModal({ isOpen: false }),
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProfile((prev) => ({ ...prev, avatar_url: uploadEvent.target.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleInitiateSaveProfile = (e) => {
    e.preventDefault();
    if (!profile.full_name || !profile.email) {
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please fill in required profile fields (Full Name and Email).',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
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
    const updatedPayload = {
      ...profile,
      updated_at: now,
    };

    try {
      // 1. Update Supabase `profiles` table & Auth User Metadata
      if (isSupabaseConfigured() && currentUser?.id) {
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name,
          username: profile.username,
          phone: profile.phone,
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

      // 2. Update local storage & session state
      const updatedUser = StorageService.saveUser({
        ...currentUser,
        role: profile.role,
        full_name: profile.full_name,
        username: profile.username,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        updated_at: now,
      });

      StorageService.setCurrentUser(updatedUser);

      // Sync active sessions
      try {
        const sessionKeys = ['zapatera_admin_session', 'zapatera_superadmin_session', 'zapatera_account_mgmt_session'];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(
              k,
              JSON.stringify({
                ...existing,
                full_name: profile.full_name,
                username: profile.username,
                phone: profile.phone,
                avatar_url: profile.avatar_url,
                updated_at: now,
              })
            );
          }
        });
      } catch (e) {}

      setProfile(updatedPayload);

      if (onUserUpdated) onUserUpdated(updatedUser);
      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Profile Updated Successfully',
        message: 'Your profile information has been saved.',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
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

      // Update password in Supabase Auth if available
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
        ...currentUser,
        password: securityForm.newPassword,
        updated_at: new Date().toISOString(),
      };

      StorageService.saveUser(updatedUser);
      StorageService.setCurrentUser(updatedUser);

      try {
        const sessionKeys = ['zapatera_admin_session', 'zapatera_superadmin_session', 'zapatera_account_mgmt_session'];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(k, JSON.stringify({ ...existing, password: securityForm.newPassword }));
          }
        });
      } catch (e) {}

      if (onUserUpdated) onUserUpdated(updatedUser);

      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Account security credentials updated successfully!');
      
      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Password Updated Successfully',
        message: 'Your account security password has been changed.',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError('Failed to update account security password.');
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Password Update Failed',
        message: 'Something went wrong while updating your password. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  // -------------------------------------------------------------
  // DELETE ACCOUNT HANDLER
  // -------------------------------------------------------------
  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim() !== 'DELETE') {
      showNotification('Please type "DELETE" exactly to confirm account deletion.', 'error');
      return;
    }

    setDeleting(true);

    try {
      if (currentUser?.id || currentUser?.email) {
        if (isSupabaseConfigured()) {
          const userId = currentUser.id;
          const userEmail = currentUser.email;

          if (userId) {
            try {
              await supabase.rpc('delete_user_by_id', { user_id: userId });
            } catch (rErr) {}
          }

          if (userEmail) {
            try {
              await supabase.rpc('delete_user_by_email', { user_email: userEmail });
            } catch (rErr) {}
          }

          if (userId) {
            await supabase.from('profiles').delete().eq('id', userId);
          }
          if (userEmail) {
            await supabase.from('profiles').delete().eq('email', userEmail);
          }

          try {
            await supabase.auth.signOut();
          } catch (err) {}
        }

        if (currentUser.id) {
          StorageService.deleteUser(currentUser.id);
        }
      }

      showNotification('Account deleted successfully. Logging out...', 'info');

      setTimeout(() => {
        setIsDeleteModalOpen(false);
        onLogout();
      }, 1500);
    } catch (err) {
      console.error('Error deleting account:', err);
      showNotification('Failed to delete account. Please contact system admin.', 'error');
      setDeleting(false);
    }
  };

  const getRoleBadgeLabel = (role) => {
    if (role === 'super_admin') return 'Super Administrator';
    if (role === 'admin') return 'Barangay Admin';
    if (role === 'treasurer') return 'Barangay Treasurer';
    if (role === 'resident') return 'Registered Resident';
    return role?.toUpperCase() || 'Barangay Admin';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Loading Account Profile & Security Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-12">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-xs font-semibold transition-all transform duration-300 ${
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
            className="text-slate-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Profile Banner */}
      <div className="p-6 rounded-2xl border shadow-sm bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-slate-200 text-white">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Avatar Preview & Upload */}
          <div className="relative group">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.full_name || profile.username || profile.email}
              role={profile.role || 'admin'}
              size="2xl"
              isDarkMode={isDarkMode}
              className="w-24 h-24 rounded-2xl text-2xl font-bold border-2 border-blue-500/40 shadow-xl"
            />

            <label
              className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-[10px] font-bold shadow-md cursor-pointer transition-transform hover:scale-105"
              title="Upload New Profile Picture"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingAvatar(true);
                  const result = await uploadAdminAvatar(profile.id || currentUser?.id || 'admin', file);
                  if (result.success && result.url) {
                    setProfile((prev) => ({ ...prev, avatar_url: result.url }));
                    setActionModal({
                      isOpen: true,
                      type: 'success',
                      title: 'Profile Photo Uploaded',
                      message: 'Your photo has been uploaded. Click "Save Profile Changes" to persist your updates.',
                      buttonText: 'OK',
                      onClose: () => setActionModal({ isOpen: false }),
                    });
                  } else {
                    setActionModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Upload Failed',
                      message: 'Unable to upload photo. Please check the image file and try again.',
                      buttonText: 'Close',
                      onClose: () => setActionModal({ isOpen: false }),
                    });
                  }
                  setUploadingAvatar(false);
                }}
              />
            </label>
          </div>

          {/* User Info Overview */}
          <div className="text-center sm:text-left space-y-1 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{profile.full_name}</h1>
              {/* Account Role Badge */}
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center self-center sm:self-auto">
                <ShieldCheck className="w-3 h-3 mr-1 text-blue-400" />
                {getRoleBadgeLabel(profile.role)}
              </span>
            </div>
            <p className="text-xs text-blue-300 font-mono">@{profile.username || 'admin'}</p>
            <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start pt-1">
              <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span>{profile.email}</span>
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 mt-3">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-blue-400" />
                Member Since: <strong className="ml-1 text-slate-200">{formatDate(profile.created_at)}</strong>
              </span>
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Last Updated: <strong className="ml-1 text-slate-200">{formatDate(profile.updated_at)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="p-6 sm:p-8 rounded-2xl border shadow-sm bg-white border-slate-200 text-slate-800">
        <div className="border-b pb-4 mb-6 flex items-center justify-between border-slate-200">
          <div>
            <h2 className="text-lg font-bold">Profile Details & Personal Information</h2>
            <p className="text-xs mt-0.5 text-slate-500">
              Manage your official administrator details, contact number, and profile photo.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Account Info
          </span>
        </div>

        <form onSubmit={handleInitiateSaveProfile} className="space-y-6">
          {/* Read-Only Email & Account Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Email Address (Read-Only)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={profile.email}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors cursor-not-allowed bg-slate-100 border-slate-200 text-slate-500"
                />
                <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Account Security Role (Read-Only)
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={getRoleBadgeLabel(profile.role)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-not-allowed capitalize bg-blue-50 border-blue-200 text-blue-800"
                />
                <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Barangay Staff Officer"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Username *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  required
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="admin"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Phone Number & Avatar URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="09171234567"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
                Avatar Image URL (Optional)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                    placeholder="https://... or upload an image file"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                  />
                </div>
                <label
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 border transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  title="Upload Avatar Image"
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
                  <span className="text-[11px] text-slate-400">Preview</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all cursor-pointer"
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
      <div className="p-6 sm:p-8 rounded-2xl border shadow-sm bg-white border-slate-200 text-slate-800">
        <div className="border-b pb-4 mb-6 flex items-center justify-between border-slate-200">
          <div>
            <h2 className="text-lg font-bold flex items-center">
              <Key className="w-5 h-5 text-amber-500 mr-2" />
              <span>Security Settings & Password Authentication</span>
            </h2>
            <p className="text-xs mt-0.5 text-slate-500">
              Update your account password and security credentials.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Security Control
          </span>
        </div>

        {passwordError && (
          <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700">
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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-700">
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Real-Time Strong Password Validation Checklist */}
          {securityForm.newPassword && (
            <div className="p-3.5 rounded-xl border max-w-2xl text-xs space-y-2 transition-all bg-slate-50 border-slate-200">
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
                    ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                    : [
                        securityForm.newPassword.length >= 8,
                        /[A-Z]/.test(securityForm.newPassword),
                        /[a-z]/.test(securityForm.newPassword),
                        /[0-9]/.test(securityForm.newPassword),
                        /[^A-Za-z0-9]/.test(securityForm.newPassword)
                      ].filter(Boolean).length >= 3
                    ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-600 border border-rose-500/30'
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

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={updatingPassword}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Security Password…</span>
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

      {/* Danger Zone Section */}
      <div className="p-6 sm:p-8 rounded-2xl border shadow-sm bg-rose-50/50 border-rose-200 text-slate-900">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="text-base font-bold text-rose-600">Danger Zone</h3>
            <p className="text-xs text-slate-600">
              Deleting your account is a permanent action. This will remove your administrator account and revoke all access permissions.
            </p>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmInput('');
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 bg-white border-slate-200 text-slate-800">
            <div className="flex items-center space-x-3 text-rose-500">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900">Delete Account Confirmation</h3>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              Are you sure you want to permanently delete your profile for <strong className="font-mono text-rose-600">{profile.email}</strong>?
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
              <p className="font-bold">⚠️ Warning: This action cannot be undone!</p>
              <p>
                Type <span className="font-mono font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded">DELETE</span> below to proceed.
              </p>
            </div>

            <div>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteConfirmInput.trim() !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Profile…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete Profile</span>
                  </>
                )}
              </button>
            </div>
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
        title="Security Verification - Save Profile Changes"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-950">Authorize Profile Changes</p>
              <p className="text-xs text-blue-800 mt-1">
                Please enter your logged-in administrator password to verify your identity and commit your account profile modifications.
              </p>
            </div>
          </div>

          {securityError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{securityError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
            <label className="block font-bold text-xs flex items-center text-slate-700">
              <Lock className="w-3.5 h-3.5 mr-1 text-slate-500" /> Logged-in Account Password (Required to Authorize)
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsSecurityModalOpen(false);
                setSecurityPassword('');
                setSecurityError('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isVerifyingPassword || !securityPassword.trim()}
              onClick={handleConfirmSaveProfile}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 flex items-center space-x-2 transition-all cursor-pointer"
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

      {/* Accessible Reusable Feedback ActionModal */}
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
