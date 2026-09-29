// Resident/src/components/ActionModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
} from 'lucide-react';

export type ActionModalType = 'success' | 'error' | 'confirmation' | 'warning' | 'info';

export interface ActionModalProps {
  isOpen: boolean;
  type?: ActionModalType;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  buttonText?: string;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  isProcessing?: boolean;
  isDestructive?: boolean;
  maxWidth?: string;
  secondaryButton?: {
    text: string;
    onClick: () => void;
  };
}

export default function ActionModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  buttonText = 'OK',
  onConfirm,
  onClose,
  isProcessing = false,
  isDestructive = false,
  secondaryButton,
}: ActionModalProps) {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color="#16a34a" />,
          bgColor: '#dcfce7',
          borderColor: '#bbf7d0',
          btnBgColor: '#16a34a',
        };
      case 'error':
        return {
          icon: <AlertCircle size={32} color="#e11d48" />,
          bgColor: '#ffe4e6',
          borderColor: '#fecdd3',
          btnBgColor: '#e11d48',
        };
      case 'warning':
      case 'confirmation':
        if (isDestructive) {
          return {
            icon: <AlertTriangle size={32} color="#e11d48" />,
            bgColor: '#ffe4e6',
            borderColor: '#fecdd3',
            btnBgColor: '#e11d48',
          };
        }
        return {
          icon: <HelpCircle size={32} color="#2563eb" />,
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          btnBgColor: '#2563eb',
        };
      case 'info':
      default:
        return {
          icon: <Info size={32} color="#2563eb" />,
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe',
          btnBgColor: '#2563eb',
        };
    }
  };

  const theme = getTheme();

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={isProcessing ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {!isProcessing && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <View style={styles.content}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.bgColor, borderColor: theme.borderColor },
              ]}
            >
              {theme.icon}
            </View>

            <Text style={styles.title}>{title}</Text>

            {typeof message === 'string' ? (
              <Text style={styles.message}>{message}</Text>
            ) : (
              <View style={styles.messageContainer}>{message}</View>
            )}

            <View style={styles.actionsContainer}>
              {type === 'confirmation' || type === 'warning' ? (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={onClose}
                    disabled={isProcessing}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.btnBgColor }]}
                    onPress={onConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmBtnText}>{confirmText}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.buttonStack}>
                  {secondaryButton && (
                    <TouchableOpacity
                      style={[styles.btn, styles.secondaryBtn]}
                      onPress={secondaryButton.onClick}
                      disabled={isProcessing}
                    >
                      <Text style={styles.secondaryBtnText}>{secondaryButton.text}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.btnBgColor }]}
                    onPress={onClose}
                    disabled={isProcessing}
                  >
                    <Text style={styles.confirmBtnText}>{buttonText}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  messageContainer: {
    marginTop: 8,
    width: '100%',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
