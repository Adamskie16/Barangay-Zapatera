// Resident/src/features/dashboard/ResidentDashboard.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import {
  FileText,
  Clock,
  Megaphone,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  Phone,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  MoreHorizontal,
  SlidersHorizontal,
  Bell,
  FileCheck2,
  Layers,
  Smile,
  TrendingUp,
  Briefcase,
  Home,
  HeartHandshake,
  Award,
} from 'lucide-react';
import {
  ResidentUser,
  DocumentRequest,
  BarangayConfig,
  BarangayAnnouncement,
  DocumentType,
} from '../../types';
import Badge from '../../components/Badge';
import GlobalFooter from '../../components/GlobalFooter';
import { formatCurrency } from '../../core/security';

interface SwipeableCarouselProps {
  scrollRef: React.RefObject<ScrollView | null>;
  scrollOffsetRef: React.MutableRefObject<number>;
  onDragStateChange?: (isDragging: boolean) => void;
  children: React.ReactNode;
}

/**
 * Cross-platform Touch & Pointer Swipeable Horizontal Carousel.
 * Supports:
 * - Native mobile touch swipe (iOS / Android / Expo Go) with nestedScrollEnabled
 * - Mobile web touch swipe & Chrome DevTools touch simulation
 * - Desktop / Emulator click-and-drag touch simulation without child TouchableOpacity stealing responder
 */
function SwipeableHorizontalCarousel({
  scrollRef,
  scrollOffsetRef,
  onDragStateChange,
  children,
}: SwipeableCarouselProps) {
  const wrapperRef = useRef<any>(null);
  const isPointerDown = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const getScrollableDomNode = useCallback((): HTMLElement | null => {
    if (Platform.OS !== 'web') return null;
    const raw: any = scrollRef.current;
    if (raw) {
      if (typeof raw.getScrollableNode === 'function') {
        const node = raw.getScrollableNode();
        if (node instanceof HTMLElement) return node;
      }
      if (raw instanceof HTMLElement) {
        return raw;
      }
    }
    if (wrapperRef.current instanceof HTMLElement) {
      return (wrapperRef.current.firstElementChild as HTMLElement) || wrapperRef.current;
    }
    return null;
  }, [scrollRef]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = getScrollableDomNode();
    const host: HTMLElement | null =
      wrapperRef.current instanceof HTMLElement ? wrapperRef.current : node;
    if (!host) return;

    if (node) {
      node.style.overflowX = 'auto';
      node.style.overflowY = 'hidden';
      node.style.touchAction = 'pan-x pan-y';
      (node.style as any).webkitOverflowScrolling = 'touch';
      node.style.cursor = 'grab';
      node.style.userSelect = 'none';
      node.style.scrollbarWidth = 'none';
    }

    const applyScroll = (nextScroll: number) => {
      const clamped = Math.max(0, nextScroll);
      if (node) {
        node.scrollLeft = clamped;
      }
      scrollRef.current?.scrollTo?.({ x: clamped, animated: false });
      scrollOffsetRef.current = clamped;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isPointerDown.current = true;
      hasDragged.current = false;
      startX.current = e.clientX;
      startScrollLeft.current = scrollOffsetRef.current || node?.scrollLeft || 0;
      if (node) {
        node.style.cursor = 'grabbing';
        node.style.scrollBehavior = 'auto';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerDown.current) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 5) {
        if (!hasDragged.current) {
          hasDragged.current = true;
          onDragStateChange?.(true);
        }
        if (e.cancelable) e.preventDefault();
        applyScroll(startScrollLeft.current - dx);
      }
    };

    const finishDrag = () => {
      if (!isPointerDown.current) return;
      isPointerDown.current = false;
      if (node) {
        node.style.cursor = 'grab';
        node.style.scrollBehavior = 'smooth';
      }
      if (hasDragged.current) {
        setTimeout(() => {
          hasDragged.current = false;
          onDragStateChange?.(false);
        }, 80);
      }
    };

    // Touch events in capture phase so swiping works even when starting on a button/image/card
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScroll = 0;
    let isTouchSwiping = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartScroll = scrollOffsetRef.current || node?.scrollLeft || 0;
      isTouchSwiping = false;
      if (node) node.style.scrollBehavior = 'auto';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;

      if (!isTouchSwiping && Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
        isTouchSwiping = true;
        hasDragged.current = true;
        onDragStateChange?.(true);
      }

      if (isTouchSwiping) {
        if (e.cancelable) e.preventDefault();
        applyScroll(touchStartScroll - dx);
      }
    };

    const onTouchEnd = () => {
      if (node) node.style.scrollBehavior = 'smooth';
      if (isTouchSwiping) {
        isTouchSwiping = false;
        setTimeout(() => {
          hasDragged.current = false;
          onDragStateChange?.(false);
        }, 80);
      }
    };

    // Prevent accidental clicks on child buttons/cards when the user was swiping/dragging
    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    host.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', finishDrag, true);
    host.addEventListener('mouseleave', finishDrag, { passive: true });
    host.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    host.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    host.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    host.addEventListener('click', onClickCapture, true);

    return () => {
      host.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finishDrag, true);
      host.removeEventListener('mouseleave', finishDrag);
      host.removeEventListener('touchstart', onTouchStart, true);
      host.removeEventListener('touchmove', onTouchMove, true);
      host.removeEventListener('touchend', onTouchEnd, true);
      host.removeEventListener('click', onClickCapture, true);
    };
  }, [getScrollableDomNode, onDragStateChange, scrollOffsetRef, scrollRef]);

  return (
    <View ref={wrapperRef} style={styles.fullBleedHorizontalScroll}>
      <ScrollView
        ref={scrollRef as any}
        horizontal
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
        }}
        contentContainerStyle={styles.horizontalCarouselContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

interface ResidentDashboardProps {
  currentUser: ResidentUser;
  requests: DocumentRequest[];
  docTypes?: DocumentType[];
  announcements: BarangayAnnouncement[];
  config: BarangayConfig;
  onNavigateTab: (tab: 'home' | 'documents' | 'requests' | 'announcements' | 'profile') => void;
  onRequestDocument: (docTypeId?: string | DocumentType) => void;
  onOpenRequirements: (doc?: DocumentType) => void;
  onViewRequestDetails: (req: DocumentRequest) => void;
  onViewAnnouncement: (ann: BarangayAnnouncement) => void;
}

export default function ResidentDashboard({
  currentUser,
  requests,
  docTypes = [],
  announcements,
  config,
  onNavigateTab,
  onRequestDocument,
  onOpenRequirements,
  onViewRequestDetails,
  onViewAnnouncement,
}: ResidentDashboardProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(() => new Date().toDateString());
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'fulfillment' | 'services'>('overview');
  const [appFilterStatus, setAppFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [isDraggingCarousel, setIsDraggingCarousel] = useState(false);

  // Horizontal ScrollView refs & scroll offsets for smooth button/touch scrolling
  const docScrollRef = useRef<ScrollView | null>(null);
  const docScrollOffset = useRef(0);
  const bulletinScrollRef = useRef<ScrollView | null>(null);
  const bulletinScrollOffset = useRef(0);

  const handleScrollDocs = (direction: 'left' | 'right') => {
    const step = 264;
    const nextX =
      direction === 'left'
        ? Math.max(0, docScrollOffset.current - step)
        : docScrollOffset.current + step;
    docScrollOffset.current = nextX;
    docScrollRef.current?.scrollTo({ x: nextX, animated: true });
  };

  const handleScrollBulletins = (direction: 'left' | 'right') => {
    const step = 284;
    const nextX =
      direction === 'left'
        ? Math.max(0, bulletinScrollOffset.current - step)
        : bulletinScrollOffset.current + step;
    bulletinScrollOffset.current = nextX;
    bulletinScrollRef.current?.scrollTo({ x: nextX, animated: true });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Request status breakdowns matching Admin Dashboard
  const pendingCount = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || 'pending').toLowerCase();
        return s === 'pending' || s === 'under_review' || s === 'processing';
      }).length,
    [requests]
  );

  const readyCount = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase();
        return s === 'ready_for_pickup' || s === 'approved';
      }).length,
    [requests]
  );

  const completedCount = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase();
        return s === 'issued' || s === 'completed';
      }).length,
    [requests]
  );

  const totalRequests = requests.length;
  const availableDocTypes = useMemo(
    () => (docTypes || []).filter((doc) => doc.is_active !== false && (doc as any).is_available !== false),
    [docTypes]
  );

  // Dynamic icon & color for each document card
  const getDocVisual = (doc: DocumentType) => {
    const text = `${doc.code || ''} ${doc.title || ''}`.toLowerCase();
    if (text.includes('clearance')) {
      return { Icon: ShieldCheck, color: '#0284c7', bg: '#f0f9ff' };
    }
    if (text.includes('residency')) {
      return { Icon: Home, color: '#2563eb', bg: '#eff6ff' };
    }
    if (text.includes('indigency')) {
      return { Icon: HeartHandshake, color: '#059669', bg: '#ecfdf5' };
    }
    if (text.includes('business') || text.includes('permit') || text.includes('jobseeker')) {
      return { Icon: Briefcase, color: '#7c3aed', bg: '#f5f3ff' };
    }
    if (text.includes('moral')) {
      return { Icon: Award, color: '#d97706', bg: '#fffbeb' };
    }
    return { Icon: FileText, color: '#0284c7', bg: '#f0f9ff' };
  };

  // Active request (highest priority: ready_for_pickup > processing > under_review > pending)
  const activeRequest =
    requests.find((r) => r.status === 'ready_for_pickup') ||
    requests.find((r) => r.status === 'processing') ||
    requests.find((r) => r.status === 'under_review') ||
    requests.find((r) => r.status === 'pending') ||
    null;

  // Emergency announcement banner
  const emergencyAnn = announcements.find((a) => a.is_emergency);

  const getRequestStageIndex = (status?: string): number => {
    switch (status) {
      case 'pending':
        return 1;
      case 'under_review':
        return 2;
      case 'processing':
        return 3;
      case 'ready_for_pickup':
      case 'approved':
      case 'issued':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  // Calendar Week Strip (matching Admin Dashboard Calendar)
  const calendarDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const start = new Date(base);
    start.setDate(base.getDate() - 3);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toDateString();
      const hasActivity = requests.some((r) => {
        if (!r.created_at) return false;
        return new Date(r.created_at).toDateString() === dateStr;
      });
      days.push({
        key: dateStr,
        dayName: dayLabels[d.getDay()],
        dayNumber: d.getDate(),
        fullDate: d,
        hasActivity,
      });
    }
    return days;
  }, [weekOffset, requests]);

  const currentMonthLabel = useMemo(() => {
    const midDay = calendarDays[3]?.fullDate || new Date();
    return midDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarDays]);

  // 2x2 Gradient KPI Activity Cards (matching Admin Dashboard Activity cards)
  const activityCards = [
    {
      id: 'active_queue',
      title: 'In Progress',
      count: pendingCount,
      badge: pendingCount > 0 ? 'Active' : 'Clear',
      bgColor: '#2f9fed',
      iconColor: '#38bdf8',
      Icon: Clock,
      bars: [12, 18, 14, 24, 20, 28],
      onPress: () => onNavigateTab('requests'),
    },
    {
      id: 'ready_pickup',
      title: 'Ready to Claim',
      count: readyCount,
      badge: readyCount > 0 ? 'Pickup' : '0 Ready',
      bgColor: '#10b981',
      iconColor: '#10b981',
      Icon: Bell,
      bars: [16, 12, 20, 18, 25, 22],
      onPress: () => onNavigateTab('requests'),
    },
    {
      id: 'total_requests',
      title: 'My Applications',
      count: totalRequests,
      badge: `${totalRequests} Total`,
      bgColor: '#7c3aed',
      iconColor: '#7c3aed',
      Icon: Layers,
      bars: [10, 15, 13, 21, 19, 26],
      onPress: () => onNavigateTab('requests'),
    },
    {
      id: 'completed_docs',
      title: 'Claimed Docs',
      count: completedCount,
      badge: 'Verified',
      bgColor: '#2563eb',
      iconColor: '#2563eb',
      Icon: FileCheck2,
      bars: [18, 14, 16, 22, 20, 27],
      onPress: () => onNavigateTab('documents'),
    },
  ];

  // Analytics metrics (matching Admin Analytics progress bar card)
  const analyticsMetrics = useMemo(() => {
    const completionPct =
      totalRequests > 0 ? Math.round(((readyCount + completedCount) / totalRequests) * 100) : 100;
    const activePct = totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0;

    if (analyticsTab === 'fulfillment') {
      const claimedPct = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 100;
      const readyPct = totalRequests > 0 ? Math.round((readyCount / totalRequests) * 100) : 0;
      return {
        firstLabel: 'Claimed & Issued',
        firstPct: claimedPct,
        secondLabel: 'Ready for Pickup',
        secondPct: readyPct,
      };
    }
    if (analyticsTab === 'services') {
      return {
        firstLabel: 'Online Clearances Available',
        firstPct: Math.min(100, availableDocTypes.length * 16 || 85),
        secondLabel: 'Published Bulletins',
        secondPct: Math.min(100, announcements.length * 20 || 60),
      };
    }
    return {
      firstLabel: 'Approved & Ready Rate',
      firstPct: completionPct,
      secondLabel: 'Under Verification Queue',
      secondPct: activePct,
    };
  }, [analyticsTab, totalRequests, readyCount, completedCount, pendingCount, availableDocTypes.length, announcements.length]);

  // Filtered Resident Applications list
  const displayedApplications = useMemo(() => {
    let list = [...requests];
    if (appFilterStatus === 'active') {
      list = list.filter((r) => {
        const s = String(r.status || 'pending').toLowerCase();
        return s === 'pending' || s === 'under_review' || s === 'processing' || s === 'ready_for_pickup';
      });
    } else if (appFilterStatus === 'completed') {
      list = list.filter((r) => {
        const s = String(r.status || '').toLowerCase();
        return s === 'approved' || s === 'issued' || s === 'completed';
      });
    }
    return list.slice(0, 3);
  }, [requests, appFilterStatus]);

  const firstName = currentUser.first_name || currentUser.full_name?.split(' ')[0] || 'Resident';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Greeting & Primary Quick Action Strip */}
      <View style={styles.topHeaderStrip}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.greetingBadgePill}>
            <Sparkles size={11} color="#0284c7" />
            <Text style={styles.greetingBadgeText}>
              {currentUser.sitio || 'Barangay Zapatera'} • Resident Desk
            </Text>
          </View>
          <Text style={styles.greetingTitle}>
            {getGreeting()}, {firstName}!
          </Text>
          <Text style={styles.greetingSubtitleText}>
            Monitor your barangay document requests, schedules, and community bulletins.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newRequestCtaBtn}
          onPress={() => onRequestDocument()}
          activeOpacity={0.85}
        >
          <FileText size={15} color="#ffffff" />
          <Text style={styles.newRequestCtaText}>Request Document</Text>
          <ArrowRight size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Emergency Alert Banner if any */}
      {emergencyAnn ? (
        <TouchableOpacity
          style={styles.emergencyAlert}
          onPress={() => onViewAnnouncement(emergencyAnn)}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyIconWrapper}>
            <AlertTriangle size={20} color="#ffffff" />
          </View>
          <View style={styles.emergencyTextContent}>
            <View style={styles.emergencyHeaderRow}>
              <Text style={styles.emergencyTag}>URGENT ADVISORY</Text>
              <Text style={styles.emergencyDate}>{emergencyAnn.date}</Text>
            </View>
            <Text style={styles.emergencyTitle}>{emergencyAnn.title}</Text>
            <Text style={styles.emergencySnippet} numberOfLines={2}>
              {emergencyAnn.description}
            </Text>
          </View>
          <ArrowRight size={18} color="#ef4444" />
        </TouchableOpacity>
      ) : null}

      {/* ================= 1. ACTIVITY (2x2 Gradient KPI Cards like Admin) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Activity</Text>
          <TouchableOpacity
            style={styles.seeAllPillBtn}
            onPress={() => onNavigateTab('requests')}
            activeOpacity={0.75}
          >
            <Text style={styles.skyLinkText}>My Queue ({pendingCount + readyCount})</Text>
            <ArrowRight size={13} color="#0284c7" />
          </TouchableOpacity>
        </View>

        <View style={styles.activityGrid}>
          {activityCards.map((card) => {
            const IconComponent = card.Icon;
            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.activityCard, { backgroundColor: card.bgColor }]}
                onPress={card.onPress}
                activeOpacity={0.88}
              >
                <View style={styles.activityCardGlow} />
                {/* Top Row: White Squircle Icon + MoreHorizontal */}
                <View style={styles.activityCardTopRow}>
                  <View style={styles.activityWhiteSquircle}>
                    <IconComponent size={19} color={card.iconColor} />
                  </View>
                  <View style={styles.activityMoreBtn}>
                    <MoreHorizontal size={18} color="rgba(255,255,255,0.85)" />
                  </View>
                </View>

                {/* Middle Right Decorative Mini Sparkline Bars */}
                <View style={styles.sparklineRow}>
                  {card.bars.map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.sparklineBar,
                        { height: h, opacity: i === card.bars.length - 1 ? 0.95 : 0.55 },
                      ]}
                    />
                  ))}
                </View>

                {/* Bottom Row: Big Count + Title + Translucent Pill with Icon */}
                <View style={styles.activityCardBottomRow}>
                  <View>
                    <Text style={styles.activityCountText}>{card.count}</Text>
                    <Text style={styles.activityTitleText}>{card.title}</Text>
                  </View>
                  <View style={styles.activityBadgePill}>
                    <Text style={styles.activityBadgeText}>{card.badge}</Text>
                    <TrendingUp size={10} color="#ffffff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ================= 2. CALENDAR STRIP (Like Admin Calendar) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Calendar</Text>
          <View style={styles.calendarNavRight}>
            <Text style={styles.calendarMonthText}>{currentMonthLabel}</Text>
            <View style={styles.calendarArrowsRow}>
              <TouchableOpacity
                style={styles.calendarArrowBtn}
                onPress={() => setWeekOffset((prev) => prev - 1)}
                activeOpacity={0.75}
              >
                <ChevronLeft size={14} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarArrowBtn}
                onPress={() => setWeekOffset((prev) => prev + 1)}
                activeOpacity={0.75}
              >
                <ChevronRight size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.calendarWhiteCard}>
          <View style={styles.calendarDaysRow}>
            {calendarDays.map((day) => {
              const isSelected = selectedDateKey === day.key;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.calendarDayPill, isSelected && styles.calendarDayPillActive]}
                  onPress={() => setSelectedDateKey(day.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.calendarDayName, isSelected && styles.calendarDayNameActive]}>
                    {day.dayName}
                  </Text>
                  <Text style={[styles.calendarDayNum, isSelected && styles.calendarDayNumActive]}>
                    {day.dayNumber}
                  </Text>
                  <View
                    style={[
                      styles.calendarActivityDot,
                      day.hasActivity
                        ? isSelected
                          ? { backgroundColor: '#ffffff' }
                          : { backgroundColor: '#38bdf8' }
                        : { backgroundColor: 'transparent' },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* ================= 3. ACTIVE APPLICATION TRACKER (If Active) ================= */}
      {activeRequest ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Live Request Progress</Text>
            <Badge status={activeRequest.status} size="sm" />
          </View>

          <View style={styles.activeRequestCard}>
            <View style={styles.activeRequestBody}>
              <View style={styles.activeTopRow}>
                <View style={styles.activeDocIconSquircle}>
                  <FileText size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeDocTitle}>{activeRequest.document_title}</Text>
                  <Text style={styles.activeTrackingNo}>
                    Tracking Ref:{' '}
                    <Text style={styles.activeTrackingCode}>{activeRequest.tracking_number}</Text>
                  </Text>
                </View>
              </View>

              {/* Visual 4-Stage Progress Tracker */}
              <View style={styles.stageTrackerContainer}>
                {[
                  { step: 1, label: 'Submitted' },
                  { step: 2, label: 'Under Review' },
                  { step: 3, label: 'Processing' },
                  { step: 4, label: 'Ready' },
                ].map((s, idx, arr) => {
                  const currentStage = getRequestStageIndex(activeRequest.status);
                  const isPassed = currentStage > s.step;
                  const isCurrent = currentStage === s.step;
                  return (
                    <View key={s.step} style={styles.stageStepItem}>
                      <View style={styles.stageNodeRow}>
                        <View
                          style={[
                            styles.stageNode,
                            isPassed && styles.stageNodePassed,
                            isCurrent && styles.stageNodeCurrent,
                          ]}
                        >
                          {isPassed ? (
                            <Check size={10} color="#ffffff" strokeWidth={3} />
                          ) : (
                            <Text
                              style={[
                                styles.stageNodeText,
                                isCurrent && styles.stageNodeTextCurrent,
                              ]}
                            >
                              {s.step}
                            </Text>
                          )}
                        </View>
                        {idx < arr.length - 1 && (
                          <View
                            style={[
                              styles.stageLine,
                              currentStage > s.step && styles.stageLinePassed,
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stageLabel,
                          (isCurrent || isPassed) && styles.stageLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.activeDetailsGrid}>
                <View style={styles.activeDetailCol}>
                  <View style={styles.detailRow}>
                    <Calendar size={13} color="#64748b" />
                    <Text style={styles.detailLabel}>Pickup Date:</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {activeRequest.pickup_date || 'To be scheduled'}
                  </Text>
                </View>

                <View style={styles.activeDetailCol}>
                  <View style={styles.detailRow}>
                    <Clock size={13} color="#64748b" />
                    <Text style={styles.detailLabel}>Time Slot:</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {activeRequest.pickup_time_slot || 'Regular Office Hours'}
                  </Text>
                </View>
              </View>

              {activeRequest.status === 'ready_for_pickup' && (
                <View style={styles.readyInstructionBox}>
                  <MapPin size={14} color="#166534" />
                  <Text style={styles.readyInstructionText}>
                    Claim at:{' '}
                    {activeRequest.pickup_location &&
                    !activeRequest.pickup_location.toLowerCase().includes('express window')
                      ? activeRequest.pickup_location
                      : '2nd Floor, Barangay Hall Lobby, Rahmann St.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.viewTimelineBtn}
                onPress={() => onViewRequestDetails(activeRequest)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewTimelineBtnText}>
                  View Tracking Timeline & Claim Instructions
                </Text>
                <ArrowRight size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* ================= 4. ANALYTICS & QUICK SERVICES (Like Admin Analytics) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Analytics & Services</Text>
          <TouchableOpacity
            style={styles.iconSquareBtn}
            onPress={() =>
              setAnalyticsTab((prev) =>
                prev === 'overview' ? 'fulfillment' : prev === 'fulfillment' ? 'services' : 'overview'
              )
            }
          >
            <SlidersHorizontal size={15} color="#0ea5e9" />
          </TouchableOpacity>
        </View>

        <View style={styles.analyticsSplitRow}>
          {/* Tab Selector Card */}
          <View style={styles.analyticsTabCard}>
            {[
              { id: 'overview', label: 'Request Overview' },
              { id: 'fulfillment', label: 'Fulfillment' },
              { id: 'services', label: 'Portal Coverage' },
            ].map((tab) => {
              const isActive = analyticsTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.analyticsTabBtn, isActive && styles.analyticsTabBtnActive]}
                  onPress={() => setAnalyticsTab(tab.id as any)}
                  activeOpacity={0.8}
                >
                  {isActive && <View style={styles.analyticsActiveAccent} />}
                  <Text
                    style={[
                      styles.analyticsTabBtnText,
                      isActive && styles.analyticsTabBtnTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dual Progress Bars Card */}
          <View style={styles.analyticsProgressCard}>
            <View style={styles.metricRowItem}>
              <View style={{ flex: 1 }}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabelText}>{analyticsMetrics.firstLabel}</Text>
                  <Text style={styles.metricPctText}>{analyticsMetrics.firstPct}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFillSky,
                      { width: `${Math.max(analyticsMetrics.firstPct, 8)}%` as any },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.metricSquircleSky}>
                <Smile size={20} color="#ffffff" />
              </View>
            </View>

            <View style={styles.metricRowItem}>
              <View style={{ flex: 1 }}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabelText}>{analyticsMetrics.secondLabel}</Text>
                  <Text style={styles.metricPctText}>{analyticsMetrics.secondPct}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFillEmerald,
                      { width: `${Math.max(analyticsMetrics.secondPct, 8)}%` as any },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.metricSquircleEmerald}>
                <TrendingUp size={20} color="#ffffff" />
              </View>
            </View>
          </View>
        </View>

        {/* 4 Quick Service Action Pills below Analytics */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardPrimary]}
            onPress={() => onRequestDocument()}
            activeOpacity={0.8}
          >
            <View style={styles.quickCardTopRow}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#0ea5e9' }]}>
                <FileText size={18} color="#ffffff" />
              </View>
              <ChevronRight size={15} color="#94a3b8" />
            </View>
            <Text style={styles.quickCardTitle}>Request Document</Text>
            <Text style={styles.quickCardSubtitle}>Clearances & Permits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onNavigateTab('requests')}
            activeOpacity={0.8}
          >
            <View style={styles.quickCardTopRow}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#10b981' }]}>
                <Clock size={18} color="#ffffff" />
              </View>
              <ChevronRight size={15} color="#94a3b8" />
            </View>
            <Text style={styles.quickCardTitle}>My Requests</Text>
            <Text style={styles.quickCardSubtitle}>Track Applications ({requests.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onOpenRequirements()}
            activeOpacity={0.8}
          >
            <View style={styles.quickCardTopRow}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#7c3aed' }]}>
                <BookOpen size={18} color="#ffffff" />
              </View>
              <ChevronRight size={15} color="#94a3b8" />
            </View>
            <Text style={styles.quickCardTitle}>Requirements</Text>
            <Text style={styles.quickCardSubtitle}>Valid IDs & Checklist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onNavigateTab('announcements')}
            activeOpacity={0.8}
          >
            <View style={styles.quickCardTopRow}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#2563eb' }]}>
                <Megaphone size={18} color="#ffffff" />
              </View>
              <ChevronRight size={15} color="#94a3b8" />
            </View>
            <Text style={styles.quickCardTitle}>Bulletins</Text>
            <Text style={styles.quickCardSubtitle}>News & Advisories ({announcements.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 5. RECENT DOCUMENT APPLICATIONS (Like Admin Resident Application List) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Document Applications</Text>
          <View style={styles.calendarArrowsRow}>
            <TouchableOpacity
              style={styles.iconSquareBtn}
              onPress={() =>
                setAppFilterStatus((prev) =>
                  prev === 'all' ? 'active' : prev === 'active' ? 'completed' : 'all'
                )
              }
            >
              <SlidersHorizontal size={15} color="#0ea5e9" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconSquareBtn}
              onPress={() => onNavigateTab('requests')}
            >
              <MoreHorizontal size={15} color="#0ea5e9" />
            </TouchableOpacity>
          </View>
        </View>

        {displayedApplications.length === 0 ? (
          <View style={styles.emptyWhiteCard}>
            <FileText size={26} color="#94a3b8" />
            <Text style={styles.emptyCardTitle}>No Document Applications Yet</Text>
            <Text style={styles.emptyCardSub}>
              Submit your first barangay clearance or certificate request online in minutes.
            </Text>
            <TouchableOpacity
              style={styles.emptyCardCtaBtn}
              onPress={() => onRequestDocument()}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyCardCtaText}>Request a Document</Text>
              <ArrowRight size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.applicationsStack}>
            {displayedApplications.map((req, idx) => {
              const reqKey = req.id || req.tracking_number || String(idx);
              const isHighlighted = (selectedReqId || displayedApplications[0]?.id) === reqKey;
              const statusClean = String(req.status || 'pending').replace(/_/g, ' ');
              const badgeColors = ['#0ea5e9', '#10b981', '#7c3aed'];
              const avatarBg = badgeColors[idx % badgeColors.length];

              return (
                <TouchableOpacity
                  key={reqKey}
                  style={[styles.appRowCard, isHighlighted && styles.appRowCardHighlighted]}
                  onPress={() => {
                    setSelectedReqId(reqKey);
                    onViewRequestDetails(req);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.appRowLeft}>
                    <View style={[styles.appAvatarCircle, { backgroundColor: avatarBg }]}>
                      <FileText size={16} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.appRowDocTitle,
                          isHighlighted && styles.appRowDocTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {req.document_title}
                      </Text>
                      <Text style={styles.appRowTrackingCode} numberOfLines={1}>
                        {req.tracking_number} • {statusClean.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.appRowActionBtn,
                      isHighlighted && styles.appRowActionBtnActive,
                    ]}
                    onPress={() => onViewRequestDetails(req)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.appRowActionBtnText,
                        isHighlighted && styles.appRowActionBtnTextActive,
                      ]}
                    >
                      Track
                    </Text>
                    <ChevronRight
                      size={13}
                      color={isHighlighted ? '#ffffff' : '#0284c7'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ================= 6. OFFICIAL BARANGAY DOCUMENTS (Touch & Drag Swipeable Carousel) ================= */}
      {availableDocTypes.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Official Barangay Documents</Text>
            <View style={styles.carouselHeaderRight}>
              <View style={styles.calendarArrowsRow}>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={() => handleScrollDocs('left')}
                  activeOpacity={0.75}
                  accessibilityLabel="Scroll documents left"
                >
                  <ChevronLeft size={14} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={() => handleScrollDocs('right')}
                  activeOpacity={0.75}
                  accessibilityLabel="Scroll documents right"
                >
                  <ChevronRight size={14} color="#475569" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.seeAllPillBtn}
                onPress={() => onNavigateTab('documents')}
                activeOpacity={0.75}
              >
                <Text style={styles.skyLinkText}>View All ({availableDocTypes.length})</Text>
                <ArrowRight size={13} color="#0284c7" />
              </TouchableOpacity>
            </View>
          </View>

          <SwipeableHorizontalCarousel
            scrollRef={docScrollRef}
            scrollOffsetRef={docScrollOffset}
            onDragStateChange={setIsDraggingCarousel}
          >
            {availableDocTypes.map((doc) => {
              const { Icon: DocIcon, color: iconColor, bg: iconBg } = getDocVisual(doc);
              return (
                <View key={doc.id} style={styles.docTypeCard}>
                  <View>
                    <View style={styles.docTypeHeader}>
                      <View style={[styles.docIconBox, { backgroundColor: iconBg }]}>
                        <DocIcon size={19} color={iconColor} />
                      </View>
                      <View
                        style={[
                          styles.feeTag,
                          doc.fee_type === 'variable' || doc.is_variable_fee
                            ? styles.feeTagPaid
                            : doc.fee === 0
                            ? styles.feeTagFree
                            : styles.feeTagPaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.feeTagText,
                            doc.fee_type === 'variable' || doc.is_variable_fee
                              ? styles.feeTagTextPaid
                              : doc.fee === 0
                              ? styles.feeTagTextFree
                              : styles.feeTagTextPaid,
                          ]}
                        >
                          {doc.fee_type === 'variable' || doc.is_variable_fee
                            ? 'Depends upon claim'
                            : doc.fee === 0
                            ? 'FREE'
                            : formatCurrency(doc.fee)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.docTypeTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docTypeDesc} numberOfLines={2}>
                      {doc.description}
                    </Text>
                  </View>

                  <View>
                    <View style={styles.docTypeMeta}>
                      <Clock size={11} color="#64748b" />
                      <Text style={styles.docTypeMetaText}>
                        {doc.processing_days} {doc.processing_days === 1 ? 'day' : 'days'} processing
                      </Text>
                    </View>

                    <View style={styles.docTypeBtnRow}>
                      <TouchableOpacity
                        style={styles.docDetailsBtn}
                        onPress={() => {
                          if (!isDraggingCarousel) onOpenRequirements(doc);
                        }}
                        activeOpacity={0.75}
                      >
                        <Info size={13} color="#0284c7" />
                        <Text style={styles.docDetailsBtnText}>Requirements</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.docApplyBtn}
                        onPress={() => {
                          if (!isDraggingCarousel) onRequestDocument(doc);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.docApplyBtnText}>Apply</Text>
                        <ArrowRight size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </SwipeableHorizontalCarousel>
        </View>
      )}

      {/* ================= 7. BARANGAY BULLETINS & NEWS (Touch & Drag Swipeable Carousel) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Barangay Bulletins & News</Text>
          <View style={styles.carouselHeaderRight}>
            {announcements.length > 1 && (
              <View style={styles.calendarArrowsRow}>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={() => handleScrollBulletins('left')}
                  activeOpacity={0.75}
                  accessibilityLabel="Scroll bulletins left"
                >
                  <ChevronLeft size={14} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={() => handleScrollBulletins('right')}
                  activeOpacity={0.75}
                  accessibilityLabel="Scroll bulletins right"
                >
                  <ChevronRight size={14} color="#475569" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.seeAllPillBtn}
              onPress={() => onNavigateTab('announcements')}
              activeOpacity={0.75}
            >
              <Text style={styles.skyLinkText}>See All ({announcements.length})</Text>
              <ArrowRight size={13} color="#0284c7" />
            </TouchableOpacity>
          </View>
        </View>

        {announcements.length > 0 ? (
          <SwipeableHorizontalCarousel
            scrollRef={bulletinScrollRef}
            scrollOffsetRef={bulletinScrollOffset}
            onDragStateChange={setIsDraggingCarousel}
          >
            {announcements.slice(0, 6).map((item, idx) => (
              <View key={`${item.id}-${idx}`} style={styles.bulletinSlideCard}>
                <View style={styles.bulletinCoverBox}>
                  {item.banner_url ? (
                    <Image
                      source={{ uri: item.banner_url }}
                      style={styles.bulletinCoverImage}
                      resizeMode="cover"
                      draggable={false as any}
                    />
                  ) : (
                    <View style={styles.bulletinFallbackCover}>
                      <Megaphone size={26} color="#38bdf8" />
                    </View>
                  )}
                  <View style={styles.bulletinCategoryFloatingPill}>
                    <Text style={styles.bulletinCategoryFloatingText}>
                      {(item.category || 'ADVISORY').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.bulletinSlideBody}>
                  <View style={styles.bulletinMetaTopRow}>
                    <Calendar size={11} color="#94a3b8" />
                    <Text style={styles.announcementDate}>{item.date}</Text>
                  </View>

                  <Text style={styles.announcementTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.announcementDesc} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <TouchableOpacity
                    style={styles.bulletinReadMoreRow}
                    onPress={() => {
                      if (!isDraggingCarousel) onViewAnnouncement(item);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.bulletinReadMoreText}>Read Bulletin</Text>
                    <ArrowRight size={12} color="#0284c7" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </SwipeableHorizontalCarousel>
        ) : (
          <View style={styles.emptyWhiteCard}>
            <Megaphone size={26} color="#94a3b8" />
            <Text style={styles.emptyCardTitle}>No Bulletins or Events Posted</Text>
            <Text style={styles.emptyCardSub}>
              There are currently no active public announcements or upcoming events scheduled.
            </Text>
          </View>
        )}
      </View>

      {/* ================= 8. ACCOUNT SECURITY & BARANGAY HALL INFO (Like Admin Security Card) ================= */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionHeading}>Account & Barangay Desk</Text>
            <View style={styles.protectedPill}>
              <ShieldCheck size={11} color="#059669" />
              <Text style={styles.protectedPillText}>Protected</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.seeAllPillBtn}
            onPress={() => onNavigateTab('profile')}
            activeOpacity={0.75}
          >
            <Text style={styles.skyLinkText}>Profile</Text>
            <ArrowRight size={13} color="#0284c7" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoFooterCard}>
          <View style={styles.infoFooterHeader}>
            <Image
              source={{
                uri: config?.seal_url || config?.logo_url || '/zapatera_seal.png',
              }}
              style={styles.infoFooterSeal}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoFooterTitle}>
                {config.barangay_name || 'Barangay Zapatera'}
              </Text>
              <Text style={styles.infoFooterTagline}>Official Resident Services Portal</Text>
            </View>
          </View>
          <Text style={styles.infoFooterText}>
            {config.office_hours || 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)'}
          </Text>
          <View style={styles.infoFooterRow}>
            <MapPin size={13} color="#64748b" />
            <Text style={styles.infoFooterSub}>
              {config.hall_address || '197 D. Jakosalem St., Cebu City'}
            </Text>
          </View>
          <View style={styles.infoFooterRow}>
            <Phone size={13} color="#64748b" />
            <Text style={styles.infoFooterSub}>
              Hotline: {config.contact_phone || '(032) 503-6465'}
            </Text>
          </View>
        </View>
      </View>

      {/* Global Developer & Institution Footer */}
      <GlobalFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 98,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  topHeaderStrip: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eef2f6',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  topHeaderLeft: {
    flex: 1,
    minWidth: 200,
  },
  greetingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  greetingBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 0.2,
  },
  greetingTitle: {
    fontFamily: 'Inter',
    fontSize: 19,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  greetingSubtitleText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 17,
  },
  newRequestCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 16,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  newRequestCtaText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionHeading: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  carouselHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  skyLinkText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },

  /* 1. Activity 2x2 Gradient Cards (Admin Dashboard Style) */
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  activityCard: {
    width: '48.2%',
    borderRadius: 24,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  activityCardGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  activityCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activityWhiteSquircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  activityMoreBtn: {
    padding: 2,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 4,
    height: 28,
    marginVertical: 6,
  },
  sparklineBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  activityCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  activityCountText: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 26,
  },
  activityTitleText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 3,
  },
  activityBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* 2. Calendar Strip Card (Admin Dashboard Style) */
  calendarNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarMonthText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  calendarArrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendarArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWhiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#eef2f6',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  calendarDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarDayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 999,
  },
  calendarDayPillActive: {
    backgroundColor: '#4dc4ff',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarDayName: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  calendarDayNameActive: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '700',
  },
  calendarDayNum: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  calendarDayNumActive: {
    color: '#ffffff',
  },
  calendarActivityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },

  /* 3. Analytics Split & Progress Bars (Admin Dashboard Style) */
  iconSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsSplitRow: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 12,
  },
  analyticsTabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#eef2f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  analyticsTabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  analyticsTabBtnActive: {
    backgroundColor: '#f0f9ff',
  },
  analyticsActiveAccent: {
    position: 'absolute',
    bottom: 2,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
  },
  analyticsTabBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  analyticsTabBtnTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },
  analyticsProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    gap: 14,
  },
  metricRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  metricLabelText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  metricPctText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFillSky: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 999,
  },
  progressBarFillEmerald: {
    height: '100%',
    backgroundColor: '#34d399',
    borderRadius: 999,
  },
  metricSquircleSky: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#67d4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricSquircleEmerald: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quick Service Cards */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  quickCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCard: {
    width: '48.2%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  quickCardPrimary: {
    borderColor: '#e0f2fe',
    backgroundColor: '#ffffff',
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  quickCardSubtitle: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#64748b',
    lineHeight: 14,
  },

  /* 5. My Document Applications Horizontal Cards */
  applicationsStack: {
    gap: 10,
  },
  appRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#eef2f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  appRowCardHighlighted: {
    borderColor: '#bae6fd',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  appRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRowDocTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  appRowDocTitleActive: {
    fontWeight: '800',
    color: '#0f172a',
  },
  appRowTrackingCode: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  appRowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  appRowActionBtnActive: {
    backgroundColor: '#4dc4ff',
  },
  appRowActionBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  appRowActionBtnTextActive: {
    color: '#ffffff',
  },

  /* Empty State Cards */
  emptyWhiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#eef2f6',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8,
  },
  emptyCardSub: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  emptyCardCtaBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4dc4ff',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyCardCtaText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Emergency & Active Tracker */
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  emergencyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTextContent: {
    flex: 1,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  emergencyTag: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '900',
    color: '#be123c',
    letterSpacing: 0.5,
  },
  emergencyDate: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#9f1239',
  },
  emergencyTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#881337',
    marginBottom: 2,
  },
  emergencySnippet: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#9f1239',
    lineHeight: 15,
  },
  activeRequestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    overflow: 'hidden',
    shadowColor: '#0284c7',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activeRequestBody: {
    padding: 18,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  activeDocIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDocTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  activeTrackingNo: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  activeTrackingCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: '#0284c7',
  },
  stageTrackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f6',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  stageStepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stageNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  stageNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stageNodePassed: {
    backgroundColor: '#10b981',
  },
  stageNodeCurrent: {
    backgroundColor: '#38bdf8',
  },
  stageNodeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  stageNodeTextCurrent: {
    color: '#ffffff',
  },
  stageLine: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#e2e8f0',
    zIndex: 1,
  },
  stageLinePassed: {
    backgroundColor: '#10b981',
  },
  stageLabel: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  stageLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  activeDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  activeDetailCol: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  readyInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  readyInstructionText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  viewTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4dc4ff',
    paddingVertical: 12,
    borderRadius: 14,
  },
  viewTimelineBtnText: {
    fontFamily: 'Inter',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },

  /* 6. Full-Bleed Horizontal Scroll Carousels */
  fullBleedHorizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalCarouselContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  docTypeCard: {
    width: 252,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  docTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  feeTagFree: {
    backgroundColor: '#dcfce7',
  },
  feeTagPaid: {
    backgroundColor: '#f0f9ff',
  },
  feeTagText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  feeTagTextFree: {
    color: '#166534',
  },
  feeTagTextPaid: {
    color: '#0284c7',
  },
  docTypeTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  docTypeDesc: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  docTypeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  docTypeMetaText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  docTypeBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docDetailsBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  docApplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#4dc4ff',
  },
  docApplyBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* 7. Scrollable Bulletin Cards */
  bulletinSlideCard: {
    width: 272,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#eef2f6',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  bulletinCoverBox: {
    width: '100%',
    height: 116,
    backgroundColor: '#f0f9ff',
    position: 'relative',
  },
  bulletinCoverImage: {
    width: '100%',
    height: '100%',
  },
  bulletinFallbackCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletinCategoryFloatingPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  bulletinCategoryFloatingText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.4,
  },
  bulletinSlideBody: {
    padding: 14,
  },
  bulletinMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  announcementDate: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  announcementTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  announcementDesc: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  bulletinReadMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    marginTop: 'auto' as any,
  },
  bulletinReadMoreText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  protectedPillText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  infoFooterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    gap: 6,
  },
  infoFooterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  infoFooterSeal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    backgroundColor: '#f0f9ff',
  },
  infoFooterTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  infoFooterTagline: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  infoFooterText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoFooterSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
  },
});
