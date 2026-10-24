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
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Check,
  X,
  Upload,
  LogOut,
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
        const localSession = StorageService.getCurrentUser();
        const localUsers = StorageService.getUsers();
        const localMatch = localUsers.find(
          (u) =>
            u.id === currentUser?.id ||
            (u.email || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim()
        );
        const localSavedAvatar =
          currentUser?.avatar_url || localSession?.avatar_url || localMatch?.avatar_url || '';

        if (isSupabaseConfigured() && (currentUser?.id || currentUser?.email)) {
          let data = null;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            currentUser?.id
          );

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
              const resolvedAvatar = data.avatar_url || localSavedAvatar || '';
              const loadedProfile = {
                id: data.id,
                email: data.email || currentUser.email || 'admin@zapatera.gov.ph',
                role: data.role || currentUser.role || 'admin',
                full_name: data.full_name || currentUser.full_name || 'Barangay Admin',
                username:
                  data.username ||
                  currentUser.username ||
                  (data.email || currentUser.email)?.split('@')[0] ||
                  'admin',
                phone: data.phone || currentUser.phone || '',
                address: data.address || currentUser.address || 'Barangay Zapatera, Cebu City',
                avatar_url: resolvedAvatar,
                created_at:
                  data.created_at || currentUser.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
              };

              setProfile(loadedProfile);

              // Keep local session updated with latest profile fields only if still logged in
              try {
                const currentSession = StorageService.getCurrentUser();
                if (currentSession && currentSession.role === 'admin') {
                  const synced = {
                    ...currentSession,
                    ...loadedProfile,
                    avatar_url: resolvedAvatar || currentSession.avatar_url || '',
                  };
                  StorageService.setCurrentUser(synced);
                  if (onUserUpdated && synced.avatar_url !== currentUser?.avatar_url) {
                    onUserUpdated(synced);
                  }
                }
              } catch (e) {}
            }
          } else {
            const isTargetUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                currentUser?.id
              );
            const newProfile = {
              email: (currentUser?.email || 'admin@zapatera.gov.ph').toLowerCase().trim(),
              role: currentUser?.role || 'admin',
              full_name: currentUser?.full_name || 'Barangay Staff Officer',
              username:
                currentUser?.username ||
                (currentUser?.email || 'admin')?.split('@')[0] ||
                'admin',
              phone: currentUser?.phone || '09171234567',
              address: currentUser?.address || 'Barangay Zapatera, Cebu City',
              avatar_url: localSavedAvatar,
              created_at: currentUser?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            if (isTargetUuid) {
              newProfile.id = currentUser.id;
            }

            const { data: upserted } = await supabase
              .from('profiles')
              .upsert(newProfile, { onConflict: 'email' })
              .select()
              .maybeSingle();

            if (isMounted) {
              setProfile({
                ...newProfile,
                id: upserted?.id || newProfile.id || currentUser?.id,
              });
            }
          }
        } else {
          if (localMatch && isMounted) {
            setProfile({
              id: localMatch.id,
              email: localMatch.email || currentUser?.email || 'admin@zapatera.gov.ph',
              role: localMatch.role || currentUser?.role || 'admin',
              full_name: localMatch.full_name || currentUser?.full_name || 'Barangay Admin',
              username: localMatch.username || currentUser?.username || 'admin',
              phone: localMatch.phone || currentUser?.phone || '09171234567',
              avatar_url: localSavedAvatar,
              created_at: localMatch.created_at || new Date().toISOString(),
              updated_at: localMatch.updated_at || new Date().toISOString(),
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
  }, [currentUser?.id, currentUser?.email]);

  // -------------------------------------------------------------
  // PASSWORD VERIFICATION LOGIC FOR SAVING PROFILE
  // -------------------------------------------------------------
  async function verifyLoggedInPassword(inputPassword) {
    if (!inputPassword) return false;

    const session =
      currentUser ||
      (typeof StorageService !== 'undefined' && StorageService.getCurrentUser
        ? StorageService.getCurrentUser()
        : null) ||
      JSON.parse(
        localStorage.getItem('zapatera_admin_session') ||
          localStorage.getItem('zapatera_superadmin_session') ||
          localStorage.getItem('zapatera_account_mgmt_session') ||
          localStorage.getItem('zapatera_resident_session') ||
          'null'
      );
    const loggedInEmail = (session?.email || '').trim().toLowerCase();
    if (!loggedInEmail) return false;

    // 1. Check active session or local users store password
    if (session?.password && session.password === inputPassword) return true;
    try {
      const localUsers = StorageService.getUsers();
      const matchedLocal = localUsers.find(
        (u) => (u.email || '').trim().toLowerCase() === loggedInEmail
      );
      if (matchedLocal?.password && matchedLocal.password === inputPassword) return true;
    } catch {}

    // 2. Verify with Supabase Auth
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

  // Persist newly uploaded avatar immediately so Sidebar, Header, LocalStorage, and Supabase update in real time
  const persistAvatarImmediately = async (newAvatarUrl) => {
    const now = new Date().toISOString();
    const effectiveRole = currentUser?.role || profile.role || 'admin';
    const updatedUser = {
      ...(currentUser || {}),
      ...profile,
      role: effectiveRole,
      avatar_url: newAvatarUrl,
      updated_at: now,
    };

    setProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl, updated_at: now }));

    try {
      if (typeof StorageService.saveUser === 'function') {
        StorageService.saveUser(updatedUser);
      }
      StorageService.setCurrentUser(updatedUser);

      const sessionKeys = [
        'zapatera_admin_session',
        'zapatera_superadmin_session',
        'zapatera_account_mgmt_session',
      ];
      sessionKeys.forEach((k) => {
        const existing = JSON.parse(localStorage.getItem(k) || 'null');
        if (
          existing &&
          ((existing.email || '').toLowerCase() ===
            (updatedUser.email || '').toLowerCase() ||
            existing.id === updatedUser.id)
        ) {
          localStorage.setItem(
            k,
            JSON.stringify({
              ...existing,
              ...updatedUser,
              avatar_url: newAvatarUrl,
            })
          );
        }
      });
    } catch {}

    // Immediately notify parent App.jsx so Sidebar and Navbar Header update right away
    if (onUserUpdated) {
      onUserUpdated(updatedUser);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zapatera_user_updated', { detail: updatedUser }));
    }

    // Sync to Supabase profiles & auth user metadata
    if (isSupabaseConfigured()) {
      try {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            updatedUser.id
          );
        if (isUuid) {
          await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl, updated_at: now })
            .eq('id', updatedUser.id);
        }
        if (updatedUser.email) {
          await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl, updated_at: now })
            .eq('email', updatedUser.email.toLowerCase().trim());
        }
        await supabase.auth.updateUser({
          data: { avatar_url: newAvatarUrl },
        });
      } catch (err) {
        console.warn('Supabase avatar sync notice:', err);
      }
    }
  };

  const handleAvatarFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadAdminAvatar(
        profile.id || currentUser?.id || 'admin',
        file
      );
      if (result.success && result.url) {
        await persistAvatarImmediately(result.url);
        setActionModal({
          isOpen: true,
          type: 'success',
          title: 'Profile Picture Updated',
          message:
            'Your administrator profile photo has been uploaded and updated in the sidebar and header.',
          buttonText: 'OK',
          onClose: () => setActionModal({ isOpen: false }),
        });
      } else {
        const reader = new FileReader();
        reader.onload = async (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result;
          if (dataUrl) {
            await persistAvatarImmediately(dataUrl);
            setActionModal({
              isOpen: true,
              type: 'success',
              title: 'Profile Picture Updated',
              message:
                'Your administrator profile photo has been loaded and updated in the sidebar and header.',
              buttonText: 'OK',
              onClose: () => setActionModal({ isOpen: false }),
            });
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
      if (isSupabaseConfigured()) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            currentUser?.id || profile.id
          );
        const dbPayload = {
          email: (profile.email || '').toLowerCase().trim(),
          role: profile.role || 'admin',
          full_name: profile.full_name,
          username: profile.username,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          updated_at: now,
        };
        if (isUuid) {
          dbPayload.id = currentUser?.id || profile.id;
        }

        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(dbPayload, { onConflict: 'email' });

        if (profileErr && profile.email) {
          await supabase
            .from('profiles')
            .update({
              full_name: profile.full_name,
              username: profile.username,
              phone: profile.phone,
              avatar_url: profile.avatar_url,
              updated_at: now,
            })
            .eq('email', profile.email.toLowerCase().trim());
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
      const effectiveRole = currentUser?.role || profile.role || 'admin';
      const cleanUpdatedUser = {
        ...(currentUser || {}),
        ...profile,
        role: effectiveRole,
        full_name: profile.full_name,
        username: profile.username,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        updated_at: now,
      };

      if (typeof StorageService.saveUser === 'function') {
        StorageService.saveUser(cleanUpdatedUser);
      }
      StorageService.setCurrentUser(cleanUpdatedUser);

      // Sync active sessions
      try {
        const sessionKeys = [
          'zapatera_admin_session',
          'zapatera_superadmin_session',
          'zapatera_account_mgmt_session',
        ];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(
              k,
              JSON.stringify({
                ...existing,
                ...cleanUpdatedUser,
              })
            );
          }
        });
      } catch (e) {}

      setProfile(updatedPayload);

      if (onUserUpdated) onUserUpdated(cleanUpdatedUser);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('zapatera_user_updated', { detail: cleanUpdatedUser })
        );
      }

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Profile Updated Successfully',
        message: 'Your profile information has been saved and synced across the portal.',
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

    const pw = securityForm.newPassword || '';
    const hasMinLength = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const isPasswordStrong =
      hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

    if (!isPasswordStrong) {
      setPasswordError(
        'New password must be strong: at least 8 characters and include uppercase, lowercase, a number, and a special character.'
      );
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setUpdatingPassword(true);

    try {
      const isCurrentValid = await verifyLoggedInPassword(
        securityForm.currentPassword
      );
      if (!isCurrentValid) {
        setPasswordError(
          'Current password authentication failed. Please enter your correct password.'
        );
        setUpdatingPassword(false);
        return;
      }

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

      const updatedUser = {
        ...currentUser,
        password: securityForm.newPassword,
        updated_at: new Date().toISOString(),
      };

      StorageService.saveUser(updatedUser);
      StorageService.setCurrentUser(updatedUser);

      try {
        const sessionKeys = [
          'zapatera_admin_session',
          'zapatera_superadmin_session',
          'zapatera_account_mgmt_session',
        ];
        sessionKeys.forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || 'null');
          if (existing) {
            localStorage.setItem(
              k,
              JSON.stringify({ ...existing, password: securityForm.newPassword })
            );
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
      <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 flex flex-col items-center justify-center min-h-[420px] space-y-3 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3b5bfd] shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-400">
          Loading Account Profile & Security Settings...
        </p>
      </div>
    );
  }

  const passwordStrengthChecks = [
    securityForm.newPassword.length >= 8,
    /[A-Z]/.test(securityForm.newPassword),
    /[a-z]/.test(securityForm.newPassword),
    /[0-9]/.test(securityForm.newPassword),
    /[^A-Za-z0-9]/.test(securityForm.newPassword),
  ];
  const passedStrengthCount = passwordStrengthChecks.filter(Boolean).length;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-1 pt-1">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white text-[#3b5bfd] text-[11px] font-bold uppercase tracking-wider mb-2 shadow-xs border border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Account & Security Settings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Settings & Profile Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Manage your official barangay administrator identity, contact credentials, password security, and active device session.
          </p>
        </div>

        {onLogout && (
          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={onLogout}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              title="Sign out of your active session"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Session</span>
            </button>
          </div>
        )}
      </div>

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

      {/* 4 Colorful Gradient KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#3b5bfd] via-[#4f6ef7] to-[#60a5fa] text-white shadow-[0_14px_30px_-12px_rgba(59,91,253,0.45)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Administrator Role
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {getRoleBadgeLabel(profile.role)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-mono">
              @{profile.username || 'admin'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

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

        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.45)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Member Since
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {formatDate(profile.created_at)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1">Official Barangay Portal</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

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
        {/* Left Column: Administrator Identity & Profile Details Form */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 sm:p-7 space-y-6">
            {/* Light Profile Identity Banner */}
            <div className="p-5 rounded-[22px] bg-[#f4f7fb] border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group shrink-0">
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.full_name || profile.username || profile.email}
                  role={profile.role || 'admin'}
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
                    <ShieldCheck className="w-3 h-3 mr-1 text-[#38bdf8]" />
                    {getRoleBadgeLabel(profile.role)}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-[#3b5bfd] mt-0.5">
                  @{profile.username || 'admin'}
                </p>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start mt-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              </div>
            </div>

            {/* Section Title */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Profile Details & Personal Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your official administrator name, username handle, contact number, and avatar.
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] border border-blue-100 shrink-0">
                Account Info
              </span>
            </div>

            <form onSubmit={handleInitiateSaveProfile} className="space-y-5">
              {/* Read-Only Email & Account Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Email Address (Read-Only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={profile.email}
                      className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-mono border cursor-not-allowed bg-slate-100/80 border-slate-200 text-slate-500"
                    />
                    <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Account Security Role (Read-Only)
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3b5bfd]" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={getRoleBadgeLabel(profile.role)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-bold border cursor-not-allowed capitalize bg-blue-50/70 border-blue-200 text-[#3b5bfd]"
                    />
                    <Lock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      placeholder="Barangay Staff Officer"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={profile.username}
                      onChange={(e) =>
                        setProfile({ ...profile, username: e.target.value })
                      }
                      placeholder="admin"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl text-xs font-mono font-semibold border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Number & Avatar URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      placeholder="09171234567"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Avatar Image URL or Upload
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={
                          profile.avatar_url?.startsWith('data:image/')
                            ? 'Uploaded Profile Photo'
                            : profile.avatar_url || ''
                        }
                        onChange={(e) =>
                          setProfile({ ...profile, avatar_url: e.target.value })
                        }
                        placeholder="https://... or upload file"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                      />
                    </div>
                    <label
                      className="px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 border transition-all bg-[#f4f7fb] hover:bg-blue-50 text-[#3b5bfd] border-blue-200"
                      title="Upload Avatar Image"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3b5bfd]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#3b5bfd]" />
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
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-medium">
                  Requires administrator password confirmation to save.
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer shrink-0"
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

        {/* Right Column: Password Authentication & Session / Danger Zone */}
        <div className="xl:col-span-5 space-y-6">
          {/* Security Settings & Password Card */}
          <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Password & Authentication
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your administrator login password.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                Security
              </span>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    name="account_current_pass"
                    autoComplete="current-password"
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter existing account password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-mono border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Min 8 strong chars"
                      className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-mono border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      name="account_confirm_pass"
                      autoComplete="new-password"
                      value={securityForm.confirmPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs font-mono border border-slate-200 bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Real-Time Strong Password Validation Checklist */}
              {securityForm.newPassword && (
                <div className="p-4 rounded-2xl border text-xs space-y-2.5 transition-all bg-[#f4f7fb] border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Password Strength</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        passedStrengthCount === 5
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : passedStrengthCount >= 3
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {passedStrengthCount === 5 ? 'Strong Password' : 'Incomplete'}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        passedStrengthCount === 5
                          ? 'bg-emerald-500'
                          : passedStrengthCount >= 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${(passedStrengthCount / 5) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-1 pt-1 text-[11px]">
                    <div
                      className={`flex items-center space-x-1.5 ${
                        securityForm.newPassword.length >= 8
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {securityForm.newPassword.length >= 8 ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>At least 8 characters</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${
                        /[A-Z]/.test(securityForm.newPassword)
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {/[A-Z]/.test(securityForm.newPassword) ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${
                        /[a-z]/.test(securityForm.newPassword)
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {/[a-z]/.test(securityForm.newPassword) ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${
                        /[0-9]/.test(securityForm.newPassword)
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {/[0-9]/.test(securityForm.newPassword) ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>One number (0-9)</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${
                        /[^A-Za-z0-9]/.test(securityForm.newPassword)
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {/[^A-Za-z0-9]/.test(securityForm.newPassword) ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>One special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
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

          {/* Session & Danger Zone Card */}
          <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] p-6 space-y-4">
            {onLogout && (
              <div className="p-4 rounded-2xl bg-[#f4f7fb] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Active Device Session
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Signed in as{' '}
                      <span className="font-mono font-bold text-slate-700">
                        {profile.email}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  Sign Out
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100/80 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-rose-700">
                    Danger Zone — Delete Account
                  </h4>
                  <p className="text-[11px] text-rose-600/80 mt-0.5">
                    Permanently remove this administrator profile and revoke access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmInput('');
                  setIsDeleteModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account Confirmation"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-rose-900 text-xs">
                Permanent Account Removal
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                Are you sure you want to permanently delete your profile for{' '}
                <strong className="font-mono">{profile.email}</strong>? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f4f7fb] border border-slate-200/80 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Type <span className="font-mono font-extrabold text-rose-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={deleteConfirmInput.trim() !== 'DELETE' || deleting}
              onClick={handleDeleteAccount}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full shadow-md shadow-rose-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Profile…</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Security Verification Modal - Save Profile Changes */}
      <Modal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityPassword('');
          setSecurityError('');
        }}
        title="Authorize Profile Changes"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#3b5bfd] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">
                Identity Confirmation Required
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Enter your logged-in administrator password to verify your identity and commit your profile updates.
              </p>
            </div>
          </div>

          {securityError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{securityError}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl border bg-[#f4f7fb] border-slate-200/80 space-y-2">
            <label className="block font-bold text-[11px] uppercase tracking-wider flex items-center text-slate-600">
              <Lock className="w-3.5 h-3.5 mr-1.5 text-[#3b5bfd]" /> Administrator Password
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
                className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-mono text-xs bg-white text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showSecurityPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsSecurityModalOpen(false);
                setSecurityPassword('');
                setSecurityError('');
              }}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
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
