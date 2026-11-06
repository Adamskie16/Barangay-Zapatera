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
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
  Clock,
  Trash2,
  Eye,
  Check,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  DocumentRequest,
  DocumentType,
  ResidentUser,
  UploadedRequirementFile,
} from '../../types';
import { uploadResidentRequirementFile, deleteStoredFile } from '../../core/storageService';
import { analyzeDocumentImage } from '../../core/documentAiService';
import { APPOINTMENT_TIME_SLOTS } from '../../core/portalData';
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
  const [yearsInBarangay, setYearsInBarangay] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [permitteeName, setPermitteeName] = useState<string>('');
  const [businessAddress, setBusinessAddress] = useState<string>('');
  const [natureOfBusiness, setNatureOfBusiness] = useState<string>('');
  const [businessContact, setBusinessContact] = useState<string>('');
  const [capitalInvested, setCapitalInvested] = useState<string>('');
  const [grossSales, setGrossSales] = useState<string>('');
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('');
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

  // Helper to extract bracketed tokens from notes if needed
  const extractNoteToken = (notesStr: string | undefined, label: string): string => {
    if (!notesStr) return '';
    const regex = new RegExp(`\\[${label}:\\s*([^\\]]+)\\]`, 'i');
    const match = notesStr.match(regex);
    return match && match[1] ? match[1].replace(/^₱/, '').trim() : '';
  };

  // Populate data whenever modal opens or request changes
  useEffect(() => {
    if (visible && request) {
      setPurpose(request.purpose || '');
      const rawYears =
        request.years_in_barangay ||
        currentUser?.years_in_barangay ||
        '';
      setYearsInBarangay(String(rawYears).replace(/[^0-9]/g, ''));

      setBusinessName(
        request.business_name || extractNoteToken(request.notes, 'Business') || ''
      );
      setPermitteeName(
        request.permittee_name || extractNoteToken(request.notes, 'Permittee') || ''
      );
      setBusinessAddress(
        request.business_address || extractNoteToken(request.notes, 'Business Address') || ''
      );
      setNatureOfBusiness(
        request.nature_of_business || extractNoteToken(request.notes, 'Nature') || ''
      );
      setBusinessContact(
        request.contact_number || extractNoteToken(request.notes, 'Contact') || ''
      );
      setCapitalInvested(
        request.capital_invested !== undefined && request.capital_invested !== null
          ? String(request.capital_invested)
          : extractNoteToken(request.notes, 'Capital') || ''
      );
      setGrossSales(
        request.gross_sales !== undefined && request.gross_sales !== null
          ? String(request.gross_sales)
          : extractNoteToken(request.notes, 'Gross') || ''
      );

      setPickupDate(request.pickup_date || '');
      setPickupTimeSlot(request.pickup_time_slot || APPOINTMENT_TIME_SLOTS[2] || '9:00 AM - 9:30 AM');
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
  }, [visible, request, currentUser]);

  if (!visible || !request) return null;

  // Match document template from docTypes by id, code, or case-insensitive title
  const matchedDocType = docTypes.find(
    (dt) =>
      dt.id === request.document_type_id ||
      (dt.code && dt.code === request.document_type_id) ||
      (dt.title || '').toLowerCase().trim() === (request.document_title || '').toLowerCase().trim()
  );

  // Check if this document template is a Business Permit / Business Clearance
  const docTitleLower = (matchedDocType?.title || request.document_title || '').toLowerCase();
  const docCodeLower = (matchedDocType?.code || request.document_type_id || '').toLowerCase();
  const docTmpl = (matchedDocType as any)?.template_type || '';
  const isBusinessDoc =
    docTmpl === 'business' ||
    docTitleLower.includes('business') ||
    docTitleLower.includes('commercial') ||
    docCodeLower.includes('bus');

  // Strictly normalize requirements from the document template (matching RequestFlowModal)
  const filterValidRequirements = (rawList: any[]): string[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .map((r) => (typeof r === 'string' ? r : r?.name || r?.title || ''))
      .map((s) => String(s || '').trim())
      .filter((s) => {
        const lower = s.toLowerCase();
        return (
          lower.length > 0 &&
          lower !== 'none' &&
          !lower.includes('no required document') &&
          !lower.startsWith('none (')
        );
      });
  };

  let requirementsList: string[] = [];
  if (matchedDocType) {
    if (Array.isArray(matchedDocType.requirements)) {
      requirementsList = filterValidRequirements(matchedDocType.requirements);
    } else if (Array.isArray((matchedDocType as any).requirement_items)) {
      requirementsList = filterValidRequirements((matchedDocType as any).requirement_items);
    }
  } else if (Array.isArray(request.requirements_attached) && request.requirements_attached.length > 0) {
    requirementsList = filterValidRequirements(request.requirements_attached);
  } else if (Object.keys(uploadedFiles).length > 0) {
    requirementsList = filterValidRequirements(Object.keys(uploadedFiles));
  }

  const isVarFee = Boolean(
    matchedDocType?.is_variable_fee ||
    matchedDocType?.fee_type === 'variable' ||
    request.is_variable_fee ||
    request.fee_type === 'variable'
  );
  const resolvedDocFee = isVarFee ? 0 : Number(matchedDocType?.fee ?? request.fee ?? 0);
  const resolvedValidity = matchedDocType?.validity || '6 Months from issuance';
  const resolvedProcessingTime =
    matchedDocType?.processing_time ||
    (matchedDocType?.processing_days ? `${matchedDocType.processing_days} Day(s)` : '1 Day');

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

    if (!yearsInBarangay.trim()) {
      setUploadError('Please enter your Length of Residency (Years in Barangay Zapatera).');
      return;
    }

    if (isBusinessDoc) {
      if (!businessName.trim()) {
        setUploadError('Required Field Missing: Please enter the Business Name.');
        return;
      }
      if (!permitteeName.trim()) {
        setUploadError('Required Field Missing: Please enter the Permittee Name.');
        return;
      }
      if (!businessAddress.trim()) {
        setUploadError('Required Field Missing: Please enter the complete Business Address.');
        return;
      }
      if (!natureOfBusiness.trim()) {
        setUploadError('Required Field Missing: Please specify the Nature of Business.');
        return;
      }
      if (!businessContact.trim()) {
        setUploadError('Required Field Missing: Please provide a valid Contact Number.');
        return;
      }
    }

    const filesArray = Object.values(uploadedFiles);
    if (requirementsList.length > 0) {
      const missingReq = requirementsList.find((reqName) => !uploadedFiles[reqName]);
      if (missingReq) {
        setUploadError(
          `Required Attachment Missing: Please upload "${missingReq}" before resubmitting.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setUploadError('');

    try {
      const resubmissionCount = (request.resubmission_count || 0) + 1;
      const resubmitTimestamp = new Date().toISOString();
      const prevDeclineReason = request.declined_reason || request.rejection_reason || 'Incomplete requirements';

      const notesParts = [
        `Document: ${matchedDocType?.title || request.document_title}`,
        `Fee: ${isVarFee ? 'Depends on Claim' : `₱${resolvedDocFee}`}`,
        currentUser?.civil_status ? `Civil Status: ${currentUser.civil_status}` : '',
        request.pickup_location ? `Pickup Window: ${request.pickup_location}` : '',
        isBusinessDoc && businessName.trim() ? `[Business: ${businessName.trim()}]` : '',
        isBusinessDoc && permitteeName.trim() ? `[Permittee: ${permitteeName.trim()}]` : '',
        isBusinessDoc && businessAddress.trim() ? `[Business Address: ${businessAddress.trim()}]` : '',
        isBusinessDoc && natureOfBusiness.trim() ? `[Nature: ${natureOfBusiness.trim()}]` : '',
        isBusinessDoc && businessContact.trim() ? `[Contact: ${businessContact.trim()}]` : '',
        isBusinessDoc && capitalInvested.trim() ? `[Capital: ₱${capitalInvested.trim()}]` : '',
        isBusinessDoc && grossSales.trim() ? `[Gross: ₱${grossSales.trim()}]` : '',
        complianceNotes.trim() ? `[Resubmission Note: ${complianceNotes.trim()}]` : '',
      ].filter(Boolean);

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
        years_in_barangay: yearsInBarangay.trim(),
        pickup_date: pickupDate || request.pickup_date,
        pickup_time_slot: pickupTimeSlot || request.pickup_time_slot,
        fee: resolvedDocFee,
        business_name: isBusinessDoc ? businessName.trim() : request.business_name,
        permittee_name: isBusinessDoc ? permitteeName.trim() : request.permittee_name,
        business_address: isBusinessDoc ? businessAddress.trim() : request.business_address,
        nature_of_business: isBusinessDoc ? natureOfBusiness.trim() : request.nature_of_business,
        contact_number: isBusinessDoc ? businessContact.trim() : request.contact_number,
        capital_invested: isBusinessDoc && capitalInvested.trim() ? capitalInvested.trim() : request.capital_invested,
        gross_sales: isBusinessDoc && grossSales.trim() ? grossSales.trim() : request.gross_sales,
        notes: notesParts.join(' | '),
        uploaded_files: requirementsList.length > 0 ? filesArray : [],
        requirements_attached:
          requirementsList.length > 0 ? filesArray.map((f) => f.requirement_name) : [],
        updated_at: resubmitTimestamp,
        // Append timeline event for transparency
        timeline: [
          ...(request.timeline || []),
          {
            status: 'pending',
            label: `Resubmitted (Attempt #${resubmissionCount})`,
            description: complianceNotes.trim()
              ? `Application resubmitted by resident with compliance notes: "${complianceNotes.trim()}"`
              : requirementsList.length > 0
              ? 'Application resubmitted by resident with updated details and requirement attachments.'
              : 'Application resubmitted by resident with updated application details.',
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

            {/* 2. Document Template & Application Info Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <FileText size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Document Template Details</Text>
              </View>
              <View style={styles.docInfoGrid}>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Document</Text>
                  <Text style={styles.docInfoVal}>{matchedDocType?.title || request.document_title}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Tracking Code</Text>
                  <Text style={styles.docInfoValCode}>{request.tracking_number}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Processing Fee</Text>
                  <Text style={styles.docInfoVal}>
                    {isVarFee ? 'Depends on Claim' : resolvedDocFee > 0 ? `₱${resolvedDocFee.toFixed(2)}` : '₱0.00 (Free)'}
                  </Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Processing Time</Text>
                  <Text style={styles.docInfoVal}>{resolvedProcessingTime}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Validity Period</Text>
                  <Text style={styles.docInfoVal}>{resolvedValidity}</Text>
                </View>
                <View style={styles.docInfoItem}>
                  <Text style={styles.docInfoLabel}>Pickup Slot</Text>
                  <Text style={styles.docInfoVal}>{pickupTimeSlot || request.pickup_time_slot || 'Regular Office Hours'}</Text>
                </View>
              </View>
            </View>

            {/* 3. Purpose of Request & Residency Details (Editable, matching Document Template) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Info size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Application Details & Residency</Text>
              </View>
              <Text style={styles.inputHelperText}>
                Review and update your official purpose and residency duration as required by the {matchedDocType?.title || request.document_title} template.
              </Text>

              <Text style={styles.fieldLabel}>
                Purpose of Request <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={purpose}
                onChangeText={(txt) => {
                  setPurpose(txt);
                  if (txt.trim()) setUploadError('');
                }}
                placeholder="Enter official purpose (e.g., Local Employment, Scholarship)"
                placeholderTextColor="#94a3b8"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                Length of Residency (Years in Barangay Zapatera) <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={yearsInBarangay}
                keyboardType="numeric"
                onChangeText={(txt) => {
                  setYearsInBarangay(txt.replace(/[^0-9]/g, ''));
                  if (txt.trim()) setUploadError('');
                }}
                placeholder="Enter number of years living in Barangay Zapatera (e.g., 5)"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* 3B. Commercial & Business Entity Details (Only when Document Template is Business Permit/Clearance) */}
            {isBusinessDoc && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Building2 size={15} color="#2563eb" />
                  <Text style={styles.sectionTitle}>Commercial & Business Entity Details</Text>
                </View>
                <Text style={styles.inputHelperText}>
                  Update the official commercial entity details required for the Barangay Business Clearance template.
                </Text>

                <Text style={styles.fieldLabel}>
                  Business Name <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                  Permittee (Owner / Permittee Name) <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={permitteeName}
                  onChangeText={setPermitteeName}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                  Business Address <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                  Nature of Business <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={natureOfBusiness}
                  onChangeText={setNatureOfBusiness}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                  Contact Number <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={businessContact}
                  onChangeText={setBusinessContact}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Capital Invested (₱)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={capitalInvested}
                      onChangeText={setCapitalInvested}
                      placeholder=""
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Gross Sales (₱)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={grossSales}
                      onChangeText={setGrossSales}
                      placeholder=""
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 4. Requirements & Attachments Compliance Checklist (Driven by Document Template) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Upload size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Required Documents & Attachments</Text>
              </View>

              {requirementsList.length === 0 ? (
                <View style={styles.noRequirementsBox}>
                  <ShieldCheck size={18} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noRequirementsTitle}>
                      No Documentary Requirements Needed
                    </Text>
                    <Text style={styles.noRequirementsDesc}>
                      No supporting documents or file attachments are required for{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {matchedDocType?.title || request.document_title}
                      </Text>
                      . You may review your application details above and proceed directly with resubmission.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.inputHelperText}>
                    Upload or replace the required documents defined by the {matchedDocType?.title || request.document_title} template.
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
                                  <CheckCircle2 size={11} color={hasWarning ? '#b45309' : '#15803d'} />
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
                </>
              )}
            </View>

            {/* 5. Resident Compliance Notes to Staff (Optional / Helpful) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <FileText size={15} color="#2563eb" />
                <Text style={styles.sectionTitle}>Notes for Barangay Staff (Optional)</Text>
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  noRequirementsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  noRequirementsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 2,
  },
  noRequirementsDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
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
