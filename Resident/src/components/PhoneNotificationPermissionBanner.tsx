// Resident/src/components/PhoneNotificationPermissionBanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, Smartphone, X, CheckCircle2 } from 'lucide-react';
import {
  getNotificationPermissionStatus,
  requestPhoneNotificationPermission,
  NotificationPermissionStatus,
} from '../core/phoneNotification';

interface PhoneNotificationPermissionBannerProps {
  onPermissionChanged?: (granted: boolean) => void;
}

export default function PhoneNotificationPermissionBanner({
  onPermissionChanged,
}: PhoneNotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('granted');
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isEnabling, setIsEnabling] = useState<boolean>(false);
  const [justEnabled, setJustEnabled] = useState<boolean>(false);

  useEffect(() => {
    const status = getNotificationPermissionStatus();
    setPermission(status);

    const dismissedInSession = sessionStorage.getItem('zapatera_phone_notif_banner_dismissed') === 'true';
    if (status === 'default' && !dismissedInSession) {
      setIsDismissed(false);
    }

    const handlePermChange = (e: any) => {
      const newStatus = e.detail?.permission || getNotificationPermissionStatus();
      setPermission(newStatus);
      if (newStatus === 'granted') {
        setIsDismissed(true);
      }
    };

    window.addEventListener('zapatera_notification_permission_changed', handlePermChange);
    return () => {
      window.removeEventListener('zapatera_notification_permission_changed', handlePermChange);
    };
  }, []);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const granted = await requestPhoneNotificationPermission();
      if (granted) {
        setJustEnabled(true);
        onPermissionChanged?.(true);
        setTimeout(() => {
          setIsDismissed(true);
        }, 3000);
      } else {
        setIsDismissed(true);
        sessionStorage.setItem('zapatera_phone_notif_banner_dismissed', 'true');
        onPermissionChanged?.(false);
      }
    } catch {
      setIsDismissed(true);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('zapatera_phone_notif_banner_dismissed', 'true');
  };

  if (isDismissed || permission !== 'default') {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerCard}>
        <View style={styles.iconCircle}>
          {justEnabled ? (
            <CheckCircle2 size={20} color="#22c55e" />
          ) : (
            <Smartphone size={20} color="#3b82f6" />
          )}
        </View>

        <View style={styles.contentCol}>
          <Text style={styles.bannerTitle}>
            {justEnabled ? 'Notifications Enabled!' : 'Enable Cellphone Notifications'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {justEnabled
              ? 'You will now receive instant alerts on your phone for all published bulletins.'
              : 'Get notified immediately on your phone when Barangay Zapatera publishes official announcements and emergency advisories.'}
          </Text>
        </View>

        {!justEnabled && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.enableBtn, isEnabling && styles.btnDisabled]}
              onPress={handleEnable}
              disabled={isEnabling}
              activeOpacity={0.8}
            >
              <Bell size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.enableBtnText}>
                {isEnabling ? 'Enabling...' : 'Turn On'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 900,
  },
  bannerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enableBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  enableBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
});
