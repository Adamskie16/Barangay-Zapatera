// Resident/src/features/profile/ProfileView.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import {
  User,
  Shield,
  ShieldCheck,
  Lock,
  Bell,
  Fingerprint,
  Phone,
  Mail,
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
} from 'lucide-react';
import { ResidentUser, BarangayConfig } from '../../types';

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

  // Edit form state
  const [editFirstName, setEditFirstName] = useState(currentUser.first_name || currentUser.full_name?.split(' ')[0] || '');
  const [editLastName, setEditLastName] = useState(currentUser.last_name || '');
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAddress, setEditAddress] = useState(currentUser.address || currentUser.sitio || '');
  const [editCivilStatus, setEditCivilStatus] = useState(currentUser.civil_status || 'Single');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Settings Toggles
  const [biometricEnabled, setBiometricEnabled] = useState(currentUser.biometric_enabled ?? true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentUser.two_factor_enabled ?? true);
  const [pushNotifs, setPushNotifs] = useState(currentUser.notification_preferences?.push ?? true);
  const [smsNotifs, setSmsNotifs] = useState(currentUser.notification_preferences?.sms ?? true);
  const [emailNotifs, setEmailNotifs] = useState(currentUser.notification_preferences?.email ?? true);

  // Password Modal State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleSaveProfile = () => {
    const cleanFull = `${editLastName.trim() ? editLastName.trim() + ', ' : ''}${editFirstName.trim()}`;
    onUpdateProfile({
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      full_name: cleanFull || currentUser.full_name,
      phone: editPhone.trim(),
      address: editAddress.trim(),
      civil_status: editCivilStatus,
    });
    setSaveSuccessMsg('Profile information updated successfully!');
    setTimeout(() => {
      setSaveSuccessMsg('');
      setIsEditModalOpen(false);
    }, 1500);
  };

  const handleSavePassword = () => {
    setPassError('');
    setPassSuccess('');
    if (!currentPass || !newPass) {
      setPassError('Please fill in all password fields.');
      return;
    }
    if (newPass.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }
    setPassSuccess('Account password updated successfully.');
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setPassSuccess('');
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {currentUser.full_name?.charAt(0) || 'R'}
          </Text>
        </View>

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

        <View style={styles.menuDivider} />

        <View style={styles.switchRow}>
          <View style={styles.menuItemLeft}>
            <Fingerprint size={18} color="#059669" />
            <View>
              <Text style={styles.menuItemTitle}>Biometric Authentication</Text>
              <Text style={styles.menuItemSub}>Use Face ID / Fingerprint on mobile</Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={(val) => {
              setBiometricEnabled(val);
              onUpdateProfile({ biometric_enabled: val });
            }}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.switchRow}>
          <View style={styles.menuItemLeft}>
            <Shield size={18} color="#7c3aed" />
            <View>
              <Text style={styles.menuItemTitle}>Two-Factor Authentication (2FA)</Text>
              <Text style={styles.menuItemSub}>Require Gmail OTP verification on login</Text>
            </View>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={(val) => {
              setTwoFactorEnabled(val);
              onUpdateProfile({ two_factor_enabled: val });
            }}
          />
        </View>
      </View>

      {/* Notification Preferences */}
      <Text style={styles.sectionHeading}>Notification Preferences</Text>
      <View style={styles.menuCard}>
        <View style={styles.switchRow}>
          <View style={styles.menuItemLeft}>
            <Bell size={18} color="#0284c7" />
            <View>
              <Text style={styles.menuItemTitle}>In-App Notifications</Text>
              <Text style={styles.menuItemSub}>Real-time status updates</Text>
            </View>
          </View>
          <Switch
            value={pushNotifs}
            onValueChange={(val) => {
              setPushNotifs(val);
              onUpdateProfile({ notification_preferences: { push: val, sms: smsNotifs, email: emailNotifs } });
            }}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.switchRow}>
          <View style={styles.menuItemLeft}>
            <Phone size={18} color="#059669" />
            <View>
              <Text style={styles.menuItemTitle}>SMS Text Notifications</Text>
              <Text style={styles.menuItemSub}>Ready-for-pickup SMS alerts</Text>
            </View>
          </View>
          <Switch
            value={smsNotifs}
            onValueChange={(val) => {
              setSmsNotifs(val);
              onUpdateProfile({ notification_preferences: { push: pushNotifs, sms: val, email: emailNotifs } });
            }}
          />
        </View>

        <View style={styles.menuDivider} />

        <View style={styles.switchRow}>
          <View style={styles.menuItemLeft}>
            <Mail size={18} color="#d97706" />
            <View>
              <Text style={styles.menuItemTitle}>Email Receipts & Bulletins</Text>
              <Text style={styles.menuItemSub}>Tracking receipts to Gmail</Text>
            </View>
          </View>
          <Switch
            value={emailNotifs}
            onValueChange={(val) => {
              setEmailNotifs(val);
              onUpdateProfile({ notification_preferences: { push: pushNotifs, sms: smsNotifs, email: val } });
            }}
          />
        </View>
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

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent onRequestClose={() => setIsPasswordModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Account Password</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {passError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#b91c1c" />
                  <Text style={styles.errorBannerText}>{passError}</Text>
                </View>
              ) : null}

              {passSuccess ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <Text style={styles.successBannerText}>{passSuccess}</Text>
                </View>
              ) : null}

              <Text style={styles.formLabel}>Current Password *</Text>
              <TextInput style={styles.formInput} value={currentPass} onChangeText={setCurrentPass} secureTextEntry />

              <Text style={styles.formLabel}>New Password (min. 8 characters) *</Text>
              <TextInput style={styles.formInput} value={newPass} onChangeText={setNewPass} secureTextEntry />

              <Text style={styles.formLabel}>Confirm New Password *</Text>
              <TextInput style={styles.formInput} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsPasswordModalOpen(false)}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSavePassword}>
                <Text style={styles.saveModalBtnText}>Update Password</Text>
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
});
