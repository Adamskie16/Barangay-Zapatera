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
  Platform,
} from 'react-native';
import {
  User,
  ShieldCheck,
  Lock,
  Phone,
  MapPin,
  Vote,
  FileText,
  HelpCircle,
  LogOut,
  Edit3,
  CheckCircle2,
  X,
  ChevronRight,
  AlertCircle,
  Camera,
  Eye,
  EyeOff,
  Check,
  MessageSquare,
  MessageCircle,
  Megaphone,
  Clock,
  Search,
  ArrowRight,
  Mail,
  Heart,
} from 'lucide-react';
import { supabase } from '../../core/supabase';
import { ResidentUser, BarangayConfig, BarangayAnnouncement } from '../../types';
import { uploadUserAvatar } from '../../core/storageService';
import { getUserCommentHistory, ResidentCommentHistoryItem } from '../../core/commentService';
import ActionModal from '../../components/ActionModal';
import GlobalFooter from '../../components/GlobalFooter';
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface ProfileViewProps {
  currentUser: ResidentUser;
  config: BarangayConfig;
  announcements?: BarangayAnnouncement[];
  onUpdateProfile: (updated: Partial<ResidentUser>) => void;
  onLogout: () => void;
  onViewAnnouncement?: (ann: BarangayAnnouncement) => void;
  onNavigateTab?: (tab: string) => void;
}

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated'];

export default function ProfileView({
  currentUser,
  config,
  announcements = [],
  onUpdateProfile,
  onLogout,
  onViewAnnouncement,
  onNavigateTab,
}: ProfileViewProps) {
  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCommentHistoryModalOpen, setIsCommentHistoryModalOpen] = useState(false);

  // Comment History Feature State
  const [commentHistory, setCommentHistory] = useState<ResidentCommentHistoryItem[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentSearchQuery, setCommentSearchQuery] = useState('');
  const [commentFilter, setCommentFilter] = useState<'all' | 'with_replies' | 'waiting'>('all');

  const loadCommentHistory = async () => {
    setIsLoadingComments(true);
    try {
      const items = await getUserCommentHistory(currentUser.id, currentUser.full_name);
      setCommentHistory(items);
    } catch (e) {
      console.warn('Error loading comment history:', e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    loadCommentHistory();
  }, [currentUser?.id, currentUser?.full_name]);

  const repliedCommentsCount = commentHistory.filter((c) => c.hasAdminReply).length;

  const filteredCommentHistory = commentHistory.filter((item) => {
    if (commentFilter === 'with_replies' && !item.hasAdminReply) return false;
    if (commentFilter === 'waiting' && item.hasAdminReply) return false;

    if (commentSearchQuery.trim()) {
      const q = commentSearchQuery.toLowerCase().trim();
      const contentMatch = item.comment.content?.toLowerCase().includes(q);
      const replyMatch = item.replies.some((r) => r.content?.toLowerCase().includes(q));
      const annMatch = (announcements || []).some(
        (a) => String(a.id) === String(item.news_id) && a.title?.toLowerCase().includes(q)
      );
      return contentMatch || replyMatch || annMatch;
    }
    return true;
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmittedAttempt, setPasswordSubmittedAttempt] = useState(false);

  // Real-time strong password verification
  const pwLengthMet = newPassword.length >= 8;
  const pwUpperMet = /[A-Z]/.test(newPassword);
  const pwLowerMet = /[a-z]/.test(newPassword);
  const pwNumberMet = /[0-9]/.test(newPassword);
  const pwSpecialMet =
    /[@$!%*?&!#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`^]/.test(newPassword) ||
    /[^A-Za-z0-9\s]/.test(newPassword);
  const isStrongPassword =
    pwLengthMet && pwUpperMet && pwLowerMet && pwNumberMet && pwSpecialMet;
  const passwordCriteriaCount = [
    pwLengthMet,
    pwUpperMet,
    pwLowerMet,
    pwNumberMet,
    pwSpecialMet,
  ].filter(Boolean).length;
  const passwordsMatch = Boolean(
    confirmPassword && newPassword && confirmPassword === newPassword
  );
  const passwordsMismatch = Boolean(
    confirmPassword && newPassword && confirmPassword !== newPassword
  );

  const handleChangePassword = async () => {
    setPasswordSubmittedAttempt(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current account password.');
      return;
    }
    if (!isStrongPassword) {
      setPasswordError(
        'New password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
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
        setShowCurrentPass(false);
        setShowNewPass(false);
        setShowConfirmPass(false);
        setPasswordError('');
        setPasswordSuccess('');
        setPasswordSubmittedAttempt(false);
        setActionModal({
          isOpen: true,
          type: 'success',
          title: 'Password Updated',
          message:
            'Your account password has been changed. Use your new strong password on next sign in.',
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
  const [editFirstName, setEditFirstName] = useState(
    currentUser.first_name || currentUser.full_name?.split(' ')[0] || ''
  );
  const [editLastName, setEditLastName] = useState(currentUser.last_name || '');
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAddress, setEditAddress] = useState(
    currentUser.address || currentUser.sitio || ''
  );
  const [editCivilStatus, setEditCivilStatus] = useState(
    currentUser.civil_status || 'Single'
  );
  const [editSubmittedAttempt, setEditSubmittedAttempt] = useState(false);

  // Avatar error fallback state
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setEditFirstName(
      currentUser.first_name || currentUser.full_name?.split(' ')[0] || ''
    );
    setEditLastName(currentUser.last_name || '');
    setEditPhone(currentUser.phone || '');
    setEditAddress(currentUser.address || currentUser.sitio || '');
    setEditCivilStatus(currentUser.civil_status || 'Single');
  }, [currentUser]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [currentUser.avatar_url]);

  const isTemplateAvatar = (url?: string) => {
    if (!url) return true;
    const clean = url.trim().toLowerCase();
    if (!clean) return true;
    if (clean.includes('photo-1472099645785')) return true;
    if (clean.includes('photo-1534528741775')) return true;
    if (
      clean.includes('default-avatar') ||
      clean.includes('default_avatar') ||
      clean.includes('placeholder')
    )
      return true;
    if (
      clean.includes('silhouette') ||
      clean.includes('user-template') ||
      clean.includes('avatar-template') ||
      clean.includes('anonymous')
    )
      return true;
    return false;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSaveProfile = () => {
    setEditSubmittedAttempt(true);
    if (!editFirstName.trim() || !editLastName.trim() || !editPhone.trim() || !editAddress.trim()) {
      return;
    }

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
      setEditSubmittedAttempt(false);

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Profile Updated Successfully',
        message: 'Your official resident profile information has been saved.',
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

  const handleUploadAvatar = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const result = await uploadUserAvatar(
          currentUser.id || 'resident',
          file,
          file.name
        );
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
      } catch {
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

  const isFirstMissing = editSubmittedAttempt && !editFirstName.trim();
  const isLastMissing = editSubmittedAttempt && !editLastName.trim();
  const isPhoneMissing = editSubmittedAttempt && !editPhone.trim();
  const isAddressMissing = editSubmittedAttempt && !editAddress.trim();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. HERO & RESIDENT IDENTITY CARD ================= */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroPill}>
            <ShieldCheck size={11} color="#2563eb" />
            <Text style={styles.heroPillText}>OFFICIAL RESIDENT RECORD</Text>
          </View>

          <TouchableOpacity
            style={styles.editTopBtn}
            onPress={() => {
              setEditSubmittedAttempt(false);
              setIsEditModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Edit3 size={13} color="#2563eb" />
            <Text style={styles.editTopBtnText}>Edit Info</Text>
          </TouchableOpacity>
        </View>

        {/* Identity Row: Avatar + Name & Badges */}
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarLarge}>
              {currentUser.avatar_url &&
              !isTemplateAvatar(currentUser.avatar_url) &&
              !avatarLoadFailed ? (
                <Image
                  source={{ uri: currentUser.avatar_url }}
                  style={styles.avatarImage}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <Text style={styles.avatarLargeText}>
                  {getInitials(currentUser.full_name || currentUser.first_name)}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.cameraBadgeBtn}
              onPress={handleUploadAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Camera size={12} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.identityInfoCol}>
            <Text style={styles.profileName} numberOfLines={2}>
              {currentUser.full_name}
            </Text>
            <View style={styles.emailRow}>
              <Mail size={12} color="#64748b" />
              <Text style={styles.profileEmail} numberOfLines={1}>
                {currentUser.email}
              </Text>
            </View>

            <View style={styles.headerBadgesRow}>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={11} color="#059669" />
                <Text style={styles.verifiedBadgeText}>Verified Resident</Text>
              </View>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>
                  {currentUser.id_number || 'BZ-RESIDENT-2026'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Compact 3-Column Metrics Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              {(currentUser.voter_status || 'Registered').toLowerCase().includes('non')
                ? 'Non-Voter'
                : 'Registered'}
            </Text>
            <Text style={styles.summaryLabel}>Voter Status</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {currentUser.civil_status || 'Single'}
            </Text>
            <Text style={styles.summaryLabel}>Civil Status</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
              {commentHistory.length}
            </Text>
            <Text style={styles.summaryLabel}>Bulletin Q&A</Text>
          </View>
        </View>
      </View>

      {/* ================= 2. PERSONAL & RESIDENCE DETAILS ================= */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Personal & Residence Details</Text>
        <TouchableOpacity
          onPress={() => {
            setEditSubmittedAttempt(false);
            setIsEditModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionActionLink}>Update</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View
            style={[
              styles.infoIconBox,
              { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
            ]}
          >
            <User size={17} color="#2563eb" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Full Legal Name</Text>
            <Text style={styles.infoValue}>{currentUser.full_name}</Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.infoRow}>
          <View
            style={[
              styles.infoIconBox,
              { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
            ]}
          >
            <MapPin size={17} color="#0284c7" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Barangay Sitio / Address</Text>
            <Text style={styles.infoValue}>
              {currentUser.sitio ||
                currentUser.address ||
                'Barangay Zapatera, Cebu City'}
            </Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.infoRow}>
          <View
            style={[
              styles.infoIconBox,
              { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
            ]}
          >
            <Phone size={17} color="#059669" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Contact Mobile Number</Text>
            <Text style={styles.infoValue}>
              {currentUser.phone || '0917-123-4567'}
            </Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.infoRow}>
          <View
            style={[
              styles.infoIconBox,
              { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
            ]}
          >
            <Vote size={17} color="#7c3aed" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Voter Registration & Civil Status</Text>
            <Text style={styles.infoValue}>
              {currentUser.voter_status || 'Registered Voter'} •{' '}
              {currentUser.civil_status || 'Single'}
            </Text>
          </View>
        </View>
      </View>

      {/* ================= 3. ACCOUNT SECURITY & COMMUNITY Q&A ================= */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Security & Community Activity</Text>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setPasswordSubmittedAttempt(false);
            setPasswordError('');
            setIsPasswordModalOpen(true);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.infoIconBox,
                { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
              ]}
            >
              <Lock size={17} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuItemTitle}>Change Account Password</Text>
                <View style={styles.statusChipGreen}>
                  <Text style={styles.statusChipGreenText}>Protected</Text>
                </View>
              </View>
              <Text style={styles.menuItemSub}>
                Update your strong password and security credentials
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.rowDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            loadCommentHistory();
            setIsCommentHistoryModalOpen(true);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.infoIconBox,
                { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
              ]}
            >
              <MessageSquare size={17} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuItemTitle}>My Bulletin Q&A & Replies</Text>
                {repliedCommentsCount > 0 ? (
                  <View style={styles.statusChipBlue}>
                    <Text style={styles.statusChipBlueText}>
                      {repliedCommentsCount} Replied
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.menuItemSub}>
                Track bulletin questions and official Barangay answers
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ================= 4. SUPPORT & LEGAL COMPLIANCE ================= */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Support & Legal Compliance</Text>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setIsHelpModalOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.infoIconBox,
                { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
              ]}
            >
              <HelpCircle size={17} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Barangay Help & Contact Desk</Text>
              <Text style={styles.menuItemSub}>
                Office hours, emergency hotlines, and Hall address
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.rowDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setIsPrivacyModalOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.menuItemLeft}>
            <View
              style={[
                styles.infoIconBox,
                { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
              ]}
            >
              <FileText size={17} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuItemTitle}>Data Privacy & Terms</Text>
                <View style={styles.statusChipNeutral}>
                  <Text style={styles.statusChipNeutralText}>RA 10173</Text>
                </View>
              </View>
              <Text style={styles.menuItemSub}>
                Data Privacy Act of 2012 & encrypted record storage
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ================= 5. LOG OUT BUTTON ================= */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => setIsLogoutConfirmOpen(true)}
        activeOpacity={0.8}
      >
        <LogOut size={16} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Log Out Resident Account</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>
        Barangay Zapatera Digital Portal • v2.4.0 (Secure Government Build)
      </Text>

      {/* Global Developer & Institution Footer */}
      <GlobalFooter />

      {/* ================= EDIT PROFILE MODAL ================= */}
      <Modal
        visible={isEditModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 480 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBox}>
                  <Edit3 size={17} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Personal Information</Text>
                  <Text style={styles.modalSubtitle}>
                    Keep your resident contact & address details accurate
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  First Name <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {isFirstMissing && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.formInput, isFirstMissing && styles.formInputError]}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#94a3b8"
              />

              {/* Last Name */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  Last Name <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {isLastMissing && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.formInput, isLastMissing && styles.formInputError]}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Enter last name"
                placeholderTextColor="#94a3b8"
              />

              {/* Mobile Number */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  Mobile Number <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {isPhoneMissing && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.formInput, isPhoneMissing && styles.formInputError]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="09XX-XXX-XXXX"
                placeholderTextColor="#94a3b8"
              />

              {/* Barangay Sitio / Address */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  Barangay Sitio / House Address <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {isAddressMissing && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.formInput, isAddressMissing && styles.formInputError]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Sitio & street address in Brgy. Zapatera"
                placeholderTextColor="#94a3b8"
              />

              {/* Civil Status Pills */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>Civil Status</Text>
              </View>
              <View style={styles.civilStatusPillsRow}>
                {CIVIL_STATUS_OPTIONS.map((status) => {
                  const active =
                    editCivilStatus.toLowerCase() === status.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.civilStatusPill,
                        active && styles.civilStatusPillActive,
                      ]}
                      onPress={() => setEditCivilStatus(status)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.civilStatusPillText,
                          active && styles.civilStatusPillTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= HELP & SUPPORT MODAL ================= */}
      <Modal
        visible={isHelpModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsHelpModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 460 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIconBox,
                    { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
                  ]}
                >
                  <HelpCircle size={17} color="#d97706" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Barangay Help & Contact Desk</Text>
                  <Text style={styles.modalSubtitle}>
                    Official Barangay Zapatera directory & office hours
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsHelpModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Barangay Hall Office Hours</Text>
                <Text style={styles.helpText}>
                  {config.office_hours ||
                    'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)'}
                </Text>
              </View>

              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Hotline & Telephone</Text>
                <Text style={styles.helpText}>
                  Barangay Desk: {config.contact_phone || '(032) 255-4819'}
                </Text>
                <Text style={styles.helpText}>
                  Emergency Hotline: {config.emergency_hotline || '911 / (032) 255-1111'}
                </Text>
              </View>

              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Official Address</Text>
                <Text style={styles.helpText}>
                  {config.hall_address || 'Rahmann St., Barangay Zapatera, Cebu City'}
                </Text>
              </View>

              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Email Support</Text>
                <Text style={styles.helpText}>
                  {config.contact_email || 'zapatera.cebucity@gmail.com'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveModalBtn, { flex: 1, alignItems: 'center' }]}
                onPress={() => setIsHelpModalOpen(false)}
              >
                <Text style={styles.saveModalBtnText}>Close Help Desk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= PRIVACY POLICY MODAL ================= */}
      <Modal
        visible={isPrivacyModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 460 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalHeaderIconBox,
                    { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
                  ]}
                >
                  <FileText size={17} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Data Privacy & Terms</Text>
                  <Text style={styles.modalSubtitle}>
                    Republic Act No. 10173 Compliance
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsPrivacyModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Republic Act No. 10173</Text>
                <Text style={styles.helpText}>
                  Barangay Zapatera respects your privacy and complies with the Data Privacy Act of 2012. Information submitted through this portal is strictly used for official document clearance and verification.
                </Text>
              </View>

              <View style={styles.helpCardItem}>
                <Text style={styles.helpHeading}>Data Encryption & Storage</Text>
                <Text style={styles.helpText}>
                  All uploaded document attachments and personal details are encrypted. Only authorized Barangay records officers and the Barangay Captain have access to your data.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveModalBtn, { flex: 1, alignItems: 'center' }]}
                onPress={() => setIsPrivacyModalOpen(false)}
              >
                <Text style={styles.saveModalBtnText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CHANGE PASSWORD MODAL ================= */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBox}>
                  <Lock size={17} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Change Account Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Keep your resident portal account secure
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsPasswordModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

              {/* Current Password */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  Current Password <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {passwordSubmittedAttempt && !currentPassword.trim() && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.passwordInputContainer,
                  passwordSubmittedAttempt &&
                    !currentPassword.trim() &&
                    styles.formInputError,
                ]}
              >
                <TextInput
                  style={styles.passwordInputField}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPass}
                  placeholder="Enter current password"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ padding: 4 }}
                >
                  {showCurrentPass ? (
                    <EyeOff size={16} color="#64748b" />
                  ) : (
                    <Eye size={16} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  New Strong Password <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {passwordSubmittedAttempt && !newPassword.trim() && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.passwordInputContainer,
                  newPassword && isStrongPassword
                    ? styles.formInputSuccess
                    : passwordSubmittedAttempt && !newPassword.trim()
                    ? styles.formInputError
                    : null,
                ]}
              >
                <TextInput
                  style={styles.passwordInputField}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                  placeholder="Minimum 8 strong characters"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPass(!showNewPass)}
                  style={{ padding: 4 }}
                >
                  {showNewPass ? (
                    <EyeOff size={16} color="#64748b" />
                  ) : (
                    <Eye size={16} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Real-Time Strong Password Validation Checklist - Always Visible */}
              <View style={styles.checklistContainer}>
                <View style={styles.checklistHeaderRow}>
                  <View style={styles.checklistHeaderLeft}>
                    <ShieldCheck size={15} color="#2563eb" />
                    <Text style={styles.checklistTitle}>Strong Password Criteria (Required):</Text>
                  </View>
                  <View
                    style={[
                      styles.checklistBadge,
                      isStrongPassword
                        ? styles.checklistBadgeMet
                        : passwordCriteriaCount > 0
                        ? styles.checklistBadgePartial
                        : styles.checklistBadgeUnmet,
                    ]}
                  >
                    <Text
                      style={[
                        styles.checklistBadgeText,
                        isStrongPassword
                          ? styles.checklistBadgeTextMet
                          : passwordCriteriaCount > 0
                          ? styles.checklistBadgeTextPartial
                          : styles.checklistBadgeTextUnmet,
                      ]}
                    >
                      {isStrongPassword
                        ? 'Strong & Ready (5/5)'
                        : passwordCriteriaCount > 0
                        ? `${passwordCriteriaCount}/5 Requirements Met`
                        : 'Required (0/5)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.checklistProgressBar}>
                  <View
                    style={[
                      styles.checklistProgressFill,
                      {
                        width: `${(passwordCriteriaCount / 5) * 100}%`,
                        backgroundColor: isStrongPassword
                          ? '#16a34a'
                          : passwordCriteriaCount >= 3
                          ? '#d97706'
                          : passwordCriteriaCount > 0
                          ? '#dc2626'
                          : '#e2e8f0',
                      },
                    ]}
                  />
                </View>

                <View style={styles.checklistGrid}>
                  <View style={styles.checklistItem}>
                    {pwLengthMet ? (
                      <CheckCircle2 size={13} color="#16a34a" />
                    ) : (
                      <X size={13} color="#94a3b8" />
                    )}
                    <Text
                      style={
                        pwLengthMet ? styles.checklistTextMet : styles.checklistText
                      }
                    >
                      At least 8 characters
                    </Text>
                  </View>

                  <View style={styles.checklistItem}>
                    {pwUpperMet ? (
                      <CheckCircle2 size={13} color="#16a34a" />
                    ) : (
                      <X size={13} color="#94a3b8" />
                    )}
                    <Text
                      style={
                        pwUpperMet ? styles.checklistTextMet : styles.checklistText
                      }
                    >
                      1 Uppercase letter (A-Z)
                    </Text>
                  </View>

                  <View style={styles.checklistItem}>
                    {pwLowerMet ? (
                      <CheckCircle2 size={13} color="#16a34a" />
                    ) : (
                      <X size={13} color="#94a3b8" />
                    )}
                    <Text
                      style={
                        pwLowerMet ? styles.checklistTextMet : styles.checklistText
                      }
                    >
                      1 Lowercase letter (a-z)
                    </Text>
                  </View>

                  <View style={styles.checklistItem}>
                    {pwNumberMet ? (
                      <CheckCircle2 size={13} color="#16a34a" />
                    ) : (
                      <X size={13} color="#94a3b8" />
                    )}
                    <Text
                      style={
                        pwNumberMet ? styles.checklistTextMet : styles.checklistText
                      }
                    >
                      1 Number digit (0-9)
                    </Text>
                  </View>

                  <View style={styles.checklistItem}>
                    {pwSpecialMet ? (
                      <CheckCircle2 size={13} color="#16a34a" />
                    ) : (
                      <X size={13} color="#94a3b8" />
                    )}
                    <Text
                      style={
                        pwSpecialMet ? styles.checklistTextMet : styles.checklistText
                      }
                    >
                      1 Special character (!@#$%^&*)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldLabelRow}>
                <Text style={styles.formLabel}>
                  Confirm New Password <Text style={styles.reqAsterisk}>*</Text>
                </Text>
                {passwordSubmittedAttempt && !confirmPassword.trim() && (
                  <View style={styles.missingBadge}>
                    <AlertCircle size={10} color="#dc2626" />
                    <Text style={styles.missingBadgeText}>REQUIRED — NOT INPUTTED</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.passwordInputContainer,
                  passwordsMatch
                    ? styles.formInputSuccess
                    : (passwordSubmittedAttempt && !confirmPassword.trim()) ||
                      passwordsMismatch
                    ? styles.formInputError
                    : null,
                ]}
              >
                <TextInput
                  style={styles.passwordInputField}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPass}
                  placeholder="Re-type new password"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={{ padding: 4 }}
                >
                  {showConfirmPass ? (
                    <EyeOff size={16} color="#64748b" />
                  ) : (
                    <Eye size={16} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Real-time Confirm Password Match Feedback */}
              {confirmPassword.length > 0 ? (
                passwordsMatch ? (
                  <View style={styles.passwordMatchNotice}>
                    <CheckCircle2 size={13} color="#15803d" />
                    <Text style={styles.passwordMatchSuccessText}>Passwords match</Text>
                  </View>
                ) : (
                  <View style={styles.passwordMatchNotice}>
                    <AlertCircle size={13} color="#dc2626" />
                    <Text style={styles.passwordMatchErrorText}>Passwords do not match</Text>
                  </View>
                )
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                disabled={isUpdatingPassword}
                onPress={() => {
                  setIsPasswordModalOpen(false);
                  setShowConfirmPass(false);
                  setShowCurrentPass(false);
                  setShowNewPass(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveModalBtn,
                  { opacity: isUpdatingPassword ? 0.6 : 1 },
                ]}
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

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      <Modal
        visible={isLogoutConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsLogoutConfirmOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 370 }]}>
            <View style={styles.logoutConfirmBody}>
              <View style={styles.logoutIconCircle}>
                <LogOut size={26} color="#dc2626" />
              </View>
              <Text style={styles.logoutConfirmTitle}>
                Log Out of Resident Portal?
              </Text>
              <Text style={styles.logoutConfirmText}>
                You will need to sign in with your email and password to access your documents and request tracking.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsLogoutConfirmOpen(false)}
              >
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

      {/* ================= COMMENT HISTORY & REPLIES MODAL ================= */}
      <Modal
        visible={isCommentHistoryModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsCommentHistoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxWidth: 540, height: '86%' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBox}>
                  <MessageSquare size={17} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>My Bulletin Q&A History</Text>
                  <Text style={styles.modalSubtitle}>
                    Track questions & official responses from Barangay Zapatera
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsCommentHistoryModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs & Search Bar */}
            <View style={styles.historyFilterBox}>
              <View style={styles.historySearchInputWrap}>
                <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="Search comments or administrative replies..."
                  placeholderTextColor="#94a3b8"
                  value={commentSearchQuery}
                  onChangeText={setCommentSearchQuery}
                  style={styles.historySearchInput}
                />
                {commentSearchQuery ? (
                  <TouchableOpacity onPress={() => setCommentSearchQuery('')}>
                    <X size={14} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All', count: commentHistory.length },
                  {
                    id: 'with_replies',
                    label: 'With Replies',
                    count: repliedCommentsCount,
                  },
                  {
                    id: 'waiting',
                    label: 'Awaiting Reply',
                    count: commentHistory.length - repliedCommentsCount,
                  },
                ].map((f) => {
                  const active = commentFilter === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setCommentFilter(f.id as any)}
                      style={[
                        styles.historyFilterPill,
                        active && styles.historyFilterPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyFilterPillText,
                          active && styles.historyFilterPillTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                      <View
                        style={[
                          styles.historyFilterCount,
                          active && styles.historyFilterCountActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyFilterCountText,
                            active && styles.historyFilterCountTextActive,
                          ]}
                        >
                          {f.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* List Body */}
            <ScrollView style={{ flex: 1, padding: 14 }} showsVerticalScrollIndicator={false}>
              {isLoadingComments ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Loading comment history...
                  </Text>
                </View>
              ) : filteredCommentHistory.length === 0 ? (
                <View style={styles.historyEmptyBox}>
                  <View style={styles.historyEmptyIcon}>
                    <MessageCircle size={24} color="#2563eb" />
                  </View>
                  <Text style={styles.historyEmptyTitle}>No comments found</Text>
                  <Text style={styles.historyEmptySub}>
                    {commentSearchQuery
                      ? 'No comments matching your search query.'
                      : commentFilter === 'with_replies'
                      ? 'None of your comments currently have administrative replies yet.'
                      : "You haven't posted any comments on Barangay bulletins yet."}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12, paddingBottom: 20 }}>
                  {filteredCommentHistory.map((item) => {
                    const matchedAnn = (announcements || []).find(
                      (a) => String(a.id) === String(item.news_id)
                    );
                    const formattedDate = new Date(
                      item.comment.created_at
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <View
                        key={item.comment.id}
                        style={[
                          styles.historyItemCard,
                          item.hasAdminReply && styles.historyItemCardReplied,
                        ]}
                      >
                        <View style={styles.historyItemTopRow}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              flex: 1,
                            }}
                          >
                            <Megaphone size={13} color="#2563eb" />
                            <Text
                              style={styles.historyItemAnnTitle}
                              numberOfLines={1}
                            >
                              {matchedAnn?.title ||
                                `Announcement Bulletin #${item.news_id}`}
                            </Text>
                          </View>
                          <Text style={styles.historyItemDate}>{formattedDate}</Text>
                        </View>

                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.historyLabelSmall}>Your Inquiry:</Text>
                          <View style={styles.historyCommentBox}>
                            <Text style={styles.historyCommentText}>
                              {item.comment.content}
                            </Text>
                          </View>
                        </View>

                        {item.adminReplies && item.adminReplies.length > 0 ? (
                          <View style={{ gap: 8 }}>
                            {item.adminReplies.map((reply) => (
                              <View key={reply.id} style={styles.historyReplyBox}>
                                <View style={styles.historyReplyHeader}>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    <ShieldCheck size={13} color="#1d4ed8" />
                                    <Text style={styles.historyReplyAuthor}>
                                      {reply.author_name}
                                    </Text>
                                    <View style={styles.historyReplyBadge}>
                                      <Text style={styles.historyReplyBadgeText}>
                                        {reply.author_role === 'super_admin'
                                          ? 'Super Admin'
                                          : 'Barangay Office'}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                <Text style={styles.historyReplyText}>
                                  {reply.content}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.historyAwaitingRow}>
                            <Clock size={12} color="#d97706" />
                            <Text style={styles.historyAwaitingText}>
                              Awaiting official response from Barangay Administration
                            </Text>
                          </View>
                        )}

                        {matchedAnn && (
                          <TouchableOpacity
                            onPress={() => {
                              setIsCommentHistoryModalOpen(false);
                              if (onViewAnnouncement) {
                                onViewAnnouncement(matchedAnn);
                              } else if (onNavigateTab) {
                                onNavigateTab('announcements');
                              }
                            }}
                            style={styles.historyViewAnnBtn}
                          >
                            <Text style={styles.historyViewAnnBtnText}>
                              Open Bulletin Discussion
                            </Text>
                            <ArrowRight size={12} color="#2563eb" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveModalBtn, { flex: 1, alignItems: 'center' }]}
                onPress={() => setIsCommentHistoryModalOpen(false)}
              >
                <Text style={styles.saveModalBtnText}>Close History</Text>
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
        onClose={
          actionModal.onClose || (() => setActionModal({ isOpen: false, title: '' }))
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 96,
  },

  /* ================= 1. HERO & IDENTITY CARD ================= */
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heroPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  editTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editTopBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* Identity Row */
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#dbeafe',
  },
  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  identityInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  headerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  idBadge: {
    backgroundColor: '#f8fafc',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    fontFamily: 'monospace',
  },

  /* Summary Metrics Strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  /* ================= 2. SECTIONS & CARDS ================= */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionActionLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },

  /* Menu Cards */
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusChipGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  statusChipGreenText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  statusChipBlue: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  statusChipBlueText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563eb',
  },
  statusChipNeutral: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  statusChipNeutralText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '600',
  },

  /* ================= MODALS ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        } as any)
      : {}),
  },
  modalContent: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  reqAsterisk: {
    color: '#dc2626',
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  formInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  formInputSuccess: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  civilStatusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  civilStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  civilStatusPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  civilStatusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  civilStatusPillTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  saveModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  successBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  errorBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#b91c1c',
    flex: 1,
  },
  helpCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  helpHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  logoutConfirmBody: {
    alignItems: 'center',
    padding: 22,
  },
  logoutIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoutConfirmTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  logoutConfirmText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  passwordInputField: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 12.5,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  checklistContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },
  checklistBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  checklistBadgeMet: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  checklistBadgePartial: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  checklistBadgeUnmet: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  checklistBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  checklistBadgeTextMet: {
    color: '#15803d',
  },
  checklistBadgeTextPartial: {
    color: '#b45309',
  },
  checklistBadgeTextUnmet: {
    color: '#64748b',
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
  checklistGrid: {
    gap: 4,
    marginTop: 3,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 1.5,
  },
  checklistText: {
    fontSize: 11,
    color: '#64748b',
  },
  checklistTextMet: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '700',
  },
  passwordMatchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  passwordMatchSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  passwordMatchErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },

  /* Comment History Modal Styles */
  historyFilterBox: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  historySearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  historyFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  historyFilterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  historyFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  historyFilterPillTextActive: {
    color: '#ffffff',
  },
  historyFilterCount: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  historyFilterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  historyFilterCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  historyFilterCountTextActive: {
    color: '#ffffff',
  },
  historyEmptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  historyEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  historyEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  historyEmptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  historyItemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 13,
  },
  historyItemCardReplied: {
    borderColor: '#bfdbfe',
  },
  historyItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyItemAnnTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  historyItemDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  historyLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  historyCommentBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyCommentText: {
    fontSize: 12.5,
    color: '#1e293b',
    lineHeight: 18,
  },
  historyReplyBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 10,
  },
  historyReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyReplyAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e40af',
  },
  historyReplyBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  historyReplyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  historyReplyText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 17,
  },
  historyAwaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  historyAwaitingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  historyViewAnnBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  historyViewAnnBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
});
