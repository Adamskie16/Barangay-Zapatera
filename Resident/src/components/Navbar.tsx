// Resident/src/components/Navbar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Bell, Plus, ShieldCheck } from 'lucide-react';
import { ResidentUser, BarangayConfig } from '../types';

interface NavbarProps {
  currentUser: ResidentUser;
  config: BarangayConfig;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onRequestDocument: () => void;
}

export default function Navbar({
  currentUser,
  config,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenProfile,
  onRequestDocument,
}: NavbarProps) {
  return (
    <View style={styles.header}>
      {/* Left Branding */}
      <View style={styles.headerLeft}>
        <Image
          source={{
            uri: config.seal_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
          }}
          style={styles.sealLogo}
        />
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.barangayName}>{config.barangay_name.toUpperCase()}</Text>
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

        {/* User Profile Avatar */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onOpenProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser.first_name?.charAt(0) || currentUser.full_name?.charAt(0) || 'R'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
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
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
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
});
