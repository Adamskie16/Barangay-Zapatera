// Resident/src/features/requests/ResubmitRequestModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
  Clock,
  Trash2,
  Eye,
  Check,
} from 'lucide-react';
import {
  DocumentRequest,
  DocumentType,
  ResidentUser,
  UploadedRequirementFile,
} from '../../types';
import { uploadResidentRequirementFile, deleteStoredFile } from '../../core/storageService';
import { analyzeDocumentImage } from '../../core/documentAiService';
import ActionModal from '../../components/ActionModal';

interface ResubmitRequestModalProps {
  visible: boolean;
  request: DocumentRequest | null;
  docTypes: DocumentType[];
  currentUser: ResidentUser;
  onClose: () => void;
  onResubmitSuccess: (updatedRequest: DocumentRequest) => void;
}

export default function ResubmitRequestModal({
  visible,
  request,
  docTypes,
  currentUser,
  onClose,
  onResubmitSuccess,
}: ResubmitRequestModalProps) {
  const [purpose, setPurpose] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<{ [reqName: string]: UploadedRequirementFile }>({});
  const [complianceNotes, setComplianceNotes] = useState<string>('');
  const [uploadingMap, setUploadingMap] = useState<{ [reqName: string]: boolean }>({});
  const [uploadError, setUploadError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<UploadedRequirementFile | null>(null);

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'confirmation' | 'info';
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    buttonText?: string;
    onConfirm?: () => void;
    onClose?: () => void;
  }>({
    isOpen: false,
    title: '',
  });

  // Populate data whenever modal opens or request changes
  useEffect(() => {
    if (visible && request) {
      setPurpose(request.purpose || '');
      setComplianceNotes('');
      setUploadError('');

      // Map existing uploaded files
      const fileMap: { [reqName: string]: UploadedRequirementFile } = {};
      if (Array.isArray(request.uploaded_files)) {
        request.uploaded_files.forEach((file) => {
          if (file && file.requirement_name) {
            fileMap[file.requirement_name] = file;
          }
        });
      }
      setUploadedFiles(fileMap);
    }
  }, [visible, request]);

  if (!visible || !request) return null;

  // Find document type requirements
  const matchedDocType = docTypes.find(
    (dt) => dt.id === request.document_type_id || dt.title === request.document_title
  );

  // Requirements list: from matchedDocType or fallback to request's requirements_attached or existing uploaded file names
  let requirementsList: string[] = [];
  if (matchedDocType && Array.isArray(matchedDocType.requirements) && matchedDocType.requirements.length > 0) {
    requirementsList = matchedDocType.requirements;
  } else if (Array.isArray(request.requirements_attached) && request.requirements_attached.length > 0) {
    requirementsList = request.requirements_attached;
  } else if (Object.keys(uploadedFiles).length > 0) {
    requirementsList = Object.keys(uploadedFiles);
  } else {
    requirementsList = [
      'Valid Government-Issued ID (Front & Back)',
      'Proof of Residency (Utility Bill or Barangay Certificate)',
    ];
  }

  // Handle uploading or replacing a requirement file
  const handleUploadFile = (reqName: string) => {
    if (typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,application/pdf';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      setUploadingMap((prev) => ({ ...prev, [reqName]: true }));
      setUploadError('');

      try {
        const result = await uploadResidentRequirementFile(
          currentUser.id || 'resident',
          reqName,
          file,
          file.name
        );

        if (!result.success) {
          setUploadError(result.error || `Failed to upload ${file.name}`);
          setUploadingMap((prev) => ({ ...prev, [reqName]: false }));
          return;
        }

        const isPdf = result.fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        // Execute AI Document Quality & Blur/Cut-Off Inspection
        const aiQuality = await analyzeDocumentImage(file);

        const newFile: UploadedRequirementFile = {
          requirement_name: reqName,
          file_name: result.fileName,
          file_type: result.fileType || (isPdf ? 'application/pdf' : 'image/jpeg'),
          file_size: result.fileSizeFormatted,
          file_url: result.fileUrl || result.signedUrl,
          storage_path: result.storagePath,
          bucket: result.bucket,
          signed_url: result.signedUrl,
          status: 'uploaded',
          uploaded_at: new Date().toISOString(),
          ai_quality: aiQuality,
        };

        setUploadedFiles((prev) => ({ ...prev, [reqName]: newFile }));
        setUploadError('');
      } catch (err: any) {
        setUploadError(err?.message || 'Upload error occurred.');
      } finally {
        setUploadingMap((prev) => ({ ...prev, [reqName]: false }));
      }
    };

    input.click();
  };

  const handleRemoveFile = async (reqName: string) => {
    const existing = uploadedFiles[reqName];
    if (existing?.storage_path) {
      deleteStoredFile('documents', existing.storage_path).catch(() => {});
    }
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      delete updated[reqName];
      return updated;
    });
  };

  const handleSubmitResubmission = async () => {
    if (!purpose.trim()) {
      setUploadError('Please provide a valid purpose for your document request.');
      return;
    }

    const filesArray = Object.values(uploadedFiles);
    if (filesArray.length === 0) {
      setUploadError('Please attach at least one valid requirement document before resubmitting.');
      return;
    }

    setIsSubmitting(true);
    setUploadError('');

    try {
      const resubmissionCount = (request.resubmission_count || 0) + 1;
      const resubmitTimestamp = new Date().toISOString();
      const prevDeclineReason = request.declined_reason || request.rejection_reason || 'Incomplete requirements';

      // Build updated request object with status reset to pending
      const updatedReq: DocumentRequest = {
        ...request,
        status: 'pending',
        is_resubmitted: true,
        resubmitted_at: resubmitTimestamp,
        resubmission_count: resubmissionCount,
        resubmission_notes: complianceNotes.trim(),
        previous_decline_reason: prevDeclineReason,
        purpose: purpose.trim(),
        uploaded_files: filesArray,
        requirements_attached: filesArray.map((f) => f.requirement_name),
        updated_at: resubmitTimestamp,
        // Append timeline event for transparency
        timeline: [
          ...(request.timeline || []),
          {
            status: 'pending',
            label: `Resubmitted (Attempt #${resubmissionCount})`,
            description: complianceNotes.trim()
              ? `Application resubmitted by resident with compliance notes: "${complianceNotes.trim()}"`
              : 'Application resubmitted by resident with updated requirement attachments.',
            timestamp: resubmitTimestamp,
            is_completed: true,
            is_current: true,
          },
        ],
      };

      onResubmitSuccess(updatedReq);
      onClose();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to resubmit request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const declineReasonText = request.declined_reason || request.rejection_reason || 'Incomplete requirements';
  const declineDetailsText = request.declined_details || '';
  const dateDeclinedFormatted = request.declined_at || request.rejected_at
    ? new Date(request.declined_at || request.rejected_at || '').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconBox}>
                <RotateCcw size={18} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Resubmit Document Request</Text>
                <Text style={styles.headerSubtitle}>
                  Ref: <Text style={styles.headerRefText}>{request.tracking_number}</Text> • Status will return to Pending
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Modal Scrollable Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Decline Notification & Administrative Remarks Box */}
            <View style={styles.declineAlertBox}>
              <View style={styles.declineAlertHeader}>
                <ShieldAlert size={18} color="#b91c1c" />
                <Text style={styles.declineAlertTitle}>Notice of Request Decline</Text>
              </View>
              <Text style={styles.declineAlertDesc}>
                This application was previously declined by barangay administration. Please review the reason below and comply with the necessary corrections before resubmitting.
              </Text>

              <View style={styles.declineReasonRow}>
                <Text style={styles.declineReasonLabel}>Reason for Decline:</Text>
                <Text style={styles.declineReasonVal}>{declineReasonText}</Text>
              </View>

              {declineDetailsText ? (
                <View style={styles.declineReasonRow}>
                  <Text style={styles.declineReasonLabel}>Administrative Explanation:</Text>
                  <Text style={styles.declineReasonVal}>{declineDetailsText}</Text>
                </View>
              ) : null}

              <View style={styles.declineMetaRow}>
                <Text style={styles.declineMetaText}>Date Declined: <Text style={{ fontWeight: '700' }}>{dateDeclinedFormatted}</Text></Text>
                <Text style={styles.declineMetaText}>Processed By: <Text style={{ fontWeight: '700' }}>{request.processed_by || 'Barangay Staff'}</Text></Text>
              </View>
            </View>

            {/* 2. Document & Application Info Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <FileText size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Document Details</Text>
              </View>
              <View style={styles.docInfoGrid}>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Document</Text>
                  <Text style={styles.docInfoVal}>{request.document_title}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Tracking Code</Text>
                  <Text style={styles.docInfoValCode}>{request.tracking_number}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Pickup Slot</Text>
                  <Text style={styles.docInfoVal}>{request.pickup_time_slot || 'Regular Office Hours'}</Text>
                </View>
              </View>
            </View>

            {/* 3. Purpose of Request (Editable) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Info size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Purpose of Request</Text>
              </View>
              <Text style={styles.inputHelperText}>
                You may edit or clarify your purpose to comply with administrative verification guidelines.
              </Text>
              <TextInput
                style={styles.textInput}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="Enter official purpose (e.g., Local Employment, Scholarship)"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* 4. Requirements & Attachments Compliance Checklist */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Upload size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Compliance Document Requirements</Text>
              </View>
              <Text style={styles.inputHelperText}>
                Upload or replace the required documents that were incomplete, blurred, or missing.
              </Text>

              <View style={styles.requirementsList}>
                {requirementsList.map((reqName, idx) => {
                  const uploaded = uploadedFiles[reqName];
                  const isUploading = uploadingMap[reqName];
                  const aiQuality = uploaded?.ai_quality;
                  const hasWarning = aiQuality?.status === 'warning' || aiQuality?.status === 'needs_attention';

                  return (
                    <View key={idx} style={[styles.reqItemCard, uploaded && styles.reqItemCardUploaded]}>
                      <View style={styles.reqItemTopRow}>
                        <View style={styles.reqItemTitleBox}>
                          <View style={[styles.reqNumberBadge, uploaded && styles.reqNumberBadgeUploaded]}>
                            {uploaded ? (
                              <Check size={12} color="#ffffff" />
                            ) : (
                              <Text style={styles.reqNumberBadgeText}>{idx + 1}</Text>
                            )}
                          </View>
                          <Text style={styles.reqItemName}>{reqName}</Text>
                        </View>

                        {/* Status Chip */}
                        {uploaded ? (
                          <View style={styles.uploadedChip}>
                            <CheckCircle2 size={11} color="#15803d" />
                            <Text style={styles.uploadedChipText}>Ready</Text>
                          </View>
                        ) : (
                          <View style={styles.missingChip}>
                            <AlertCircle size={11} color="#b45309" />
                            <Text style={styles.missingChipText}>Required</Text>
                          </View>
                        )}
                      </View>

                      {/* Uploaded File Details (if uploaded) */}
                      {uploaded ? (
                        <View style={styles.fileDetailBox}>
                          <View style={styles.fileDetailInfo}>
                            <FileText size={16} color="#3b82f6" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.fileDetailName} numberOfLines={1}>
                                {uploaded.file_name}
                              </Text>
                              <Text style={styles.fileDetailMeta}>
                                {uploaded.file_size || 'Attached'} • {uploaded.file_type || 'Document'}
                              </Text>
                            </View>
                          </View>

                          {/* AI Quality Chip */}
                          {aiQuality && (
                            <View
                              style={[
                                styles.aiInspectionChip,
                                hasWarning ? styles.aiInspectionWarning : styles.aiInspectionPassed,
                              ]}
                            >
                              <Sparkles size={11} color={hasWarning ? '#b45309' : '#15803d'} />
                              <Text
                                style={[
                                  styles.aiInspectionText,
                                  hasWarning ? styles.aiInspectionTextWarning : styles.aiInspectionTextPassed,
                                ]}
                              >
                                {aiQuality.summary || `Quality: ${aiQuality.qualityScore}%`}
                              </Text>
                            </View>
                          )}

                          {/* Actions: Replace or Remove */}
                          <View style={styles.fileActionsRow}>
                            <TouchableOpacity
                              style={styles.replaceBtn}
                              onPress={() => handleUploadFile(reqName)}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <ActivityIndicator size="small" color="#2563eb" />
                              ) : (
                                <>
                                  <RotateCcw size={12} color="#2563eb" />
                                  <Text style={styles.replaceBtnText}>Replace File</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.removeBtn}
                              onPress={() => handleRemoveFile(reqName)}
                              disabled={isUploading}
                            >
                              <Trash2 size={12} color="#ef4444" />
                              <Text style={styles.removeBtnText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* Empty Upload Trigger */
                        <TouchableOpacity
                          style={styles.uploadTriggerBox}
                          onPress={() => handleUploadFile(reqName)}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <View style={styles.uploadingState}>
                              <ActivityIndicator size="small" color="#2563eb" />
                              <Text style={styles.uploadingText}>Uploading document...</Text>
                            </View>
                          ) : (
                            <View style={styles.uploadIdleState}>
                              <Upload size={16} color="#2563eb" />
                              <Text style={styles.uploadIdleText}>Click to upload clear photo or PDF</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 5. Resident Compliance Notes to Staff (Optional / Helpful) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Compliance Notes for Barangay Staff</Text>
              </View>
              <Text style={styles.inputHelperText}>
                Explain the changes or new attachments you provided so the evaluating staff can verify them quickly.
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={complianceNotes}
                onChangeText={setComplianceNotes}
                placeholder="e.g., Attached newly scanned 2026 Postal ID and clear copy of Proof of Billing as requested."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Error Message */}
            {uploadError ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={15} color="#b91c1c" />
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            ) : null}

            {/* Information Notice */}
            <View style={styles.infoNoticeBox}>
              <Info size={14} color="#0369a1" />
              <Text style={styles.infoNoticeText}>
                Upon resubmission, this application's status will immediately return to <Text style={{ fontWeight: '700' }}>Pending</Text> in the Barangay Administration queue for review.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resubmitBtn, isSubmitting && styles.resubmitBtnDisabled]}
              onPress={handleSubmitResubmission}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.resubmitBtnText}>Resubmitting...</Text>
                </>
              ) : (
                <>
                  <RotateCcw size={15} color="#ffffff" />
                  <Text style={styles.resubmitBtnText}>Confirm & Resubmit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ActionModal for Feedback */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={() => setActionModal({ isOpen: false, title: '' })}
      />
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
  },
  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  headerRefText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#2563eb',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  body: {
    padding: 20,
    flex: 1,
  },
  declineAlertBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  declineAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  declineAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  declineAlertDesc: {
    fontSize: 11,
    color: '#7f1d1d',
    lineHeight: 16,
    marginBottom: 10,
  },
  declineReasonRow: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 8,
  },
  declineReasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  declineReasonVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f1d1d',
  },
  declineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  declineMetaText: {
    fontSize: 10,
    color: '#991b1b',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputHelperText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 10,
  },
  docInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docInfoItem: {
    flex: 1,
    minWidth: 140,
  },
  docInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  docInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  docInfoValCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  requirementsList: {
    gap: 12,
  },
  reqItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reqItemCardUploaded: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f7ff',
  },
  reqItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reqItemTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reqNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqNumberBadgeUploaded: {
    backgroundColor: '#16a34a',
  },
  reqNumberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reqItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  uploadedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  uploadedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  missingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  missingChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  fileDetailBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  fileDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fileDetailName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  fileDetailMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  aiInspectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  aiInspectionPassed: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  aiInspectionWarning: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  aiInspectionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  aiInspectionTextPassed: {
    color: '#15803d',
  },
  aiInspectionTextWarning: {
    color: '#b45309',
  },
  fileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  replaceBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  uploadTriggerBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  uploadIdleState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadIdleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  uploadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
    flex: 1,
  },
  infoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoNoticeText: {
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  resubmitBtnDisabled: {
    opacity: 0.6,
  },
  resubmitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
