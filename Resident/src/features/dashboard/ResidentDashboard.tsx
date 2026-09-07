// Resident/src/features/dashboard/ResidentDashboard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {
  FileText,
  Clock,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Megaphone,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  Phone,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ResidentUser, DocumentRequest, BarangayConfig, BarangayAnnouncement } from '../../types';
import Badge from '../../components/Badge';

interface ResidentDashboardProps {
  currentUser: ResidentUser;
  requests: DocumentRequest[];
  announcements: BarangayAnnouncement[];
  config: BarangayConfig;
  onNavigateTab: (tab: 'home' | 'documents' | 'requests' | 'announcements' | 'profile') => void;
  onRequestDocument: (docTypeId?: string) => void;
  onOpenRequirements: () => void;
  onViewRequestDetails: (req: DocumentRequest) => void;
  onViewAnnouncement: (ann: BarangayAnnouncement) => void;
}

export default function ResidentDashboard({
  currentUser,
  requests,
  announcements,
  config,
  onNavigateTab,
  onRequestDocument,
  onOpenRequirements,
  onViewRequestDetails,
  onViewAnnouncement,
}: ResidentDashboardProps) {
  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Status counts
  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length;
  const processingCount = requests.filter((r) => r.status === 'processing').length;
  const readyCount = requests.filter((r) => r.status === 'ready_for_pickup').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  // Active request (highest priority: ready_for_pickup > processing > pending > under_review)
  const activeRequest =
    requests.find((r) => r.status === 'ready_for_pickup') ||
    requests.find((r) => r.status === 'processing') ||
    requests.find((r) => r.status === 'under_review') ||
    requests.find((r) => r.status === 'pending') ||
    null;

  // Emergency or Important announcement banner
  const emergencyAnn = announcements.find((a) => a.is_emergency);
  const importantAnn = announcements.find((a) => a.is_important && !a.is_emergency);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.greetingText}>{getGreeting()}, {currentUser.first_name || currentUser.full_name?.split(' ')[0] || 'Resident'}!</Text>
          <Text style={styles.greetingSubtitle}>How can we help you today with your official barangay documents?</Text>
        </View>
        <View style={styles.sealCircle}>
          <ShieldCheck size={28} color="#1d4ed8" />
        </View>
      </View>

      {/* Emergency Alert Banner if any */}
      {emergencyAnn && (
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
            <Text style={styles.emergencySnippet} numberOfLines={2}>{emergencyAnn.description}</Text>
          </View>
          <ArrowRight size={18} color="#ef4444" />
        </TouchableOpacity>
      )}

      {/* Prominent Active Request Card */}
      {activeRequest ? (
        <View style={styles.activeRequestCard}>
          <View style={styles.activeRequestHeader}>
            <View style={styles.activeRequestHeaderLeft}>
              <View style={[styles.statusDot, activeRequest.status === 'ready_for_pickup' ? styles.statusDotGreen : styles.statusDotBlue]} />
              <Text style={styles.activeRequestHeaderTitle}>
                {activeRequest.status === 'ready_for_pickup' ? '🎉 DOCUMENT READY FOR PICKUP' : 'ACTIVE DOCUMENT REQUEST'}
              </Text>
            </View>
            <Badge status={activeRequest.status} size="sm" />
          </View>

          <View style={styles.activeRequestBody}>
            <Text style={styles.activeDocTitle}>{activeRequest.document_title}</Text>
            <Text style={styles.activeTrackingNo}>Tracking Ref: <Text style={styles.activeTrackingCode}>{activeRequest.tracking_number}</Text></Text>

            <View style={styles.activeDetailsGrid}>
              <View style={styles.activeDetailCol}>
                <View style={styles.detailRow}>
                  <Calendar size={13} color="#64748b" />
                  <Text style={styles.detailLabel}>Pickup Date:</Text>
                </View>
                <Text style={styles.detailValue}>{activeRequest.pickup_date || 'To be scheduled'}</Text>
              </View>

              <View style={styles.activeDetailCol}>
                <View style={styles.detailRow}>
                  <Clock size={13} color="#64748b" />
                  <Text style={styles.detailLabel}>Time Interval:</Text>
                </View>
                <Text style={styles.detailValue}>{activeRequest.pickup_time_slot || 'Regular Office Hours'}</Text>
              </View>
            </View>

            {activeRequest.status === 'ready_for_pickup' && (
              <View style={styles.readyInstructionBox}>
                <MapPin size={14} color="#166534" />
                <Text style={styles.readyInstructionText}>
                  Claim at: {activeRequest.pickup_location || 'Express Window, Barangay Hall Lobby'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.viewTimelineBtn}
              onPress={() => onViewRequestDetails(activeRequest)}
            >
              <Text style={styles.viewTimelineBtnText}>View Tracking Timeline & Claim Instructions</Text>
              <ArrowRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Quick Actions Grid */}
      <Text style={styles.sectionHeading}>Quick Services</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickCard, styles.quickCardPrimary]}
          onPress={() => onRequestDocument()}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#1d4ed8' }]}>
            <FileText size={22} color="#ffffff" />
          </View>
          <Text style={styles.quickCardTitle}>Request a Document</Text>
          <Text style={styles.quickCardSubtitle}>Clearances, Certificates & Permits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('requests')}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#0284c7' }]}>
            <Clock size={22} color="#ffffff" />
          </View>
          <Text style={styles.quickCardTitle}>My Requests</Text>
          <Text style={styles.quickCardSubtitle}>Track & View Active Applications ({requests.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={onOpenRequirements}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#059669' }]}>
            <BookOpen size={22} color="#ffffff" />
          </View>
          <Text style={styles.quickCardTitle}>Requirements Guide</Text>
          <Text style={styles.quickCardSubtitle}>Check valid IDs & needed papers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('announcements')}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#7c3aed' }]}>
            <Megaphone size={22} color="#ffffff" />
          </View>
          <Text style={styles.quickCardTitle}>Announcements</Text>
          <Text style={styles.quickCardSubtitle}>News, Advisories & Programs</Text>
        </TouchableOpacity>
      </View>

      {/* Request Status Summary Row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Application Status Overview</Text>
        <TouchableOpacity onPress={() => onNavigateTab('requests')}>
          <Text style={styles.seeAllText}>View All ({requests.length}) →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
        <TouchableOpacity style={styles.statusSummaryCard} onPress={() => onNavigateTab('requests')}>
          <View style={[styles.statusSummaryIcon, { backgroundColor: '#fef3c7' }]}>
            <Clock size={16} color="#d97706" />
          </View>
          <Text style={styles.statusSummaryCount}>{pendingCount}</Text>
          <Text style={styles.statusSummaryLabel}>Pending Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statusSummaryCard} onPress={() => onNavigateTab('requests')}>
          <View style={[styles.statusSummaryIcon, { backgroundColor: '#e0e7ff' }]}>
            <FileText size={16} color="#4338ca" />
          </View>
          <Text style={styles.statusSummaryCount}>{processingCount}</Text>
          <Text style={styles.statusSummaryLabel}>Processing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statusSummaryCard} onPress={() => onNavigateTab('requests')}>
          <View style={[styles.statusSummaryIcon, { backgroundColor: '#dcfce7' }]}>
            <PackageCheck size={16} color="#15803d" />
          </View>
          <Text style={styles.statusSummaryCount}>{readyCount}</Text>
          <Text style={styles.statusSummaryLabel}>Ready for Pickup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statusSummaryCard} onPress={() => onNavigateTab('requests')}>
          <View style={[styles.statusSummaryIcon, { backgroundColor: '#d1fae5' }]}>
            <CheckCircle2 size={16} color="#065f46" />
          </View>
          <Text style={styles.statusSummaryCount}>{completedCount}</Text>
          <Text style={styles.statusSummaryLabel}>Completed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statusSummaryCard} onPress={() => onNavigateTab('requests')}>
          <View style={[styles.statusSummaryIcon, { backgroundColor: '#fee2e2' }]}>
            <XCircle size={16} color="#b91c1c" />
          </View>
          <Text style={styles.statusSummaryCount}>{rejectedCount}</Text>
          <Text style={styles.statusSummaryLabel}>Rejected</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Recent Announcements Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Barangay Bulletins & News</Text>
        <TouchableOpacity onPress={() => onNavigateTab('announcements')}>
          <Text style={styles.seeAllText}>See All ({announcements.length}) →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.announcementsList}>
        {announcements.slice(0, 3).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.announcementCard}
            onPress={() => onViewAnnouncement(item)}
            activeOpacity={0.8}
          >
            {item.banner_url && (
              <Image source={{ uri: item.banner_url }} style={styles.announcementThumb} />
            )}
            <View style={styles.announcementBody}>
              <View style={styles.announcementHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
                </View>
                <Text style={styles.announcementDate}>{item.date}</Text>
              </View>
              <Text style={styles.announcementTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.announcementDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Barangay Hall Office Information Footer */}
      <View style={styles.infoFooterCard}>
        <View style={styles.infoFooterHeader}>
          <Info size={16} color="#1d4ed8" />
          <Text style={styles.infoFooterTitle}>Barangay Hall Office Hours</Text>
        </View>
        <Text style={styles.infoFooterText}>
          {config.office_hours || 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)'}
        </Text>
        <View style={styles.infoFooterRow}>
          <MapPin size={13} color="#64748b" />
          <Text style={styles.infoFooterSub}>{config.hall_address || 'Rahmann St., Barangay Zapatera, Cebu City'}</Text>
        </View>
        <View style={styles.infoFooterRow}>
          <Phone size={13} color="#64748b" />
          <Text style={styles.infoFooterSub}>Hotline: {config.contact_phone || '(032) 255-4819'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  welcomeLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  sealCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  emergencyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  emergencyIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    fontSize: 10,
    fontWeight: '900',
    color: '#be123c',
    letterSpacing: 0.5,
  },
  emergencyDate: {
    fontSize: 10,
    color: '#9f1239',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#881337',
    marginBottom: 2,
  },
  emergencySnippet: {
    fontSize: 11,
    color: '#9f1239',
    lineHeight: 15,
  },
  activeRequestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  activeRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  activeRequestHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotBlue: {
    backgroundColor: '#2563eb',
  },
  statusDotGreen: {
    backgroundColor: '#16a34a',
  },
  activeRequestHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  activeRequestBody: {
    padding: 16,
  },
  activeDocTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  activeTrackingNo: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  activeTrackingCode: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1d4ed8',
  },
  activeDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
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
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
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
    borderRadius: 10,
    marginBottom: 12,
  },
  readyInstructionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  viewTimelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    paddingVertical: 11,
    borderRadius: 10,
  },
  viewTimelineBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  quickCardPrimary: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f7ff',
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  quickCardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  statusScroll: {
    marginBottom: 18,
  },
  statusSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 105,
    alignItems: 'center',
  },
  statusSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusSummaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusSummaryLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  announcementsList: {
    gap: 10,
    marginBottom: 20,
  },
  announcementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  announcementThumb: {
    width: 90,
    height: '100%',
    minHeight: 85,
    backgroundColor: '#cbd5e1',
  },
  announcementBody: {
    flex: 1,
    padding: 10,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  announcementDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  announcementTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  announcementDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
  },
  infoFooterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  infoFooterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  infoFooterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  infoFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoFooterSub: {
    fontSize: 11,
    color: '#64748b',
  },
});
