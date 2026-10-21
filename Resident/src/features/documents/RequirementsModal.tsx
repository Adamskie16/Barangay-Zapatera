// Resident/src/features/documents/RequirementsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Platform,
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
  Search,
  ChevronRight,
  Info,
  Calendar,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { DocumentType } from '../../types';
import { formatCurrency } from '../../core/security';

interface RequirementsModalProps {
  visible: boolean;
  doc: DocumentType | null;
  docTypes?: DocumentType[];
  onClose: () => void;
  onProceedToRequest: (doc: DocumentType) => void;
}

const ACCEPTED_VALID_IDS = [
  {
    category: 'Primary Government IDs',
    items: [
      'Philippine Identification Card (PhilSys National ID / ePhilID)',
      'Philippine Passport (DFA)',
      'Driver\'s License (LTO)',
      'Unified Multi-Purpose ID (UMID / SSS / GSIS)',
      'Postal ID (Digital or Physical PVC)',
      'Professional Regulation Commission (PRC) License',
    ],
  },
  {
    category: 'Secondary & Supporting IDs',
    items: [
      'Voter\'s ID or COMELEC Voter\'s Certification',
      'Senior Citizen ID Card (OSCA)',
      'Person with Disability (PWD) ID Card',
      'Student ID with Current Semester Certificate of Registration',
      'Solo Parent ID Card',
      'Barangay Resident ID Card',
    ],
  },
];

export default function RequirementsModal({
  visible,
  doc,
  docTypes = [],
  onClose,
  onProceedToRequest,
}: RequirementsModalProps) {
  // Available documents catalog
  const catalogDocs = useMemo(() => {
    if (docTypes && docTypes.length > 0) return docTypes;
    if (doc) return [doc];
    return [];
  }, [docTypes, doc]);

  // Selected document state
  const [selectedDocId, setSelectedDocId] = useState<string>(doc?.id || catalogDocs[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'requirements' | 'guidelines' | 'ids'>('requirements');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Sync selected document when prop changes or modal opens
  useEffect(() => {
    if (visible) {
      if (doc?.id) {
        setSelectedDocId(doc.id);
      } else if (catalogDocs.length > 0 && !selectedDocId) {
        setSelectedDocId(catalogDocs[0].id);
      }
      setHasAcknowledged(false);
      setDownloadSuccess(false);
    }
  }, [visible, doc, catalogDocs]);

  // Active document
  const activeDoc = useMemo(() => {
    return (
      catalogDocs.find((d) => d.id === selectedDocId || d.code === selectedDocId) ||
      doc ||
      catalogDocs[0] ||
      null
    );
  }, [catalogDocs, selectedDocId, doc]);

  // Parse requirement strings from Document Information Management
  const requirementsList = useMemo(() => {
    if (!activeDoc) return [];
    if (activeDoc.requirement_items && activeDoc.requirement_items.length > 0) {
      return activeDoc.requirement_items;
    }

    let rawList: string[] = [];
    if (Array.isArray(activeDoc.requirements)) {
      rawList = activeDoc.requirements;
    } else if (typeof activeDoc.requirements === 'string') {
      try {
        const parsed = JSON.parse(activeDoc.requirements);
        if (Array.isArray(parsed)) rawList = parsed;
        else rawList = [activeDoc.requirements];
      } catch {
        rawList = (activeDoc.requirements as string).split('\n');
      }
    }

    return rawList
      .map((r) => (typeof r === 'string' ? r.trim() : ''))
      .filter((r) => {
        if (!r) return false;
        const s = r.toLowerCase();
        return s !== 'none' && !s.includes('no required document') && !s.startsWith('none (');
      })
      .map((reqName, idx) => ({
        id: `req-${activeDoc.id || activeDoc.code}-${idx}`,
        name: reqName,
        description: 'Original or clear scanned digital copy (JPG, PNG, PDF up to 10MB)',
        is_required: true,
      }));
  }, [activeDoc]);

  // Toggle item in resident checklist
  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Download / Save Checklist file handler
  const handleDownloadChecklist = () => {
    if (!activeDoc) return;

    try {
      const checklistText = `=====================================================
BARANGAY ZAPATERA, CEBU CITY
DOCUMENT REQUIREMENTS & APPLICATION GUIDE
=====================================================

Document: ${activeDoc.title} (${activeDoc.code || 'Official Document'})
Issuance Fee: ${activeDoc.fee_type === 'variable' || activeDoc.is_variable_fee ? 'Depends upon claim (Assessed at barangay hall)' : activeDoc.fee === 0 ? 'FREE / No Charge' : formatCurrency(activeDoc.fee)}
Estimated Processing Time: ${activeDoc.processing_days} Business Day(s)
Validity: ${activeDoc.validity || '6 Months from date of issuance'}

DESCRIPTION & SCOPE:
${activeDoc.description || 'Official Barangay Document'}

-----------------------------------------------------
REQUIRED ATTACHMENTS & REQUIREMENTS:
-----------------------------------------------------
${requirementsList.map((r, i) => `[ ] ${i + 1}. ${r.name} (${r.is_required ? 'REQUIRED' : 'OPTIONAL'})\n    - ${r.description}`).join('\n\n')}

-----------------------------------------------------
ACCEPTED PHILIPPINE GOVERNMENT IDs:
-----------------------------------------------------
- PhilSys National ID (ePhilID / Card)
- Philippine Passport
- Driver's License (LTO)
- UMID / SSS / GSIS Card
- Postal ID
- PRC Professional License
- Voter's Certification / Senior / PWD / Student ID

-----------------------------------------------------
APPLICATION & CLAIMING PROCEDURES:
-----------------------------------------------------
1. Submit your document application online through the Barangay Zapatera Resident Portal.
2. Upload clear digital photos or scans of all required attachments above.
3. Choose your preferred pickup date and appointment time slot.
4. Wait for document processing and notification from Barangay Staff.
5. Bring your original Valid Government ID and digital Claim Pass QR to:
   Barangay Zapatera Hall
   197 D. Jakosalem St., Cebu City
   Office Hours: Mon-Fri, 8:00 AM - 5:00 PM (No Noon Break)

Representative Claiming:
If claiming via representative, provide an Authorization Letter, original Representative ID, and original Applicant ID.
=====================================================
Generated on: ${new Date().toLocaleString('en-US')}
`;

      if (typeof window !== 'undefined') {
        const blob = new Blob([checklistText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Zapatera_${(activeDoc.title || 'Document').replace(/\s+/g, '_')}_Requirements.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  const handleProceed = () => {
    if (!activeDoc) return;
    onClose();
    onProceedToRequest(activeDoc);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <FileText size={18} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Requirements & Guidelines</Text>
                <Text style={styles.modalSubtitle}>
                  What you need to prepare for your document request
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Document Switcher Horizontal Pills */}
          {catalogDocs.length > 1 && (
            <View style={styles.docSwitcherSection}>
              <Text style={styles.docSwitcherLabel}>Select Document to View Guidelines:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.docPillsRow}
              >
                {catalogDocs.map((item) => {
                  const isSelected = activeDoc?.id === item.id || activeDoc?.code === item.code;
                  return (
                    <TouchableOpacity
                      key={item.id || item.code}
                      style={[styles.docPill, isSelected && styles.docPillActive]}
                      onPress={() => {
                        setSelectedDocId(item.id);
                        setHasAcknowledged(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.docPillText, isSelected && styles.docPillTextActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.docPillFeeTag,
                          item.fee === 0 ? styles.pillFeeFree : styles.pillFeePaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.docPillFeeText,
                            item.fee === 0 ? styles.pillFeeTextFree : styles.pillFeeTextPaid,
                          ]}
                        >
                          {item.fee === 0 ? 'FREE' : `₱${item.fee}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Sub Navigation Tabs */}
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTabBtn, activeTab === 'requirements' && styles.subTabBtnActive]}
              onPress={() => setActiveTab('requirements')}
            >
              <FileCheck size={14} color={activeTab === 'requirements' ? '#1d4ed8' : '#64748b'} />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'requirements' && styles.subTabTextActive,
                ]}
              >
                Required Attachments ({requirementsList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabBtn, activeTab === 'guidelines' && styles.subTabBtnActive]}
              onPress={() => setActiveTab('guidelines')}
            >
              <Info size={14} color={activeTab === 'guidelines' ? '#1d4ed8' : '#64748b'} />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'guidelines' && styles.subTabTextActive,
                ]}
              >
                Step-by-Step Guidelines
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabBtn, activeTab === 'ids' && styles.subTabBtnActive]}
              onPress={() => setActiveTab('ids')}
            >
              <ShieldCheck size={14} color={activeTab === 'ids' ? '#1d4ed8' : '#64748b'} />
              <Text
                style={[
                  styles.subTabText,
                  activeTab === 'ids' && styles.subTabTextActive,
                ]}
              >
                Accepted Valid IDs
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Scrollable Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {activeDoc && (
              <>
                {/* Document Information Hero Banner */}
                <View style={styles.docHeaderCard}>
                  <View style={styles.docHeaderTopRow}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{activeDoc.code || 'DOC'}</Text>
                    </View>
                    {activeDoc.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{activeDoc.category}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.docTitle}>{activeDoc.title}</Text>
                  <Text style={styles.docDesc}>
                    {activeDoc.description ||
                      'Official document issued by Barangay Zapatera for resident employment, civic, and government transactions.'}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaLabel}>Processing Fee:</Text>
                      <Text style={styles.metaValue}>
                        {activeDoc.fee_type === 'variable' || activeDoc.is_variable_fee
                          ? 'Depends upon claim'
                          : activeDoc.fee === 0
                          ? 'FREE / No Charge'
                          : formatCurrency(activeDoc.fee)}
                      </Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Clock size={12} color="#1d4ed8" />
                      <Text style={styles.metaLabel}>Processing Time:</Text>
                      <Text style={styles.metaValue}>
                        {activeDoc.processing_days}{' '}
                        {activeDoc.processing_days === 1 ? 'Business Day' : 'Business Days'}
                      </Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Calendar size={12} color="#1d4ed8" />
                      <Text style={styles.metaLabel}>Validity:</Text>
                      <Text style={styles.metaValue}>
                        {activeDoc.validity || '6 Months from issuance'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* TAB 1: REQUIRED ATTACHMENTS */}
                {activeTab === 'requirements' && (
                  <View style={styles.tabContentSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View>
                        <Text style={styles.sectionHeading}>Required Attachments / Guidelines</Text>
                        <Text style={styles.sectionSub}>
                          Sourced from Barangay Zapatera Document Information Management. Prepare clear
                          scanned copies or photos on your phone before applying.
                        </Text>
                      </View>
                    </View>

                    {/* Requirements Interactive Checklist */}
                    <View style={styles.requirementsList}>
                      {requirementsList.map((item, idx) => {
                        const isChecked = !!checkedItems[item.id];
                        return (
                          <TouchableOpacity
                            key={item.id || idx}
                            style={[
                              styles.requirementItemCard,
                              isChecked && styles.requirementItemCardChecked,
                            ]}
                            onPress={() => toggleCheckItem(item.id)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.reqTopRow}>
                              <View style={styles.reqTitleLeft}>
                                <TouchableOpacity
                                  onPress={() => toggleCheckItem(item.id)}
                                  style={styles.checkboxTouch}
                                >
                                  {isChecked ? (
                                    <CheckSquare size={18} color="#059669" />
                                  ) : (
                                    <Square size={18} color="#94a3b8" />
                                  )}
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={[
                                      styles.reqName,
                                      isChecked && styles.reqNameChecked,
                                    ]}
                                  >
                                    {item.name}
                                  </Text>
                                  {item.description && (
                                    <Text style={styles.reqDescription}>
                                      {item.description}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View
                                style={[
                                  styles.reqTag,
                                  item.is_required ? styles.reqTagRequired : styles.reqTagOptional,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.reqTagText,
                                    item.is_required
                                      ? styles.reqTagTextRequired
                                      : styles.reqTagTextOptional,
                                  ]}
                                >
                                  {item.is_required ? 'MANDATORY' : 'OPTIONAL'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Download Guide Box */}
                    <View style={styles.downloadBox}>
                      <View style={styles.downloadTextCol}>
                        <Text style={styles.downloadTitle}>Save Checklist & Instructions</Text>
                        <Text style={styles.downloadSubtitle}>
                          Download an offline text summary of needed documents and schedule steps.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={handleDownloadChecklist}
                        activeOpacity={0.7}
                      >
                        <Download size={14} color="#1d4ed8" />
                        <Text style={styles.downloadBtnText}>
                          {downloadSuccess ? 'Saved to Device!' : 'Download Guide'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Reminder Notice */}
                    <View style={styles.alertNotice}>
                      <AlertCircle size={18} color="#d97706" style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertNoticeTitle}>Important Barangay Advisory:</Text>
                        <Text style={styles.alertNoticeText}>
                          Please bring your original Valid Government ID when claiming your requested document
                          at the Barangay Zapatera Hall during your confirmed pickup schedule.
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
                        I have reviewed the required guidelines and confirm that I have the attachments
                        ready for online upload.
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* TAB 2: STEP-BY-STEP GUIDELINES */}
                {activeTab === 'guidelines' && (
                  <View style={styles.tabContentSection}>
                    <Text style={styles.sectionHeading}>Official 5-Step Application Process</Text>
                    <Text style={styles.sectionSub}>
                      Follow these standard steps to smoothly complete your request and receive your official document.
                    </Text>

                    <View style={styles.stepsContainer}>
                      <View style={styles.stepItem}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>Prepare Clear Scans / Photos</Text>
                          <Text style={styles.stepText}>
                            Take clean, high-resolution photos or scanned PDFs of all required attachments.
                            Make sure all text, photos, and signatures are legible without glare.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.stepItem}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>Submit Online Request Form</Text>
                          <Text style={styles.stepText}>
                            Click "Proceed to Request", verify your resident address & personal profile, specify
                            the exact purpose for issuance, and upload your files.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.stepItem}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>Choose Preferred Pickup Schedule</Text>
                          <Text style={styles.stepText}>
                            Select an available appointment date and time slot (Monday - Friday, 8:00 AM to 5:00 PM).
                            Our system prevents crowding and reserves your timeslot.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.stepItem}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>4</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>Barangay Staff Verification</Text>
                          <Text style={styles.stepText}>
                            The Barangay Zapatera Records Officer validates your submitted files and prepares the
                            official printed certificate with seal and serial tracking code.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.stepItem}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>5</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle}>Claim Document with Digital Pass</Text>
                          <Text style={styles.stepText}>
                            Receive your Digital Claim Pass QR Code in the portal. Present this together with your
                            original Valid ID at 197 D. Jakosalem St., Cebu City to claim.
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Operational Info Card */}
                    <View style={styles.operationalCard}>
                      <View style={styles.operationalRow}>
                        <MapPin size={16} color="#1d4ed8" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.operationalTitle}>Barangay Zapatera Hall Location</Text>
                          <Text style={styles.operationalSubtitle}>
                            197 D. Jakosalem St., Barangay Zapatera, Cebu City, 6000
                          </Text>
                        </View>
                      </View>
                      <View style={styles.operationalRow}>
                        <Clock size={16} color="#1d4ed8" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.operationalTitle}>Public Office Hours</Text>
                          <Text style={styles.operationalSubtitle}>
                            Monday – Friday: 8:00 AM – 5:00 PM (No Noon Break)
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* TAB 3: ACCEPTED VALID IDS */}
                {activeTab === 'ids' && (
                  <View style={styles.tabContentSection}>
                    <Text style={styles.sectionHeading}>Accepted Philippine Government IDs</Text>
                    <Text style={styles.sectionSub}>
                      Barangay Zapatera recognizes the following government-issued identification cards for
                      resident verification and document claiming:
                    </Text>

                    {ACCEPTED_VALID_IDS.map((cat, cIdx) => (
                      <View key={cIdx} style={styles.idCategoryCard}>
                        <Text style={styles.idCategoryTitle}>{cat.category}</Text>
                        <View style={styles.idList}>
                          {cat.items.map((idItem, idx) => (
                            <View key={idx} style={styles.idItemRow}>
                              <CheckCircle2 size={15} color="#059669" />
                              <Text style={styles.idItemText}>{idItem}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}

                    <View style={styles.photoTipCard}>
                      <ShieldCheck size={18} color="#1d4ed8" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.photoTipTitle}>ID Upload Quality Guidelines:</Text>
                        <Text style={styles.photoTipText}>
                          • Ensure the ID is valid and unexpired.{'\n'}
                          • Upload both front and back sides if applicable.{'\n'}
                          • Capture under adequate natural lighting without camera flash glare.{'\n'}
                          • Do not crop out edges or borders of the ID card.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Close Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={handleProceed}
              activeOpacity={0.8}
            >
              <Text style={styles.proceedBtnText}>
                Request {activeDoc?.title || 'Document'}
              </Text>
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
    borderRadius: 24,
    maxHeight: '92%',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  docSwitcherSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  docSwitcherLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  docPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  docPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  docPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  docPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  docPillTextActive: {
    color: '#ffffff',
  },
  docPillFeeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillFeeFree: {
    backgroundColor: '#dcfce7',
  },
  pillFeePaid: {
    backgroundColor: '#eff6ff',
  },
  docPillFeeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  pillFeeTextFree: {
    color: '#15803d',
  },
  pillFeeTextPaid: {
    color: '#1d4ed8',
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabBtnActive: {
    borderBottomColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
  docHeaderCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 18,
  },
  docHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e40af',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  docDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaBadge: {
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  tabContentSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  requirementsList: {
    gap: 10,
    marginBottom: 16,
  },
  requirementItemCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requirementItemCardChecked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  reqTitleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  checkboxTouch: {
    marginTop: 1,
  },
  reqName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  reqNameChecked: {
    color: '#059669',
    textDecorationLine: 'line-through',
  },
  reqTag: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
    letterSpacing: 0.3,
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
    lineHeight: 15,
  },
  downloadBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadTextCol: {
    flex: 1,
    paddingRight: 12,
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
    lineHeight: 14,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
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
    gap: 10,
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 14,
  },
  alertNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 3,
  },
  alertNoticeText: {
    fontSize: 11,
    color: '#b45309',
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
  stepsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  operationalCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 12,
    marginBottom: 10,
  },
  operationalRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  operationalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  operationalSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 1,
  },
  idCategoryCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  idCategoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
  },
  idList: {
    gap: 8,
  },
  idItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idItemText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  photoTipCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 10,
  },
  photoTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 4,
  },
  photoTipText: {
    fontSize: 11,
    color: '#1d4ed8',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
