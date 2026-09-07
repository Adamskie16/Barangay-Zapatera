// Resident/src/features/documents/RequirementsModal.tsx
import React, { useState } from 'react';
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
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Download,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { DocumentType } from '../../types';
import { formatCurrency } from '../../core/security';

interface RequirementsModalProps {
  visible: boolean;
  doc: DocumentType | null;
  onClose: () => void;
  onProceedToRequest: (doc: DocumentType) => void;
}

export default function RequirementsModal({
  visible,
  doc,
  onClose,
  onProceedToRequest,
}: RequirementsModalProps) {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!doc) return null;

  const handleDownloadChecklist = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleProceed = () => {
    if (!hasAcknowledged) return;
    onClose();
    onProceedToRequest(doc);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <FileText size={20} color="#1d4ed8" />
              <Text style={styles.modalTitle}>Document Requirements</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Document Header Card */}
            <View style={styles.docHeaderCard}>
              <Text style={styles.docTitle}>{doc.title}</Text>
              <Text style={styles.docDesc}>{doc.description}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaLabel}>Fee:</Text>
                  <Text style={styles.metaValue}>{doc.fee === 0 ? 'FREE' : formatCurrency(doc.fee)}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaLabel}>Processing Time:</Text>
                  <Text style={styles.metaValue}>{doc.processing_days} Business Day(s)</Text>
                </View>
                {doc.validity && (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaLabel}>Validity:</Text>
                    <Text style={styles.metaValue}>{doc.validity}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Checklist Section */}
            <Text style={styles.sectionHeading}>Mandatory & Supporting Requirements</Text>
            <Text style={styles.sectionSub}>
              Please prepare the following items. You will be asked to upload photo or PDF copies during the online application:
            </Text>

            <View style={styles.requirementsList}>
              {(doc.requirement_items || doc.requirements.map((r, i) => ({
                id: `req-${i}`,
                name: r,
                description: 'Original or clear digital scanned copy',
                is_required: i < 2,
              }))).map((item, idx) => (
                <View key={item.id || idx} style={styles.requirementItemCard}>
                  <View style={styles.reqTopRow}>
                    <View style={styles.reqTitleLeft}>
                      <CheckCircle2 size={16} color={item.is_required ? '#1d4ed8' : '#059669'} />
                      <Text style={styles.reqName}>{item.name}</Text>
                    </View>
                    <View style={[styles.reqTag, item.is_required ? styles.reqTagRequired : styles.reqTagOptional]}>
                      <Text style={[styles.reqTagText, item.is_required ? styles.reqTagTextRequired : styles.reqTagTextOptional]}>
                        {item.is_required ? 'REQUIRED' : 'OPTIONAL'}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={styles.reqDescription}>{item.description}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Download Instructions Box */}
            <View style={styles.downloadBox}>
              <View style={styles.downloadTextCol}>
                <Text style={styles.downloadTitle}>Save Requirement Instructions</Text>
                <Text style={styles.downloadSubtitle}>Keep a digital copy of the required checklist on your device.</Text>
              </View>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={handleDownloadChecklist}
              >
                <Download size={14} color="#1d4ed8" />
                <Text style={styles.downloadBtnText}>{downloadSuccess ? 'Downloaded!' : 'Download Guide'}</Text>
              </TouchableOpacity>
            </View>

            {/* Important Notes */}
            <View style={styles.alertNotice}>
              <AlertCircle size={16} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertNoticeTitle}>Important Barangay Advisory:</Text>
                <Text style={styles.alertNoticeText}>
                  Please bring your original Valid Government ID when claiming your requested document at the Barangay Hall during your selected appointment schedule.
                </Text>
              </View>
            </View>

            {/* Acknowledgment Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setHasAcknowledged(!hasAcknowledged)}
              activeOpacity={0.8}
            >
              {hasAcknowledged ? (
                <CheckSquare size={20} color="#1d4ed8" />
              ) : (
                <Square size={20} color="#94a3b8" />
              )}
              <Text style={styles.checkboxLabel}>
                I have reviewed the requirements above and confirm that I have the required documents ready for upload.
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.proceedBtn, !hasAcknowledged && styles.proceedBtnDisabled]}
              onPress={handleProceed}
              disabled={!hasAcknowledged}
            >
              <Text style={styles.proceedBtnText}>Proceed to Request</Text>
              <ArrowRight size={16} color="#ffffff" />
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
    maxHeight: '90%',
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
  docHeaderCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  docTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e40af',
  },
  docDesc: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaBadge: {
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 15,
  },
  requirementsList: {
    gap: 8,
    marginBottom: 14,
  },
  requirementItemCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  reqName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  reqTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  reqTagRequired: {
    backgroundColor: '#fee2e2',
  },
  reqTagOptional: {
    backgroundColor: '#dcfce7',
  },
  reqTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  reqTagTextRequired: {
    color: '#b91c1c',
  },
  reqTagTextOptional: {
    color: '#15803d',
  },
  reqDescription: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginLeft: 24,
  },
  downloadBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  downloadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  downloadSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  alertNotice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 14,
  },
  alertNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  alertNoticeText: {
    fontSize: 11,
    color: '#b45309',
    lineHeight: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  proceedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
  },
  proceedBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
