// Admin/src/features/requests/ReceiveRequestView.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  Inbox,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileCheck2,
  Eye,
  Download,
  Calendar,
  Clock,
  User,
  Mail,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileBadge,
  Sparkles,
  MapPin,
  Phone,
  Cake,
  RotateCcw,
  RefreshCw,
  Info,
  Layers,
  FileCheck
} from 'lucide-react';
import { formatDate, formatCurrency, sanitizeInput } from '../../core/security';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { documentTemplates, formatIssuedDateOrdinal } from '../documents/documentTemplates';
import DocumentTemplate from '../documents/DocumentTemplate';
import FilePreviewModal from '../../components/FilePreviewModal';
import { downloadStoredAttachment } from '../../core/storageService';

const DECLINE_REASONS = [
  'Missing required document',
  'Invalid document',
  'Incorrect information',
  'Information does not match',
  'Requirements are incomplete',
  'Other',
];

export default function ReceiveRequestView({
  requests = [],
  docTypes = [],
  config = {},
  onProcessRequest,
  currentUser,
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Main Document Processing Workspace Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [generatorTab, setGeneratorTab] = useState('variables'); // 'variables' | 'preview'
  const [verificationMap, setVerificationMap] = useState({});
  const [processingNotes, setProcessingNotes] = useState('');

  // Confirmation / Decline Modals
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Missing required document');
  const [declineDetails, setDeclineDetails] = useState('');
  const [declineError, setDeclineError] = useState('');

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState(null);

  // Document Generator Variables (Synchronized with SuperAdmin Document Info Management)
  const templateKeys = Object.keys(documentTemplates);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('barangayCertification');
  const [genDocTitle, setGenDocTitle] = useState(documentTemplates.barangayCertification.title);
  const [genName, setGenName] = useState('');
  const [genAddress, setGenAddress] = useState('Barangay Zapatera, Cebu City');
  const [genDob, setGenDob] = useState('');
  const [genContact, setGenContact] = useState('');
  const [genYearsInBarangay, setGenYearsInBarangay] = useState('5 years');
  const [genPurpose, setGenPurpose] = useState(documentTemplates.barangayCertification.defaultPurpose);
  const [genIssuedDate, setGenIssuedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [genIssuedLocation, setGenIssuedLocation] = useState('Barangay Zapatera, Cebu City, Philippines');
  const [genBodyText, setGenBodyText] = useState(documentTemplates.barangayCertification.defaultBody);
  const [genSignatoryName, setGenSignatoryName] = useState(config?.punong_barangay || config?.signatory_name || 'HON. DAVID M. AGRAVANTE');
  const [genSignatoryTitle, setGenSignatoryTitle] = useState(config?.signatory_title || 'Punong Barangay');

  useEffect(() => {
    if (config?.punong_barangay || config?.signatory_name) {
      setGenSignatoryName(config.punong_barangay || config.signatory_name);
    }
    if (config?.signatory_title) {
      setGenSignatoryTitle(config.signatory_title);
    }
  }, [config]);

  // Filter requests: Active operational queue (Pending, Processing, Declined)
  // Approved and issued documents are automatically transferred to the Approved Documents registry
  const operationalRequests = requests.filter(
    (r) =>
      r.status !== 'approved' &&
      r.status !== 'ready_for_pickup' &&
      r.status !== 'issued' &&
      r.status !== 'completed' &&
      !r.is_claimed
  );

  const pendingCount = operationalRequests.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length;
  const processingCount = operationalRequests.filter((r) => (r.status || '').toLowerCase() === 'processing' || (r.status || '').toLowerCase() === 'under_review').length;
  const declinedCount = operationalRequests.filter((r) => (r.status || '').toLowerCase() === 'declined' || (r.status || '').toLowerCase() === 'rejected').length;

  const filteredRequests = operationalRequests.filter((r) => {
    const normStatus = (r.status || 'pending').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      normStatus === statusFilter ||
      (statusFilter === 'pending' && normStatus === 'pending') ||
      (statusFilter === 'processing' && (normStatus === 'under_review' || normStatus === 'processing')) ||
      (statusFilter === 'declined' && (normStatus === 'rejected' || normStatus === 'declined'));

    const matchesSearch =
      r.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.resident_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.document_title?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Determine if a request has required attachments
  const getRequirementList = (req) => {
    if (!req) return [];

    const matchedDocType = docTypes.find(
      (dt) =>
        dt.id === req.document_type_id ||
        dt.code === req.document_type_id ||
        dt.title?.toLowerCase() === req.document_title?.toLowerCase()
    );

    const docTypeReqs = matchedDocType?.requirements?.filter(
      (r) => r && typeof r === 'string' && r.trim().toLowerCase() !== 'none' && r.trim().toLowerCase() !== 'no requirements' && r.trim().toLowerCase() !== 'n/a'
    ) || [];

    if (req.uploaded_files && Array.isArray(req.uploaded_files) && req.uploaded_files.length > 0) {
      return req.uploaded_files.map((fileObj, idx) => ({
        id: `req-file-${idx}`,
        name: fileObj.requirement_name || `Requirement #${idx + 1}`,
        fileName: fileObj.file_name || `attachment_${idx + 1}.pdf`,
        fileType: fileObj.file_type || 'image/jpeg',
        file_size: fileObj.file_size,
        file_url: fileObj.file_url,
        storage_path: fileObj.storage_path,
        uploadDate: req.created_at ? formatDate(req.created_at) : formatDate(new Date()),
        status: fileObj.status || 'pending',
      }));
    }

    if (req.requirements_attached && Array.isArray(req.requirements_attached) && req.requirements_attached.length > 0) {
      const validAttached = req.requirements_attached.filter(
        (item) => {
          const str = typeof item === 'string' ? item : item?.name || '';
          return str.trim().toLowerCase() !== 'none' && str.trim().toLowerCase() !== 'n/a' && str.trim() !== '';
        }
      );

      if (validAttached.length > 0) {
        return validAttached.map((item, idx) => ({
          id: `req-att-${idx}`,
          name: typeof item === 'string' ? item : (item.name || `Requirement #${idx + 1}`),
          fileName: typeof item === 'string' ? `${item.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scan.pdf` : (item.fileName || 'attachment.pdf'),
          fileType: 'application/pdf',
          uploadDate: req.created_at ? formatDate(req.created_at) : formatDate(new Date()),
          status: 'pending',
        }));
      }
    }

    if (docTypeReqs.length > 0) {
      return docTypeReqs.map((reqTitle, idx) => ({
        id: `req-doctype-${idx}`,
        name: reqTitle,
        fileName: `${reqTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_document.pdf`,
        fileType: 'application/pdf',
        uploadDate: req.created_at ? formatDate(req.created_at) : formatDate(new Date()),
        status: 'pending',
      }));
    }

    return [];
  };

  // Synchronize resident profile details directly into generator dynamic variables
  const populateGeneratorFromResident = (req) => {
    if (!req) return;

    const resName = req.resident_name || req.profiles?.full_name || req.user_metadata?.full_name || '';
    const resAddress = req.resident_address || req.profiles?.address || req.address || (req.profiles?.sitio ? `${req.profiles.sitio}, Barangay Zapatera, Cebu City` : 'Barangay Zapatera, Cebu City');
    const resDob = req.resident_birth_date || req.date_of_birth || req.dob || req.birthdate || req.profiles?.birth_date || '';
    const resContact = req.resident_phone || req.phone || req.contact_no || req.profiles?.phone || '';
    const resYears = req.years_in_barangay || req.profiles?.years_in_barangay || '5 years';
    const resPurpose = req.purpose || 'Local Employment Application';

    setGenName(resName);
    setGenAddress(resAddress);
    setGenDob(resDob);
    setGenContact(resContact);
    setGenYearsInBarangay(resYears);
    setGenPurpose(resPurpose);

    // Auto-select matching template based on document title
    const titleLower = (req.document_title || '').toLowerCase();
    let matchedKey = 'barangayCertification';
    if (titleLower.includes('clearance')) matchedKey = 'barangayClearance';
    else if (titleLower.includes('residency')) matchedKey = 'certificateOfResidency';
    else if (titleLower.includes('moral')) matchedKey = 'certificateOfGoodMoralCharacter';
    else if (titleLower.includes('indigency')) matchedKey = 'certificateOfIndigency';
    else if (titleLower.includes('jobseeker')) matchedKey = 'firstTimeJobseeker';

    setSelectedTemplateKey(matchedKey);
    const tmpl = documentTemplates[matchedKey] || documentTemplates.barangayCertification;
    setGenDocTitle(req.document_title ? req.document_title.toUpperCase() : tmpl.title);
    setGenBodyText(tmpl.defaultBody);
  };

  // When admin clicks Process:
  // Immediately change request status from Pending -> Processing and populate all resident details into generator
  const handleStartProcess = (req) => {
    let updatedReq = { ...req };

    if (req.status === 'pending') {
      updatedReq.status = 'processing';
      updatedReq.updated_at = new Date().toISOString();
      if (onProcessRequest) {
        onProcessRequest(updatedReq);
      }
    }

    const reqList = getRequirementList(updatedReq);
    const initialMap = {};
    reqList.forEach((item) => {
      if (updatedReq.requirements_status && updatedReq.requirements_status[item.name]) {
        initialMap[item.name] = updatedReq.requirements_status[item.name];
      } else {
        initialMap[item.name] = 'verified';
      }
    });

    setVerificationMap(initialMap);
    setProcessingNotes(updatedReq.notes || '');

    // Auto-fill all resident information into the Official Document Generator
    populateGeneratorFromResident(updatedReq);

    setGeneratorTab('variables');
    setSelectedReq(updatedReq);
  };

  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    const tmpl = documentTemplates[key];
    if (tmpl) {
      setGenDocTitle(tmpl.title);
      setGenBodyText(tmpl.defaultBody);
      if (!genPurpose) {
        setGenPurpose(tmpl.defaultPurpose);
      }
    }
  };

  const handleSetVerification = (reqName, status) => {
    setVerificationMap((prev) => ({
      ...prev,
      [reqName]: status,
    }));
  };

  const currentReqList = getRequirementList(selectedReq);
  const hasRequirements = currentReqList.length > 0;
  const totalReqCount = currentReqList.length;
  const verifiedCount = currentReqList.filter((item) => verificationMap[item.name] === 'verified').length;
  const hasInvalidOrMissing = currentReqList.some(
    (item) => verificationMap[item.name] === 'invalid' || verificationMap[item.name] === 'missing'
  );

  const canProceedToPrint = !hasRequirements || (totalReqCount > 0 && verifiedCount === totalReqCount && !hasInvalidOrMissing);

  // When admin clicks Print Document:
  // Automatically mark the request as Approved and trigger window.print()
  const handlePrintAndApprove = () => {
    if (!selectedReq) return;

    const adminName = currentUser?.full_name || currentUser?.email || 'Barangay Administrator';
    const updatedPayload = {
      ...selectedReq,
      status: 'approved',
      approved_at: new Date().toISOString(),
      processed_by: adminName,
      notes: sanitizeInput(processingNotes),
      requirements_status: verificationMap,
      rejection_reason: '',
      declined_reason: '',
      declined_details: '',
      updated_at: new Date().toISOString(),
    };

    if (onProcessRequest) {
      onProcessRequest(updatedPayload);
    }

    setSelectedReq(null);

    // Trigger browser print
    window.print();
  };

  // Decline Document Request:
  const handleOpenDeclineModal = () => {
    setDeclineReason('Missing required document');
    setDeclineDetails('Your submitted proof of residency is not valid. Please submit a current barangay certificate or other accepted proof of residency.');
    setDeclineError('');
    setShowDeclineModal(true);
  };

  const handleConfirmDecline = (e) => {
    e?.preventDefault();
    if (!selectedReq) return;

    if (!declineReason || !declineReason.trim()) {
      setDeclineError('Please select a reason for declining this request.');
      return;
    }

    const adminName = currentUser?.full_name || currentUser?.email || 'Barangay Administrator';
    const fullExplanation = declineDetails.trim()
      ? `${declineReason}: ${declineDetails.trim()}`
      : declineReason;

    const updatedPayload = {
      ...selectedReq,
      status: 'declined',
      rejection_reason: fullExplanation,
      declined_reason: declineReason,
      declined_details: declineDetails.trim(),
      rejected_at: new Date().toISOString(),
      declined_at: new Date().toISOString(),
      processed_by: adminName,
      notes: sanitizeInput(processingNotes),
      requirements_status: verificationMap,
      updated_at: new Date().toISOString(),
    };

    if (onProcessRequest) {
      onProcessRequest(updatedPayload);
    }

    setShowDeclineModal(false);
    setSelectedReq(null);
  };

  const currentTemplateConfig = documentTemplates[selectedTemplateKey] || documentTemplates.barangayCertification;

  // Extract resident details helper for modal
  const residentFullName = selectedReq?.resident_name || selectedReq?.profiles?.full_name || selectedReq?.user_metadata?.full_name || 'Resident Applicant';
  const residentEmail = selectedReq?.resident_email || selectedReq?.profiles?.email || selectedReq?.email || 'N/A';
  const residentPhone = selectedReq?.resident_phone || selectedReq?.phone || selectedReq?.contact_no || selectedReq?.profiles?.phone || 'Not provided';
  const residentAddress = selectedReq?.resident_address || selectedReq?.profiles?.address || selectedReq?.address || (selectedReq?.profiles?.sitio ? `${selectedReq.profiles.sitio}, Barangay Zapatera, Cebu City` : 'Barangay Zapatera, Cebu City');
  const residentDob = selectedReq?.resident_birth_date || selectedReq?.date_of_birth || selectedReq?.dob || selectedReq?.birthdate || selectedReq?.profiles?.birth_date || 'Not specified';
  const residentCivilStatus = selectedReq?.civil_status || selectedReq?.profiles?.civil_status || 'Single';
  const residentYears = selectedReq?.years_in_barangay || selectedReq?.profiles?.years_in_barangay || '5 years';

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Document Requests Management Workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            Central operational queue for receiving, processing, verifying, and printing official resident certificates.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {pendingCount} Pending
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {processingCount} Processing
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `All Requests (${operationalRequests.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'processing', label: `Processing (${processingCount})` },
            { id: 'declined', label: `Declined (${declinedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking no, resident or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 1. Request Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Resident Applicant</th>
                <th className="p-4">Document Requested</th>
                <th className="p-4">Pick-up Time Slot</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Submitted</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableSkeleton rows={6} cols={8} isDarkMode={false} />
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No document requests found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try selecting another filter or adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const normalizedStatus = (req.status || 'pending').toLowerCase();
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Tracking Number */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {req.tracking_number}
                        </span>
                      </td>

                      {/* Resident Applicant */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{req.resident_name || 'Resident Applicant'}</p>
                        <p className="text-[11px] text-slate-400">{req.resident_email}</p>
                      </td>

                      {/* Document Requested */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{req.document_title}</p>
                        <p className="text-[11px] text-emerald-700 font-bold">
                          {req.fee > 0 ? formatCurrency(req.fee) : 'Free'}
                        </p>
                      </td>

                      {/* Pick-up Time Slot */}
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold">
                          {req.pickup_time_slot || '9:00 AM - 9:30 AM'}
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={req.purpose}>
                        {req.purpose || 'Local Employment Application'}
                      </td>

                      {/* Status Badges */}
                      <td className="p-4">
                        <Badge variant={normalizedStatus}>{normalizedStatus.replace('_', ' ')}</Badge>
                      </td>

                      {/* Date Submitted */}
                      <td className="p-4 text-slate-500 font-medium">
                        {req.created_at ? formatDate(req.created_at) : formatDate(new Date())}
                      </td>

                      {/* Actions: Blue Process Button */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleStartProcess(req)}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
                          title="Process Document Request"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Process</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Document Processing Workspace Modal — Side-by-Side (50% Review & Verification / 50% Generator & Print) */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Document Processing Workspace — ${selectedReq?.tracking_number || ''}`}
        maxWidth="max-w-[96vw] 2xl:max-w-[1550px]"
      >
        {selectedReq && (
          <div className="space-y-5 text-xs max-h-[85vh] overflow-y-auto pr-1">
            
            {/* Top Operational Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl">
                  <FileBadge className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-white/10 px-2 py-0.5 rounded border border-white/15">
                      {selectedReq.tracking_number}
                    </span>
                    <Badge variant={selectedReq.status}>
                      {selectedReq.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    Processing: {selectedReq.document_title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => populateGeneratorFromResident(selectedReq)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/15 inline-flex items-center space-x-1.5 transition-all cursor-pointer"
                  title="Reload & sync resident info into generator fields"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Resident Info</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintAndApprove}
                  disabled={!canProceedToPrint}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md inline-flex items-center space-x-1.5 transition-all ${
                    canProceedToPrint
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document & Set Approved</span>
                </button>
              </div>
            </div>

            {/* SIDE-BY-SIDE 50% / 50% SPLIT LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ========================================================================= */}
              {/* LEFT HALF (50%): REVIEW & VERIFICATION DESK */}
              {/* ========================================================================= */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Section Header */}
                <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-4 py-2.5 rounded-xl text-blue-900">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs">Review & Resident Verification</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700">Resident Details & Requirements</span>
                </div>

                {/* 1. Complete Resident Profile Card */}
                <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Resident Applicant Profile</h4>
                        <p className="text-[10px] text-slate-500">Official registered citizen details</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Fee: {selectedReq.fee > 0 ? formatCurrency(selectedReq.fee) : 'Free of Charge'}
                    </span>
                  </div>

                  {/* Resident Info Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Legal Name</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{residentFullName}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</p>
                      <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        {residentPhone}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address / Sitio</p>
                      <p className="text-xs text-slate-800 mt-0.5 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {residentAddress}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                      <p className="text-xs text-slate-800 mt-0.5 flex items-center gap-1 font-medium">
                        <Cake className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {residentDob}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Years in Barangay</p>
                      <p className="text-xs text-slate-800 mt-0.5 font-medium">{residentYears}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 truncate" title={residentEmail}>
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        {residentEmail}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Civil Status</p>
                      <p className="text-xs text-slate-800 mt-0.5 font-medium">{residentCivilStatus}</p>
                    </div>
                  </div>

                  {/* Purpose of Request Box */}
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose of Request</p>
                    <div className="mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-start space-x-2 shadow-2xs">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{selectedReq.purpose || 'Local Employment Application'}</span>
                    </div>
                  </div>

                  {/* Pick-up and Submission Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-600">Pick-up Slot: </span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {selectedReq.pickup_time_slot || '9:00 AM - 9:30 AM'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-600">Submitted: </span>
                      <span>{formatDate(selectedReq.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Submitted Verification Requirements */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Submitted Verification Requirements</span>
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Review uploaded proof documents & verify compliance.
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        canProceedToPrint
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : hasInvalidOrMissing
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {verifiedCount} of {totalReqCount} Verified
                    </span>
                  </div>

                  {hasRequirements ? (
                    <div className="space-y-2.5">
                      {currentReqList.map((item, idx) => {
                        const currentStatus = verificationMap[item.name] || 'verified';
                        return (
                          <div
                            key={item.id || idx}
                            className={`p-3 rounded-xl border transition-all ${
                              currentStatus === 'verified'
                                ? 'bg-white border-emerald-200 shadow-2xs'
                                : currentStatus === 'invalid'
                                ? 'bg-rose-50/40 border-rose-300 shadow-2xs'
                                : 'bg-amber-50/40 border-amber-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-start space-x-2.5">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    currentStatus === 'verified'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : currentStatus === 'invalid'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                                  <p className="font-mono text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                                    <span>{item.fileName}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{item.uploadDate}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewFile({
                                      name: item.name,
                                      fileName: item.fileName,
                                      fileType: item.fileType,
                                      file_size: item.file_size,
                                      file_url: item.file_url,
                                      storage_path: item.storage_path,
                                      residentName: residentFullName,
                                    })
                                  }
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.storage_path) {
                                      downloadStoredAttachment(item.storage_path, item.fileName);
                                    } else if (item.file_url) {
                                      window.open(item.file_url, '_blank');
                                    } else {
                                      alert(`Downloading verification file: ${item.fileName}`);
                                    }
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>

                            {/* Status Selector */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-500">Status:</span>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'verified')}
                                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                    currentStatus === 'verified'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  Verified
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'invalid')}
                                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                    currentStatus === 'invalid'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                >
                                  Invalid
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'missing')}
                                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                    currentStatus === 'missing'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                                >
                                  Missing
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center space-x-2.5 text-blue-900">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        This certificate type ({selectedReq.document_title}) does not require resident supporting document uploads.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Administrative Notes & Decline Action */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Administrative Notes / Internal Processing Log (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                    placeholder="Add internal notes (e.g. Verified with Barangay Masterlist)..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedReq(null)}
                      className="px-3.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                    >
                      Close Window
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenDeclineModal}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5 cursor-pointer active:scale-95 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline Request</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* ========================================================================= */}
              {/* RIGHT HALF (50%): OFFICIAL DOCUMENT GENERATOR & LIVE PRINT PREVIEW */}
              {/* ========================================================================= */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Section Header with Mode Tabs */}
                <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setGeneratorTab('variables')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                        generatorTab === 'variables'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>1. Dynamic Certificate Variables</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGeneratorTab('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                        generatorTab === 'preview'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>2. Live A4 Preview & Print</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-2 hidden sm:inline">
                    Auto-Populated
                  </span>
                </div>

                {/* Template Quick Switcher */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <label className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-blue-600" />
                    <span>Select Certificate Template</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {templateKeys.map((k) => {
                      const tmpl = documentTemplates[k];
                      const isActive = selectedTemplateKey === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleSelectTemplate(k)}
                          className={`p-2 rounded-xl text-left border transition-all text-[11px] cursor-pointer ${
                            isActive
                              ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{tmpl.title}</span>
                            {isActive && <Check size={12} className="text-blue-600 shrink-0 ml-1" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TAB 1: DYNAMIC VARIABLES FORM */}
                {generatorTab === 'variables' && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-900 text-xs">
                        Certificate Details & Values (Auto-Filled)
                      </h4>
                      <button
                        type="button"
                        onClick={() => populateGeneratorFromResident(selectedReq)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        <span>Reset from Applicant</span>
                      </button>
                    </div>

                    {/* 1. Document Title */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        1. Document Title
                      </label>
                      <input
                        type="text"
                        required
                        value={genDocTitle}
                        onChange={(e) => setGenDocTitle(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold tracking-wide uppercase text-slate-900"
                      />
                    </div>

                    {/* 2. Applicant Name */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        2. Resident Applicant Name
                      </label>
                      <input
                        type="text"
                        required
                        value={genName}
                        onChange={(e) => setGenName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                      />
                    </div>

                    {/* 3. Address */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        3. Address
                      </label>
                      <input
                        type="text"
                        value={genAddress}
                        onChange={(e) => setGenAddress(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>

                    {/* 4 & 5. Date of Birth & Contact */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">4. Date of Birth</label>
                        <input
                          type="date"
                          value={genDob}
                          onChange={(e) => setGenDob(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">5. Contact No.</label>
                        <input
                          type="text"
                          value={genContact}
                          onChange={(e) => setGenContact(e.target.value)}
                          placeholder="e.g. 09171234567"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    {/* 6 & 8. Years in Barangay & Issued Date */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">6. Years in Barangay</label>
                        <input
                          type="text"
                          value={genYearsInBarangay}
                          onChange={(e) => setGenYearsInBarangay(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">8. Issued Date</label>
                        <input
                          type="date"
                          value={genIssuedDate}
                          onChange={(e) => setGenIssuedDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* 7. Purpose */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        7. Purpose of Request
                      </label>
                      <input
                        type="text"
                        value={genPurpose}
                        onChange={(e) => setGenPurpose(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                      />
                    </div>

                    {/* Body Text */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">Certification Body Text</label>
                        <button
                          type="button"
                          onClick={() => setGenBodyText(currentTemplateConfig.defaultBody)}
                          className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={10} />
                          <span>Reset text</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={genBodyText}
                        onChange={(e) => setGenBodyText(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 leading-relaxed text-xs"
                      />
                    </div>

                    {/* Signatory Names */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">Signatory Name</label>
                        <input
                          type="text"
                          value={genSignatoryName}
                          onChange={(e) => setGenSignatoryName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">Signatory Title</label>
                        <input
                          type="text"
                          value={genSignatoryTitle}
                          onChange={(e) => setGenSignatoryTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Switch to Live Preview Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setGeneratorTab('preview')}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs inline-flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Live Certificate Template</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: LIVE A4 PRINTABLE PREVIEW */}
                {generatorTab === 'preview' && (
                  <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-start min-h-[520px] overflow-hidden space-y-3">
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>Live A4 Document Preview</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setGeneratorTab('variables')}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal size={12} />
                        <span>Edit Variables</span>
                      </button>
                    </div>

                    {/* Scaled Preview Template Box */}
                    <div className="w-full overflow-x-auto flex justify-center py-1">
                      <div className="transform scale-[0.62] sm:scale-[0.70] origin-top transition-transform duration-200">
                        <DocumentTemplate
                          documentTitle={genDocTitle}
                          name={genName}
                          address={genAddress}
                          dateOfBirth={genDob}
                          contactNo={genContact}
                          yearsInBarangay={genYearsInBarangay}
                          purpose={genPurpose}
                          issuedDate={genIssuedDate}
                          issuedLocation={genIssuedLocation}
                          bodyText={genBodyText}
                          signatoryName={genSignatoryName}
                          signatoryTitle={genSignatoryTitle}
                          config={config}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Action Button Bar */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePrintAndApprove}
                    disabled={!canProceedToPrint}
                    className={`w-full py-2.5 font-bold rounded-xl shadow-md inline-flex items-center justify-center space-x-2 transition-all ${
                      canProceedToPrint
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20 cursor-pointer active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Document & Set Approved</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* Decline Request Modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        title="Decline Document Request"
      >
        <form onSubmit={handleConfirmDecline} className="space-y-4 text-xs">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 text-sm">Decline Document Request</h4>
              <p className="text-rose-800 text-xs mt-0.5 leading-relaxed">
                Please provide the reason why this document request cannot be approved. The resident will be notified with these instructions.
              </p>
            </div>
          </div>

          {declineError && (
            <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg font-bold">
              {declineError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Reason for Declining <span className="text-rose-600">*</span>
            </label>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium text-slate-800"
              required
            >
              {DECLINE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Additional Details / Explanation <span className="text-slate-400 font-normal">(Visible to Resident)</span>
            </label>
            <textarea
              rows={4}
              value={declineDetails}
              onChange={(e) => setDeclineDetails(e.target.value)}
              placeholder="e.g. Your submitted proof of residency is not valid. Please submit a current barangay certificate or other accepted proof of residency."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowDeclineModal(false)}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirm Decline</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Requirement File Preview Modal with Supabase Storage Support */}
      <FilePreviewModal
        isOpen={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* HIDDEN PRINT ROOT for Direct Browser Printing */}
      <div id="printable-document-root" className="hidden print:block">
        <DocumentTemplate
          documentTitle={genDocTitle}
          name={genName}
          address={genAddress}
          dateOfBirth={genDob}
          contactNo={genContact}
          yearsInBarangay={genYearsInBarangay}
          purpose={genPurpose}
          issuedDate={genIssuedDate}
          issuedLocation={genIssuedLocation}
          bodyText={genBodyText}
          signatoryName={genSignatoryName}
          signatoryTitle={genSignatoryTitle}
          config={config}
        />
      </div>
    </div>
  );
}
