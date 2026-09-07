// Resident/src/features/requests/RequestFlowModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
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

interface RequestFlowModalProps {
  visible: boolean;
  initialDoc: DocumentType | null;
  docTypes: DocumentType[];
  currentUser: ResidentUser;
  config: BarangayConfig;
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
  // Steps: 1: Document, 2: Resident Info, 3: Uploads, 4: Schedule, 5: Review, 6: Confirmation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDoc?.id || docTypes[0]?.id || 'dt-001');
  const [purpose, setPurpose] = useState<string>(COMMON_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState<string>('');

  // Step 3 Uploads State
  const [uploadedFiles, setUploadedFiles] = useState<{ [reqKey: string]: UploadedRequirementFile }>({});
  const [uploadError, setUploadError] = useState<string>('');

  // Step 4 Schedule State
  const today = new Date();
  const getNextBusinessDays = () => {
    const days: string[] = [];
    let d = new Date(today);
    d.setDate(d.getDate() + 1); // Start tomorrow
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
  const [selectedSlot, setSelectedSlot] = useState<string>(APPOINTMENT_TIME_SLOTS[2]); // Default 9:00 AM - 9:30 AM

  // Confirmation State
  const [submittedReq, setSubmittedReq] = useState<DocumentRequest | null>(null);

  const selectedDoc = docTypes.find((d) => d.id === selectedDocId) || initialDoc || docTypes[0];

  // Requirements list normalized from selectedDoc
  const requirementsToUpload = (selectedDoc?.requirements && Array.isArray(selectedDoc.requirements) && selectedDoc.requirements.length > 0)
    ? selectedDoc.requirements.map((r, i) => {
        const name = typeof r === 'string' ? r : (r as any).name || (r as any).title || `Requirement ${i + 1}`;
        const isReq = typeof r === 'object' && 'is_required' in (r as any) ? !!(r as any).is_required : true;
        return {
          id: `req-${i}`,
          name: name,
          description: 'Original or clear digital scanned copy / camera photo',
          is_required: isReq,
        };
      })
    : (selectedDoc?.requirement_items || []);

  // Real browser/device file and camera upload handler
  const handleRealFileUpload = (reqName: string, mode: 'camera' | 'photo' | 'document' = 'photo') => {
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

    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const fileSize = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || (!isPdf);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFile: UploadedRequirementFile = {
          requirement_name: reqName,
          file_name: file.name,
          file_type: isPdf ? 'application/pdf' : 'image/jpeg',
          file_size: fileSize,
          file_url: isImage ? dataUrl : undefined,
          status: 'uploaded',
        };
        setUploadedFiles((prev) => ({ ...prev, [reqName]: newFile }));
        setUploadError('');
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        const newFile: UploadedRequirementFile = {
          requirement_name: reqName,
          file_name: file.name,
          file_type: 'application/pdf',
          file_size: fileSize,
          status: 'uploaded',
        };
        setUploadedFiles((prev) => ({ ...prev, [reqName]: newFile }));
        setUploadError('');
      }
    };

    input.click();
  };

  const handleRemoveFile = (reqName: string) => {
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      delete updated[reqName];
      return updated;
    });
  };

  // Validate step transitions
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (purpose === 'Other Official Purpose' && !customPurpose.trim()) {
        setUploadError('Please specify the purpose for requesting this document.');
        return;
      }
      setUploadError('');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Check mandatory requirements
      const mandatoryItems = requirementsToUpload.filter((r) => r.is_required);
      if (mandatoryItems.length > 0) {
        const missing = mandatoryItems.find((m) => !uploadedFiles[m.name]);
        if (missing) {
          setUploadError(`Required: Please upload or capture a copy of "${missing.name}" before proceeding.`);
          return;
        }
      }
      setUploadError('');
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!selectedDate || !selectedSlot) {
        setUploadError('Please select both a pickup date and a 30-minute time slot.');
        return;
      }
      setUploadError('');
      setCurrentStep(5);
    } else if (currentStep === 5) {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = () => {
    const trackingNo = generateTrackingNumber(config.doc_prefix || 'BRGY-2026');
    const finalPurpose = purpose === 'Other Official Purpose' ? customPurpose.trim() : purpose;

    const newRequest: DocumentRequest = {
      id: `req-${Date.now()}`,
      tracking_number: trackingNo,
      resident_id: currentUser.id || 'res-user',
      resident_name: currentUser.full_name || `${currentUser.first_name} ${currentUser.last_name}`,
      resident_email: currentUser.email,
      resident_phone: currentUser.phone || '0917-000-0000',
      resident_address: currentUser.address || currentUser.sitio || 'Barangay Zapatera, Cebu City',
      document_type_id: selectedDoc.id,
      document_title: selectedDoc.title,
      fee: selectedDoc.fee,
      purpose: finalPurpose,
      requirements_attached: Object.keys(uploadedFiles),
      uploaded_files: Object.values(uploadedFiles),
      pickup_date: selectedDate,
      pickup_time_slot: selectedSlot,
      status: 'pending',
      pickup_location: 'Express Window 2, Barangay Hall Lobby, Rahmann St.',
      pickup_instructions: `Please arrive during your selected 30-minute interval (${selectedSlot}). Bring your valid ID and the exact fee of ${selectedDoc.fee === 0 ? '₱0.00 (FREE)' : formatCurrency(selectedDoc.fee)}.`,
      timeline: [
        {
          status: 'pending',
          label: 'Request Submitted',
          description: 'Document request submitted online and registered into the records queue.',
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          is_completed: true,
          is_current: true,
        },
        {
          status: 'under_review',
          label: 'Under Review',
          description: 'Barangay administrative staff validates residency and blotter clearances.',
          timestamp: 'Pending Staff Review',
          is_completed: false,
          is_current: false,
        },
        {
          status: 'processing',
          label: 'Processing & Printing',
          description: 'Official clearance generated, printed, sealed, and approved.',
          timestamp: 'Pending Processing',
          is_completed: false,
          is_current: false,
        },
        {
          status: 'ready_for_pickup',
          label: 'Ready for Pickup',
          description: `Document ready for collection on ${selectedDate} at Express Window.`,
          timestamp: 'Scheduled for ' + selectedDate,
          is_completed: false,
          is_current: false,
        },
        {
          status: 'completed',
          label: 'Completed',
          description: 'Document claimed and released to resident.',
          timestamp: 'Pending Release',
          is_completed: false,
          is_current: false,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onRequestSubmitted(newRequest);
    setSubmittedReq(newRequest);
    setCurrentStep(6);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setUploadedFiles({});
    setUploadError('');
    setSubmittedReq(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetForm}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <FileText size={20} color="#1d4ed8" />
              <Text style={styles.modalTitle}>
                {currentStep === 6 ? 'Request Filed' : `File Request: Step ${currentStep} of 5`}
              </Text>
            </View>
            <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator (Steps 1 to 5) */}
          {currentStep <= 5 && (
            <View style={styles.progressBar}>
              {['Document', 'Resident', 'Uploads', 'Schedule', 'Review'].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum;
                const isCurr = currentStep === stepNum;
                return (
                  <View key={stepNum} style={styles.progressStepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        isDone && styles.stepCircleDone,
                        isCurr && styles.stepCircleCurr,
                      ]}
                    >
                      {isDone ? (
                        <Check size={12} color="#ffffff" />
                      ) : (
                        <Text style={[styles.stepNumText, isCurr && styles.stepNumTextCurr]}>{stepNum}</Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isCurr && styles.stepLabelCurr]}>{stepLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Body Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {uploadError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#b91c1c" />
                <Text style={styles.errorBannerText}>{uploadError}</Text>
              </View>
            ) : null}

            {/* STEP 1: SELECT DOCUMENT & PURPOSE */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Select Document & Purpose</Text>
                <Text style={styles.stepSubtitle}>
                  Choose the official document you wish to request from Barangay Zapatera.
                </Text>

                {/* Selected Document Card Preview */}
                <View style={styles.selectedDocCard}>
                  <View style={styles.selectedDocHeader}>
                    <Text style={styles.selectedDocName}>{selectedDoc.title}</Text>
                    <Text style={styles.selectedDocFee}>
                      {selectedDoc.fee === 0 ? 'FREE' : formatCurrency(selectedDoc.fee)}
                    </Text>
                  </View>
                  <Text style={styles.selectedDocDesc}>{selectedDoc.description}</Text>
                </View>

                {/* Document Selector Pills */}
                <Text style={styles.inputLabel}>Change Document Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docPillScroll}>
                  {docTypes.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.docPill,
                        selectedDocId === d.id && styles.docPillActive,
                      ]}
                      onPress={() => setSelectedDocId(d.id)}
                    >
                      <Text
                        style={[
                          styles.docPillText,
                          selectedDocId === d.id && styles.docPillTextActive,
                        ]}
                      >
                        {d.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Purpose of Request */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Purpose of Request *</Text>
                <View style={styles.purposeOptionsList}>
                  {COMMON_PURPOSES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.purposeOption,
                        purpose === p && styles.purposeOptionActive,
                      ]}
                      onPress={() => setPurpose(p)}
                    >
                      <View style={[styles.radioCircle, purpose === p && styles.radioCircleActive]}>
                        {purpose === p && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.purposeOptionText, purpose === p && styles.purposeOptionTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {purpose === 'Other Official Purpose' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>Please specify specific purpose:</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. For Overseas Employment, PhilHealth Claim..."
                      placeholderTextColor="#94a3b8"
                      value={customPurpose}
                      onChangeText={setCustomPurpose}
                    />
                  </View>
                )}
              </View>
            )}

            {/* STEP 2: RESIDENT INFORMATION REVIEW */}
            {currentStep === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Review Resident Information</Text>
                <Text style={styles.stepSubtitle}>
                  The system automatically pulls your registered resident profile to eliminate manual paperwork.
                </Text>

                <View style={styles.residentInfoCard}>
                  <View style={styles.infoRow}>
                    <User size={15} color="#1d4ed8" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Full Legal Name</Text>
                      <Text style={styles.infoValue}>{currentUser.full_name || 'Resident Name'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={15} color="#1d4ed8" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Registered Sitio / Address</Text>
                      <Text style={styles.infoValue}>{currentUser.sitio || currentUser.address || 'Barangay Zapatera, Cebu City'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Phone size={15} color="#1d4ed8" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Contact Mobile Number</Text>
                      <Text style={styles.infoValue}>{currentUser.phone || '0917-123-4567'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Mail size={15} color="#1d4ed8" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Verified Email Address</Text>
                      <Text style={styles.infoValue}>{currentUser.email}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <ShieldCheck size={15} color="#1d4ed8" />
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Voter Registration Status</Text>
                      <Text style={styles.infoValue}>{currentUser.voter_status || 'Registered Voter'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tipBox}>
                  <ShieldCheck size={14} color="#059669" />
                  <Text style={styles.tipText}>
                    Verified Zapatera resident record. If you need to update contact info, you can edit your profile under Settings.
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 3: UPLOAD REQUIREMENTS */}
            {currentStep === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Upload Requirements</Text>
                <Text style={styles.stepSubtitle}>
                  Attach clear photos, camera captures, or PDF copies of the required supporting documents for {selectedDoc.title}.
                </Text>

                {requirementsToUpload.length === 0 ? (
                  <View style={styles.tipBox}>
                    <ShieldCheck size={16} color="#059669" />
                    <Text style={styles.tipText}>
                      No supporting documents or attachments required for this document. You can proceed directly to select your express pickup schedule.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadsList}>
                    {requirementsToUpload.map((item) => {
                      const uploaded = uploadedFiles[item.name];
                      return (
                        <View key={item.id || item.name} style={styles.uploadItemCard}>
                          <View style={styles.uploadItemHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={styles.uploadItemName}>{item.name}</Text>
                                <View style={[styles.reqTag, item.is_required ? styles.reqTagRequired : styles.reqTagOptional]}>
                                  <Text style={[styles.reqTagText, item.is_required ? styles.reqTagTextRequired : styles.reqTagTextOptional]}>
                                    {item.is_required ? 'REQUIRED' : 'OPTIONAL'}
                                  </Text>
                                </View>
                              </View>
                              {item.description && (
                                <Text style={styles.uploadItemDesc}>{item.description}</Text>
                              )}
                            </View>
                          </View>

                          {uploaded ? (
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
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={14} color="#16a34a" />
                                    <Text style={styles.uploadedFileName} numberOfLines={1}>{uploaded.file_name}</Text>
                                  </View>
                                  <Text style={styles.uploadedFileSize}>{uploaded.file_size} • Ready for verification</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeFileBtn}
                                  onPress={() => handleRemoveFile(item.name)}
                                  title="Remove attachment"
                                >
                                  <Trash2 size={15} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.uploadActionButtons}>
                              <TouchableOpacity
                                style={styles.uploadActionBtn}
                                onPress={() => handleRealFileUpload(item.name, 'camera')}
                              >
                                <Camera size={14} color="#1d4ed8" />
                                <Text style={styles.uploadActionText}>Photo / Camera</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.uploadActionBtn}
                                onPress={() => handleRealFileUpload(item.name, 'photo')}
                              >
                                <ImageIcon size={14} color="#059669" />
                                <Text style={[styles.uploadActionText, { color: '#059669' }]}>Upload Picture</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.uploadActionBtn}
                                onPress={() => handleRealFileUpload(item.name, 'document')}
                              >
                                <Upload size={14} color="#7c3aed" />
                                <Text style={[styles.uploadActionText, { color: '#7c3aed' }]}>Upload PDF</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* STEP 4: SELECT PICKUP APPOINTMENT SCHEDULE (30-MIN INTERVALS) */}
            {currentStep === 4 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Select Express Pickup Schedule</Text>
                <Text style={styles.stepSubtitle}>
                  Choose your preferred pickup date and a specific 30-minute interval window at the Barangay Hall.
                </Text>

                {/* Date Picker Horizontal Pills */}
                <Text style={styles.inputLabel}>1. Select Pickup Date (Monday – Friday):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  {availableDates.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isSelected = selectedDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateCard, isSelected && styles.dateCardActive]}
                        onPress={() => setSelectedDate(dateStr)}
                      >
                        <Text style={[styles.dayNameText, isSelected && styles.dayNameTextActive]}>{dayName}</Text>
                        <Text style={[styles.monthDayText, isSelected && styles.monthDayTextActive]}>{monthDay}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 30-Minute Interval Time Slots */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>2. Select 30-Minute Pickup Interval:</Text>
                <View style={styles.slotGrid}>
                  {APPOINTMENT_TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeSlotPill, isSelected && styles.timeSlotPillActive]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Clock size={12} color={isSelected ? '#ffffff' : '#64748b'} />
                        <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.scheduleNotice}>
                  <MapPin size={14} color="#1d4ed8" />
                  <Text style={styles.scheduleNoticeText}>
                    Claiming Counter: Express Window 2, Barangay Hall Lobby, Rahmann St.
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 5: REVIEW REQUEST SUMMARY */}
            {currentStep === 5 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Review & Confirm Request</Text>
                <Text style={styles.stepSubtitle}>
                  Please verify all details before submitting your official barangay request.
                </Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>DOCUMENT & PURPOSE</Text>
                    <Text style={styles.summaryMainText}>{selectedDoc.title}</Text>
                    <Text style={styles.summarySubText}>Purpose: {purpose === 'Other Official Purpose' ? customPurpose : purpose}</Text>
                    <Text style={styles.summaryFeeText}>
                      Document Fee: <Text style={{ color: '#1d4ed8', fontWeight: '800' }}>{selectedDoc.fee === 0 ? 'FREE' : formatCurrency(selectedDoc.fee)}</Text>
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>RESIDENT DETAILS</Text>
                    <Text style={styles.summarySubText}>Name: {currentUser.full_name}</Text>
                    <Text style={styles.summarySubText}>Address: {currentUser.sitio || currentUser.address || 'Barangay Zapatera'}</Text>
                    <Text style={styles.summarySubText}>Mobile: {currentUser.phone || '0917-000-0000'}</Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>PICKUP APPOINTMENT</Text>
                    <View style={styles.appointmentBadge}>
                      <Calendar size={13} color="#1d4ed8" />
                      <Text style={styles.appointmentDateText}>{selectedDate}</Text>
                      <Clock size={13} color="#1d4ed8" style={{ marginLeft: 8 }} />
                      <Text style={styles.appointmentSlotText}>{selectedSlot}</Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryHeader}>ATTACHED REQUIREMENTS</Text>
                    {Object.keys(uploadedFiles).length > 0 ? (
                      Object.values(uploadedFiles).map((file, i) => (
                        <View key={i} style={styles.summaryFileRow}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <Text style={styles.summaryFileName}>{file.requirement_name} ({file.file_name})</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.summarySubText}>Standard resident identification on file</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 6: CONFIRMATION SCREEN */}
            {currentStep === 6 && submittedReq && (
              <View style={styles.confirmationContent}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={44} color="#16a34a" />
                </View>

                <Text style={styles.successTitle}>Request Submitted Successfully!</Text>
                <Text style={styles.successSub}>
                  Your application has been logged into the Barangay Zapatera queue.
                </Text>

                {/* Tracking Reference Box */}
                <View style={styles.trackingBox}>
                  <Text style={styles.trackingLabel}>OFFICIAL TRACKING NUMBER</Text>
                  <Text style={styles.trackingCode}>{submittedReq.tracking_number}</Text>
                  <Text style={styles.trackingInstruction}>Save or take a screenshot of this tracking code.</Text>
                </View>

                <View style={styles.confirmDetailsCard}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Document:</Text>
                    <Text style={styles.confirmValue}>{submittedReq.document_title}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Pickup Date:</Text>
                    <Text style={styles.confirmValue}>{submittedReq.pickup_date}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Time Interval:</Text>
                    <Text style={styles.confirmValue}>{submittedReq.pickup_time_slot}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Fee to Prepare:</Text>
                    <Text style={[styles.confirmValue, { color: '#1d4ed8', fontWeight: '800' }]}>
                      {submittedReq.fee === 0 ? 'FREE' : formatCurrency(submittedReq.fee)}
                    </Text>
                  </View>
                </View>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.trackNowBtn}
                    onPress={() => {
                      onTrackSubmittedRequest(submittedReq);
                      resetForm();
                    }}
                  >
                    <Clock size={16} color="#ffffff" />
                    <Text style={styles.trackNowBtnText}>Track Request Timeline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={resetForm}
                  >
                    <Text style={styles.doneBtnText}>Back to Dashboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Navigation (Steps 1 to 5) */}
          {currentStep <= 5 && (
            <View style={styles.modalFooter}>
              {currentStep > 1 ? (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setUploadError('');
                    setCurrentStep((prev) => prev - 1);
                  }}
                >
                  <ArrowLeft size={16} color="#64748b" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.backBtn} onPress={resetForm}>
                  <Text style={styles.backBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNextStep}
              >
                <Text style={styles.nextBtnText}>
                  {currentStep === 5 ? 'Submit Application' : 'Next Step'}
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressStepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurr: {
    backgroundColor: '#1d4ed8',
  },
  stepCircleDone: {
    backgroundColor: '#16a34a',
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  stepNumTextCurr: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLabelCurr: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  modalBody: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '700',
    flex: 1,
  },
  stepContent: {
    gap: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 6,
  },
  selectedDocCard: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedDocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDocName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e40af',
  },
  selectedDocFee: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  selectedDocDesc: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  docPillScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  docPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  docPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  docPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  purposeOptionsList: {
    gap: 6,
  },
  purposeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  purposeOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#1d4ed8',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  purposeOptionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  purposeOptionTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    marginTop: 4,
  },
  residentInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tipText: {
    fontSize: 11,
    color: '#065f46',
    flex: 1,
    lineHeight: 15,
  },
  uploadsList: {
    gap: 10,
  },
  uploadItemCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  uploadItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadItemDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  reqTag: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  reqTagRequired: {
    backgroundColor: '#fee2e2',
  },
  reqTagOptional: {
    backgroundColor: '#dcfce7',
  },
  reqTagText: {
    fontSize: 8,
    fontWeight: '800',
  },
  reqTagTextRequired: {
    color: '#b91c1c',
  },
  reqTagTextOptional: {
    color: '#15803d',
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
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  uploadActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  uploadedFileContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
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
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  pdfBadge: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  uploadedFileLeft: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  uploadedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadedFileSize: {
    fontSize: 10,
    color: '#64748b',
  },
  removeFileBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  dateScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  dateCard: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 70,
  },
  dateCardActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  dayNameTextActive: {
    color: '#bfdbfe',
  },
  monthDayText: {
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
    marginVertical: 6,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeSlotPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  timeSlotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  timeSlotTextActive: {
    color: '#ffffff',
  },
  scheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  scheduleNoticeText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '600',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summarySection: {
    paddingVertical: 6,
  },
  summaryHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryMainText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  summarySubText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  summaryFeeText: {
    fontSize: 12,
    color: '#0f172a',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  appointmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  appointmentDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginLeft: 4,
  },
  appointmentSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    marginLeft: 4,
  },
  summaryFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  summaryFileName: {
    fontSize: 11,
    color: '#334155',
  },
  confirmationContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  trackingBox: {
    width: '100%',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    marginBottom: 16,
  },
  trackingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  trackingCode: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1d4ed8',
    marginVertical: 4,
  },
  trackingInstruction: {
    fontSize: 10,
    color: '#64748b',
  },
  confirmDetailsCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  confirmValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  confirmActions: {
    width: '100%',
    gap: 10,
  },
  trackNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 10,
  },
  trackNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  doneBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  nextBtn: {
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
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
