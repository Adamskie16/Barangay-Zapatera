// Resident/src/features/requests/MyRequestsView.tsx
import React, { useState } from 'react';
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
  Filter,
  ArrowRight,
  PlusCircle,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import { DocumentRequest, RequestStatus } from '../../types';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../core/security';

interface MyRequestsViewProps {
  requests: DocumentRequest[];
  onViewRequestDetails: (req: DocumentRequest) => void;
  onRequestNew: () => void;
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Requests', value: 'all' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready for Pickup', value: 'ready_for_pickup' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function MyRequestsView({
  requests,
  onViewRequestDetails,
  onRequestNew,
}: MyRequestsViewProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter Active vs Completed/History
  const activeRequestsList = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review' || r.status === 'processing' || r.status === 'ready_for_pickup'
  );

  const historyRequestsList = requests.filter(
    (r) => r.status === 'completed' || r.status === 'rejected'
  );

  const baseList = activeTab === 'active' ? activeRequestsList : historyRequestsList;

  const filteredRequests = baseList.filter((r) => {
    const matchesSearch =
      r.document_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      r.status === statusFilter ||
      (statusFilter === 'pending' && r.status === 'under_review');

    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>My Document Requests</Text>
            <Text style={styles.subtitle}>Track live progress and review completed clearance history.</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={onRequestNew}>
            <PlusCircle size={16} color="#ffffff" />
            <Text style={styles.newBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher: Active vs History */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'active' && styles.switchTabActive]}
            onPress={() => {
              setActiveTab('active');
              setStatusFilter('all');
            }}
          >
            <Text style={[styles.switchTabText, activeTab === 'active' && styles.switchTabTextActive]}>
              Active Requests ({activeRequestsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'history' && styles.switchTabActive]}
            onPress={() => {
              setActiveTab('history');
              setStatusFilter('all');
            }}
          >
            <Text style={[styles.switchTabText, activeTab === 'history' && styles.switchTabTextActive]}>
              Request History ({historyRequestsList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Tracking ID, document title, purpose..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Status Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterPill,
                statusFilter === f.value && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === f.value && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Requests Content List */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <TouchableOpacity
              key={req.id}
              style={[
                styles.requestCard,
                req.status === 'ready_for_pickup' && styles.requestCardReady,
                req.status === 'rejected' && styles.requestCardRejected,
              ]}
              onPress={() => onViewRequestDetails(req)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardDocTitle}>{req.document_title}</Text>
                  <Text style={styles.cardTrackingNo}>Ref: <Text style={styles.trackingCodeText}>{req.tracking_number}</Text></Text>
                </View>
                <Badge status={req.status} size="sm" />
              </View>

              <Text style={styles.cardPurpose} numberOfLines={2}>
                Purpose: {req.purpose}
              </Text>

              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <Calendar size={13} color="#64748b" />
                  <Text style={styles.scheduleLabel}>Date: <Text style={styles.scheduleVal}>{req.pickup_date || 'N/A'}</Text></Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Clock size={13} color="#64748b" />
                  <Text style={styles.scheduleLabel}>Slot: <Text style={styles.scheduleVal}>{req.pickup_time_slot || 'Regular'}</Text></Text>
                </View>
              </View>

              {req.status === 'ready_for_pickup' && (
                <View style={styles.readyHighlightBanner}>
                  <PackageCheck size={14} color="#15803d" />
                  <Text style={styles.readyHighlightText}>
                    Ready for Collection at Express Window 2! Tap to view claim pass.
                  </Text>
                </View>
              )}

              {req.status === 'rejected' && req.rejection_reason && (
                <View style={styles.rejectedBanner}>
                  <AlertTriangle size={14} color="#b91c1c" />
                  <Text style={styles.rejectedBannerText} numberOfLines={2}>
                    Reason: {req.rejection_reason}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.feeText}>
                  Fee: <Text style={styles.feeValue}>{req.fee === 0 ? 'FREE' : formatCurrency(req.fee)}</Text>
                </Text>
                <View style={styles.viewDetailsBtn}>
                  <Text style={styles.viewDetailsBtnText}>
                    {req.status === 'ready_for_pickup' ? 'View Claiming Pass' : 'View Timeline'}
                  </Text>
                  <ArrowRight size={13} color="#1d4ed8" />
                </View>
              </View>
            </TouchableOpacity>
          ))
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1d4ed8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  switchTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  switchTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  switchTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  switchTabTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  requestCardReady: {
    borderColor: '#86efac',
    borderWidth: 1.5,
  },
  requestCardRejected: {
    borderColor: '#fca5a5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardDocTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardTrackingNo: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  trackingCodeText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1d4ed8',
  },
  cardPurpose: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    gap: 12,
    marginBottom: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  scheduleVal: {
    fontWeight: '700',
    color: '#0f172a',
  },
  readyHighlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  readyHighlightText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    flex: 1,
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  rejectedBannerText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  feeText: {
    fontSize: 11,
    color: '#64748b',
  },
  feeValue: {
    fontWeight: '800',
    color: '#0f172a',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
});
