// Resident/src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
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
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatar_url]);

  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
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

        {/* User Profile Avatar */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onOpenProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {currentUser.avatar_url && !avatarError ? (
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
    elevation: 2,
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
