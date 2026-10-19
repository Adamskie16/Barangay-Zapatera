// Resident/src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { Bell, User, LogOut, ShieldCheck } from 'lucide-react';
import { ResidentUser, BarangayConfig } from '../types';

interface NavbarProps {
  currentUser: ResidentUser;
  config: BarangayConfig;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onRequestDocument: () => void;
  onLogout?: () => void;
}

export default function Navbar({
  currentUser,
  config,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenProfile,
  onRequestDocument,
  onLogout,
}: NavbarProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatar_url]);

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

  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName =
    currentUser.full_name ||
    `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() ||
    'Resident User';

  return (
    <>
      <View style={styles.header}>
        {/* Left Branding */}
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: config.seal_url || config.logo_url || '/zapatera_seal.png',
            }}
            style={styles.sealLogo}
          />
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.barangayName}>{(config.barangay_name || 'Barangay Zapatera').toUpperCase()}</Text>
            </View>
            <Text style={styles.portalTagline}>Resident Digital Services</Text>
          </View>
        </View>

        {/* Right Controls */}
        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <Bell size={20} color="#334155" />
            {unreadNotifsCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeText}>{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar Button */}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setIsMenuOpen((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityLabel="Open profile menu"
          >
            <View style={styles.avatar}>
              {currentUser.avatar_url && !isTemplateAvatar(currentUser.avatar_url) && !avatarError ? (
                <Image
                  source={{ uri: currentUser.avatar_url }}
                  style={{ width: 33, height: 33, borderRadius: 16.5 }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(currentUser.first_name || currentUser.full_name)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Dropdown Menu Modal */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <View style={styles.dropdownCard}>
            {/* User Identity Header */}
            <View style={styles.dropdownHeader}>
              <View style={styles.avatarLarge}>
                {currentUser.avatar_url && !isTemplateAvatar(currentUser.avatar_url) && !avatarError ? (
                  <Image
                    source={{ uri: currentUser.avatar_url }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text style={styles.avatarLargeText}>
                    {getInitials(currentUser.first_name || currentUser.full_name)}
                  </Text>
                )}
              </View>
              <View style={styles.dropdownHeaderTextCol}>
                <Text style={styles.dropdownName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.dropdownEmail} numberOfLines={1}>
                  {currentUser.email}
                </Text>
                <View style={styles.roleBadge}>
                  <ShieldCheck size={11} color="#1d4ed8" />
                  <Text style={styles.roleBadgeText}>REGISTERED RESIDENT</Text>
                </View>
              </View>
            </View>

            {/* Menu Action Options */}
            <View style={styles.dropdownActions}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setIsMenuOpen(false);
                  onOpenProfile();
                }}
                activeOpacity={0.7}
              >
                <User size={16} color="#475569" />
                <Text style={styles.dropdownItemText}>My Account Profile</Text>
              </TouchableOpacity>

              {onLogout && (
                <TouchableOpacity
                  style={[styles.dropdownItem, styles.logoutItem]}
                  onPress={() => {
                    setIsMenuOpen(false);
                    setIsLogoutConfirmOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <LogOut size={16} color="#dc2626" />
                  <Text style={styles.logoutItemText}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={isLogoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLogoutConfirmOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconCircle}>
              <LogOut size={26} color="#dc2626" />
            </View>
            <Text style={styles.confirmTitle}>Confirm Sign Out</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to sign out of your resident account? You will need your credentials to log back in.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsLogoutConfirmOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setIsLogoutConfirmOpen(false);
                  if (onLogout) onLogout();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmLogoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 1000,
    position: (Platform.OS === 'web' ? 'sticky' : 'relative') as any,
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sealLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barangayName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  portalTagline: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  avatarButton: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Dropdown Styles */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 62,
    paddingRight: 16,
  },
  dropdownCard: {
    width: 280,
    maxWidth: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  dropdownHeaderTextCol: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.3,
  },
  dropdownActions: {
    marginTop: 8,
    gap: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  logoutItem: {
    backgroundColor: '#fef2f2',
    marginTop: 4,
  },
  logoutItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },

  /* Confirm Dialog */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  confirmText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmLogoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

