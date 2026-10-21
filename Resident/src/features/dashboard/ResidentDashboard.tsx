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
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react';
import { ResidentUser, DocumentRequest, BarangayConfig, BarangayAnnouncement, DocumentType } from '../../types';
import Badge from '../../components/Badge';
import GlobalFooter from '../../components/GlobalFooter';
import { formatCurrency } from '../../core/security';

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
  // Greeting based on exact time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Welcome Hero Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeBannerGlow} />
        <View style={styles.welcomeLeft}>
          <View style={styles.welcomePill}>
            <Sparkles size={12} color="#93c5fd" />
            <Text style={styles.welcomePillText}>Barangay Zapatera Digital Desk</Text>
          </View>
          <Text style={styles.greetingText}>
            {getGreeting()}, {currentUser.first_name || currentUser.full_name?.split(' ')[0] || 'Resident'}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            Request official barangay clearances, track your applications in real-time, and read community bulletins.
          </Text>
        </View>
        <View style={styles.welcomeSealWrapper}>
          <Image
            source={{ uri: config?.seal_url || config?.logo_url || '/zapatera_seal.png' }}
            style={styles.welcomeSeal}
          />
        </View>
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
            <Text style={styles.emergencySnippet} numberOfLines={2}>{emergencyAnn.description}</Text>
          </View>
          <ArrowRight size={18} color="#ef4444" />
        </TouchableOpacity>
      ) : null}

      {/* Prominent Active Request Card */}
      {activeRequest ? (
        <View style={styles.activeRequestCard}>
          <View style={styles.activeRequestHeader}>
            <View style={styles.activeRequestHeaderLeft}>
              <View style={[styles.statusDot, activeRequest.status === 'ready_for_pickup' ? styles.statusDotGreen : styles.statusDotBlue]} />
              <Text style={styles.activeRequestHeaderTitle}>
                {activeRequest.status === 'ready_for_pickup' ? '🎉 DOCUMENT READY FOR PICKUP' : 'ACTIVE DOCUMENT APPLICATION'}
              </Text>
            </View>
            <Badge status={activeRequest.status} size="sm" />
          </View>

          <View style={styles.activeRequestBody}>
            <Text style={styles.activeDocTitle}>{activeRequest.document_title}</Text>
            <Text style={styles.activeTrackingNo}>
              Tracking Ref: <Text style={styles.activeTrackingCode}>{activeRequest.tracking_number}</Text>
            </Text>

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
                          <Text style={[styles.stageNodeText, isCurrent && styles.stageNodeTextCurrent]}>{s.step}</Text>
                        )}
                      </View>
                      {idx < arr.length - 1 && (
                        <View style={[styles.stageLine, currentStage > s.step && styles.stageLinePassed]} />
                      )}
                    </View>
                    <Text style={[styles.stageLabel, (isCurrent || isPassed) && styles.stageLabelActive]} numberOfLines={1}>
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
                  Claim at: {activeRequest.pickup_location && !activeRequest.pickup_location.toLowerCase().includes('express window')
                    ? activeRequest.pickup_location
                    : '2nd Floor, Barangay Hall Lobby, Rahmann St.'}
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
          <View style={styles.quickCardTopRow}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#1d4ed8' }]}>
              <FileText size={20} color="#ffffff" />
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </View>
          <Text style={styles.quickCardTitle}>Request a Document</Text>
          <Text style={styles.quickCardSubtitle}>Clearances, Certificates & Permits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('requests')}
          activeOpacity={0.8}
        >
          <View style={styles.quickCardTopRow}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#0284c7' }]}>
              <Clock size={20} color="#ffffff" />
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </View>
          <Text style={styles.quickCardTitle}>My Requests</Text>
          <Text style={styles.quickCardSubtitle}>Track & View Active Applications ({requests.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={onOpenRequirements}
          activeOpacity={0.8}
        >
          <View style={styles.quickCardTopRow}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#059669' }]}>
              <BookOpen size={20} color="#ffffff" />
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </View>
          <Text style={styles.quickCardTitle}>Requirements Guide</Text>
          <Text style={styles.quickCardSubtitle}>Check valid IDs & needed papers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('announcements')}
          activeOpacity={0.8}
        >
          <View style={styles.quickCardTopRow}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#7c3aed' }]}>
              <Megaphone size={20} color="#ffffff" />
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </View>
          <Text style={styles.quickCardTitle}>Announcements</Text>
          <Text style={styles.quickCardSubtitle}>News, Advisories & Programs</Text>
        </TouchableOpacity>
      </View>

      {/* Official Barangay Documents (Live from Supabase CMS / Document Information Management) */}
      {(() => {
        const availableDocTypes = (docTypes || []).filter((doc) => doc.is_active !== false && (doc as any).is_available !== false);
        if (availableDocTypes.length === 0) return null;
        return (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Official Barangay Documents</Text>
              <TouchableOpacity onPress={() => onNavigateTab('documents')}>
                <Text style={styles.seeAllText}>View All ({availableDocTypes.length}) →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docTypesScroll}>
              {availableDocTypes.map((doc) => (
                <View key={doc.id} style={styles.docTypeCard}>
                  <View style={styles.docTypeHeader}>
                    <View style={styles.docIconBox}>
                      <FileText size={18} color="#1d4ed8" />
                    </View>
                    <View style={[styles.feeTag, (doc.fee_type === 'variable' || doc.is_variable_fee) ? styles.feeTagPaid : (doc.fee === 0 ? styles.feeTagFree : styles.feeTagPaid)]}>
                      <Text style={[styles.feeTagText, (doc.fee_type === 'variable' || doc.is_variable_fee) ? styles.feeTagTextPaid : (doc.fee === 0 ? styles.feeTagTextFree : styles.feeTagTextPaid)]}>
                        {doc.fee_type === 'variable' || doc.is_variable_fee ? 'Depends upon claim' : doc.fee === 0 ? 'FREE' : formatCurrency(doc.fee)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.docTypeTitle} numberOfLines={1}>{doc.title}</Text>
                  <Text style={styles.docTypeDesc} numberOfLines={2}>{doc.description}</Text>
                  <View style={styles.docTypeMeta}>
                    <Clock size={11} color="#64748b" />
                    <Text style={styles.docTypeMetaText}>{doc.processing_days} {doc.processing_days === 1 ? 'day' : 'days'} processing</Text>
                  </View>
                  <View style={styles.docTypeBtnRow}>
                    <TouchableOpacity
                      style={styles.docDetailsBtn}
                      onPress={() => onOpenRequirements(doc)}
                      activeOpacity={0.7}
                    >
                      <Info size={13} color="#1d4ed8" />
                      <Text style={styles.docDetailsBtnText}>Requirements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.docApplyBtn}
                      onPress={() => onRequestDocument(doc)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.docApplyBtnText}>Apply</Text>
                      <ArrowRight size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        );
      })()}

      {/* Recent Announcements Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Barangay Bulletins & News</Text>
        <TouchableOpacity onPress={() => onNavigateTab('announcements')}>
          <Text style={styles.seeAllText}>See All ({announcements.length}) →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.announcementsList}>
        {announcements.length > 0 ? (
          announcements.slice(0, 3).map((item, idx) => (
            <TouchableOpacity
              key={`${item.id}-${idx}`}
              style={styles.announcementCard}
              onPress={() => onViewAnnouncement(item)}
              activeOpacity={0.8}
            >
              {item.banner_url ? (
                <Image source={{ uri: item.banner_url }} style={styles.announcementThumb} />
              ) : null}
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
          ))
        ) : (
          <View style={styles.emptyAnnouncementsCard}>
            <Megaphone size={28} color="#94a3b8" />
            <Text style={styles.emptyAnnouncementsTitle}>No Bulletins or Events Posted</Text>
            <Text style={styles.emptyAnnouncementsSub}>
              There are currently no active public announcements or upcoming events scheduled.
            </Text>
          </View>
        )}
      </View>

      {/* Barangay Hall Office Information Footer */}
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
            <Text style={styles.infoFooterTitle}>{config.barangay_name || 'Barangay Zapatera'}</Text>
            <Text style={styles.infoFooterTagline}>Official Resident Services Portal</Text>
          </View>
        </View>
        <Text style={styles.infoFooterText}>
          {config.office_hours || 'Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)'}
        </Text>
        <View style={styles.infoFooterRow}>
          <MapPin size={13} color="#64748b" />
          <Text style={styles.infoFooterSub}>{config.hall_address || '197 D. Jakosalem St., Cebu City'}</Text>
        </View>
        <View style={styles.infoFooterRow}>
          <Phone size={13} color="#64748b" />
          <Text style={styles.infoFooterSub}>Hotline: {config.contact_phone || '(032) 503-6465'}</Text>
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
    backgroundColor: '#1e3a8a',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  welcomeBannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  welcomeLeft: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  welcomePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dbeafe',
    letterSpacing: 0.3,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: 'rgba(238, 242, 255, 0.9)',
    marginTop: 6,
    lineHeight: 17,
  },
  welcomeSealWrapper: {
    alignSelf: 'center',
    zIndex: 2,
  },
  welcomeSeal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sealCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sealLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  stageTrackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
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
    backgroundColor: '#16a34a',
  },
  stageNodeCurrent: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  stageNodeText: {
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
    backgroundColor: '#16a34a',
  },
  stageLabel: {
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
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  viewTimelineBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  quickCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickCardPrimary: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8faff',
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  quickCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  quickCardSubtitle: {
    fontSize: 10.5,
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
  emptyAnnouncementsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyAnnouncementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAnnouncementsSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
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
    gap: 10,
    marginBottom: 4,
  },
  infoFooterSeal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  infoFooterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  infoFooterTagline: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
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
  docTypesScroll: {
    marginBottom: 16,
  },
  docTypeCard: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  docTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  feeTagFree: {
    backgroundColor: '#dcfce7',
  },
  feeTagPaid: {
    backgroundColor: '#eff6ff',
  },
  feeTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  feeTagTextFree: {
    color: '#166534',
  },
  feeTagTextPaid: {
    color: '#1d4ed8',
  },
  docTypeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  docTypeDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 8,
  },
  docTypeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  docTypeMetaText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
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
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docDetailsBtnText: {
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
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  docApplyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
});
