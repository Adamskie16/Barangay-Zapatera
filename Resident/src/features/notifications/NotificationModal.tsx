import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
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
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface NotificationModalProps {
  visible: boolean;
  notifications: ResidentNotification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onToggleReadStatus?: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
  onNotificationClick: (notif: ResidentNotification) => void;
}

type NotifFilter = 'all' | 'unread' | 'requests' | 'bulletins';

export default function NotificationModal({
  visible,
  notifications,
  onClose,
  onMarkAsRead,
  onToggleReadStatus,
  onDeleteNotification,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
}: NotificationModalProps) {
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('all');

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const isBulletinNotif = (n: ResidentNotification) =>
    n.type === 'announcement' ||
    n.type === 'warning' ||
    n.type === 'emergency' ||
    n.link_tab === 'announcements';

  const requestsCount = useMemo(
    () => notifications.filter((n) => !isBulletinNotif(n)).length,
    [notifications]
  );

  const bulletinsCount = useMemo(
    () => notifications.filter((n) => isBulletinNotif(n)).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'unread') return !n.is_read;
      if (activeFilter === 'requests') return !isBulletinNotif(n);
      if (activeFilter === 'bulletins') return isBulletinNotif(n);
      return true;
    });
  }, [notifications, activeFilter]);

  const getNotifVisual = (notif: ResidentNotification) => {
    const type = (notif.type || '').toLowerCase();
    if (type === 'ready_pickup') {
      return {
        icon: <PackageCheck size={18} color="#059669" />,
        bg: '#ecfdf5',
        border: '#a7f3d0',
        badgeBg: '#d1fae5',
        badgeText: '#047857',
        label: 'FOR PICKUP',
      };
    }
    if (type === 'rejected') {
      return {
        icon: <XCircle size={18} color="#dc2626" />,
        bg: '#fef2f2',
        border: '#fecaca',
        badgeBg: '#fee2e2',
        badgeText: '#b91c1c',
        label: 'DECLINED',
      };
    }
    if (type === 'warning' || type === 'emergency') {
      return {
        icon: <AlertTriangle size={18} color="#dc2626" />,
        bg: '#fef2f2',
        border: '#fecaca',
        badgeBg: '#fee2e2',
        badgeText: '#b91c1c',
        label: 'EMERGENCY ALERT',
      };
    }
    if (type === 'announcement' || notif.link_tab === 'announcements') {
      return {
        icon: <Megaphone size={18} color="#7c3aed" />,
        bg: '#f5f3ff',
        border: '#ddd6fe',
        badgeBg: '#ede9fe',
        badgeText: '#6d28d9',
        label: 'BULLETIN',
      };
    }
    if (type === 'security') {
      return {
        icon: <ShieldCheck size={18} color="#d97706" />,
        bg: '#fffbeb',
        border: '#fde68a',
        badgeBg: '#fef3c7',
        badgeText: '#b45309',
        label: 'SECURITY',
      };
    }
    return {
      icon: <Clock size={18} color="#2563eb" />,
      bg: '#eff6ff',
      border: '#dbeafe',
      badgeBg: '#dbeafe',
      badgeText: '#1d4ed8',
      label: 'REQUEST UPDATE',
    };
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ================= 1. MODAL HEADER ================= */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Bell size={18} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.modalTitle}>Notifications</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.unreadCountPill}>
                      <Text style={styles.unreadCountPillText}>{unreadCount} Unread</Text>
                    </View>
                  ) : (
                    <View style={styles.allCaughtUpPill}>
                      <Text style={styles.allCaughtUpPillText}>All Read</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modalSubtitle}>
                  Real-time request progress, pickup alerts, and barangay advisories
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* ================= 2. FILTER PILLS & BULK ACTIONS BAR ================= */}
          <View style={styles.controlsSection}>
            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {[
                { key: 'all' as NotifFilter, label: 'All', count: notifications.length },
                { key: 'unread' as NotifFilter, label: 'Unread', count: unreadCount },
                { key: 'requests' as NotifFilter, label: 'Requests', count: requestsCount },
                { key: 'bulletins' as NotifFilter, label: 'Bulletins', count: bulletinsCount },
              ].map((tab) => {
                const isSelected = activeFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setActiveFilter(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected && styles.filterPillTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={[
                        styles.filterCountBubble,
                        isSelected && styles.filterCountBubbleActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,
                          isSelected && styles.filterCountTextActive,
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Bulk Actions Row */}
            {notifications.length > 0 && (
              <View style={styles.bulkActionsRow}>
                <View style={styles.liveIndicatorRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveIndicatorText}>Live In-App Alerts Active</Text>
                </View>

                <View style={styles.bulkButtonsRight}>
                  <TouchableOpacity
                    style={[
                      styles.markAllBtn,
                      unreadCount === 0 && styles.markAllBtnDisabled,
                    ]}
                    onPress={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    activeOpacity={0.75}
                  >
                    <CheckCheck size={13} color={unreadCount > 0 ? '#2563eb' : '#94a3b8'} />
                    <Text
                      style={[
                        styles.markAllBtnText,
                        unreadCount === 0 && styles.markAllBtnTextDisabled,
                      ]}
                    >
                      Mark all as read
                    </Text>
                  </TouchableOpacity>

                  {onClearAll && (
                    <TouchableOpacity
                      style={styles.clearAllBtn}
                      onPress={onClearAll}
                      activeOpacity={0.75}
                    >
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={styles.clearAllBtnText}>Clear all</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* ================= 3. NOTIFICATION ITEMS LIST ================= */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const visual = getNotifVisual(notif);
                const isUnread = !notif.is_read;

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifCard, isUnread && styles.notifCardUnread]}
                    onPress={() => {
                      onMarkAsRead(notif.id);
                      onNotificationClick(notif);
                    }}
                    activeOpacity={0.85}
                  >
                    {/* Top Row: Icon Box + Badges + Title */}
                    <View style={styles.notifHeaderRow}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: visual.bg, borderColor: visual.border },
                        ]}
                      >
                        {visual.icon}
                      </View>

                      <View style={styles.notifHeaderMain}>
                        <View style={styles.badgesAndTimeRow}>
                          <View style={styles.badgesGroup}>
                            <View
                              style={[
                                styles.typeBadge,
                                { backgroundColor: visual.badgeBg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBadgeText,
                                  { color: visual.badgeText },
                                ]}
                              >
                                {visual.label}
                              </Text>
                            </View>

                            {isUnread && (
                              <View style={styles.newPill}>
                                <View style={styles.newPillDot} />
                                <Text style={styles.newPillText}>NEW</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.timeChip}>
                            <Clock size={10.5} color="#94a3b8" />
                            <Text style={styles.notifTime}>{notif.created_at}</Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.notifTitle,
                            isUnread && styles.notifTitleUnread,
                          ]}
                          numberOfLines={2}
                        >
                          {notif.title}
                        </Text>
                      </View>
                    </View>

                    {/* Message Body */}
                    <Text style={styles.notifMessage}>{notif.message}</Text>

                    {/* Footer Action Bar */}
                    <View style={styles.notifFooterRow}>
                      <Text style={styles.tapHintText}>Tap to open details</Text>

                      <View style={styles.itemActionsRight}>
                        <TouchableOpacity
                          style={
                            notif.is_read
                              ? styles.markAsUnreadBtn
                              : styles.markAsReadBtn
                          }
                          onPress={(e) => {
                            e.stopPropagation?.();
                            if (onToggleReadStatus) {
                              onToggleReadStatus(notif.id);
                            } else {
                              onMarkAsRead(notif.id);
                            }
                          }}
                          activeOpacity={0.75}
                        >
                          {notif.is_read ? (
                            <>
                              <Clock size={11} color="#64748b" />
                              <Text style={styles.markAsUnreadBtnText}>
                                Mark unread
                              </Text>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} color="#2563eb" />
                              <Text style={styles.markAsReadBtnText}>Mark read</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {onDeleteNotification && (
                          <TouchableOpacity
                            style={styles.deleteSingleBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              onDeleteNotification(notif.id);
                            }}
                            activeOpacity={0.75}
                            accessibilityLabel="Delete notification"
                          >
                            <Trash2 size={12} color="#dc2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <Bell size={26} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilter === 'unread'
                    ? 'No Unread Notifications'
                    : 'No Notifications Found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter === 'unread'
                    ? "You're all caught up! Switch to 'All' to view previous notifications."
                    : "You'll receive real-time alerts here when your document requests change status or new advisories are posted."}
                </Text>
                {activeFilter !== 'all' && notifications.length > 0 && (
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={() => setActiveFilter('all')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyResetBtnText}>Show All Notifications</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* ================= 4. MODAL FOOTER ================= */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeModalBtnText}>Close Notifications</Text>
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
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  /* ================= 1. HEADER ================= */
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  unreadCountPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadCountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  allCaughtUpPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  allCaughtUpPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ================= 2. CONTROLS & FILTER BAR ================= */
  controlsSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  filterCountBubble: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  filterCountBubbleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  filterCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  filterCountTextActive: {
    color: '#ffffff',
  },

  /* Bulk Actions Row */
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  liveIndicatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  bulkButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  markAllBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  markAllBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563eb',
  },
  markAllBtnTextDisabled: {
    color: '#94a3b8',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dc2626',
  },

  /* ================= 3. NOTIFICATION CARDS ================= */
  modalBody: {
    padding: 14,
  },
  notifCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  notifCardUnread: {
    backgroundColor: '#f8fbff',
    borderColor: '#93c5fd',
    borderWidth: 1.5,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 7,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderMain: {
    flex: 1,
  },
  badgesAndTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typeBadge: {
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  newPillDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#ffffff',
  },
  newPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 18,
  },
  notifTitleUnread: {
    fontWeight: '900',
    color: '#0f172a',
  },
  notifMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  notifFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tapHintText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  itemActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAsReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  markAsReadBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  markAsUnreadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  markAsUnreadBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  deleteSingleBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  /* Empty State */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 280,
  },
  emptyResetBtn: {
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* ================= 4. FOOTER ================= */
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  closeModalBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
});
