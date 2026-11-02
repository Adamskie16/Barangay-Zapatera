// Resident/src/features/requests/MyRequestsView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Search,
  FileText,
  Clock,
  Calendar,
  ArrowRight,
  Plus,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  ClipboardCheck,
  XCircle,
} from 'lucide-react';
import { DocumentRequest, DocumentType } from '../../types';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import GlobalFooter from '../../components/GlobalFooter';
import { formatCurrency } from '../../core/security';
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface MyRequestsViewProps {
  requests: DocumentRequest[];
  docTypes?: DocumentType[];
  onViewRequestDetails: (req: DocumentRequest) => void;
  onRequestNew: () => void;
  onOpenResubmit?: (req: DocumentRequest) => void;
}

const ACTIVE_STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Active', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready for Pickup', value: 'approved' },
];

const HISTORY_STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All History', value: 'all' },
  { label: 'Claimed', value: 'claimed' },
  { label: 'Declined', value: 'declined' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function MyRequestsView({
  requests,
  docTypes = [],
  onViewRequestDetails,
  onRequestNew,
  onOpenResubmit,
}: MyRequestsViewProps) {
  const [activeTab, setActiveTabState] = useState<'active' | 'history'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('zapatera_resident_requests_subtab');
        if (saved === 'active' || saved === 'history') return saved;
      }
    } catch {}
    return 'active';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const setActiveTab = (tab: 'active' | 'history') => {
    setActiveTabState(tab);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('zapatera_resident_requests_subtab', tab);
      }
    } catch {}
  };

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  // Helper to check if request is claimed / completed
  const isClaimed = (r: DocumentRequest) => {
    return r.status === 'issued' || r.status === 'completed' || !!r.is_claimed;
  };

  // Filter Active vs Request History (Claimed / Completed / Declined / Cancelled)
  const activeRequestsList = useMemo(
    () =>
      requests
        .filter(
          (r) =>
            !isClaimed(r) &&
            r.status !== 'rejected' &&
            r.status !== 'declined' &&
            r.status !== 'cancelled'
        )
        .sort((a, b) => {
          const timeA = new Date(a.created_at || a.request_date || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.request_date || b.updated_at || 0).getTime();
          return timeB - timeA;
        }),
    [requests]
  );

  // History sorted from the most recent ones
  const historyRequestsList = useMemo(
    () =>
      requests
        .filter(
          (r) =>
            isClaimed(r) ||
            r.status === 'rejected' ||
            r.status === 'declined' ||
            r.status === 'cancelled'
        )
        .sort((a, b) => {
          const timeA = new Date(a.created_at || a.request_date || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.request_date || b.updated_at || 0).getTime();
          return timeB - timeA;
        }),
    [requests]
  );

  const readyCount = useMemo(
    () =>
      activeRequestsList.filter(
        (r) => r.status === 'approved' || r.status === 'ready_for_pickup'
      ).length,
    [activeRequestsList]
  );

  const claimedCount = useMemo(
    () => historyRequestsList.filter((r) => isClaimed(r)).length,
    [historyRequestsList]
  );

  const declinedCount = useMemo(
    () =>
      historyRequestsList.filter(
        (r) => r.status === 'declined' || r.status === 'rejected'
      ).length,
    [historyRequestsList]
  );

  const baseList = activeTab === 'active' ? activeRequestsList : historyRequestsList;
  const currentFilters = activeTab === 'active' ? ACTIVE_STATUS_FILTERS : HISTORY_STATUS_FILTERS;

  const matchesFilterValue = (r: DocumentRequest, filterVal: string) => {
    if (filterVal === 'all') return true;
    const claimed = isClaimed(r);
    const normStatus = (r.status || 'pending').toLowerCase();
    if (filterVal === 'claimed') return claimed;
    if (filterVal === 'declined') return normStatus === 'declined' || normStatus === 'rejected';
    if (filterVal === 'cancelled') return normStatus === 'cancelled';
    if (filterVal === 'pending')
      return (normStatus === 'pending' || normStatus === 'under_review') && !claimed;
    if (filterVal === 'processing') return normStatus === 'processing' && !claimed;
    if (filterVal === 'approved')
      return (normStatus === 'approved' || normStatus === 'ready_for_pickup') && !claimed;
    return normStatus === filterVal;
  };

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentFilters.forEach((f) => {
      counts[f.value] = baseList.filter((r) => matchesFilterValue(r, f.value)).length;
    });
    return counts;
  }, [baseList, currentFilters]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((r) => {
      const matchesSearch =
        !q ||
        (r.document_title || '').toLowerCase().includes(q) ||
        (r.tracking_number || '').toLowerCase().includes(q) ||
        (r.purpose || '').toLowerCase().includes(q);

      return matchesSearch && matchesFilterValue(r, statusFilter);
    });
  }, [baseList, searchQuery, statusFilter]);

  const getStatusVisual = (req: DocumentRequest) => {
    const claimed = isClaimed(req);
    const isDeclined = req.status === 'declined' || req.status === 'rejected';
    const isCancelled = req.status === 'cancelled';
    const isApproved =
      (req.status === 'approved' || req.status === 'ready_for_pickup') && !claimed;

    if (claimed) {
      return {
        icon: <CheckCircle2 size={20} color="#059669" />,
        bg: '#ecfdf5',
        border: '#a7f3d0',
      };
    }
    if (isApproved) {
      return {
        icon: <PackageCheck size={20} color="#16a34a" />,
        bg: '#f0fdf4',
        border: '#bbf7d0',
      };
    }
    if (isDeclined) {
      return {
        icon: <XCircle size={20} color="#dc2626" />,
        bg: '#fef2f2',
        border: '#fecaca',
      };
    }
    if (isCancelled) {
      return {
        icon: <AlertTriangle size={20} color="#64748b" />,
        bg: '#f8fafc',
        border: '#e2e8f0',
      };
    }
    return {
      icon: <FileText size={20} color="#2563eb" />,
      bg: '#eff6ff',
      border: '#dbeafe',
    };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. HERO & STATUS SUMMARY CARD ================= */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleCol}>
            <View style={styles.heroPill}>
              <ClipboardCheck size={11} color="#2563eb" />
              <Text style={styles.heroPillText}>APPLICATION TRACKER</Text>
            </View>
            <Text style={styles.heroTitle}>My Requests</Text>
            <Text style={styles.heroSubtitle}>
              Monitor live clearance progress, pickup schedules, and release history.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newRequestBtn}
            onPress={onRequestNew}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.newRequestBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>

        {/* 4-Column Status Metrics Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
              {activeRequestsList.length}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{readyCount}</Text>
            <Text style={styles.summaryLabel}>For Pickup</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{claimedCount}</Text>
            <Text style={styles.summaryLabel}>Claimed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{declinedCount}</Text>
            <Text style={styles.summaryLabel}>Declined</Text>
          </View>
        </View>

        {/* Segmented Tab Switcher: Active vs History */}
        <View style={styles.segmentedBar}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'active' && styles.segmentBtnActive,
            ]}
            onPress={() => {
              setActiveTab('active');
              setStatusFilter('all');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'active' && styles.segmentBtnTextActive,
              ]}
            >
              Active Requests ({activeRequestsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'history' && styles.segmentBtnActive,
            ]}
            onPress={() => {
              setActiveTab('history');
              setStatusFilter('all');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'history' && styles.segmentBtnTextActive,
              ]}
            >
              Request History ({historyRequestsList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Tracking ID, document, or purpose..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              activeOpacity={0.7}
            >
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Pills with Count Bubbles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          {currentFilters.map((f) => {
            const isSelected = statusFilter === f.value;
            const count = filterCounts[f.value] ?? 0;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setStatusFilter(f.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
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
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= 2. SECTION HEADER ================= */}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsTitle}>
          {activeTab === 'active' ? 'Active Applications' : 'Completed & Archived'}{' '}
          <Text style={styles.resultsCountMuted}>({filteredRequests.length})</Text>
        </Text>

        {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
          <TouchableOpacity
            onPress={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.resetFilterLink}>Reset filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ================= 3. ORGANIZED REQUEST CARDS ================= */}
      {filteredRequests.length > 0 ? (
        filteredRequests.map((req) => {
          const claimed = isClaimed(req);
          const isDeclined = req.status === 'declined' || req.status === 'rejected';
          const isCancelled = req.status === 'cancelled';
          const isApproved =
            (req.status === 'approved' || req.status === 'ready_for_pickup') && !claimed;
          const visual = getStatusVisual(req);

          const declineReasonText =
            req.declined_details ||
            req.declined_reason ||
            req.rejection_reason ||
            'Missing required residency documents or incomplete attachments.';
          const dateDeclinedFormatted =
            req.declined_at || req.rejected_at || req.updated_at
              ? new Date(
                  req.declined_at || req.rejected_at || req.updated_at || ''
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
          const adminProcessor = req.processed_by || 'Barangay Administrator';

          const matchedDoc = docTypes.find(
            (d) =>
              d.id === req.document_type_id ||
              (d.code && d.code === req.document_type_id) ||
              (d.title || '').toLowerCase().trim() ===
                (req.document_title || '').toLowerCase().trim()
          );
          const isBusinessDoc = `${req.document_title || ''} ${matchedDoc?.title || ''}`
            .toLowerCase()
            .includes('business');
          const resolvedFee =
            claimed &&
            req.claimed_fee !== undefined &&
            req.claimed_fee !== null &&
            Number(req.claimed_fee) > 0
              ? Number(req.claimed_fee)
              : Number(req.fee) > 0
              ? Number(req.fee)
              : matchedDoc && Number(matchedDoc.fee) > 0
              ? Number(matchedDoc.fee)
              : isBusinessDoc
              ? 500
              : 0;

          const feeDisplay =
            resolvedFee === 0 ? 'FREE' : formatCurrency(resolvedFee);

          return (
            <TouchableOpacity
              key={req.id}
              style={[
                styles.requestCard,
                isApproved && styles.requestCardReady,
                isDeclined && styles.requestCardDeclined,
                isCancelled && styles.requestCardCancelled,
              ]}
              onPress={() => onViewRequestDetails(req)}
              activeOpacity={0.82}
            >
              {/* Card Top Row: Icon + Title + Ref Code + Status Badge */}
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.cardIconBox,
                    { backgroundColor: visual.bg, borderColor: visual.border },
                  ]}
                >
                  {visual.icon}
                </View>

                <View style={styles.cardTitleCol}>
                  <Text style={styles.cardDocTitle} numberOfLines={1}>
                    {req.document_title}
                  </Text>
                  <View style={styles.refMetaRow}>
                    <View style={styles.refCodeChip}>
                      <Text style={styles.refCodeText}>{req.tracking_number}</Text>
                    </View>
                    {Boolean(req.is_resubmitted) && req.status === 'pending' && (
                      <View style={styles.resubmittedTag}>
                        <RotateCcw size={10} color="#b45309" />
                        <Text style={styles.resubmittedTagText}>Resubmitted</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.statusBadgeCol}>
                  <Badge status={claimed ? 'issued' : req.status} size="sm" />
                </View>
              </View>

              {/* Compact Purpose & Schedule Strip */}
              <View style={styles.infoGridStrip}>
                <View style={styles.purposeRow}>
                  <Text style={styles.infoLabel}>Purpose:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {req.purpose || 'Official Barangay Application'}
                  </Text>
                </View>

                <View style={styles.scheduleChipsRow}>
                  <View style={styles.scheduleChip}>
                    <Calendar size={12} color="#64748b" />
                    <Text style={styles.scheduleChipText}>
                      {req.pickup_date || 'Scheduled'}
                    </Text>
                  </View>

                  <View style={styles.scheduleChip}>
                    <Clock size={12} color="#64748b" />
                    <Text style={styles.scheduleChipText}>
                      {req.pickup_time_slot || '9:00 AM - 9:30 AM'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status-Specific Callout Banners */}
              {isApproved && (
                <View style={styles.readyCallout}>
                  <PackageCheck size={15} color="#15803d" />
                  <Text style={styles.readyCalloutText}>
                    Ready for pickup at the Barangay Express Counter ({req.pickup_time_slot || '9:00 AM - 9:30 AM'}).
                  </Text>
                </View>
              )}

              {claimed && (
                <View style={styles.claimedCallout}>
                  <CheckCircle2 size={15} color="#059669" />
                  <Text style={styles.claimedCalloutText}>
                    Official document claimed & released
                    {req.claimed_at
                      ? ` on ${new Date(req.claimed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`
                      : ''}
                    .
                  </Text>
                </View>
              )}

              {isCancelled && (
                <View style={styles.cancelledCallout}>
                  <AlertTriangle size={14} color="#64748b" />
                  <Text style={styles.cancelledCalloutText}>
                    Application cancelled by resident.
                  </Text>
                </View>
              )}

              {Boolean(req.is_resubmitted) && req.status === 'pending' && (
                <View style={styles.resubmittedCallout}>
                  <RotateCcw size={13} color="#b45309" />
                  <Text style={styles.resubmittedCalloutText}>
                    Resubmitted (Attempt #{req.resubmission_count || 1}) • Awaiting Barangay Staff verification.
                  </Text>
                </View>
              )}

              {isDeclined && (
                <View style={styles.declinedBox}>
                  <View style={styles.declinedTopRow}>
                    <View style={styles.declinedTitleWrap}>
                      <XCircle size={14} color="#dc2626" />
                      <Text style={styles.declinedTitle}>Requires Compliance</Text>
                    </View>
                    <Text style={styles.declinedDateText}>{dateDeclinedFormatted}</Text>
                  </View>

                  <Text style={styles.declinedReasonText}>{declineReasonText}</Text>

                  <Text style={styles.declinedProcessorText}>
                    Reviewed by: <Text style={styles.declinedProcessorBold}>{adminProcessor}</Text>
                  </Text>

                  {onOpenResubmit && (
                    <TouchableOpacity
                      style={styles.resubmitBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        onOpenResubmit(req);
                      }}
                      activeOpacity={0.85}
                    >
                      <RotateCcw size={13} color="#ffffff" />
                      <Text style={styles.resubmitBtnText}>
                        Resubmit & Fix Requirements
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Card Footer: Fee Pill & Track Action */}
              <View style={styles.cardFooter}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>
                    {claimed ? 'Claimed Fee:' : 'Document Fee:'}
                  </Text>
                  <View
                    style={[
                      styles.feeBadge,
                      feeDisplay === 'FREE' ? styles.feeBadgeFree : styles.feeBadgePaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.feeBadgeText,
                        feeDisplay === 'FREE'
                          ? styles.feeBadgeTextFree
                          : styles.feeBadgeTextPaid,
                      ]}
                    >
                      {feeDisplay}
                    </Text>
                  </View>
                </View>

                <View style={styles.trackActionBtn}>
                  <Text style={styles.trackActionText}>
                    {claimed
                      ? 'Release Details'
                      : isDeclined
                      ? 'Decline Details'
                      : isCancelled
                      ? 'View Details'
                      : isApproved
                      ? 'View Claim Pass'
                      : 'Track Progress'}
                  </Text>
                  <ArrowRight size={14} color="#2563eb" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <EmptyState
          icon={activeTab === 'active' ? 'requests' : 'history'}
          title={
            activeTab === 'active'
              ? 'No Active Document Requests'
              : 'No Previous Request History'
          }
          description={
            activeTab === 'active'
              ? 'You do not have any pending or in-progress applications. You can file a new barangay clearance or certificate anytime.'
              : 'Your completed or previous document requests will be archived and shown here for future reference.'
          }
          actionLabel={activeTab === 'active' ? 'File Document Request' : undefined}
          onAction={activeTab === 'active' ? onRequestNew : undefined}
        />
      )}

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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },

  /* Hero & Summary Card */
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heroPillText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 17,
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  newRequestBtnText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* 4-Column Summary Strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#e2e8f0',
  },

  /* Segmented Switcher */
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 13,
    padding: 4,
    marginTop: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  segmentBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },

  /* Search Input */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#0f172a',
    padding: 0,
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Filter Pills */
  filterScroll: {
    marginTop: 12,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6.5,
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
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  filterCountBubble: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountBubbleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  filterCountText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  filterCountTextActive: {
    color: '#ffffff',
  },

  /* Results Section Header */
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsCountMuted: {
    fontWeight: '700',
    color: '#64748b',
  },
  resetFilterLink: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* Request Card */
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  requestCardReady: {
    borderColor: '#86efac',
    borderWidth: 1.5,
  },
  requestCardDeclined: {
    borderColor: '#fecaca',
  },
  requestCardCancelled: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitleCol: {
    flex: 1,
  },
  cardDocTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  refMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  refCodeChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  refCodeText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  resubmittedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  resubmittedTagText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400e',
  },
  statusBadgeCol: {
    alignItems: 'flex-end',
  },

  /* Purpose & Schedule Strip */
  infoGridStrip: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eef2f6',
    gap: 8,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  infoValue: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  scheduleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scheduleChipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  /* Status Callout Banners */
  readyCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  readyCalloutText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
    lineHeight: 16,
  },
  claimedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  claimedCalloutText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
    lineHeight: 16,
  },
  cancelledCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelledCalloutText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  resubmittedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  resubmittedCalloutText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },

  /* Declined Compliance Box */
  declinedBox: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 13,
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  declinedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  declinedTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  declinedTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
  },
  declinedDateText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#be123c',
  },
  declinedReasonText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#881337',
    lineHeight: 16,
  },
  declinedProcessorText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#9f1239',
  },
  declinedProcessorBold: {
    fontWeight: '700',
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  resubmitBtnText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Card Footer */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  feeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeBadgeFree: {
    backgroundColor: '#dcfce7',
  },
  feeBadgePaid: {
    backgroundColor: '#eff6ff',
  },
  feeBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
  },
  feeBadgeTextFree: {
    color: '#15803d',
  },
  feeBadgeTextPaid: {
    color: '#1d4ed8',
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  trackActionText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563eb',
  },
});
