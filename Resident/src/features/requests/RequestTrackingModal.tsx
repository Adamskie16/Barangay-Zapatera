// Resident/src/features/requests/RequestTrackingModal.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import {
  X,
  FileText,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Download,
  Info,
  ArrowRight,
  User,
  Paperclip,
} from 'lucide-react';
import { DocumentRequest, BarangayConfig } from '../../types';
import Badge from '../../components/Badge';
import { formatCurrency } from '../../core/security';

interface RequestTrackingModalProps {
  visible: boolean;
  request: DocumentRequest | null;
  config: BarangayConfig;
  onClose: () => void;
  onReRequest?: (req: DocumentRequest) => void;
}

export default function RequestTrackingModal({
  visible,
  request,
  config,
  onClose,
  onReRequest,
}: RequestTrackingModalProps) {
  if (!request) return null;

  const isRejected = request.status === 'rejected' || request.status === 'declined';
  const isReady = request.status === 'ready_for_pickup' || request.status === 'approved';
  const isCompleted = request.status === 'completed';

  const declineReasonText = request.declined_reason || request.rejection_reason || 'Missing valid proof of residency.';
  const declineDetailsText = request.declined_details || '';
  const dateDeclinedFormatted = request.declined_at || request.rejected_at || request.updated_at ? new Date(request.declined_at || request.rejected_at || request.updated_at || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'September 8, 2026';
  const processedByAdmin = request.processed_by || 'Barangay Administrator';

  // Default timeline steps if not populated
  const timelineSteps = request.timeline || [
    {
      status: 'pending',
      label: 'Request Submitted',
      description: 'Request received online and entered in the barangay review queue.',
      timestamp: request.created_at ? new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Submitted',
      is_completed: true,
      is_current: request.status === 'pending',
    },
    {
      status: 'processing',
      label: 'Processing & Requirements Verification',
      description: 'Barangay Administrator is verifying resident identification and attached documents.',
      timestamp: request.status !== 'pending' ? 'Verified' : 'In Progress',
      is_completed: request.status !== 'pending',
      is_current: request.status === 'processing' || request.status === 'under_review',
    },
    {
      status: 'approved',
      label: isRejected ? 'Request Declined' : 'Approved & Ready for Pickup',
      description: isRejected ? 'Application declined due to incomplete or invalid requirements.' : `Available at Express Counter on ${request.pickup_date || 'scheduled date'} (${request.pickup_time_slot || '9:00 AM - 9:30 AM'}).`,
      timestamp: isReady || isCompleted || isRejected ? (isRejected ? 'Declined' : 'Approved') : 'Scheduled',
      is_completed: isReady || isCompleted || isRejected,
      is_current: isReady || isRejected,
    },
    {
      status: 'completed',
      label: 'Document Released',
      description: 'Official document signed and handed over to resident.',
      timestamp: isCompleted ? 'Claimed' : 'Pending Pickup',
      is_completed: isCompleted,
      is_current: isCompleted,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Clock size={20} color="#1d4ed8" />
              <Text style={styles.modalTitle}>Request Tracking Timeline</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Top Tracking Ref Banner */}
            <View style={styles.trackingHeaderCard}>
              <View style={styles.trackingTopRow}>
                <View>
                  <Text style={styles.trackingRefLabel}>TRACKING NUMBER</Text>
                  <Text style={styles.trackingRefCode}>{request.tracking_number}</Text>
                </View>
                <Badge status={request.status} size="md" />
              </View>
              <Text style={styles.trackingDocName}>{request.document_title}</Text>
              <Text style={styles.trackingPurpose}>Purpose: {request.purpose}</Text>
            </View>

            {/* 7. RESIDENT NOTIFICATION MODAL / REJECTION CARD */}
            {isRejected && (
              <View style={styles.rejectionCard}>
                <View style={styles.rejectionHeader}>
                  <XCircle size={22} color="#b91c1c" />
                  <div>
                    <Text style={styles.rejectionTitle}>Document Request Declined</Text>
                    <Text style={styles.rejectionSubtitle}>
                      Unfortunately, your document request could not be approved because the submitted requirements did not meet the barangay's verification requirements.
                    </Text>
                  </div>
                </View>

                <View style={styles.declineSectionItem}>
                  <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                  <Text style={styles.rejectionReasonText}>
                    {declineReasonText}
                  </Text>
                </View>

                {declineDetailsText ? (
                  <View style={styles.declineSectionItem}>
                    <Text style={styles.rejectionReasonLabel}>Additional Details / Explanation:</Text>
                    <Text style={styles.rejectionReasonText}>
                      {declineDetailsText}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.rejectionActionBox}>
                  <Info size={16} color="#991b1b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rejectionActionHeader}>What you need to do:</Text>
                    <Text style={styles.rejectionActionText}>
                      Please submit a valid and current proof of residency and create a new request.
                    </Text>
                  </View>
                </View>

                <View style={styles.declineMetaBox}>
                  <Text style={styles.declineMetaLine}>Date Declined: <Text style={{ fontWeight: '700' }}>{dateDeclinedFormatted}</Text></Text>
                  <Text style={styles.declineMetaLine}>Processed By: <Text style={{ fontWeight: '700' }}>{processedByAdmin}</Text></Text>
                </View>

                {onReRequest && (
                  <TouchableOpacity
                    style={styles.reRequestBtn}
                    onPress={() => {
                      onClose();
                      onReRequest(request);
                    }}
                  >
                    <Text style={styles.reRequestBtnText}>Submit New Corrected Request</Text>
                    <ArrowRight size={14} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* READY FOR PICKUP PASS CARD */}
            {isReady && (
              <View style={styles.readyPassCard}>
                <View style={styles.readyPassHeader}>
                  <ShieldCheck size={20} color="#15803d" />
                  <Text style={styles.readyPassTitle}>OFFICIAL CLAIMING PASS</Text>
                </View>
                <Text style={styles.readyPassDoc}>{request.document_title}</Text>

                <View style={styles.passGrid}>
                  <View style={styles.passCol}>
                    <Text style={styles.passLabel}>PICKUP DATE</Text>
                    <Text style={styles.passValue}>{request.pickup_date}</Text>
                  </View>
                  <View style={styles.passCol}>
                    <Text style={styles.passLabel}>APPOINTMENT INTERVAL</Text>
                    <Text style={styles.passValue}>{request.pickup_time_slot}</Text>
                  </View>
                </View>

                <View style={styles.passLocationBox}>
                  <MapPin size={14} color="#166534" />
                  <Text style={styles.passLocationText}>
                    {request.pickup_location || 'Express Window 2, Barangay Hall Lobby, Rahmann St.'}
                  </Text>
                </View>

                {/* QR Code Simulation */}
                <View style={styles.qrSection}>
                  <View style={styles.qrPlaceholder}>
                    <QrCode size={64} color="#0f172a" />
                  </View>
                  <Text style={styles.qrSubText}>
                    Present this QR code or Tracking No. <Text style={{ fontWeight: '800' }}>{request.tracking_number}</Text> to the Counter Clerk.
                  </Text>
                </View>

                <View style={styles.readyFeeRow}>
                  <Text style={styles.readyFeeLabel}>Fee to Prepare:</Text>
                  <Text style={styles.readyFeeValue}>
                    {request.fee === 0 ? 'FREE (₱0.00)' : formatCurrency(request.fee)}
                  </Text>
                </View>
              </View>
            )}

            {/* VERTICAL TIMELINE */}
            <Text style={styles.timelineHeading}>Application Progress Timeline</Text>
            <View style={styles.timelineContainer}>
              {timelineSteps.map((step, idx) => {
                const isLast = idx === timelineSteps.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    {/* Left Icon & Connecting Line */}
                    <View style={styles.timelineLeftCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          step.is_completed && styles.timelineDotCompleted,
                          step.is_current && styles.timelineDotCurrent,
                          isRejected && step.status === request.status && styles.timelineDotRejected,
                        ]}
                      >
                        {step.is_completed ? (
                          <CheckCircle2 size={12} color="#ffffff" />
                        ) : (
                          <View style={styles.innerDot} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            step.is_completed && styles.timelineLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    {/* Right Content */}
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineRow}>
                        <Text
                          style={[
                            styles.timelineStepLabel,
                            step.is_current && styles.timelineStepLabelCurrent,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.timelineTimestamp}>{step.timestamp}</Text>
                      </View>
                      <Text style={styles.timelineStepDesc}>{step.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* REQUEST DETAILS SUMMARY */}
            <Text style={[styles.timelineHeading, { marginTop: 16 }]}>Application Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Applicant Name:</Text>
                <Text style={styles.summaryVal}>{request.resident_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Registered Address:</Text>
                <Text style={styles.summaryVal}>{request.resident_address || 'Barangay Zapatera'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Contact Number:</Text>
                <Text style={styles.summaryVal}>{request.resident_phone || '0917-000-0000'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee:</Text>
                <Text style={[styles.summaryVal, { color: '#1d4ed8', fontWeight: '800' }]}>
                  {request.fee === 0 ? 'FREE' : formatCurrency(request.fee)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Attached Files:</Text>
                <Text style={styles.summaryVal}>
                  {request.requirements_attached?.length || 0} document(s) uploaded
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
              <Text style={styles.closeModalBtnText}>Close Tracking</Text>
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
    maxHeight: '92%',
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
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  trackingHeaderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  trackingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackingRefLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  trackingRefCode: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1d4ed8',
  },
  trackingDocName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  trackingPurpose: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rejectionCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffe4e6',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  rejectionSubtitle: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 2,
    lineHeight: 15,
  },
  declineSectionItem: {
    gap: 2,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7f1d1d',
    textTransform: 'uppercase',
  },
  rejectionReasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 16,
  },
  rejectionActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectionActionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7f1d1d',
    marginBottom: 2,
  },
  rejectionActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 15,
  },
  declineMetaBox: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffe4e6',
    gap: 4,
  },
  declineMetaLine: {
    fontSize: 10,
    color: '#9f1239',
  },
  reRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  reRequestBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  readyPassCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  readyPassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  readyPassTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  readyPassDoc: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532d',
    marginBottom: 10,
  },
  passGrid: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 10,
  },
  passCol: {
    flex: 1,
  },
  passLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  passValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  passLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  passLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  qrSection: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 10,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  qrSubText: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },
  readyFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  readyFeeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  readyFeeValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
  },
  timelineHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  timelineContainer: {
    paddingLeft: 4,
    marginBottom: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#16a34a',
  },
  timelineDotCurrent: {
    backgroundColor: '#1d4ed8',
  },
  timelineDotRejected: {
    backgroundColor: '#dc2626',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#86efac',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  timelineStepLabelCurrent: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  timelineTimestamp: {
    fontSize: 10,
    color: '#94a3b8',
  },
  timelineStepDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  closeModalBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
