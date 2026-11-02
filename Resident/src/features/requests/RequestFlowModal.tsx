// Resident/src/features/requests/RequestFlowModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  FileText,
  User,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Check,
  MapPin,
  Phone,
  Mail,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import {
  DocumentType,
  ResidentUser,
  BarangayConfig,
  DocumentRequest,
  UploadedRequirementFile,
} from '../../types';
import { formatCurrency, generateTrackingNumber } from '../../core/security';
import { APPOINTMENT_TIME_SLOTS } from '../../core/portalData';
import { uploadResidentRequirementFile, deleteStoredFile } from '../../core/storageService';
import ActionModal from '../../components/ActionModal';
import { analyzeDocumentImage } from '../../core/documentAiService';
import { checkContentModeration } from '../../core/contentModerationService';
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface RequestFlowModalProps {
  visible: boolean;
  initialDoc: DocumentType | null;
  docTypes: DocumentType[];
  currentUser: ResidentUser;
  config: BarangayConfig;
  showDocSelector?: boolean;
  onClose: () => void;
  onRequestSubmitted: (req: DocumentRequest) => void;
  onTrackSubmittedRequest: (req: DocumentRequest) => void;
}

const COMMON_PURPOSES = [
  'Local Employment Application',
  'Bank Account Opening / Loan',
  'School Admission / Scholarship',
  'DSWD / Financial Assistance',
  'Senior Citizen / Solo Parent Benefit',
  'Postal ID / Passport Application',
  'Business Registration Renewal',
  'Other Official Purpose',
];

const BUSINESS_PURPOSES = [
  "Renewal of Mayor's Business Permit",
  'New Business Permit Application',
  'Barangay Business Clearance',
  'Change of Business Location',
  'Retirement / Closure of Business',
  'Other Official Purpose',
];

const STEP_META = [
  { num: 1, short: 'Document', subtitle: 'Select Document & Purpose' },
  { num: 2, short: 'Resident', subtitle: 'Verify Resident Profile & Residency' },
  { num: 3, short: 'Uploads', subtitle: 'Attach Supporting Requirements' },
  { num: 4, short: 'Schedule', subtitle: 'Choose Express Pickup Schedule' },
  { num: 5, short: 'Review', subtitle: 'Final Review & Submission' },
];

export default function RequestFlowModal({
  visible,
  initialDoc,
  docTypes,
  currentUser,
  config,
  onClose,
  onRequestSubmitted,
  onTrackSubmittedRequest,
}: RequestFlowModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDoc?.id || docTypes[0]?.id || 'dt-001'
  );
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState<boolean>(false);
  const [purpose, setPurpose] = useState<string>('');
  const [customPurpose, setCustomPurpose] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tracks whether the user attempted to proceed on the current step so missing required fields highlight prominently
  const [showStepValidation, setShowStepValidation] = useState<boolean>(false);
  const bodyScrollRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  useEffect(() => {
    if (visible) {
      setPurpose('');
      setCustomPurpose('');
    }
    if (initialDoc?.id) {
      setSelectedDocId(initialDoc.id);
    } else if (docTypes.length > 0 && !selectedDocId) {
      setSelectedDocId(docTypes[0].id);
    }
  }, [visible, initialDoc, docTypes]);

  // Step 2 Resident Info State
  const [yearsInBarangay, setYearsInBarangay] = useState<string>(
    currentUser.years_in_barangay ? String(currentUser.years_in_barangay) : ''
  );

  // Business Clearance / Permit Specific Variables (Official Document Reference)
  const [businessName, setBusinessName] = useState<string>('');
  const [permitteeName, setPermitteeName] = useState<string>('');
  const [businessAddress, setBusinessAddress] = useState<string>('');
  const [natureOfBusiness, setNatureOfBusiness] = useState<string>('');
  const [businessContact, setBusinessContact] = useState<string>('');
  const [capitalInvested, setCapitalInvested] = useState<string>('');
  const [grossSales, setGrossSales] = useState<string>('');

  // Step 3 Uploads State
  const [uploadedFiles, setUploadedFiles] = useState<{
    [reqKey: string]: UploadedRequirementFile;
  }>({});
  const [uploadingMap, setUploadingMap] = useState<{ [reqKey: string]: boolean }>({});
  const [uploadError, setUploadError] = useState<string>('');

  // Step 4 Schedule State
  const today = new Date();
  const getNextBusinessDays = () => {
    const days: string[] = [];
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    while (days.length < 10) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const availableDates = getNextBusinessDays();
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(APPOINTMENT_TIME_SLOTS[2]);

  // Confirmation State
  const [submittedReq, setSubmittedReq] = useState<DocumentRequest | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  const handleCopyTracking = () => {
    if (submittedReq?.tracking_number) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(submittedReq.tracking_number);
      }
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2500);
    }
  };

  const availableDocTypes = useMemo(
    () =>
      docTypes.filter(
        (dt) => dt.is_active !== false && (dt as any).is_available !== false
      ),
    [docTypes]
  );

  const selectedDoc =
    availableDocTypes.find((d) => d.id === selectedDocId) ||
    initialDoc ||
    docTypes[0];

  const isBusinessDoc = useMemo(() => {
    const t = (selectedDoc?.title || '').toLowerCase();
    const c = (selectedDoc?.code || '').toLowerCase();
    const tmpl = (selectedDoc as any)?.template_type || '';
    return (
      tmpl === 'business' ||
      t.includes('business') ||
      t.includes('commercial') ||
      c.includes('bus')
    );
  }, [selectedDoc]);

  // Keep purpose empty when switching documents so the resident always inputs or selects their own purpose
  useEffect(() => {
    setPurpose('');
    setCustomPurpose('');
  }, [selectedDocId]);

  // Requirements list normalized from selectedDoc
  const requirementsToUpload =
    selectedDoc?.requirements &&
    Array.isArray(selectedDoc.requirements) &&
    selectedDoc.requirements.length > 0
      ? selectedDoc.requirements
          .filter((r) => {
            const str =
              typeof r === 'string'
                ? r
                : (r as any).name || (r as any).title || '';
            const s = str.trim().toLowerCase();
            return (
              s &&
              s !== 'none' &&
              !s.includes('no required document') &&
              !s.startsWith('none (')
            );
          })
          .map((r, i) => {
            const name =
              typeof r === 'string'
                ? r
                : (r as any).name || (r as any).title || `Requirement ${i + 1}`;
            const isReq =
              typeof r === 'object' && 'is_required' in (r as any)
                ? !!(r as any).is_required
                : true;
            return {
              id: `req-${i}`,
              name,
              description: 'Original or clear digital scanned copy / camera photo',
              is_required: isReq,
            };
          })
      : selectedDoc?.requirement_items || [];

  // Mandatory requirements calculation for Step 3 progress
  const mandatoryItems = useMemo(
    () => (requirementsToUpload || []).filter((r) => r.is_required),
    [requirementsToUpload]
  );
  const totalMandatory = mandatoryItems.length;
  const mandatoryUploadedCount = useMemo(
    () => mandatoryItems.filter((m) => !!uploadedFiles[m.name]).length,
    [mandatoryItems, uploadedFiles]
  );
  const isAllMandatoryUploaded =
    totalMandatory === 0 || mandatoryUploadedCount >= totalMandatory;
  const uploadProgressPercentage =
    totalMandatory > 0
      ? Math.round((mandatoryUploadedCount / totalMandatory) * 100)
      : 100;

  // Derived required-field validation states
  const activePurposeValue =
    customPurpose.trim() ||
    (purpose !== 'Other Official Purpose' ? purpose.trim() : '');
  const isPurposeEmpty = !activePurposeValue;
  const isYearsEmpty = !yearsInBarangay || !yearsInBarangay.trim();
  const isScheduleIncomplete = !selectedDate || !selectedSlot;

  // Real browser/device file and camera upload handler using Supabase Storage
  const handleRealFileUpload = (
    reqName: string,
    mode: 'camera' | 'photo' | 'document' = 'photo'
  ) => {
    if (typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'file';

    if (mode === 'camera') {
      input.accept = 'image/*';
      input.capture = 'environment';
    } else if (mode === 'photo') {
      input.accept = 'image/*';
    } else {
      input.accept = 'application/pdf,image/*';
    }

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

        const isPdf =
          result.fileType === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf');

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

  // Validate step transitions with prominent field highlighting
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (isPurposeEmpty) {
        setShowStepValidation(true);
        setUploadError(
          'Required Field Missing: Please enter or select your purpose for requesting this document.'
        );
        bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      const modCheck = checkContentModeration(activePurposeValue);
      if (!modCheck.isClean) {
        setShowStepValidation(true);
        setUploadError(
          `Inappropriate language detected in purpose (${modCheck.flaggedWords.join(
            ', '
          )}). Please provide a formal, valid purpose.`
        );
        bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      setShowStepValidation(false);
      setUploadError('');
      setCurrentStep(2);
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 2) {
      if (isYearsEmpty) {
        setShowStepValidation(true);
        setUploadError(
          'Required Field Missing: Please enter how many years you have resided in Barangay Zapatera.'
        );
        bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      if (isBusinessDoc) {
        if (!businessName.trim()) {
          setShowStepValidation(true);
          setUploadError('Required Field Missing: Please enter the official Business Name.');
          bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        if (!permitteeName.trim()) {
          setShowStepValidation(true);
          setUploadError('Required Field Missing: Please enter the Permittee Name.');
          bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        if (!businessAddress.trim()) {
          setShowStepValidation(true);
          setUploadError('Required Field Missing: Please enter the complete Business Address.');
          bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        if (!natureOfBusiness.trim()) {
          setShowStepValidation(true);
          setUploadError('Required Field Missing: Please specify the Nature of Business.');
          bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
        if (!businessContact.trim()) {
          setShowStepValidation(true);
          setUploadError('Required Field Missing: Please provide a valid Contact Number.');
          bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
          return;
        }
      }

      setShowStepValidation(false);
      setUploadError('');
      setCurrentStep(3);
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 3) {
      if (!isAllMandatoryUploaded) {
        setShowStepValidation(true);
        const missing = mandatoryItems.find((m) => !uploadedFiles[m.name]);
        setUploadError(
          `Required Attachment Missing: Please upload all mandatory documents (${mandatoryUploadedCount} of ${totalMandatory} submitted). Missing: "${
            missing?.name || 'Required Document'
          }".`
        );
        bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      setShowStepValidation(false);
      setUploadError('');
      setCurrentStep(4);
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 4) {
      if (isScheduleIncomplete) {
        setShowStepValidation(true);
        setUploadError(
          'Required Selection Missing: Please choose both a pickup date and a 30-minute time slot.'
        );
        bodyScrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      setShowStepValidation(false);
      setUploadError('');
      setCurrentStep(5);
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (currentStep === 5) {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const trackingNo = generateTrackingNumber(config.doc_prefix || 'BRGY-2026');
      const finalPurpose = activePurposeValue || 'Local Employment Application';

      const resolvedDocFee =
        Number(selectedDoc.fee) > 0
          ? Number(selectedDoc.fee)
          : isBusinessDoc
          ? 500
          : 0;

      const newRequest: DocumentRequest = {
        id: `req-${Date.now()}`,
        tracking_number: trackingNo,
        resident_id: currentUser.id || 'res-user',
        resident_name:
          currentUser.full_name ||
          `${currentUser.first_name} ${currentUser.last_name}`,
        resident_email: currentUser.email,
        resident_phone: currentUser.phone || '0917-000-0000',
        resident_address:
          currentUser.address || currentUser.sitio || 'Barangay Zapatera, Cebu City',
        resident_birth_date: currentUser.birth_date || currentUser.birthdate,
        years_in_barangay: yearsInBarangay.trim(),
        // Business Clearance entity variables (if business permit)
        business_name: isBusinessDoc ? businessName.trim() : undefined,
        permittee_name: isBusinessDoc ? (permitteeName.trim() || currentUser.full_name) : undefined,
        business_address: isBusinessDoc ? businessAddress.trim() : undefined,
        nature_of_business: isBusinessDoc ? natureOfBusiness.trim() : undefined,
        contact_number: isBusinessDoc ? (businessContact.trim() || currentUser.phone || '') : undefined,
        capital_invested: isBusinessDoc && capitalInvested.trim() ? capitalInvested.trim() : undefined,
        gross_sales: isBusinessDoc && grossSales.trim() ? grossSales.trim() : undefined,
        document_type_id: selectedDoc.id,
        document_title: selectedDoc.title,
        fee: resolvedDocFee,
        purpose: finalPurpose,
        requirements_attached: Object.keys(uploadedFiles),
        uploaded_files: Object.values(uploadedFiles),
        pickup_date: selectedDate,
        pickup_time_slot: selectedSlot,
        status: 'pending',
        pickup_location: '2nd Floor, Barangay Hall Lobby, Rahmann St.',
        is_variable_fee: Boolean(
          selectedDoc.fee_type === 'variable' || selectedDoc.is_variable_fee
        ),
        pickup_instructions: `Please arrive during your selected 30-minute interval (${selectedSlot}). Bring your valid ID and the processing fee of ${
          resolvedDocFee === 0
            ? '₱0.00 (FREE)'
            : formatCurrency(resolvedDocFee)
        }.`,
        timeline: [
          {
            status: 'pending',
            label: 'Request Submitted',
            description:
              'Document request submitted online and registered into the records queue.',
            timestamp: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            is_completed: true,
            is_current: true,
          },
          {
            status: 'under_review',
            label: 'Under Review',
            description:
              'Barangay administrative staff is reviewing details and verifying clearance.',
            timestamp: 'Pending Staff Review',
            is_completed: false,
            is_current: false,
          },
          {
            status: 'ready_for_pickup',
            label: 'Ready for Pick up',
            description: `Document printed, sealed, and approved for collection on ${selectedDate} at 2nd Floor, Barangay Hall Lobby (${selectedSlot}).`,
            timestamp: 'Scheduled for ' + selectedDate,
            is_completed: false,
            is_current: false,
          },
          {
            status: 'completed',
            label: 'Completed',
            description:
              'Official document claimed and successfully released to resident.',
            timestamp: 'Pending Release',
            is_completed: false,
            is_current: false,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (onRequestSubmitted) {
        await onRequestSubmitted(newRequest);
      }
      setSubmittedReq(newRequest);
      setCurrentStep(6);
    } catch (err) {
      console.error('Submission failed:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Request Submission Failed',
        message:
          'We could not submit your document request. Please check your information and try again.',
        buttonText: 'Try Again',
        onClose: () => setActionModal({ isOpen: false, title: '' }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setPurpose('');
    setCustomPurpose('');
    setUploadedFiles({});
    setUploadError('');
    setShowStepValidation(false);
    setIsDocDropdownOpen(false);
    setSubmittedReq(null);
    setCopiedTracking(false);
    setIsSubmitting(false);
    setBusinessName('');
    setPermitteeName('');
    setBusinessAddress('');
    setNatureOfBusiness('');
    setBusinessContact('');
    setCapitalInvested('');
    setGrossSales('');
    onClose();
  };

  if (!visible) return null;

  const activeStepMeta = STEP_META.find((s) => s.num === currentStep);
  const selectedDocFee =
    Number(selectedDoc?.fee) > 0
      ? Number(selectedDoc?.fee)
      : isBusinessDoc
      ? 500
      : 0;
  const isSelectedDocFree = selectedDocFee === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetForm}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ================= 1. MODAL HEADER ================= */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBox,
                  currentStep === 6 && styles.headerIconBoxSuccess,
                ]}
              >
                {currentStep === 6 ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <FileText size={19} color="#2563eb" />
                )}
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerStepTag}>
                  {currentStep === 6
                    ? 'APPLICATION COMPLETED'
                    : `STEP ${currentStep} OF 5 • ${activeStepMeta?.short.toUpperCase()}`}
                </Text>
                <Text
                  style={[
                    styles.modalTitle,
                    currentStep === 6 && { color: '#15803d' },
                  ]}
                  numberOfLines={1}
                >
                  {currentStep === 6
                    ? 'Request Submitted'
                    : activeStepMeta?.subtitle || 'File Document Request'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={resetForm}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* ================= 2. CONNECTED 5-STEP PROGRESS BAR ================= */}
          {currentStep <= 5 && (
            <View style={styles.stepperWrap}>
              <View style={styles.stepperRow}>
                {STEP_META.map((step, idx) => {
                  const isDone = currentStep > step.num;
                  const isCurr = currentStep === step.num;
                  const hasStepError =
                    showStepValidation && isCurr && Boolean(uploadError);

                  return (
                    <React.Fragment key={step.num}>
                      <View style={styles.stepNodeCol}>
                        <View
                          style={[
                            styles.stepCircle,
                            isDone && styles.stepCircleDone,
                            isCurr && styles.stepCircleCurr,
                            hasStepError && styles.stepCircleError,
                          ]}
                        >
                          {isDone ? (
                            <Check size={12} color="#ffffff" strokeWidth={2.8} />
                          ) : hasStepError ? (
                            <AlertCircle size={12} color="#ffffff" />
                          ) : (
                            <Text
                              style={[
                                styles.stepNumText,
                                isCurr && styles.stepNumTextCurr,
                              ]}
                            >
                              {step.num}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.stepLabel,
                            isCurr && styles.stepLabelCurr,
                            isDone && styles.stepLabelDone,
                            hasStepError && styles.stepLabelError,
                          ]}
                        >
                          {step.short}
                        </Text>
                      </View>

                      {idx < STEP_META.length - 1 && (
                        <View
                          style={[
                            styles.stepConnectorLine,
                            isDone && styles.stepConnectorLineDone,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* ================= 3. SCROLLABLE BODY CONTENT ================= */}
          <ScrollView
            ref={bodyScrollRef}
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Global Validation Error Banner */}
            {uploadError ? (
              <View style={styles.errorBanner}>
                <View style={styles.errorBannerIconBox}>
                  <AlertCircle size={16} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBannerTitle}>
                    Action Required Before Proceeding
                  </Text>
                  <Text style={styles.errorBannerText}>{uploadError}</Text>
                </View>
              </View>
            ) : null}

            {/* ================= STEP 1: DOCUMENT & PURPOSE ================= */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                {/* Field 1: Custom Expandable Document Dropdown */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.inputLabel}>
                      1. Official Document Type <Text style={styles.reqAsterisk}>*</Text>
                    </Text>
                    <View style={styles.statusIndicatorDone}>
                      <CheckCircle2 size={11} color="#059669" />
                      <Text style={styles.statusIndicatorDoneText}>SELECTED</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      isDocDropdownOpen && styles.dropdownTriggerOpen,
                    ]}
                    onPress={() => setIsDocDropdownOpen((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <View style={styles.dropdownDocIcon}>
                        <FileText size={16} color="#2563eb" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownSelectedTitle} numberOfLines={1}>
                          {selectedDoc?.title}
                        </Text>
                        <Text style={styles.dropdownSelectedSub}>
                          {isSelectedDocFree
                            ? 'FREE'
                            : formatCurrency(selectedDocFee)}{' '}
                          • {selectedDoc?.processing_days || 1}{' '}
                          {Number(selectedDoc?.processing_days || 1) === 1
                            ? 'Working Day'
                            : 'Working Days'}
                        </Text>
                      </View>
                    </View>
                    {isDocDropdownOpen ? (
                      <ChevronUp size={18} color="#2563eb" />
                    ) : (
                      <ChevronDown size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>

                  {isDocDropdownOpen && (
                    <View style={styles.dropdownMenuCard}>
                      {availableDocTypes.map((dt) => {
                        const isSelected = dt.id === selectedDoc?.id;
                        const dtIsBiz = (dt.title || '').toLowerCase().includes('business');
                        const dtFee = Number(dt.fee) > 0 ? Number(dt.fee) : dtIsBiz ? 500 : 0;
                        const dtFree = dtFee === 0;
                        return (
                          <TouchableOpacity
                            key={dt.id}
                            style={[
                              styles.dropdownOptionRow,
                              isSelected && styles.dropdownOptionRowActive,
                            ]}
                            onPress={() => {
                              setSelectedDocId(dt.id);
                              setIsDocDropdownOpen(false);
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={[
                                  styles.dropdownOptionTitle,
                                  isSelected && styles.dropdownOptionTitleActive,
                                ]}
                              >
                                {dt.title}
                              </Text>
                              <Text style={styles.dropdownOptionMeta}>
                                Processing: {dt.processing_days || 1}{' '}
                                {Number(dt.processing_days || 1) === 1 ? 'day' : 'days'}
                              </Text>
                            </View>
                            <View style={styles.dropdownOptionRight}>
                              <View
                                style={[
                                  styles.miniFeePill,
                                  dtFree ? styles.miniFeePillFree : styles.miniFeePillPaid,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.miniFeePillText,
                                    dtFree
                                      ? styles.miniFeePillTextFree
                                      : styles.miniFeePillTextPaid,
                                  ]}
                                >
                                  {dtFree
                                    ? 'FREE'
                                    : formatCurrency(dtFee)}
                                </Text>
                              </View>
                              {isSelected && <CheckCircle2 size={15} color="#2563eb" />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Selected Document Overview Card */}
                <View style={styles.selectedDocCard}>
                  <View style={styles.selectedDocHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.selectedDocTag}>SELECTED SERVICE</Text>
                      <Text style={styles.selectedDocName}>{selectedDoc?.title}</Text>
                    </View>
                    <View
                      style={[
                        styles.selectedDocFeeBadge,
                        isSelectedDocFree
                          ? styles.selectedDocFeeBadgeFree
                          : styles.selectedDocFeeBadgePaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectedDocFeeText,
                          isSelectedDocFree
                            ? styles.selectedDocFeeTextFree
                            : styles.selectedDocFeeTextPaid,
                        ]}
                      >
                        {isSelectedDocFree
                          ? 'FREE'
                          : formatCurrency(selectedDocFee)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.selectedDocDesc}>{selectedDoc?.description}</Text>
                </View>

                {/* Field 2: Purpose of Request (Required Field with Indicator) */}
                <View
                  style={[
                    styles.fieldCard,
                    isPurposeEmpty && styles.fieldCardMissing,
                    showStepValidation && isPurposeEmpty && styles.fieldCardErrorStrong,
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.inputLabel}>
                      2. Purpose of Request <Text style={styles.reqAsterisk}>*</Text>
                    </Text>

                    {isPurposeEmpty ? (
                      <View style={styles.statusIndicatorRequired}>
                        <AlertCircle size={11} color="#dc2626" />
                        <Text style={styles.statusIndicatorRequiredText}>
                          REQUIRED — NOT INPUTTED
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusIndicatorDone}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.statusIndicatorDoneText}>COMPLETED</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.inputBoxRow,
                      isPurposeEmpty ? styles.inputBoxRowMissing : styles.inputBoxRowValid,
                    ]}
                  >
                    <TextInput
                      style={styles.textInputFlex}
                      placeholder="Enter your purpose for requesting this document"
                      placeholderTextColor="#94a3b8"
                      value={customPurpose}
                      onChangeText={(txt) => {
                        setCustomPurpose(txt);
                        setPurpose('Other Official Purpose');
                        if (txt.trim()) {
                          setUploadError('');
                        }
                      }}
                    />
                    {customPurpose ? (
                      <TouchableOpacity
                        onPress={() => {
                          setCustomPurpose('');
                          setPurpose('Other Official Purpose');
                        }}
                        style={styles.clearInputBtn}
                      >
                        <X size={13} color="#64748b" />
                      </TouchableOpacity>
                    ) : (
                      <AlertCircle size={16} color="#ef4444" />
                    )}
                  </View>

                  {isPurposeEmpty && (
                    <View style={styles.inlineMissingHint}>
                      <AlertCircle size={12} color="#dc2626" />
                      <Text style={styles.inlineMissingHintText}>
                        This field is required. Type a reason above or tap a quick preset below.
                      </Text>
                    </View>
                  )}

                  {/* Quick Selection Presets */}
                  <Text style={styles.presetsHeading}>
                    {isBusinessDoc ? 'Business Purpose Presets:' : 'Quick Purpose Presets:'}
                  </Text>
                  <View style={styles.presetsWrap}>
                    {(isBusinessDoc ? BUSINESS_PURPOSES : COMMON_PURPOSES).filter((p) => p !== 'Other Official Purpose').map(
                      (p) => {
                        const isSelected = customPurpose.trim() === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.presetChip,
                              isSelected && styles.presetChipActive,
                            ]}
                            onPress={() => {
                              setPurpose(p);
                              setCustomPurpose(p);
                              setUploadError('');
                            }}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isSelected && styles.presetChipTextActive,
                              ]}
                            >
                              {p}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ================= STEP 2: RESIDENT INFORMATION ================= */}
            {currentStep === 2 && (
              <View style={styles.stepContent}>
                {/* Required Input First: Years in the Barangay (Highlighted if empty!) */}
                <View
                  style={[
                    styles.fieldCard,
                    isYearsEmpty && styles.fieldCardMissing,
                    showStepValidation && isYearsEmpty && styles.fieldCardErrorStrong,
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.inputLabel}>
                      Length of Residency (Years in Barangay) <Text style={styles.reqAsterisk}>*</Text>
                    </Text>
                    {isYearsEmpty ? (
                      <View style={styles.statusIndicatorRequired}>
                        <AlertCircle size={11} color="#dc2626" />
                        <Text style={styles.statusIndicatorRequiredText}>
                          REQUIRED — NOT INPUTTED
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusIndicatorDone}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.statusIndicatorDoneText}>COMPLETED</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.inputBoxRow,
                      isYearsEmpty ? styles.inputBoxRowMissing : styles.inputBoxRowValid,
                    ]}
                  >
                    <TextInput
                      style={styles.textInputFlex}
                      placeholder="Enter number of years living in Barangay Zapatera (e.g. 5)"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={yearsInBarangay}
                      onChangeText={(val) => {
                        setYearsInBarangay(val);
                        if (val.trim()) setUploadError('');
                      }}
                    />
                    {isYearsEmpty ? (
                      <AlertCircle size={16} color="#ef4444" />
                    ) : (
                      <CheckCircle2 size={16} color="#10b981" />
                    )}
                  </View>

                  {isYearsEmpty && (
                    <View style={styles.inlineMissingHint}>
                      <AlertCircle size={12} color="#dc2626" />
                      <Text style={styles.inlineMissingHintText}>
                        Required field: Please input how many years you have lived in Barangay Zapatera.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Commercial & Business Entity Details Card (When Requesting Business Clearance) */}
                {isBusinessDoc && (
                  <View style={styles.residentInfoCard}>
                    <View style={styles.residentInfoCardHeader}>
                      <Building2 size={16} color="#2563eb" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.residentInfoCardTitle}>
                          COMMERCIAL & BUSINESS ENTITY DETAILS
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          Official variables required for the Barangay Business Clearance
                        </Text>
                      </View>
                    </View>

                    {/* Business Name */}
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.inputLabel}>
                          Business Name <Text style={styles.reqAsterisk}>*</Text>
                        </Text>
                        {!businessName.trim() ? (
                          <View style={styles.statusIndicatorRequired}>
                            <AlertCircle size={10} color="#dc2626" />
                            <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                          </View>
                        ) : (
                          <View style={styles.statusIndicatorDone}>
                            <CheckCircle2 size={10} color="#059669" />
                            <Text style={styles.statusIndicatorDoneText}>ENTERED</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.inputBoxRow,
                          !businessName.trim() && showStepValidation
                            ? styles.inputBoxRowMissing
                            : styles.inputBoxRowValid,
                        ]}
                      >
                        <TextInput
                          style={styles.textInputFlex}
                          placeholder=""
                          placeholderTextColor="#94a3b8"
                          value={businessName}
                          onChangeText={(txt) => {
                            setBusinessName(txt);
                            if (txt.trim()) setUploadError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* Permittee Name */}
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.inputLabel}>
                          Permittee (Owner / Permittee Name) <Text style={styles.reqAsterisk}>*</Text>
                        </Text>
                        {!permitteeName.trim() ? (
                          <View style={styles.statusIndicatorRequired}>
                            <AlertCircle size={10} color="#dc2626" />
                            <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                          </View>
                        ) : (
                          <View style={styles.statusIndicatorDone}>
                            <CheckCircle2 size={10} color="#059669" />
                            <Text style={styles.statusIndicatorDoneText}>ENTERED</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.inputBoxRow,
                          !permitteeName.trim() && showStepValidation
                            ? styles.inputBoxRowMissing
                            : styles.inputBoxRowValid,
                        ]}
                      >
                        <TextInput
                          style={styles.textInputFlex}
                          placeholder=""
                          placeholderTextColor="#94a3b8"
                          value={permitteeName}
                          onChangeText={(txt) => {
                            setPermitteeName(txt);
                            if (txt.trim()) setUploadError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* Business Address */}
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.inputLabel}>
                          Business Address <Text style={styles.reqAsterisk}>*</Text>
                        </Text>
                        {!businessAddress.trim() ? (
                          <View style={styles.statusIndicatorRequired}>
                            <AlertCircle size={10} color="#dc2626" />
                            <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                          </View>
                        ) : (
                          <View style={styles.statusIndicatorDone}>
                            <CheckCircle2 size={10} color="#059669" />
                            <Text style={styles.statusIndicatorDoneText}>ENTERED</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.inputBoxRow,
                          !businessAddress.trim() && showStepValidation
                            ? styles.inputBoxRowMissing
                            : styles.inputBoxRowValid,
                        ]}
                      >
                        <TextInput
                          style={styles.textInputFlex}
                          placeholder=""
                          placeholderTextColor="#94a3b8"
                          value={businessAddress}
                          onChangeText={(txt) => {
                            setBusinessAddress(txt);
                            if (txt.trim()) setUploadError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* Nature of Business */}
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.inputLabel}>
                          Nature of Business <Text style={styles.reqAsterisk}>*</Text>
                        </Text>
                        {!natureOfBusiness.trim() ? (
                          <View style={styles.statusIndicatorRequired}>
                            <AlertCircle size={10} color="#dc2626" />
                            <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                          </View>
                        ) : (
                          <View style={styles.statusIndicatorDone}>
                            <CheckCircle2 size={10} color="#059669" />
                            <Text style={styles.statusIndicatorDoneText}>ENTERED</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.inputBoxRow,
                          !natureOfBusiness.trim() && showStepValidation
                            ? styles.inputBoxRowMissing
                            : styles.inputBoxRowValid,
                        ]}
                      >
                        <TextInput
                          style={styles.textInputFlex}
                          placeholder=""
                          placeholderTextColor="#94a3b8"
                          value={natureOfBusiness}
                          onChangeText={(txt) => {
                            setNatureOfBusiness(txt);
                            if (txt.trim()) setUploadError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* Contact Number */}
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.inputLabel}>
                          Contact Number <Text style={styles.reqAsterisk}>*</Text>
                        </Text>
                        {!businessContact.trim() ? (
                          <View style={styles.statusIndicatorRequired}>
                            <AlertCircle size={10} color="#dc2626" />
                            <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                          </View>
                        ) : (
                          <View style={styles.statusIndicatorDone}>
                            <CheckCircle2 size={10} color="#059669" />
                            <Text style={styles.statusIndicatorDoneText}>ENTERED</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.inputBoxRow,
                          !businessContact.trim() && showStepValidation
                            ? styles.inputBoxRowMissing
                            : styles.inputBoxRowValid,
                        ]}
                      >
                        <TextInput
                          style={styles.textInputFlex}
                          placeholder=""
                          placeholderTextColor="#94a3b8"
                          value={businessContact}
                          onChangeText={(txt) => {
                            setBusinessContact(txt);
                            if (txt.trim()) setUploadError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* Financial Fields: Capital Invested & Gross Sales */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Capital Invested (₱)</Text>
                        <View style={[styles.inputBoxRowValid, { marginTop: 4 }]}>
                          <TextInput
                            style={styles.textInputFlex}
                            placeholder=""
                            placeholderTextColor="#94a3b8"
                            value={capitalInvested}
                            onChangeText={setCapitalInvested}
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Gross Sales (₱)</Text>
                        <View style={[styles.inputBoxRowValid, { marginTop: 4 }]}>
                          <TextInput
                            style={styles.textInputFlex}
                            placeholder=""
                            placeholderTextColor="#94a3b8"
                            value={grossSales}
                            onChangeText={setGrossSales}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Auto-Filled Resident Profile Summary Card */}
                <View style={styles.residentInfoCard}>
                  <View style={styles.residentInfoCardHeader}>
                    <ShieldCheck size={15} color="#2563eb" />
                    <Text style={styles.residentInfoCardTitle}>
                      VERIFIED RESIDENT PROFILE
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <User size={15} color="#2563eb" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Full Legal Name</Text>
                      <Text style={styles.infoValue}>
                        {currentUser.full_name || 'Resident Name'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={15} color="#2563eb" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Registered Sitio / Address</Text>
                      <Text style={styles.infoValue}>
                        {currentUser.sitio ||
                          currentUser.address ||
                          'Barangay Zapatera, Cebu City'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid2Col}>
                    <View style={styles.infoRowHalf}>
                      <Calendar size={14} color="#2563eb" />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Date of Birth</Text>
                        <Text style={styles.infoValue}>
                          {currentUser.birth_date ||
                            currentUser.birthdate ||
                            'Not specified'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRowHalf}>
                      <Phone size={14} color="#2563eb" />
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Mobile Number</Text>
                        <Text style={styles.infoValue}>
                          {currentUser.phone || '0917-123-4567'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Mail size={15} color="#2563eb" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Verified Email Address</Text>
                      <Text style={styles.infoValue}>{currentUser.email}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ================= STEP 3: UPLOAD REQUIREMENTS ================= */}
            {currentStep === 3 && (
              <View style={styles.stepContent}>
                {/* Upload Requirements Progress Card */}
                {requirementsToUpload.length > 0 && (
                  <View
                    style={[
                      styles.reqProgressCard,
                      !isAllMandatoryUploaded &&
                        showStepValidation &&
                        styles.reqProgressCardError,
                    ]}
                  >
                    <View style={styles.reqProgressHeader}>
                      <View style={styles.reqProgressHeaderLeft}>
                        <View
                          style={[
                            styles.reqProgressIconBox,
                            isAllMandatoryUploaded
                              ? styles.reqProgressIconDone
                              : styles.reqProgressIconPending,
                          ]}
                        >
                          {isAllMandatoryUploaded ? (
                            <CheckCircle2 size={18} color="#059669" />
                          ) : (
                            <Upload size={18} color="#2563eb" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reqProgressTitle}>
                            Mandatory Attachments
                          </Text>
                          <Text style={styles.reqProgressSubtitle}>
                            {totalMandatory === 0
                              ? 'No mandatory attachments required'
                              : isAllMandatoryUploaded
                              ? 'All required attachments uploaded (100%)'
                              : `${mandatoryUploadedCount} of ${totalMandatory} required document(s) attached`}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.reqProgressBadge,
                          isAllMandatoryUploaded
                            ? styles.reqProgressBadgeDone
                            : styles.reqProgressBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reqProgressBadgeText,
                            isAllMandatoryUploaded
                              ? styles.reqProgressBadgeTextDone
                              : styles.reqProgressBadgeTextPending,
                          ]}
                        >
                          {uploadProgressPercentage}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reqProgressBarTrack}>
                      <View
                        style={[
                          styles.reqProgressBarFill,
                          { width: `${uploadProgressPercentage}%` },
                          isAllMandatoryUploaded && styles.reqProgressBarFillDone,
                        ]}
                      />
                    </View>
                  </View>
                )}

                {requirementsToUpload.length === 0 ? (
                  <View style={styles.tipBox}>
                    <ShieldCheck size={16} color="#059669" />
                    <Text style={styles.tipText}>
                      No supporting documents or attachments required for this service. You may proceed directly to schedule your pickup.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadsList}>
                    {requirementsToUpload.map((item) => {
                      const uploaded = uploadedFiles[item.name];
                      const isMissingMandatory = item.is_required && !uploaded;

                      return (
                        <View
                          key={item.id || item.name}
                          style={[
                            styles.uploadItemCard,
                            isMissingMandatory && styles.uploadItemCardMissing,
                            showStepValidation &&
                              isMissingMandatory &&
                              styles.uploadItemCardErrorStrong,
                            uploaded && styles.uploadItemCardUploaded,
                          ]}
                        >
                          <View style={styles.uploadItemHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.uploadItemTitleRow}>
                                <Text style={styles.uploadItemName}>
                                  {item.name}
                                  {item.is_required ? (
                                    <Text style={styles.reqAsterisk}> *</Text>
                                  ) : null}
                                </Text>

                                {uploaded ? (
                                  <View style={styles.statusIndicatorDone}>
                                    <CheckCircle2 size={11} color="#059669" />
                                    <Text style={styles.statusIndicatorDoneText}>
                                      ATTACHED
                                    </Text>
                                  </View>
                                ) : item.is_required ? (
                                  <View style={styles.statusIndicatorRequired}>
                                    <AlertCircle size={11} color="#dc2626" />
                                    <Text style={styles.statusIndicatorRequiredText}>
                                      REQUIRED — NOT UPLOADED
                                    </Text>
                                  </View>
                                ) : (
                                  <View style={styles.optionalTag}>
                                    <Text style={styles.optionalTagText}>OPTIONAL</Text>
                                  </View>
                                )}
                              </View>

                              {item.description ? (
                                <Text style={styles.uploadItemDesc}>
                                  {item.description}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          {uploadingMap[item.name] ? (
                            <View style={styles.uploadingSpinnerBox}>
                              <ActivityIndicator size="small" color="#2563eb" />
                              <Text style={styles.uploadingSpinnerText}>
                                Uploading securely to Barangay Storage...
                              </Text>
                            </View>
                          ) : uploaded ? (
                            <View style={styles.uploadedFileContainer}>
                              <View style={styles.uploadedFileRow}>
                                {uploaded.file_url ? (
                                  <Image
                                    source={{ uri: uploaded.file_url }}
                                    style={styles.uploadedThumbnail}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={styles.pdfBadge}>
                                    <FileText size={18} color="#dc2626" />
                                  </View>
                                )}
                                <View style={styles.uploadedFileLeft}>
                                  <Text
                                    style={styles.uploadedFileName}
                                    numberOfLines={1}
                                  >
                                    {uploaded.file_name}
                                  </Text>
                                  <Text style={styles.uploadedFileSize}>
                                    {uploaded.file_size} • Ready for verification
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeFileBtn}
                                  onPress={() => handleRemoveFile(item.name)}
                                >
                                  <Trash2 size={15} color="#ef4444" />
                                </TouchableOpacity>
                              </View>

                              {/* AI Document Quality Inspection Result */}
                              {uploaded.ai_quality && (
                                <View
                                  style={[
                                    styles.aiQualityBox,
                                    uploaded.ai_quality.status === 'passed'
                                      ? styles.aiQualityBoxPass
                                      : styles.aiQualityBoxWarn,
                                  ]}
                                >
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    {uploaded.ai_quality.status === 'passed' ? (
                                      <CheckCircle2 size={14} color="#15803d" />
                                    ) : (
                                      <AlertTriangle size={14} color="#b45309" />
                                    )}
                                    <Text
                                      style={[
                                        styles.aiQualityTitle,
                                        uploaded.ai_quality.status === 'passed'
                                          ? styles.aiQualityTitlePass
                                          : styles.aiQualityTitleWarn,
                                      ]}
                                    >
                                      {uploaded.ai_quality.status === 'passed'
                                        ? `AI Check: Clear & Readable (${uploaded.ai_quality.qualityScore}%)`
                                        : `AI Quality Notice: ${
                                            uploaded.ai_quality.issues.join(', ') ||
                                            'Check clarity'
                                          }`}
                                    </Text>
                                  </View>

                                  {uploaded.ai_quality.status !== 'passed' && (
                                    <View style={{ marginTop: 4, paddingLeft: 19 }}>
                                      <Text style={styles.aiQualityWarningText}>
                                        {uploaded.ai_quality.suggestions[0] ||
                                          'Make sure all four corners are visible and text is sharp.'}
                                      </Text>
                                      <TouchableOpacity
                                        style={styles.aiRetakeBtn}
                                        onPress={() =>
                                          handleRealFileUpload(item.name, 'camera')
                                        }
                                      >
                                        <Camera size={11} color="#92400e" />
                                        <Text style={styles.aiRetakeBtnText}>
                                          Re-take / Replace Photo
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          ) : (
                            <>
                              <View style={styles.uploadActionButtons}>
                                <TouchableOpacity
                                  style={styles.uploadActionBtn}
                                  onPress={() =>
                                    handleRealFileUpload(item.name, 'camera')
                                  }
                                  activeOpacity={0.75}
                                >
                                  <Camera size={14} color="#2563eb" />
                                  <Text style={styles.uploadActionText}>Camera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.uploadActionBtn}
                                  onPress={() =>
                                    handleRealFileUpload(item.name, 'photo')
                                  }
                                  activeOpacity={0.75}
                                >
                                  <ImageIcon size={14} color="#059669" />
                                  <Text
                                    style={[
                                      styles.uploadActionText,
                                      { color: '#059669' },
                                    ]}
                                  >
                                    Gallery
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.uploadActionBtn}
                                  onPress={() =>
                                    handleRealFileUpload(item.name, 'document')
                                  }
                                  activeOpacity={0.75}
                                >
                                  <Upload size={14} color="#7c3aed" />
                                  <Text
                                    style={[
                                      styles.uploadActionText,
                                      { color: '#7c3aed' },
                                    ]}
                                  >
                                    PDF File
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {showStepValidation && isMissingMandatory && (
                                <View style={styles.inlineMissingHint}>
                                  <AlertCircle size={12} color="#dc2626" />
                                  <Text style={styles.inlineMissingHintText}>
                                    Required attachment not uploaded. Please attach a photo or PDF above.
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ================= STEP 4: SCHEDULE PICKUP ================= */}
            {currentStep === 4 && (
              <View style={styles.stepContent}>
                <View style={styles.fieldCard}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.inputLabel}>
                      1. Pickup Date (Mon–Fri) <Text style={styles.reqAsterisk}>*</Text>
                    </Text>
                    {selectedDate ? (
                      <View style={styles.statusIndicatorDone}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.statusIndicatorDoneText}>
                          {selectedDate}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusIndicatorRequired}>
                        <AlertCircle size={11} color="#dc2626" />
                        <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                      </View>
                    )}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dateScroll}
                  >
                    {availableDates.map((dateStr) => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', {
                        weekday: 'short',
                      });
                      const monthDay = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      const isSelected = selectedDate === dateStr;
                      return (
                        <TouchableOpacity
                          key={dateStr}
                          style={[
                            styles.dateCard,
                            isSelected && styles.dateCardActive,
                          ]}
                          onPress={() => setSelectedDate(dateStr)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.dayNameText,
                              isSelected && styles.dayNameTextActive,
                            ]}
                          >
                            {dayName}
                          </Text>
                          <Text
                            style={[
                              styles.monthDayText,
                              isSelected && styles.monthDayTextActive,
                            ]}
                          >
                            {monthDay}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.fieldCard}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.inputLabel}>
                      2. 30-Minute Pickup Window <Text style={styles.reqAsterisk}>*</Text>
                    </Text>
                    {selectedSlot ? (
                      <View style={styles.statusIndicatorDone}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.statusIndicatorDoneText}>SELECTED</Text>
                      </View>
                    ) : (
                      <View style={styles.statusIndicatorRequired}>
                        <AlertCircle size={11} color="#dc2626" />
                        <Text style={styles.statusIndicatorRequiredText}>REQUIRED</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.slotGrid}>
                    {APPOINTMENT_TIME_SLOTS.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.timeSlotPill,
                            isSelected && styles.timeSlotPillActive,
                          ]}
                          onPress={() => setSelectedSlot(slot)}
                          activeOpacity={0.8}
                        >
                          <Clock
                            size={12}
                            color={isSelected ? '#ffffff' : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextActive,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.scheduleNotice}>
                  <MapPin size={15} color="#2563eb" />
                  <Text style={styles.scheduleNoticeText}>
                    Claiming Counter: 2nd Floor, Barangay Hall Lobby, Rahmann St.
                  </Text>
                </View>
              </View>
            )}

            {/* ================= STEP 5: REVIEW REQUEST SUMMARY ================= */}
            {currentStep === 5 && (
              <View style={styles.stepContent}>
                <View style={styles.summaryCard}>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>DOCUMENT & PURPOSE</Text>
                    <Text style={styles.summaryMainText}>{selectedDoc?.title}</Text>
                    <Text style={styles.summarySubText}>
                      Purpose: {activePurposeValue}
                    </Text>
                    <Text style={styles.summaryFeeText}>
                      Document Fee:{' '}
                      <Text style={{ color: '#2563eb', fontWeight: '800' }}>
                        {isSelectedDocFree
                          ? 'FREE'
                          : formatCurrency(selectedDocFee)}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>RESIDENT DETAILS</Text>
                    <Text style={styles.summarySubText}>
                      Name: {currentUser.full_name}
                    </Text>
                    <Text style={styles.summarySubText}>
                      Address:{' '}
                      {currentUser.sitio ||
                        currentUser.address ||
                        'Barangay Zapatera'}
                    </Text>
                    <Text style={styles.summarySubText}>
                      Years in Barangay: {yearsInBarangay} year(s)
                    </Text>
                  </View>

                  {isBusinessDoc && (
                    <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryHeader}>COMMERCIAL & BUSINESS DETAILS</Text>
                        <Text style={styles.summaryMainText}>{businessName || 'Business Name'}</Text>
                        <Text style={styles.summarySubText}>Permittee: {permitteeName || currentUser.full_name}</Text>
                        <Text style={styles.summarySubText}>Address: {businessAddress}</Text>
                        <Text style={styles.summarySubText}>Nature of Business: {natureOfBusiness}</Text>
                        <Text style={styles.summarySubText}>Contact: {businessContact || currentUser.phone}</Text>
                        {capitalInvested ? (
                          <Text style={styles.summarySubText}>Capital Invested: ₱{capitalInvested}</Text>
                        ) : null}
                        {grossSales ? (
                          <Text style={styles.summarySubText}>Gross Sales: ₱{grossSales}</Text>
                        ) : null}
                      </View>
                    </>
                  )}

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>PICKUP APPOINTMENT</Text>
                    <View style={styles.appointmentBadge}>
                      <Calendar size={13} color="#2563eb" />
                      <Text style={styles.appointmentDateText}>{selectedDate}</Text>
                      <Clock size={13} color="#2563eb" style={{ marginLeft: 8 }} />
                      <Text style={styles.appointmentSlotText}>{selectedSlot}</Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>ATTACHED REQUIREMENTS</Text>
                    {Object.keys(uploadedFiles).length > 0 ? (
                      Object.values(uploadedFiles).map((file, i) => (
                        <View key={i} style={styles.summaryFileRow}>
                          <CheckCircle2 size={13} color="#16a34a" />
                          <Text style={styles.summaryFileName}>
                            {file.requirement_name} ({file.file_name})
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.summarySubText}>
                        Standard resident identification on file
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ================= STEP 6: CONFIRMATION SCREEN ================= */}
            {currentStep === 6 && submittedReq && (
              <View style={styles.confirmationContent}>
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <Check size={30} color="#ffffff" strokeWidth={3} />
                  </View>
                </View>

                <Text style={styles.successTitle}>
                  Request Submitted Successfully!
                </Text>
                <Text style={styles.successSub}>
                  Your application is now queued for Barangay Zapatera administration verification.
                </Text>

                {/* Tracking Reference Highlight Card */}
                <View style={styles.trackingBox}>
                  <View style={styles.trackingHeaderRow}>
                    <View style={styles.trackingHeaderLeft}>
                      <ShieldCheck size={14} color="#2563eb" />
                      <Text style={styles.trackingLabel}>
                        OFFICIAL TRACKING NUMBER
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.copyPill,
                        copiedTracking && styles.copyPillActive,
                      ]}
                      onPress={handleCopyTracking}
                      activeOpacity={0.7}
                    >
                      {copiedTracking ? (
                        <>
                          <Check size={12} color="#16a34a" strokeWidth={2.5} />
                          <Text style={styles.copyPillTextSuccess}>Copied</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={12} color="#2563eb" />
                          <Text style={styles.copyPillText}>Copy Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.trackingCode}>
                    {submittedReq.tracking_number}
                  </Text>
                  <Text style={styles.trackingInstruction}>
                    Save or screenshot this tracking code for verification upon claiming.
                  </Text>
                </View>

                {/* Detailed Summary Card */}
                <View style={styles.confirmDetailsCard}>
                  <View style={styles.confirmRow}>
                    <View style={styles.confirmLabelGroup}>
                      <FileText size={14} color="#64748b" />
                      <Text style={styles.confirmLabel}>Document:</Text>
                    </View>
                    <Text style={styles.confirmValueBold}>
                      {submittedReq.document_title}
                    </Text>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmLabelGroup}>
                      <Calendar size={14} color="#64748b" />
                      <Text style={styles.confirmLabel}>Pickup Schedule:</Text>
                    </View>
                    <View style={styles.scheduleBadge}>
                      <Text style={styles.scheduleBadgeText}>
                        {submittedReq.pickup_date} • {submittedReq.pickup_time_slot}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={styles.confirmRow}>
                    <View style={styles.confirmLabelGroup}>
                      <MapPin size={14} color="#64748b" />
                      <Text style={styles.confirmLabel}>Claim Location:</Text>
                    </View>
                    <Text style={styles.confirmValue}>Barangay Zapatera Hall</Text>
                  </View>
                </View>

                {/* Guidelines Card */}
                <View style={styles.guideCard}>
                  <View style={styles.guideHeaderRow}>
                    <Info size={14} color="#2563eb" />
                    <Text style={styles.guideTitle}>Next Steps & Reminders</Text>
                  </View>
                  <Text style={styles.guideText}>
                    • Bring at least 1 valid government ID and present tracking code{' '}
                    <Text style={{ fontWeight: '800', color: '#1e3a8a' }}>
                      #{submittedReq.tracking_number}
                    </Text>{' '}
                    at the Releasing Counter.
                  </Text>
                </View>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.trackNowBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      onTrackSubmittedRequest(submittedReq);
                      resetForm();
                    }}
                  >
                    <Clock size={16} color="#ffffff" />
                    <Text style={styles.trackNowBtnText}>
                      Track Request Timeline
                    </Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    activeOpacity={0.8}
                    onPress={resetForm}
                  >
                    <Text style={styles.doneBtnText}>Back to Dashboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ================= 4. FOOTER NAVIGATION ================= */}
          {currentStep <= 5 && (
            <View style={styles.modalFooter}>
              {currentStep > 1 ? (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setUploadError('');
                    setShowStepValidation(false);
                    setCurrentStep((prev) => prev - 1);
                  }}
                  activeOpacity={0.75}
                >
                  <ArrowLeft size={15} color="#475569" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={resetForm}
                  activeOpacity={0.75}
                >
                  <Text style={styles.backBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  isSubmitting && { opacity: 0.6 },
                  currentStep === 3 &&
                    !isAllMandatoryUploaded &&
                    styles.nextBtnIncomplete,
                ]}
                onPress={handleNextStep}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.nextBtnText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>
                      {currentStep === 5
                        ? 'Submit Application'
                        : currentStep === 3
                        ? isAllMandatoryUploaded
                          ? 'Continue to Schedule'
                          : `Upload Required (${mandatoryUploadedCount}/${totalMandatory})`
                        : 'Continue'}
                    </Text>
                    <ArrowRight size={15} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={
          actionModal.onClose ||
          (() => setActionModal({ isOpen: false, title: '' }))
        }
      />
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
  headerIconBoxSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  headerTextCol: {
    flex: 1,
  },
  headerStepTag: {
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

  /* Connected Stepper */
  stepperWrap: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNodeCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurr: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  stepCircleDone: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  stepCircleError: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  stepNumText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
  },
  stepNumTextCurr: {
    color: '#ffffff',
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stepLabelCurr: {
    color: '#2563eb',
    fontWeight: '800',
  },
  stepLabelDone: {
    color: '#15803d',
    fontWeight: '700',
  },
  stepLabelError: {
    color: '#dc2626',
    fontWeight: '800',
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepConnectorLineDone: {
    backgroundColor: '#86efac',
  },

  /* Body */
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 14,
    paddingBottom: 22,
  },
  stepContent: {
    gap: 12,
  },

  /* Validation Error Banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#f87171',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  errorBannerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBannerTitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#991b1b',
  },
  errorBannerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#b91c1c',
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },

  /* Field Containers & Required Highlighting */
  fieldGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  fieldCardMissing: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffafb',
  },
  fieldCardErrorStrong: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  reqAsterisk: {
    color: '#ef4444',
    fontWeight: '900',
  },

  /* Status Indicators (Required vs Completed) */
  statusIndicatorRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  statusIndicatorRequiredText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.3,
  },
  statusIndicatorDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  statusIndicatorDoneText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.3,
  },
  optionalTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  optionalTagText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },

  /* Custom Document Dropdown */
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 13,
    padding: 11,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  dropdownTriggerOpen: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  dropdownDocIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownSelectedTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownSelectedSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 1,
  },
  dropdownMenuCard: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 6,
    gap: 4,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dropdownOptionRowActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownOptionTitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  dropdownOptionTitleActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  dropdownOptionMeta: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  dropdownOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniFeePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  miniFeePillFree: {
    backgroundColor: '#dcfce7',
  },
  miniFeePillPaid: {
    backgroundColor: '#eff6ff',
  },
  miniFeePillText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  miniFeePillTextFree: {
    color: '#15803d',
  },
  miniFeePillTextPaid: {
    color: '#1d4ed8',
  },

  /* Selected Document Summary Card */
  selectedDocCard: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedDocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedDocTag: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  selectedDocName: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 2,
  },
  selectedDocFeeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedDocFeeBadgeFree: {
    backgroundColor: '#dcfce7',
  },
  selectedDocFeeBadgePaid: {
    backgroundColor: '#ffffff',
  },
  selectedDocFeeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
  },
  selectedDocFeeTextFree: {
    color: '#15803d',
  },
  selectedDocFeeTextPaid: {
    color: '#1d4ed8',
  },
  selectedDocDesc: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#334155',
    marginTop: 6,
    lineHeight: 16,
  },

  /* Highlighted Input Box */
  inputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1.5,
    gap: 8,
  },
  inputBoxRowValid: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  inputBoxRowMissing: {
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
  },
  textInputFlex: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 8,
  },
  clearInputBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineMissingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inlineMissingHintText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },

  /* Presets */
  presetsHeading: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 6,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetChipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* Resident Profile Card */
  residentInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 11,
  },
  residentInfoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  residentInfoCardTitle: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoGrid2Col: {
    flexDirection: 'row',
    gap: 10,
  },
  infoRowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tipText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#065f46',
    flex: 1,
    lineHeight: 16,
  },

  /* Step 3 Uploads */
  reqProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  reqProgressCardError: {
    borderColor: '#ef4444',
    backgroundColor: '#fffafb',
  },
  reqProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  reqProgressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reqProgressIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqProgressIconPending: {
    backgroundColor: '#eff6ff',
  },
  reqProgressIconDone: {
    backgroundColor: '#dcfce7',
  },
  reqProgressTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  reqProgressSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  reqProgressBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reqProgressBadgePending: {
    backgroundColor: '#eff6ff',
  },
  reqProgressBadgeDone: {
    backgroundColor: '#dcfce7',
  },
  reqProgressBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
  },
  reqProgressBadgeTextPending: {
    color: '#2563eb',
  },
  reqProgressBadgeTextDone: {
    color: '#15803d',
  },
  reqProgressBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginTop: 10,
    overflow: 'hidden',
  },
  reqProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  reqProgressBarFillDone: {
    backgroundColor: '#16a34a',
  },

  uploadsList: {
    gap: 10,
  },
  uploadItemCard: {
    backgroundColor: '#ffffff',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 9,
  },
  uploadItemCardMissing: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffafb',
  },
  uploadItemCardErrorStrong: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  uploadItemCardUploaded: {
    borderColor: '#86efac',
    backgroundColor: '#ffffff',
  },
  uploadItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  uploadItemName: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  uploadItemDesc: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 3,
  },
  uploadingSpinnerBox: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  uploadingSpinnerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#2563eb',
    fontWeight: '700',
  },
  uploadActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  uploadActionText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  uploadedFileContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    overflow: 'hidden',
  },
  uploadedFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  uploadedThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  pdfBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedFileLeft: {
    flex: 1,
    gap: 2,
  },
  uploadedFileName: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadedFileSize: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#15803d',
    fontWeight: '600',
  },
  removeFileBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  aiQualityBox: {
    margin: 8,
    marginTop: 0,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  aiQualityBoxPass: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  aiQualityBoxWarn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  aiQualityTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
  },
  aiQualityTitlePass: {
    color: '#15803d',
  },
  aiQualityTitleWarn: {
    color: '#92400e',
  },
  aiQualityWarningText: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#78350f',
    lineHeight: 14,
    marginBottom: 6,
  },
  aiRetakeBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  aiRetakeBtnText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },

  /* Step 4 Schedule */
  dateScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  dateCard: {
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 72,
  },
  dateCardActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayNameText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  dayNameTextActive: {
    color: '#dbeafe',
  },
  monthDayText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  monthDayTextActive: {
    color: '#ffffff',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    backgroundColor: '#f8fafc',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeSlotPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  timeSlotTextActive: {
    color: '#ffffff',
  },
  scheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  scheduleNoticeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#1e40af',
    fontWeight: '600',
    flex: 1,
  },

  /* Step 5 Summary */
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summarySection: {
    paddingVertical: 4,
  },
  summaryHeader: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryMainText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  summarySubText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  summaryFeeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#0f172a',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  appointmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  appointmentDateText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginLeft: 5,
  },
  appointmentSlotText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginLeft: 5,
  },
  summaryFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  summaryFileName: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },

  /* Step 6 Confirmation */
  confirmationContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  successIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  successSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  trackingBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    marginBottom: 12,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copyPillActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  copyPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  copyPillTextSuccess: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  trackingCode: {
    fontSize: 21,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1d4ed8',
    marginVertical: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  trackingInstruction: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  confirmDetailsCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  confirmLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  confirmValue: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  confirmValueBold: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 6,
  },
  scheduleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduleBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  guideCard: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  guideText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  confirmActions: {
    width: '100%',
    gap: 8,
  },
  trackNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    borderRadius: 13,
  },
  trackNowBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  doneBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  doneBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  /* Footer */
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  backBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  nextBtnIncomplete: {
    backgroundColor: '#475569',
  },
  nextBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
