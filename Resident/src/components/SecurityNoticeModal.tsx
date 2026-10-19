// Resident/src/components/SecurityNoticeModal.tsx
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
  ShieldAlert,
  Lock,
  Building2,
  Unlock,
  X,
  Clock,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export interface SecurityNoticeModalProps {
  visible: boolean;
  type?: 'deleted' | 'locked' | 'inactive' | 'idle' | 'session_timeout';
  title?: string;
  message?: string;
  onClose: () => void;
  onUnlock?: () => void;
}

export default function SecurityNoticeModal({
  visible,
  type = 'deleted',
  title,
  message,
  onClose,
  onUnlock,
}: SecurityNoticeModalProps) {
  if (!visible) return null;

  const isLocked = type === 'locked';
  const isInactive = type === 'inactive';
  const isIdle =
    type === 'idle' ||
    type === 'session_timeout' ||
    Boolean(message?.toLowerCase().includes('inactivity')) ||
    Boolean(message?.toLowerCase().includes('session'));

  const defaultTitle = isIdle
    ? 'Session Expired (Inactivity)'
    : isLocked
    ? 'Account Security Lockout'
    : isInactive
    ? 'Account Deactivated'
    : 'Account Deleted';

  const defaultBadge = isIdle
    ? 'SESSION TIMED OUT'
    : isLocked
    ? 'SECURITY LOCKOUT'
    : isInactive
    ? 'ACCESS DEACTIVATED'
    : 'ACCOUNT DELETED';

  const defaultSubtitle = isIdle
    ? 'Barangay Zapatera Automated Security Guard'
    : isLocked
    ? 'Security protection protocol has been triggered'
    : 'Official notice from Barangay Zapatera Administration';

  const displayMessage =
    message ||
    (isIdle
      ? 'Notice: For your account privacy and security, your session was closed due to inactivity. Your resident account is safe, active, and has NOT been deleted.'
      : isLocked
      ? 'Your resident account has been deactivated or locked by Barangay Zapatera administration.'
      : 'Your resident account has been deleted by Barangay Zapatera administration. You have been logged out.');


  // =========================================================================
  // WEB PLATFORM: Direct DOM rendering with 100% INLINE STYLES
  // Guaranteed to render centered, visible, and styled under Expo, Vite, or any bundler
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
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '460px',
            padding: '34px 28px 26px 28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(226, 232, 240, 0.9)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top colored accent indicator */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: isIdle
                ? 'linear-gradient(90deg, #1e40af, #3b82f6, #2563eb)'
                : isLocked
                ? 'linear-gradient(90deg, #dc2626, #ea580c, #dc2626)'
                : 'linear-gradient(90deg, #e11d48, #f43f5e, #be123c)',
            }}
          />

          {/* Close X Button in top right */}
          <button
            type="button"
            onClick={onClose}
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
              backgroundColor: isIdle ? '#eff6ff' : isLocked ? '#fef2f2' : '#fff1f2',
              border: `2px solid ${isIdle ? '#bfdbfe' : isLocked ? '#fecaca' : '#fecdd3'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: isIdle
                ? '0 0 24px rgba(37, 99, 235, 0.2)'
                : isLocked
                ? '0 0 24px rgba(220, 38, 38, 0.2)'
                : '0 0 24px rgba(225, 29, 72, 0.2)',
            }}
          >
            {isIdle ? (
              <Clock size={36} color="#1d4ed8" />
            ) : isLocked ? (
              <Lock size={36} color="#dc2626" />
            ) : (
              <ShieldAlert size={36} color="#e11d48" />
            )}
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
              backgroundColor: isIdle ? '#dbeafe' : isLocked ? '#fef2f2' : '#fff1f2',
              color: isIdle ? '#1e40af' : isLocked ? '#b91c1c' : '#be123c',
              border: `1px solid ${isIdle ? '#bfdbfe' : isLocked ? '#fecaca' : '#fecdd3'}`,
            }}
          >
            {defaultBadge}
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
            {title || defaultTitle}
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
            {defaultSubtitle}
          </p>

          {/* Notice Callout Box */}
          <div
            style={{
              backgroundColor: isIdle ? '#eff6ff' : isLocked ? '#fef2f2' : '#fff1f2',
              border: `1px solid ${isIdle ? '#bfdbfe' : isLocked ? '#fecaca' : '#fecdd3'}`,
              borderLeft: `5px solid ${isIdle ? '#2563eb' : isLocked ? '#dc2626' : '#e11d48'}`,
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: isIdle ? '#1e3a8a' : isLocked ? '#991b1b' : '#881337',
                fontWeight: 600,
                margin: 0,
              }}
            >
              {displayMessage}
            </p>
          </div>

          {/* Important Account Status Reassurance Card (Only when isIdle) */}
          {isIdle && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '16px',
                textAlign: 'left',
                fontSize: '12.5px',
                color: '#166534',
              }}
            >
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#15803d',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓ Your Account Remains Active & Safe</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5, color: '#14532d', fontSize: '12px' }}>
                Your account has <strong>NOT been deleted</strong>. All of your personal documents and records remain safe. Simply sign in again to continue.
              </p>
            </div>
          )}


          {/* Guidance Information Section */}
          {isLocked ? (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <HelpCircle size={15} color="#dc2626" />
                <span>Self-Service Security Unlock</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                To restore your account, click the button below to receive a 6-digit verification code on your registered Gmail. If you need help, please visit the Barangay Zapatera administration office.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Building2 size={15} color="#475569" />
                <span>Barangay Zapatera Administration Office</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: '#64748b',
                  marginTop: '4px',
                }}
              >
                <MapPin size={13} color="#64748b" />
                <span>Rahmann St., Barangay Zapatera, Cebu City</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: '#64748b',
                  marginTop: '4px',
                }}
              >
                <Clock size={13} color="#64748b" />
                <span>Monday – Friday, 8:00 AM – 5:00 PM</span>
              </div>
              <p style={{ marginTop: '8px', marginBottom: 0, lineHeight: 1.5 }}>
                If you believe this action was taken in error or require credential verification, please visit the administration office with a valid government ID.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div>
            {isLocked ? (
              <div>
                {onUnlock && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onUnlock();
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(220, 38, 38, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Unlock size={17} />
                    <span>Unlock Account with Gmail Code</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '14px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    marginTop: '8px',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  background: isIdle
                    ? 'linear-gradient(135deg, #1e40af, #2563eb)'
                    : 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isIdle
                    ? '0 6px 18px rgba(37, 99, 235, 0.35)'
                    : '0 6px 18px rgba(225, 29, 72, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box',
                }}
              >
                {isIdle ? 'Acknowledge & Sign In' : 'Acknowledge & Return to Login'}
              </button>
            )}

          </div>
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
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {/* Top colored accent indicator */}
          <View
            style={[
              styles.topAccentBar,
              isIdle ? styles.topAccentBarIdle : isLocked ? styles.topAccentBarLocked : styles.topAccentBarDeleted,
            ]}
          />

          {/* Close X Button in top right */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Central Security Icon with glowing halo */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconHalo,
                isIdle ? styles.iconHaloIdle : isLocked ? styles.iconHaloLocked : styles.iconHaloDeleted,
              ]}
            >
              <View
                style={[
                  styles.iconCore,
                  isIdle ? styles.iconCoreIdle : isLocked ? styles.iconCoreLocked : styles.iconCoreDeleted,
                ]}
              >
                {isIdle ? (
                  <Clock size={30} color="#1d4ed8" />
                ) : isLocked ? (
                  <Lock size={30} color="#dc2626" />
                ) : (
                  <ShieldAlert size={32} color="#e11d48" />
                )}
              </View>
            </View>
          </View>

          {/* Pill Badge */}
          <View
            style={[
              styles.badge,
              isIdle ? styles.badgeIdle : isLocked ? styles.badgeLocked : styles.badgeDeleted,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isIdle ? styles.badgeTextIdle : isLocked ? styles.badgeTextLocked : styles.badgeTextDeleted,
              ]}
            >
              {defaultBadge}
            </Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.modalTitle}>{title || defaultTitle}</Text>
          <Text style={styles.modalSubtitle}>{defaultSubtitle}</Text>

          {/* Notice Callout Box */}
          <View
            style={[
              styles.noticeBox,
              isIdle ? styles.noticeBoxIdle : isLocked ? styles.noticeBoxLocked : styles.noticeBoxDeleted,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                isIdle ? styles.noticeTextIdle : isLocked ? styles.noticeTextLocked : styles.noticeTextDeleted,
              ]}
            >
              {displayMessage}
            </Text>
          </View>

          {/* Important Account Status Reassurance Card (Only when isIdle) */}
          {isIdle && (
            <View style={styles.reassuranceBox}>
              <Text style={styles.reassuranceTitle}>✓ Your Account Remains Active & Safe</Text>
              <Text style={styles.reassuranceText}>
                Your account has NOT been deleted. All your records remain safe. Please sign in again.
              </Text>
            </View>
          )}

          {/* Guidance Information Section */}
          {isLocked ? (
            <View style={styles.guidanceBox}>
              <View style={styles.guidanceHeader}>
                <HelpCircle size={15} color="#dc2626" />
                <Text style={styles.guidanceTitle}>Self-Service Security Unlock</Text>
              </View>
              <Text style={styles.guidanceText}>
                To restore access, enter your registered Gmail to receive a 6-digit verification code. If you do not have access to your email, visit the Barangay Hall for identity verification.
              </Text>
            </View>
          ) : (
            <View style={styles.guidanceBox}>
              <View style={styles.guidanceHeader}>
                <Building2 size={15} color="#475569" />
                <Text style={styles.guidanceTitle}>Barangay Zapatera Administration</Text>
              </View>
              <View style={styles.guidanceRow}>
                <MapPin size={13} color="#64748b" />
                <Text style={styles.guidanceDetail}>Rahmann St., Barangay Zapatera, Cebu City</Text>
              </View>
              <View style={styles.guidanceRow}>
                <Clock size={13} color="#64748b" />
                <Text style={styles.guidanceDetail}>Monday – Friday, 8:00 AM – 5:00 PM</Text>
              </View>
              <Text style={[styles.guidanceText, { marginTop: 6 }]}>
                If you believe this was done in error or wish to apply for account reinstatement, please visit the administration office with a valid government ID.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {isLocked ? (
              <View style={styles.buttonStack}>
                {onUnlock && (
                  <TouchableOpacity
                    style={styles.primaryUnlockBtn}
                    onPress={() => {
                      onClose();
                      onUnlock();
                    }}
                    activeOpacity={0.85}
                  >
                    <Unlock size={16} color="#ffffff" />
                    <Text style={styles.primaryUnlockBtnText}>
                      Unlock Account with Gmail Code
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryAcknowledgeBtn, isIdle && styles.primaryBtnIdle]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryAcknowledgeBtnText}>
                  {isIdle ? 'Acknowledge & Sign In' : 'Acknowledge & Return to Login'}
                </Text>
              </TouchableOpacity>
            )}
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
    paddingTop: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  topAccentBarIdle: {
    backgroundColor: '#2563eb',
  },
  topAccentBarDeleted: {
    backgroundColor: '#e11d48',
  },
  topAccentBarLocked: {
    backgroundColor: '#dc2626',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 10,
  },
  iconWrapper: {
    marginBottom: 12,
  },
  iconHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  iconHaloIdle: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  iconHaloDeleted: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  iconHaloLocked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCoreIdle: {
    backgroundColor: '#dbeafe',
  },
  iconCoreDeleted: {
    backgroundColor: '#ffe4e6',
  },
  iconCoreLocked: {
    backgroundColor: '#fee2e2',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  badgeIdle: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  badgeDeleted: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  badgeLocked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeTextIdle: {
    color: '#1e40af',
  },
  badgeTextDeleted: {
    color: '#be123c',
  },
  badgeTextLocked: {
    color: '#b91c1c',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
    fontWeight: '500',
  },
  noticeBox: {
    width: '100%',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 14,
  },
  noticeBoxIdle: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderLeftColor: '#2563eb',
  },
  noticeBoxDeleted: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderLeftColor: '#e11d48',
  },
  noticeBoxLocked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderLeftColor: '#dc2626',
  },
  noticeText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  noticeTextIdle: {
    color: '#1e3a8a',
  },
  noticeTextDeleted: {
    color: '#9f1239',
  },
  noticeTextLocked: {
    color: '#991b1b',
  },
  reassuranceBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
  },
  reassuranceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 3,
  },
  reassuranceText: {
    fontSize: 11,
    color: '#14532d',
    lineHeight: 15,
  },
  guidanceBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  guidanceDetail: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  guidanceText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 2,
  },
  actionContainer: {
    width: '100%',
  },
  buttonStack: {
    width: '100%',
    gap: 8,
  },
  primaryUnlockBtn: {
    width: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryUnlockBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryAcknowledgeBtn: {
    width: '100%',
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnIdle: {
    backgroundColor: '#1e40af',
    shadowColor: '#1e40af',
  },
  primaryAcknowledgeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
});

