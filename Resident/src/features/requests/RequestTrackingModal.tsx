// Resident/src/features/requests/RequestTrackingModal.tsx
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
  X,
  FileText,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Info,
  User,
  RotateCcw,
  Copy,
  Check,
  PackageCheck,
  Receipt,
} from 'lucide-react';
import { DocumentRequest, DocumentType, BarangayConfig } from '../../types';
import Badge from '../../components/Badge';
import { formatCurrency } from '../../core/security';
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface RequestTrackingModalProps {
  visible: boolean;
  request: DocumentRequest | null;
  docTypes?: DocumentType[];
  config: BarangayConfig;
  onClose: () => void;
  onReRequest?: (req: DocumentRequest) => void;
  onOpenResubmit?: (req: DocumentRequest) => void;
  onCancelRequest?: (req: DocumentRequest) => void;
}

export default function RequestTrackingModal({
  visible,
  request,
  docTypes = [],
  onClose,
  onReRequest,
  onOpenResubmit,
  onCancelRequest,
}: RequestTrackingModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  if (!request) return null;

  const normStatus = (request.status || 'pending').toLowerCase();
  const isClaimed =
    normStatus === 'completed' ||
    normStatus === 'issued' ||
    Boolean(request.is_claimed) ||
    Boolean(request.claimed_at);
  const isRejected = normStatus === 'rejected' || normStatus === 'declined';
  const isCancelled = normStatus === 'cancelled';
  const isReady =
    (normStatus === 'ready_for_pickup' || normStatus === 'approved') &&
    !isClaimed &&
    !isRejected &&
    !isCancelled;
  const isUnderReview =
    normStatus === 'under_review' || normStatus === 'processing';
  const isCompleted = isClaimed;
  const canCancel =
    !isClaimed &&
    !isRejected &&
    !isCancelled &&
    normStatus !== 'completed' &&
    normStatus !== 'issued';

  const declineReasonText =
    request.declined_reason ||
    request.rejection_reason ||
    'Missing valid proof of residency.';
  const declineDetailsText = request.declined_details || '';
  const dateDeclinedFormatted =
    request.declined_at || request.rejected_at || request.updated_at
      ? new Date(
        request.declined_at || request.rejected_at || request.updated_at || ''
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
  const processedByAdmin = request.processed_by || 'Barangay Administrator';

  const handleCopyTracking = () => {
    if (request.tracking_number) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(request.tracking_number);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  // 4-Stage Official Tracking Timeline
  const timelineSteps = [
    {
      status: 'pending',
      label: 'Request Submitted',
      description:
        'Application received online and registered in the Barangay Zapatera records queue.',
      timestamp: request.created_at
        ? new Date(request.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        : 'Submitted',
      is_completed: true,
      is_current: normStatus === 'pending',
    },
    {
      status: 'under_review',
      label: 'Under Review',
      description:
        'Barangay staff is verifying resident records and attached supporting documents.',
      timestamp:
        isUnderReview || isReady || isCompleted || isRejected || isCancelled
          ? request.updated_at
            ? new Date(request.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
            : 'In Review'
          : 'Pending Staff Review',
      is_completed: isUnderReview || isReady || isCompleted || isRejected,
      is_current: isUnderReview && !isRejected && !isCancelled,
    },
    {
      status: isCancelled ? 'cancelled' : 'ready_for_pickup',
      label: isCancelled
        ? 'Request Cancelled'
        : isRejected
          ? 'Request Declined'
          : 'Ready for Pick Up',
      description: isCancelled
        ? 'Document request was cancelled by the resident.'
        : isRejected
          ? request.declined_reason ||
          'Application declined due to incomplete or invalid requirements.'
          : `Document printed, sealed, and ready for pickup at 2nd Floor, Barangay Hall Lobby (${request.pickup_time_slot || 'Regular Office Hours'
          }).`,
      timestamp: isCancelled
        ? 'Cancelled'
        : isReady || isCompleted || isRejected
          ? isRejected
            ? 'Declined'
            : request.approved_at
              ? new Date(request.approved_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              : request.pickup_date || 'Approved'
          : `Scheduled for ${request.pickup_date || 'Pickup'}`,
      is_completed: isReady || isCompleted || isRejected || isCancelled,
      is_current: isReady || isRejected || isCancelled,
    },
    {
      status: 'completed',
      label: 'Completed & Released',
      description: isCompleted
        ? 'Official document claimed and released to resident.'
        : 'Official document claimed and handed over to resident at the counter.',
      timestamp: isCompleted
        ? request.claimed_at || request.issued_at
          ? new Date(
            request.claimed_at || request.issued_at || ''
          ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Claimed & Released'
        : 'Pending Release',
      is_completed: isCompleted,
      is_current: isCompleted,
    },
  ];

  const completedStagesCount = timelineSteps.filter((s) => s.is_completed).length;

  const matchedDoc = docTypes.find(
    (d) =>
      d.id === request.document_type_id ||
      (d.code && d.code === request.document_type_id) ||
      (d.title || '').toLowerCase().trim() ===
      (request.document_title || '').toLowerCase().trim()
  );
  const isBusinessDoc = `${request.document_title || ''} ${matchedDoc?.title || ''}`
    .toLowerCase()
    .includes('business');
  const isVarFee = !isClaimed && Boolean(request.is_variable_fee || request.fee_type === 'variable' || matchedDoc?.fee_type === 'variable' || matchedDoc?.is_variable_fee);
  const resolvedFee =
    isClaimed &&
      request.claimed_fee !== undefined &&
      request.claimed_fee !== null &&
      Number(request.claimed_fee) > 0
      ? Number(request.claimed_fee)
      : Number(request.fee) > 0
        ? Number(request.fee)
        : matchedDoc && Number(matchedDoc.fee) > 0
          ? Number(matchedDoc.fee)
          : 0;

  const feeFormatted =
    isVarFee ? 'Depends on Claim' : resolvedFee === 0 ? 'FREE (₱0.00)' : formatCurrency(resolvedFee);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ================= 1. HEADER ================= */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Clock size={19} color="#2563eb" />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerSubtitleTag}>LIVE STATUS TRACKER</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Request Timeline & Pass
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. HERO TRACKING REFERENCE CARD ================= */}
            <View style={styles.heroRefCard}>
              <View style={styles.heroRefTopRow}>
                <View style={styles.refCodeWrap}>
                  <Text style={styles.trackingRefLabel}>TRACKING REFERENCE</Text>
                  <View style={styles.refCodeActionRow}>
                    <Text style={styles.trackingRefCode}>
                      {request.tracking_number}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyBtnPill,
                        copiedCode && styles.copyBtnPillActive,
                      ]}
                      onPress={handleCopyTracking}
                      activeOpacity={0.75}
                    >
                      {copiedCode ? (
                        <>
                          <Check size={11} color="#15803d" strokeWidth={2.5} />
                          <Text style={styles.copyBtnTextSuccess}>Copied</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={11} color="#2563eb" />
                          <Text style={styles.copyBtnText}>Copy</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Badge status={isClaimed ? 'issued' : request.status} size="md" />
              </View>

              <View style={styles.heroDivider} />

              <Text style={styles.trackingDocName}>{request.document_title}</Text>
              <Text style={styles.trackingPurpose}>
                Purpose: <Text style={styles.trackingPurposeVal}>{request.purpose}</Text>
              </Text>

              {/* Quick Schedule & Fee Strip */}
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <Calendar size={12} color="#2563eb" />
                  <Text style={styles.heroMetaPillText}>
                    {request.pickup_date || 'Scheduled'}
                  </Text>
                </View>

                <View style={styles.heroMetaPill}>
                  <Clock size={12} color="#2563eb" />
                  <Text style={styles.heroMetaPillText}>
                    {request.pickup_time_slot || '9:00 AM - 9:30 AM'}
                  </Text>
                </View>

                <View style={styles.heroFeePill}>
                  <Text style={styles.heroFeePillText}>{feeFormatted}</Text>
                </View>
              </View>
            </View>

            {/* ================= 3. STATUS-SPECIFIC ACTION / PASS CARDS ================= */}
            {/* Declined / Rejected Compliance Card */}
            {isRejected && (
              <View style={styles.rejectionCard}>
                <View style={styles.rejectionHeader}>
                  <View style={styles.rejectionIconCircle}>
                    <XCircle size={20} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rejectionTitle}>
                      Application Requires Compliance
                    </Text>
                    <Text style={styles.rejectionSubtitle}>
                      Your request could not be approved due to the following verification issue:
                    </Text>
                  </View>
                </View>

                <View style={styles.declineReasonBox}>
                  <Text style={styles.rejectionReasonLabel}>REASON FOR DECLINING</Text>
                  <Text style={styles.rejectionReasonText}>{declineReasonText}</Text>
                  {declineDetailsText ? (
                    <Text style={styles.rejectionDetailsSub}>
                      {declineDetailsText}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.rejectionActionBox}>
                  <Info size={15} color="#991b1b" />
                  <Text style={styles.rejectionActionText}>
                    You can replace or upload clear copies of the missing documents and resubmit this application directly.
                  </Text>
                </View>

                <View style={styles.declineMetaBox}>
                  <Text style={styles.declineMetaLine}>
                    Declined: <Text style={{ fontWeight: '700' }}>{dateDeclinedFormatted}</Text>
                  </Text>
                  <Text style={styles.declineMetaLine}>
                    By: <Text style={{ fontWeight: '700' }}>{processedByAdmin}</Text>
                  </Text>
                </View>

                {(onOpenResubmit || onReRequest) && (
                  <TouchableOpacity
                    style={styles.reRequestBtn}
                    onPress={() => {
                      onClose();
                      if (onOpenResubmit) {
                        onOpenResubmit(request);
                      } else if (onReRequest) {
                        onReRequest(request);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <RotateCcw size={15} color="#ffffff" />
                    <Text style={styles.reRequestBtnText}>
                      Resubmit & Fix Requirements
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Resubmitted Notice Card */}
            {request.is_resubmitted && !isRejected && (
              <View style={styles.resubmissionNoticeCard}>
                <View style={styles.resubmissionHeader}>
                  <RotateCcw size={15} color="#2563eb" />
                  <Text style={styles.resubmissionTitle}>
                    Application Resubmitted (Attempt #{request.resubmission_count || 1})
                  </Text>
                </View>
                {request.previous_decline_reason ? (
                  <Text style={styles.resubmissionPrevReason}>
                    Previous Issue:{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {request.previous_decline_reason}
                    </Text>
                  </Text>
                ) : null}
                {request.resubmission_notes ? (
                  <Text style={styles.resubmissionNotes}>
                    Your Note: "{request.resubmission_notes}"
                  </Text>
                ) : null}
              </View>
            )}

            {/* Cancelled Request Card */}
            {isCancelled && (
              <View style={styles.cancelledCard}>
                <View style={styles.cancelledHeader}>
                  <AlertTriangle size={20} color="#64748b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cancelledTitle}>
                      Document Request Cancelled
                    </Text>
                    <Text style={styles.cancelledSubtitle}>
                      This application was cancelled by the resident and archived in your request history.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Claimed Success Card */}
            {isCompleted && (
              <View style={styles.claimedSuccessCard}>
                <View style={styles.claimedHeader}>
                  <View style={styles.claimedIconBox}>
                    <CheckCircle2 size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.claimedTitle}>
                      Document Claimed & Released
                    </Text>
                    <Text style={styles.claimedSubtitle}>
                      Official certificate released at the Barangay Zapatera Hall counter.
                    </Text>
                  </View>
                </View>
                <View style={styles.claimedMetaRow}>
                  <Text style={styles.claimedMetaLine}>
                    Date Released:{' '}
                    <Text style={{ fontWeight: '800' }}>
                      {request.claimed_at || request.issued_at
                        ? new Date(
                          request.claimed_at || request.issued_at || ''
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                        : 'Released'}
                    </Text>
                  </Text>
                  {request.claimed_by_admin ? (
                    <Text style={styles.claimedMetaLine}>
                      By: <Text style={{ fontWeight: '800' }}>{request.claimed_by_admin}</Text>
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Under Review Card */}
            {isUnderReview && !isRejected && (
              <View style={styles.underReviewCard}>
                <View style={styles.underReviewHeader}>
                  <Clock size={16} color="#2563eb" />
                  <Text style={styles.underReviewTitle}>
                    APPLICATION UNDER STAFF REVIEW
                  </Text>
                </View>
                <Text style={styles.underReviewText}>
                  Barangay officers are currently verifying your residency record and uploaded attachments.
                </Text>
              </View>
            )}

            {/* Official Claiming Pass Card (Ready for Pickup) */}
            {isReady && (
              <View style={styles.readyPassCard}>
                <View style={styles.readyPassHeader}>
                  <PackageCheck size={16} color="#15803d" />
                  <Text style={styles.readyPassTitle}>
                    OFFICIAL CLAIMING PASS • READY FOR PICKUP
                  </Text>
                </View>

                <View style={styles.passGrid}>
                  <View style={styles.passCol}>
                    <Text style={styles.passLabel}>PICKUP DATE</Text>
                    <Text style={styles.passValue}>
                      {request.pickup_date || 'Scheduled Date'}
                    </Text>
                  </View>
                  <View style={styles.passDividerVertical} />
                  <View style={styles.passCol}>
                    <Text style={styles.passLabel}>TIME WINDOW</Text>
                    <Text style={styles.passValue}>
                      {request.pickup_time_slot || '9:00 AM - 9:30 AM'}
                    </Text>
                  </View>
                </View>

                <View style={styles.passLocationBox}>
                  <MapPin size={13} color="#15803d" />
                  <Text style={styles.passLocationText}>
                    {request.pickup_location &&
                      !request.pickup_location.toLowerCase().includes('express window')
                      ? request.pickup_location
                      : '2nd Floor, Barangay Hall Lobby, Rahmann St.'}
                  </Text>
                </View>

                <View style={styles.claimNoticeBox}>
                  <Text style={styles.claimNoticeText}>
                    Present Tracking No.{' '}
                    <Text style={{ fontWeight: '800', fontFamily: 'monospace' }}>
                      {request.tracking_number}
                    </Text>{' '}
                    and 1 valid ID at the Releasing Counter.
                  </Text>
                </View>
              </View>
            )}

            {/* ================= 4. VERTICAL PROGRESS TIMELINE CARD ================= */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <ShieldCheck size={15} color="#2563eb" />
                  <Text style={styles.sectionTitle}>
                    Application Progress Timeline
                  </Text>
                </View>
                <View style={styles.stageCounterPill}>
                  <Text style={styles.stageCounterText}>
                    {completedStagesCount}/{timelineSteps.length} Stages
                  </Text>
                </View>
              </View>

              <View style={styles.timelineContainer}>
                {timelineSteps.map((step, idx) => {
                  const isLast = idx === timelineSteps.length - 1;
                  const isCurrentRejected = isRejected && step.is_current;

                  return (
                    <View key={idx} style={styles.timelineItem}>
                      <View style={styles.timelineLeftCol}>
                        <View
                          style={[
                            styles.timelineDot,
                            step.is_completed && styles.timelineDotCompleted,
                            step.is_current && styles.timelineDotCurrent,
                            isCurrentRejected && styles.timelineDotRejected,
                          ]}
                        >
                          {step.is_completed && !isCurrentRejected ? (
                            <Check size={11} color="#ffffff" strokeWidth={3} />
                          ) : (
                            <View
                              style={[
                                styles.innerDot,
                                (step.is_current || isCurrentRejected) && {
                                  backgroundColor: '#ffffff',
                                },
                              ]}
                            />
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

                      <View
                        style={[
                          styles.timelineContent,
                          step.is_current && styles.timelineContentCurrent,
                        ]}
                      >
                        <View style={styles.timelineRow}>
                          <Text
                            style={[
                              styles.timelineStepLabel,
                              step.is_current && styles.timelineStepLabelCurrent,
                              isCurrentRejected && { color: '#dc2626' },
                            ]}
                          >
                            {step.label}
                          </Text>
                          <Text style={styles.timelineTimestamp}>
                            {step.timestamp}
                          </Text>
                        </View>
                        <Text style={styles.timelineStepDesc}>
                          {step.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ================= 5. RESIDENT & REQUEST DETAILS CARD ================= */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <User size={15} color="#2563eb" />
                  <Text style={styles.sectionTitle}>Applicant & Request Details</Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Applicant Name</Text>
                  <Text style={styles.detailValueBold}>
                    {request.resident_name || 'Resident Applicant'}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered Address</Text>
                  <Text style={styles.detailValue}>
                    {request.sitio ||
                      request.resident_address ||
                      'Barangay Zapatera'}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Number</Text>
                  <Text style={styles.detailValue}>
                    {request.resident_phone || 'On Record'}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Length of Residency</Text>
                  <Text style={[styles.detailValueBold, { color: '#2563eb' }]}>
                    {request.years_in_barangay
                      ? String(request.years_in_barangay)
                        .toLowerCase()
                        .includes('year')
                        ? String(request.years_in_barangay)
                        : `${request.years_in_barangay} years`
                      : '5 years'}
                  </Text>
                </View>

                {request.business_name && (
                  <>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Business Name</Text>
                      <Text style={styles.detailValueBold}>{request.business_name}</Text>
                    </View>
                    {request.permittee_name ? (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Permittee</Text>
                          <Text style={styles.detailValue}>{request.permittee_name}</Text>
                        </View>
                      </>
                    ) : null}
                    {request.nature_of_business ? (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Nature of Business</Text>
                          <Text style={styles.detailValue}>{request.nature_of_business}</Text>
                        </View>
                      </>
                    ) : null}
                    {request.business_address ? (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Business Address</Text>
                          <Text style={styles.detailValue}>{request.business_address}</Text>
                        </View>
                      </>
                    ) : null}
                  </>
                )}

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date Filed</Text>
                  <Text style={styles.detailValue}>
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )
                      : 'Filed Online'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ================= 6. FOOTER ================= */}
          <View style={styles.modalFooter}>
            <View style={styles.modalFooterRow}>
              {canCancel && onCancelRequest ? (
                <TouchableOpacity
                  style={styles.cancelRequestBtn}
                  onPress={() => setShowCancelConfirm(true)}
                  activeOpacity={0.8}
                >
                  <XCircle size={15} color="#dc2626" />
                  <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.closeModalBtn,
                  canCancel && onCancelRequest ? styles.closeModalBtnFlex : null,
                ]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <X size={15} color="#ffffff" />
                <Text style={styles.closeModalBtnText}>Close Window</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Confirmation Modal for Request Cancellation */}
      {showCancelConfirm && (
        <View style={[StyleSheet.absoluteFill, styles.confirmOverlay, { zIndex: 9999 }]}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconCircle}>
              <AlertTriangle size={24} color="#dc2626" />
            </View>
            <Text style={styles.confirmTitle}>Cancel Document Request?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to cancel your request for "
              {request.document_title}" (Ref: {request.tracking_number})?
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowCancelConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelBtnText}>Keep Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmProceedBtn}
                onPress={() => {
                  setShowCancelConfirm(false);
                  onCancelRequest?.(request);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmProceedBtnText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    padding: 14,
  },
  modalContent: {
    backgroundColor: '#f4f7fb',
    borderRadius: 24,
    maxHeight: '93%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  /* Header */
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerSubtitleTag: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 14,
    paddingBottom: 22,
    gap: 12,
  },

  /* Hero Reference Card */
  heroRefCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  heroRefTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  refCodeWrap: {
    flex: 1,
  },
  trackingRefLabel: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  refCodeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  trackingRefCode: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1d4ed8',
  },
  copyBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copyBtnPillActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  copyBtnText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  copyBtnTextSuccess: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 11,
  },
  trackingDocName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  trackingPurpose: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  trackingPurposeVal: {
    color: '#334155',
    fontWeight: '700',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroMetaPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  heroFeePill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  heroFeePillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },

  /* Status Cards */
  rejectionCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rejectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectionTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  rejectionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#b91c1c',
    marginTop: 2,
    lineHeight: 16,
  },
  declineReasonBox: {
    backgroundColor: '#ffffff',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectionReasonLabel: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#be123c',
    letterSpacing: 0.5,
  },
  rejectionReasonText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#881337',
    marginTop: 3,
    lineHeight: 17,
  },
  rejectionDetailsSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#9f1239',
    marginTop: 4,
  },
  rejectionActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
  },
  rejectionActionText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 15,
  },
  declineMetaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  declineMetaLine: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#9f1239',
  },
  reRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 11,
    borderRadius: 11,
  },
  reRequestBtnText: {
    fontFamily: 'Inter',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  resubmissionNoticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  resubmissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  resubmissionTitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  resubmissionPrevReason: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#1e40af',
  },
  resubmissionNotes: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#2563eb',
  },

  cancelledCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 14,
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cancelledTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  cancelledSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },

  claimedSuccessCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  claimedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  claimedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
  },
  claimedSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#047857',
    marginTop: 1,
  },
  claimedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#a7f3d0',
  },
  claimedMetaLine: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#065f46',
  },

  underReviewCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 5,
  },
  underReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  underReviewTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.4,
  },
  underReviewText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#1e3a8a',
    lineHeight: 16,
  },

  readyPassCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  readyPassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyPassTitle: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  passGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  passCol: {
    flex: 1,
  },
  passDividerVertical: {
    width: 1,
    height: 26,
    backgroundColor: '#dcfce7',
    marginHorizontal: 10,
  },
  passLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  passValue: {
    fontFamily: 'Inter',
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
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  passLocationText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  claimNoticeBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  claimNoticeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '600',
  },

  /* Section Cards (Timeline & Details) */
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  stageCounterPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  stageCounterText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* Timeline */
  timelineContainer: {
    paddingLeft: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 58,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  timelineDotCurrent: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timelineDotRejected: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
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
    marginVertical: 3,
  },
  timelineLineCompleted: {
    backgroundColor: '#86efac',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
    paddingHorizontal: 10,
    paddingTop: 2,
    borderRadius: 12,
  },
  timelineContentCurrent: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  timelineStepLabel: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  timelineStepLabelCurrent: {
    color: '#2563eb',
    fontWeight: '800',
  },
  timelineTimestamp: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  timelineStepDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },

  /* Details Table */
  detailsGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    flex: 1,
  },
  detailValueBold: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },

  /* Footer */
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelRequestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelRequestBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#b91c1c',
  },
  closeModalBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#b91c1c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  closeModalBtnFlex: {
    flex: 1,
    width: 'auto',
  },
  closeModalBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Cancel Confirmation Modal */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmBox: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    maxWidth: 380,
    width: '100%',
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmMessage: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  confirmProceedBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
  },
  confirmProceedBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
