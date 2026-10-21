// Resident/src/features/notifications/NotificationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import {
  Bell,
  X,
  CheckCircle2,
  Clock,
  PackageCheck,
  XCircle,
  Megaphone,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { ResidentNotification } from '../../types';

interface NotificationModalProps {
  visible: boolean;
  notifications: ResidentNotification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
  onNotificationClick: (notif: ResidentNotification) => void;
}

export default function NotificationModal({
  visible,
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
}: NotificationModalProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'ready_pickup':
        return <PackageCheck size={18} color="#15803d" />;
      case 'status_update':
        return <Clock size={18} color="#1d4ed8" />;
      case 'rejected':
        return <XCircle size={18} color="#dc2626" />;
      case 'warning':
      case 'emergency':
        return <AlertTriangle size={18} color="#dc2626" />;
      case 'announcement':
        return <Megaphone size={18} color="#7c3aed" />;
      case 'security':
        return <ShieldCheck size={18} color="#d97706" />;
      default:
        return <Bell size={18} color="#1d4ed8" />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Bell size={20} color="#1d4ed8" />
              <Text style={styles.modalTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* In-App Request Progress & Status Indicator */}
          <View style={styles.inAppStatusCard}>
            <View style={styles.inAppStatusLeft}>
              <View style={styles.inAppStatusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inAppStatusTitle}>In-App Progress Notifications Active</Text>
                <Text style={styles.inAppStatusSub}>
                  Real-time updates are sent here for document submissions, verification, approval, and pick up readiness.
                </Text>
              </View>
            </View>
          </View>

          {/* Separate Action Bar: Mark all as read & Clear all */}
          {notifications.length > 0 && (
            <View style={styles.markAllBar}>
              <TouchableOpacity
                style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.5 }]}
                onPress={onMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={14} color="#1d4ed8" />
                <Text style={styles.markAllBtnText}>
                  {unreadCount > 0 ? `Mark all as read (${unreadCount})` : 'All marked as read'}
                </Text>
              </TouchableOpacity>

              {onClearAll && (
                <TouchableOpacity style={styles.clearAllBtn} onPress={onClearAll}>
                  <Trash2 size={13} color="#dc2626" />
                  <Text style={styles.clearAllBtnText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Notification Items List */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifCard,
                    !notif.is_read && styles.notifCardUnread,
                  ]}
                  onPress={() => {
                    onMarkAsRead(notif.id);
                    onNotificationClick(notif);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      !notif.is_read ? styles.iconCircleUnread : styles.iconCircleRead,
                    ]}
                  >
                    {renderIcon(notif.type)}
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifTopRow}>
                      <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleUnread]}>
                        {notif.title}
                      </Text>
                      {!notif.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <View style={styles.notifFooterRow}>
                      <Text style={styles.notifTime}>{notif.created_at}</Text>
                      <TouchableOpacity
                        style={styles.markAsReadBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onMarkAsRead(notif.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <CheckCircle2 size={12} color="#1d4ed8" />
                        <Text style={styles.markAsReadBtnText}>Mark as read</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Bell size={36} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtitle}>
                  You'll be notified here when your document requests change status or new advisories are posted.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '85%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  unreadBadge: {
    backgroundColor: '#dbeafe',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  closeBtn: {
    padding: 4,
  },
  markAllBar: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  modalBody: {
    padding: 12,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#f0f7ff',
    borderColor: '#bfdbfe',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  iconCircleRead: {
    backgroundColor: '#f1f5f9',
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#0f172a',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  notifMessage: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  notifFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  markAsReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  markAsReadBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  closeModalBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  inAppStatusCard: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  inAppStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inAppStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginRight: 8,
  },
  inAppStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  inAppStatusSub: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 1,
  },
});
