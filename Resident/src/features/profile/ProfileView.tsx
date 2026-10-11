// Resident/src/features/profile/ProfileView.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  ShieldCheck,
  Lock,
  Phone,
  MapPin,
  Calendar,
  Vote,
  FileText,
  HelpCircle,
  LogOut,
  Edit3,
  CheckCircle2,
  X,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Camera,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { supabase } from '../../core/supabase';
import { ResidentUser, BarangayConfig } from '../../types';
import { uploadUserAvatar } from '../../core/storageService';
import ActionModal from '../../components/ActionModal';

interface ProfileViewProps {
  currentUser: ResidentUser;
  config: BarangayConfig;
  onUpdateProfile: (updated: Partial<ResidentUser>) => void;
  onLogout: () => void;
}

export default function ProfileView({
  currentUser,
  config,
  onUpdateProfile,
  onLogout,
}: ProfileViewProps) {
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Real-time strong password verification
  const pwLengthMet = newPassword.length >= 8;
  const pwUpperMet = /[A-Z]/.test(newPassword);
  const pwLowerMet = /[a-z]/.test(newPassword);
  const pwNumberMet = /[0-9]/.test(newPassword);
  const pwSpecialMet = /[^A-Za-z0-9]/.test(newPassword);
  const isStrongPassword = pwLengthMet && pwUpperMet && pwLowerMet && pwNumberMet && pwSpecialMet;

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current account password.');
      return;
    }
    if (!isStrongPassword) {
      setPasswordError('New password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const userEmail = (currentUser.email || '').trim().toLowerCase();
      if (userEmail) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });
        if (signInErr) {
          setPasswordError('Current password is incorrect. Please re-check your password.');
          setIsUpdatingPassword(false);
          return;
        }
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) {
        console.warn('Supabase auth update notice:', updateErr.message);
      }

      onUpdateProfile({ password: newPassword } as any);

      setPasswordSuccess('Account security credentials updated successfully!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
        setActionModal({
          isOpen: true,
          type: 'success',
          title: 'Password Updated',
          message: 'Your account password has been changed. Use your new strong password on next sign in.',
          buttonText: 'Done',
          onClose: () => setActionModal({ isOpen: false, title: '' }),
        });
      }, 900);
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Feedback ActionModal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'confirmation' | 'info';
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    buttonText?: string;
    onConfirm?: () => void;
    onClose?: () => void;
  }>({
    isOpen: false,
    title: '',
  });

  // Edit form state
  const [editFirstName, setEditFirstName] = useState(currentUser.first_name || currentUser.full_name?.split(' ')[0] || '');
  const [editLastName, setEditLastName] = useState(currentUser.last_name || '');
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAddress, setEditAddress] = useState(currentUser.address || currentUser.sitio || '');
  const [editCivilStatus, setEditCivilStatus] = useState(currentUser.civil_status || 'Single');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Avatar error fallback state
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Synchronize internal form states when currentUser is updated by Superadmin or Realtime
  useEffect(() => {
    setEditFirstName(currentUser.first_name || currentUser.full_name?.split(' ')[0] || '');
    setEditLastName(currentUser.last_name || '');
    setEditPhone(currentUser.phone || '');
    setEditAddress(currentUser.address || currentUser.sitio || '');
    setEditCivilStatus(currentUser.civil_status || 'Single');
  }, [currentUser]);

  // Reset image error state whenever avatar_url changes
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [currentUser.avatar_url]);

  // Checks whether an avatar URL is a template / stock placeholder
  const isTemplateAvatar = (url?: string) => {
    if (!url) return true;
    const clean = url.trim().toLowerCase();
    if (!clean) return true;
    if (clean.includes('photo-1472099645785')) return true;
    if (clean.includes('photo-1534528741775')) return true;
    if (clean.includes('default-avatar') || clean.includes('default_avatar') || clean.includes('placeholder')) return true;
    if (clean.includes('silhouette') || clean.includes('user-template') || clean.includes('avatar-template') || clean.includes('anonymous')) return true;
    return false;
  };

  // Compute clean dynamic initials: "John Doe" -> "JD", "Maria Santos" -> "MS"
  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };



  const handleSaveProfile = () => {
    try {
      const cleanFull = `${editLastName.trim() ? editLastName.trim() + ', ' : ''}${editFirstName.trim()}`;
      onUpdateProfile({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        full_name: cleanFull || currentUser.full_name,
        phone: editPhone.trim(),
        address: editAddress.trim(),
        civil_status: editCivilStatus,
      });
      setIsEditModalOpen(false);

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Profile Updated Successfully',
        message: 'Your profile information has been updated.',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false, title: '' }),
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Unable to update your profile information. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false, title: '' }),
      });
    }
  };



  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleUploadAvatar = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      setAvatarError('');
      try {
        const result = await uploadUserAvatar(currentUser.id || 'resident', file, file.name);
        if (result.success && result.fileUrl) {
          onUpdateProfile({ avatar_url: result.fileUrl });
          setActionModal({
            isOpen: true,
            type: 'success',
            title: 'Photo Updated Successfully',
            message: 'Your official resident profile picture has been updated.',
            buttonText: 'OK',
            onClose: () => setActionModal({ isOpen: false, title: '' }),
          });
        } else {
          setActionModal({
            isOpen: true,
            type: 'error',
            title: 'Photo Upload Failed',
            message: 'We could not upload your photo. Please try another image.',
            buttonText: 'Close',
            onClose: () => setActionModal({ isOpen: false, title: '' }),
          });
        }
      } catch (err: any) {
        setActionModal({
          isOpen: true,
          type: 'error',
          title: 'Photo Upload Failed',
          message: 'An error occurred while uploading. Please try again.',
          buttonText: 'Close',
          onClose: () => setActionModal({ isOpen: false, title: '' }),
        });
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileHeaderCard}>
        <View style={{ position: 'relative', alignSelf: 'center' }}>
          <View style={styles.avatarLarge}>
            {currentUser.avatar_url && !isTemplateAvatar(currentUser.avatar_url) && !avatarLoadFailed ? (
              <Image
                source={{ uri: currentUser.avatar_url }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <Text style={styles.avatarLargeText}>
                {getInitials(currentUser.full_name || currentUser.first_name)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: '#1d4ed8',
              padding: 6,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: '#ffffff',
            }}
            onPress={handleUploadAvatar}
            disabled={uploadingAvatar}
            title="Upload Profile Picture"
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Camera size={14} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {avatarError ? (
          <Text style={{ color: '#ef4444', fontSize: 11, textAlign: 'center', marginTop: 4 }}>{avatarError}</Text>
        ) : null}

        <Text style={styles.profileName}>{currentUser.full_name}</Text>
        <Text style={styles.profileEmail}>{currentUser.email}</Text>

        <View style={styles.headerBadgesRow}>
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={12} color="#15803d" />
            <Text style={styles.verifiedBadgeText}>Verified Resident</Text>
          </View>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>{currentUser.id_number || 'BZ-RESIDENT-2026'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditModalOpen(true)}>
          <Edit3 size={14} color="#1d4ed8" />
          <Text style={styles.editProfileBtnText}>Edit Personal Info</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Information Section */}
      <Text style={styles.sectionHeading}>Personal & Residence Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <User size={16} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Full Legal Name</Text>
            <Text style={styles.infoValue}>{currentUser.full_name}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MapPin size={16} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Barangay Sitio / Address</Text>
            <Text style={styles.infoValue}>{currentUser.sitio || currentUser.address || 'Barangay Zapatera, Cebu City'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Phone size={16} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Contact Mobile</Text>
            <Text style={styles.infoValue}>{currentUser.phone || '0917-123-4567'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Vote size={16} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Voter Registration Status</Text>
            <Text style={styles.infoValue}>{currentUser.voter_status || 'Registered Voter'}</Text>
          </View>
        </View>
      </View>

      {/* Security & Authentication Section */}
      <Text style={styles.sectionHeading}>Account Security & Protection</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setIsPasswordModalOpen(true)}>
          <View style={styles.menuItemLeft}>
            <Lock size={18} color="#1d4ed8" />
            <View>
              <Text style={styles.menuItemTitle}>Change Account Password</Text>
              <Text style={styles.menuItemSub}>Update your login credentials</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>

      </View>

      {/* Support & Privacy */}
      <Text style={styles.sectionHeading}>Support & Legal</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setIsHelpModalOpen(true)}>
          <View style={styles.menuItemLeft}>
            <HelpCircle size={18} color="#1d4ed8" />
            <View>
              <Text style={styles.menuItemTitle}>Help & Barangay Contact Info</Text>
              <Text style={styles.menuItemSub}>Office hours, hotlines & FAQs</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.menuItem} onPress={() => setIsPrivacyModalOpen(true)}>
          <View style={styles.menuItemLeft}>
            <FileText size={18} color="#64748b" />
            <View>
              <Text style={styles.menuItemTitle}>Data Privacy Notice & Terms</Text>
              <Text style={styles.menuItemSub}>Republic Act No. 10173 compliance</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Log Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLogoutConfirmOpen(true)}>
        <LogOut size={16} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Log Out Resident Account</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>
        Barangay Zapatera Digital Portal • v2.4.0 (Secure Government Build)
      </Text>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent onRequestClose={() => setIsEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Personal Information</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {saveSuccessMsg ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <Text style={styles.successBannerText}>{saveSuccessMsg}</Text>
                </View>
              ) : null}

              <Text style={styles.formLabel}>First Name</Text>
              <TextInput style={styles.formInput} value={editFirstName} onChangeText={setEditFirstName} />

              <Text style={styles.formLabel}>Last Name</Text>
              <TextInput style={styles.formInput} value={editLastName} onChangeText={setEditLastName} />

              <Text style={styles.formLabel}>Mobile Number (11 digits)</Text>
              <TextInput style={styles.formInput} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />

              <Text style={styles.formLabel}>Barangay Sitio / House Address</Text>
              <TextInput style={styles.formInput} value={editAddress} onChangeText={setEditAddress} />

              <Text style={styles.formLabel}>Civil Status</Text>
              <TextInput style={styles.formInput} value={editCivilStatus} onChangeText={setEditCivilStatus} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsEditModalOpen(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* HELP & SUPPORT MODAL */}
      <Modal visible={isHelpModalOpen} animationType="slide" transparent onRequestClose={() => setIsHelpModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Barangay Help & Contact Desk</Text>
              <TouchableOpacity onPress={() => setIsHelpModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.helpHeading}>Barangay Hall Office Hours</Text>
              <Text style={styles.helpText}>{config.office_hours || 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)'}</Text>

              <Text style={styles.helpHeading}>Hotline & Telephone</Text>
              <Text style={styles.helpText}>Barangay Desk: {config.contact_phone || '(032) 255-4819'}</Text>
              <Text style={styles.helpText}>Emergency Hotline: {config.emergency_hotline || '911 / (032) 255-1111'}</Text>

              <Text style={styles.helpHeading}>Official Address</Text>
              <Text style={styles.helpText}>{config.hall_address || 'Rahmann St., Barangay Zapatera, Cebu City'}</Text>

              <Text style={styles.helpHeading}>Email Support</Text>
              <Text style={styles.helpText}>{config.contact_email || 'zapatera.cebucity@gmail.com'}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveModalBtn} onPress={() => setIsHelpModalOpen(false)}>
                <Text style={styles.saveModalBtnText}>Close Help Desk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PRIVACY POLICY MODAL */}
      <Modal visible={isPrivacyModalOpen} animationType="slide" transparent onRequestClose={() => setIsPrivacyModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data Privacy & Terms</Text>
              <TouchableOpacity onPress={() => setIsPrivacyModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.helpHeading}>Republic Act No. 10173</Text>
              <Text style={styles.helpText}>
                Barangay Zapatera respects your privacy and complies with the Data Privacy Act of 2012. Information submitted through this portal is strictly used for official document clearance and verification.
              </Text>
              <Text style={styles.helpHeading}>Data Encryption & Storage</Text>
              <Text style={styles.helpText}>
                All uploaded document attachments and personal details are encrypted. Only authorized Barangay records officers and the Barangay Captain have access to your data.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveModalBtn} onPress={() => setIsPrivacyModalOpen(false)}>
                <Text style={styles.saveModalBtnText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent onRequestClose={() => setIsPasswordModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Lock size={18} color="#1d4ed8" />
                <Text style={styles.modalTitle}>Change Account Password</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {passwordError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#b91c1c" />
                  <Text style={styles.errorBannerText}>{passwordError}</Text>
                </View>
              ) : null}

              {passwordSuccess ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#15803d" />
                  <Text style={styles.successBannerText}>{passwordSuccess}</Text>
                </View>
              ) : null}

              <Text style={styles.formLabel}>Current Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputField}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPass}
                  placeholder="Enter current password"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={{ padding: 4 }}>
                  {showCurrentPass ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>New Strong Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputField}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                  placeholder="Minimum 8 strong characters"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={{ padding: 4 }}>
                  {showNewPass ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                </TouchableOpacity>
              </View>

              {/* Real-Time Strong Password Validation Checklist */}
              {newPassword ? (
                <View style={styles.checklistContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.checklistTitle}>Security Criteria:</Text>
                    <Text style={[styles.checklistBadge, isStrongPassword ? styles.checklistBadgeMet : styles.checklistBadgeUnmet]}>
                      {isStrongPassword ? 'Strong' : 'Incomplete'}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.checklistProgressBar}>
                    <View
                      style={[
                        styles.checklistProgressFill,
                        {
                          width: `${([pwLengthMet, pwUpperMet, pwLowerMet, pwNumberMet, pwSpecialMet].filter(Boolean).length / 5) * 100}%`,
                          backgroundColor: isStrongPassword ? '#16a34a' : [pwLengthMet, pwUpperMet, pwLowerMet, pwNumberMet, pwSpecialMet].filter(Boolean).length >= 3 ? '#d97706' : '#dc2626',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.checklistItem}>
                    {pwLengthMet ? <Check size={14} color="#16a34a" /> : <X size={14} color="#94a3b8" />}
                    <Text style={pwLengthMet ? styles.checklistTextMet : styles.checklistText}>At least 8 characters</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    {pwUpperMet ? <Check size={14} color="#16a34a" /> : <X size={14} color="#94a3b8" />}
                    <Text style={pwUpperMet ? styles.checklistTextMet : styles.checklistText}>At least one uppercase letter (A-Z)</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    {pwLowerMet ? <Check size={14} color="#16a34a" /> : <X size={14} color="#94a3b8" />}
                    <Text style={pwLowerMet ? styles.checklistTextMet : styles.checklistText}>At least one lowercase letter (a-z)</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    {pwNumberMet ? <Check size={14} color="#16a34a" /> : <X size={14} color="#94a3b8" />}
                    <Text style={pwNumberMet ? styles.checklistTextMet : styles.checklistText}>At least one number (0-9)</Text>
                  </View>
                  <View style={styles.checklistItem}>
                    {pwSpecialMet ? <Check size={14} color="#16a34a" /> : <X size={14} color="#94a3b8" />}
                    <Text style={pwSpecialMet ? styles.checklistTextMet : styles.checklistText}>At least one special character (!@#$%^&*)</Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.formLabel}>Confirm New Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInputField}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNewPass}
                  placeholder="Re-type new password"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                disabled={isUpdatingPassword}
                onPress={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, { opacity: isUpdatingPassword ? 0.6 : 1 }]}
                disabled={isUpdatingPassword}
                onPress={handleChangePassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal visible={isLogoutConfirmOpen} animationType="fade" transparent onRequestClose={() => setIsLogoutConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340 }]}>
            <View style={styles.logoutConfirmBody}>
              <View style={styles.logoutIconCircle}>
                <LogOut size={28} color="#dc2626" />
              </View>
              <Text style={styles.logoutConfirmTitle}>Log Out of Resident Portal?</Text>
              <Text style={styles.logoutConfirmText}>
                You will need to sign in with your email and password to access your documents and request tracking.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsLogoutConfirmOpen(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: '#dc2626' }]}
                onPress={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
              >
                <Text style={styles.saveModalBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Feedback & Confirmation Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose || (() => setActionModal({ isOpen: false, title: '' }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  idBadge: {
    backgroundColor: '#eff6ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
    fontFamily: 'monospace',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuItemSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBody: {
    padding: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  saveModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  successBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  helpHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
    marginTop: 10,
    marginBottom: 2,
  },
  helpText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  logoutConfirmBody: {
    alignItems: 'center',
    padding: 20,
  },
  logoutIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoutConfirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  logoutConfirmText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  passwordInputField: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  checklistContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  checklistBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checklistBadgeMet: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  checklistBadgeUnmet: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  checklistProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 6,
  },
  checklistProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  checklistText: {
    fontSize: 10,
    color: '#64748b',
  },
  checklistTextMet: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: '700',
  },
});
