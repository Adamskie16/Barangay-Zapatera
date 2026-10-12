// Resident/src/components/InactivityNoticeModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {
  Clock,
  ShieldCheck,
  Building2,
  X,
  MapPin,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

export interface InactivityNoticeModalProps {
  visible: boolean;
  message?: string;
  onClose: () => void;
  onLoginAgain?: () => void;
}

export default function InactivityNoticeModal({
  visible,
  message,
  onClose,
  onLoginAgain,
}: InactivityNoticeModalProps) {
  if (!visible) return null;

  const handleAction = () => {
    onClose();
    if (onLoginAgain) {
      onLoginAgain();
    }
  };

  const displayMessage =
    message ||
    'Notice: For your account privacy and security, your session was closed due to inactivity. Your resident account is safe, active, and has NOT been deleted.';

  // =========================================================================
  // WEB PLATFORM: Direct DOM rendering with 100% INLINE STYLES
  // =========================================================================
  if (Platform.OS === 'web') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '16px',
          boxSizing: 'border-box',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
        onClick={handleAction}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '470px',
            padding: '34px 28px 26px 28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(226, 232, 240, 0.9)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top colored accent indicator - civic theme blue */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #1e40af, #3b82f6, #2563eb)',
            }}
          />

          {/* Close X Button in top right */}
          <button
            type="button"
            onClick={handleAction}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <X size={18} />
          </button>

          {/* Central Halo with glowing ring */}
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '38px',
              backgroundColor: '#eff6ff',
              border: '2px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Clock size={36} color="#1d4ed8" />
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'inline-block',
              padding: '5px 14px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '12px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
            }}
          >
            SESSION TIMED OUT
          </div>

          {/* Title & Subtitle */}
          <h3
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
              lineHeight: 1.25,
            }}
          >
            Session Expired (Inactivity)
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 18px 0',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            Barangay Zapatera Automated Security Guard
          </p>

          {/* Notice Callout Box */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderLeft: '5px solid #2563eb',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '14px',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#1e3a8a',
                fontWeight: 600,
                margin: 0,
              }}
            >
              {displayMessage}
            </p>
          </div>

          {/* Important Account Status Reassurance Card */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#166534',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#15803d',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <ShieldCheck size={17} color="#16a34a" />
              <span>Your Account Remains Active & Safe</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5, color: '#14532d', fontSize: '12px' }}>
              Your account has <strong>NOT been deleted</strong>. All of your personal documents, pending applications, and submitted requests remain safe in the barangay system.
            </p>
          </div>

          {/* Administration Contact Info */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '11.5px',
              color: '#475569',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Building2 size={14} color="#475569" />
              <span>Barangay Zapatera Administration Office</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#64748b',
                marginTop: '3px',
              }}
            >
              <MapPin size={12} color="#64748b" />
              <span>Rahmann St., Barangay Zapatera, Cebu City</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#64748b',
                marginTop: '3px',
              }}
            >
              <Clock size={12} color="#64748b" />
              <span>Monday – Friday, 8:00 AM – 5:00 PM</span>
            </div>
          </div>

          {/* Action Button: Return to Login */}
          <button
            type="button"
            onClick={handleAction}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1e40af, #2563eb)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxSizing: 'border-box',
            }}
          >
            <LogIn size={17} />
            <span>Acknowledge & Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // NATIVE MOBILE PLATFORM: Render React Native Modal
  // =========================================================================
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleAction}
    >
      <Pressable style={styles.overlay} onPress={handleAction}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {/* Top accent bar */}
          <View style={styles.topAccentBar} />

          {/* Close X Button in top right */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleAction}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Central Security Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconHalo}>
              <View style={styles.iconCore}>
                <Clock size={32} color="#1d4ed8" />
              </View>
            </View>
          </View>

          {/* Pill Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SESSION TIMED OUT</Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.modalTitle}>Session Expired (Inactivity)</Text>
          <Text style={styles.modalSubtitle}>Barangay Zapatera Automated Security Guard</Text>

          {/* Notice Callout Box */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{displayMessage}</Text>
          </View>

          {/* Important Account Status Reassurance Card */}
          <View style={styles.reassuranceBox}>
            <View style={styles.reassuranceHeader}>
              <ShieldCheck size={16} color="#16a34a" />
              <Text style={styles.reassuranceTitle}>Your Account Remains Active & Safe</Text>
            </View>
            <Text style={styles.reassuranceText}>
              Your account has NOT been deleted. All submitted documents and personal details remain securely saved.
            </Text>
          </View>

          {/* Guidance Information Section */}
          <View style={styles.guidanceBox}>
            <View style={styles.guidanceHeader}>
              <Building2 size={14} color="#475569" />
              <Text style={styles.guidanceTitle}>Barangay Zapatera Administration</Text>
            </View>
            <View style={styles.guidanceRow}>
              <MapPin size={12} color="#64748b" />
              <Text style={styles.guidanceDetail}>Rahmann St., Barangay Zapatera, Cebu City</Text>
            </View>
            <View style={styles.guidanceRow}>
              <Clock size={12} color="#64748b" />
              <Text style={styles.guidanceDetail}>Monday – Friday, 8:00 AM – 5:00 PM</Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAction}
              activeOpacity={0.85}
            >
              <LogIn size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Acknowledge & Sign In</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#2563eb',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginBottom: 12,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#1e40af',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  noticeBox: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderLeftWidth: 5,
    borderLeftColor: '#2563eb',
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  reassuranceBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  reassuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reassuranceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803d',
  },
  reassuranceText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#14532d',
  },
  guidanceBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  guidanceDetail: {
    fontSize: 11,
    color: '#64748b',
  },
  actionContainer: {
    width: '100%',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#1e40af',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
