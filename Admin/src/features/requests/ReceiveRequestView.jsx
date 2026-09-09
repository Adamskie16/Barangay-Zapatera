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
  Info
} from 'lucide-react';
import { formatDate, formatCurrency, sanitizeInput } from '../../core/security';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { documentTemplates, formatIssuedDateOrdinal } from '../documents/documentTemplates';
import DocumentTemplate from '../documents/DocumentTemplate';

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
  const [activeStep, setActiveStep] = useState(1); // 1: Verification, 2: Document Generator
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
  const [genSignatoryName, setGenSignatoryName] = useState('HON. DAVID M. AGRAVANTE');
  const [genSignatoryTitle, setGenSignatoryTitle] = useState('Punong Barangay');

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const normStatus = (r.status || 'pending').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      normStatus === statusFilter ||
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
        uploadDate: req.created_at ? formatDate(req.created_at) : 'Sep 7, 2026',
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
          uploadDate: req.created_at ? formatDate(req.created_at) : 'Sep 7, 2026',
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
        uploadDate: req.created_at ? formatDate(req.created_at) : 'Sep 7, 2026',
        status: 'pending',
      }));
    }

    return [];
  };

  // When admin clicks Process:
  // Immediately change request status from Pending -> Processing and save to storage so resident side updates
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
        initialMap[item.name] = updatedReq.status === 'approved' ? 'verified' : 'verified';
      }
    });

    setVerificationMap(initialMap);
    setProcessingNotes(updatedReq.notes || '');

    // Setup Document Generator Initial Values with Applicant info
    setGenName(updatedReq.resident_name || '');
    setGenAddress(updatedReq.resident_address || 'Barangay Zapatera, Cebu City');
    setGenDob(updatedReq.resident_birth_date || '');
    setGenContact(updatedReq.resident_phone || '');
    setGenYearsInBarangay(updatedReq.years_in_barangay || '5 years');
    setGenPurpose(updatedReq.purpose || 'Local Employment Application');

    // Auto-select matching template based on document title
    const titleLower = (updatedReq.document_title || '').toLowerCase();
    let matchedKey = 'barangayCertification';
    if (titleLower.includes('clearance')) matchedKey = 'barangayClearance';
    else if (titleLower.includes('residency')) matchedKey = 'certificateOfResidency';
    else if (titleLower.includes('moral')) matchedKey = 'certificateOfGoodMoralCharacter';
    else if (titleLower.includes('indigency')) matchedKey = 'certificateOfIndigency';
    else if (titleLower.includes('jobseeker')) matchedKey = 'firstTimeJobseeker';

    setSelectedTemplateKey(matchedKey);
    const tmpl = documentTemplates[matchedKey] || documentTemplates.barangayCertification;
    setGenDocTitle(updatedReq.document_title ? updatedReq.document_title.toUpperCase() : tmpl.title);
    setGenBodyText(tmpl.defaultBody);

    setActiveStep(1); // Start at verification review
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

    setSelectedReq(updatedPayload);

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
            {requests.filter((r) => r.status === 'pending').length} Pending
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {requests.filter((r) => r.status === 'processing' || r.status === 'under_review').length} Processing
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'processing', label: 'Processing' },
            { id: 'approved', label: 'Approved' },
            { id: 'declined', label: 'Declined' },
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
                        {req.created_at ? formatDate(req.created_at) : 'Sep 7, 2026, 07:29 PM'}
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

      {/* 3. Document Processing Workspace Modal with Multi-Step Generator */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={`Document Processing Workspace — ${selectedReq?.tracking_number}`}
        maxWidth="max-w-6xl"
      >
        {selectedReq && (
          <div className="space-y-6 text-xs max-h-[85vh] overflow-y-auto pr-1">
            {/* Step Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all ${
                    activeStep === 1
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>1. Review & Verification</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (canProceedToPrint) setActiveStep(2);
                  }}
                  disabled={!canProceedToPrint}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                    activeStep === 2
                      ? 'bg-blue-600 text-white shadow-xs'
                      : canProceedToPrint
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>2. Official Document Generator & Print</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-medium">Status:</span>
                <Badge variant={selectedReq.status}>
                  {selectedReq.status?.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* STEP 1: REVIEW & VERIFICATION */}
            {activeStep === 1 && (
              <div className="space-y-5">
                {/* Request Details Grid */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resident Applicant</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedReq.resident_name}</p>
                      <p className="text-slate-500 text-[11px] flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1 text-slate-400" />
                        {selectedReq.resident_email}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Requested & Fee</p>
                      <p className="text-sm font-bold text-blue-800 mt-0.5">{selectedReq.document_title}</p>
                      <p className="text-emerald-700 font-bold text-[11px]">
                        Fee: {selectedReq.fee > 0 ? formatCurrency(selectedReq.fee) : 'Free of Charge'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pick-up Time Slot & Date</p>
                      <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                        Slot: <span className="text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{selectedReq.pickup_time_slot || '9:00 AM - 9:30 AM'}</span>
                      </p>
                      <p className="text-slate-500 text-[11px] mt-1 flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        Submitted: {formatDate(selectedReq.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose of Request</p>
                    <p className="text-xs text-slate-800 font-medium mt-1 bg-white p-2.5 rounded-lg border border-slate-200">
                      {selectedReq.purpose || 'Local Employment Application'}
                    </p>
                  </div>
                </div>

                {/* Submitted Requirements Verification Desk (ONLY IF REQUIREMENTS EXIST) */}
                {hasRequirements ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>Submitted Verification Requirements</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Review and verify resident attachments based on document requirements.
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
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

                    {/* Requirement Cards List */}
                    <div className="space-y-3">
                      {currentReqList.map((item, idx) => {
                        const currentStatus = verificationMap[item.name] || 'verified';
                        return (
                          <div
                            key={item.id || idx}
                            className={`p-4 rounded-xl border transition-all ${
                              currentStatus === 'verified'
                                ? 'bg-white border-emerald-200 shadow-2xs'
                                : currentStatus === 'invalid'
                                ? 'bg-rose-50/40 border-rose-300 shadow-2xs'
                                : 'bg-amber-50/40 border-amber-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`p-2.5 rounded-lg ${
                                    currentStatus === 'verified'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : currentStatus === 'invalid'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                                  <p className="font-mono text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>File: {item.fileName}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>Uploaded: {item.uploadDate}</span>
                                  </p>
                                </div>
                              </div>

                              {/* File Action Buttons */}
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewFile({
                                      name: item.name,
                                      fileName: item.fileName,
                                      fileType: item.fileType,
                                      residentName: selectedReq.resident_name,
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View / Preview</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`Downloading verification file: ${item.fileName}`);
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>

                            {/* Verification Status Selector Buttons without emoji icons */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-500">Requirement Verification:</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'verified')}
                                  className={`px-3.5 py-1 rounded-lg text-xs font-bold inline-flex items-center cursor-pointer transition-all ${
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
                                  className={`px-3.5 py-1 rounded-lg text-xs font-bold inline-flex items-center cursor-pointer transition-all ${
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
                                  className={`px-3.5 py-1 rounded-lg text-xs font-bold inline-flex items-center cursor-pointer transition-all ${
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
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center space-x-3 text-blue-900">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">No Verification Attachments Required</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        This certificate type ({selectedReq.document_title}) does not require resident supporting document uploads. You may proceed directly to document generation and printing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrative Notes / Internal Processing Log (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                    placeholder="Add verification notes (e.g. Identity verified with Barangay Masterlist)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Step 1 Footer: Only Decline Request | Proceed to Print Document */}
                <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReq(null)}
                    className="w-full sm:w-auto px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Close Window
                  </button>

                  <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2.5">
                    {/* Decline Request Button */}
                    <button
                      type="button"
                      onClick={handleOpenDeclineModal}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5 cursor-pointer active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline Request</span>
                    </button>

                    {/* Proceed to Print Document Button */}
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      disabled={!canProceedToPrint}
                      className={`px-5 py-2 font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5 ${
                        canProceedToPrint
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>Proceed to Print Document</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: OFFICIAL DOCUMENT GENERATOR (Full SuperAdmin Document Management Template) */}
            {activeStep === 2 && (
              <div className="space-y-6">
                {/* Generator Header & Action Bar */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileBadge className="w-4 h-4 text-blue-400" />
                      <span>Official Document Generator & Print</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Printing this document will officially approve the resident application and update status to Approved.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePrintAndApprove}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/30 inline-flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Document & Set Approved</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Document Generator Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: Template Config & Dynamic Variables */}
                  <div className="xl:col-span-5 space-y-4">
                    {/* Template Quick Switch */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} className="text-blue-600" />
                        <span>Select Certificate Template</span>
                      </label>

                      <div className="grid grid-cols-2 gap-1.5">
                        {templateKeys.map((k) => {
                          const tmpl = documentTemplates[k];
                          const isActive = selectedTemplateKey === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleSelectTemplate(k)}
                              className={`p-2 rounded-lg text-left border transition-all text-[11px] cursor-pointer ${
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

                    {/* Dynamic Fields Form */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                        Dynamic Certificate Variables
                      </h4>

                      {/* 1. Document Title */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          1. Document Title <span className="text-blue-600 font-mono font-normal">{"{documentTitle}"}</span>
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
                        <label className="block font-bold text-slate-700 mb-1">
                          2. Resident Applicant Name <span className="text-blue-600 font-mono font-normal">{"{name}"}</span>
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
                        <label className="block font-bold text-slate-700 mb-1">
                          3. Address <span className="text-blue-600 font-mono font-normal">{"{address}"}</span>
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
                          <label className="block font-bold text-slate-700 mb-1">4. Date of Birth</label>
                          <input
                            type="text"
                            value={genDob}
                            onChange={(e) => setGenDob(e.target.value)}
                            placeholder="e.g. Jan 15, 1995"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">5. Contact No.</label>
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
                          <label className="block font-bold text-slate-700 mb-1">6. Years in Barangay</label>
                          <input
                            type="text"
                            value={genYearsInBarangay}
                            onChange={(e) => setGenYearsInBarangay(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">8. Issued Date</label>
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
                        <label className="block font-bold text-slate-700 mb-1">
                          7. Purpose <span className="text-blue-600 font-mono font-normal">{"{purpose}"}</span>
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
                          <label className="font-bold text-slate-700">Certification Body Text</label>
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
                          rows={3}
                          value={genBodyText}
                          onChange={(e) => setGenBodyText(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 leading-relaxed text-xs"
                        />
                      </div>

                      {/* Signatory Names */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Signatory Name</label>
                          <input
                            type="text"
                            value={genSignatoryName}
                            onChange={(e) => setGenSignatoryName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Signatory Title</label>
                          <input
                            type="text"
                            value={genSignatoryTitle}
                            onChange={(e) => setGenSignatoryTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Live A4 Printable Preview */}
                  <div className="xl:col-span-7 bg-slate-100 rounded-2xl p-4 sm:p-6 border border-slate-200 flex flex-col items-center justify-start min-h-[600px] overflow-hidden">
                    <div className="w-full flex items-center justify-between mb-3 px-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>Live A4 Document Preview</span>
                      </span>
                    </div>

                    {/* Scaled Preview Template Box */}
                    <div className="w-full overflow-x-auto flex justify-center py-1">
                      <div className="transform scale-[0.78] sm:scale-[0.84] origin-top transition-transform duration-200">
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
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Step 2 Bottom Navigation */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Verification Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintAndApprove}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-900/20 inline-flex items-center space-x-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Document & Set Approved</span>
                  </button>
                </div>
              </div>
            )}
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

      {/* Requirement File Preview Modal */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={`Attachment Preview — ${previewFile?.name}`}
      >
        {previewFile && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{previewFile.name}</p>
                <p className="font-mono text-slate-500 text-[11px]">{previewFile.fileName}</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-[11px]">
                {previewFile.fileType}
              </span>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-center text-white space-y-4 shadow-inner">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 border-blue-500 flex items-center justify-center">
                <FileCheck2 className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Barangay Zapatera Verification Document</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Applicant: <span className="text-white font-semibold">{previewFile.residentName}</span>
                </p>
                <p className="text-slate-400 text-xs">File Reference: {previewFile.fileName}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

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
        />
      </div>
    </div>
  );
}
