// Admin/src/features/requests/ReceiveRequestView.jsx
import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { formatDate, formatCurrency, sanitizeInput } from '../../core/security';
import { TableSkeleton } from '../../components/SkeletonLoader';

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
  const [activeStep, setActiveStep] = useState(1); // Step 1: Verification & Review, Step 2: Document Generator
  const [verificationMap, setVerificationMap] = useState({});
  const [processingNotes, setProcessingNotes] = useState('');

  // Confirmation Modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Missing required document');
  const [declineDetails, setDeclineDetails] = useState('');
  const [declineError, setDeclineError] = useState('');

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState(null);

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

  // Determine if a request actually has required attachment guidelines
  const getRequirementList = (req) => {
    if (!req) return [];

    // 1. Check matching docType guidelines
    const matchedDocType = docTypes.find(
      (dt) =>
        dt.id === req.document_type_id ||
        dt.code === req.document_type_id ||
        dt.title?.toLowerCase() === req.document_title?.toLowerCase()
    );

    const docTypeReqs = matchedDocType?.requirements?.filter(
      (r) => r && typeof r === 'string' && r.trim().toLowerCase() !== 'none' && r.trim().toLowerCase() !== 'no requirements' && r.trim().toLowerCase() !== 'n/a'
    ) || [];

    // 2. Check uploaded_files array
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

    // 3. Check requirements_attached array
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

    // 4. If docType defined requirements exist
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

    // If no requirements specified in docType and none attached, return empty array
    return [];
  };

  // 2. Process Button Behavior:
  // When clicked, open modal and transition status immediately from Pending -> Processing
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
    setActiveStep(1); // Start at verification/review
    setSelectedReq(updatedReq);
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

  // If no requirements exist, can approve immediately. If requirements exist, must all be verified.
  const canApprove = !hasRequirements || (totalReqCount > 0 && verifiedCount === totalReqCount && !hasInvalidOrMissing);

  // 4. Approve Document Request:
  const handleOpenApproveConfirm = () => {
    setShowApproveConfirm(true);
  };

  const handleConfirmApproval = () => {
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

    setShowApproveConfirm(false);
    setSelectedReq(null);
  };

  // 5. Decline Document Request:
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

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Document Requests Management Workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            Central operational queue for receiving, processing, and generating resident clearance certificates.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="mr-1.5">🟠</span>
            {requests.filter((r) => r.status === 'pending').length} Pending
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="mr-1.5">🔵</span>
            {requests.filter((r) => r.status === 'processing' || r.status === 'under_review').length} Processing
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending', icon: '🟠' },
            { id: 'processing', label: 'Processing', icon: '🔵' },
            { id: 'approved', label: 'Approved', icon: '🟢' },
            { id: 'declined', label: 'Declined', icon: '🔴' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.icon && <span className="text-[10px]">{tab.icon}</span>}
              <span>{tab.label}</span>
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

                      {/* Actions: Blue Process Button with icon */}
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
        maxWidth="max-w-4xl"
      >
        {selectedReq && (
          <div className="space-y-6 text-xs max-h-[82vh] overflow-y-auto pr-1">
            {/* Step Navigation Tabs */}
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
                  onClick={() => setActiveStep(2)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all ${
                    activeStep === 2
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>2. Official Document Generator</span>
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

                      {/* Verification Summary Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          canApprove
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

                            {/* Verification Status Selector Buttons */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-500">Requirement Verification:</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'verified')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-all ${
                                    currentStatus === 'verified'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  <span>Verified</span>
                                  <span>✅</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'invalid')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-all ${
                                    currentStatus === 'invalid'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                >
                                  <span>Invalid</span>
                                  <span>❌</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetVerification(item.name, 'missing')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-all ${
                                    currentStatus === 'missing'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                                >
                                  <span>Missing</span>
                                  <span>⚠️</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Notice when no requirements are required */
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center space-x-3 text-blue-900">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">No Verification Attachments Required</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        This certificate type ({selectedReq.document_title}) does not require resident supporting document uploads. You may proceed directly to document generation and approval.
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

                {/* Step 1 Footer */}
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

                    {/* Step 2 Trigger: Official Document Generator */}
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      disabled={!canApprove}
                      className={`px-4 py-2 font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5 ${
                        canApprove
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>Proceed to Official Document Generator</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>

                    {/* Direct Quick Approve */}
                    <button
                      type="button"
                      onClick={handleOpenApproveConfirm}
                      disabled={!canApprove}
                      className={`px-4 py-2 font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5 ${
                        canApprove
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Document</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: OFFICIAL DOCUMENT GENERATOR & PRINT */}
            {activeStep === 2 && (
              <div className="space-y-5">
                {/* Generator Header Toolbar */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                      <FileBadge className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Official Barangay Document Generator</h4>
                      <p className="text-[11px] text-slate-300">
                        Ready for digital printing, official stamp sealing, and archiving.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePrintDocument}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center space-x-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Document</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => alert(`Exporting ${selectedReq.document_title} as PDF...`)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable Certificate Template Box */}
                <div className="bg-white p-8 sm:p-10 rounded-2xl border-4 border-double border-slate-300 shadow-lg font-serif max-w-2xl mx-auto space-y-6 text-slate-900 print:shadow-none print:border-none print:m-0">
                  {/* Republic Header */}
                  <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                        <img
                          src={config?.seal_url || '/logo.jpg'}
                          alt="Barangay Seal"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-sans">Republic of the Philippines</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                      Province of {config?.province || 'Cebu'} • City of {config?.municipality || 'Cebu City'}
                    </p>
                    <h2 className="text-xl font-extrabold uppercase text-slate-900 tracking-wider font-sans">
                      {config?.barangay_name || 'BARANGAY ZAPATERA'}
                    </h2>
                    <p className="text-[11px] italic text-slate-500 font-sans">
                      Office of the Punong Barangay & Clearance Secretariat
                    </p>
                  </div>

                  {/* Certificate Document Title */}
                  <div className="text-center py-2">
                    <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900 underline decoration-slate-400 underline-offset-8">
                      {selectedReq.document_title?.toUpperCase() || 'OFFICIAL BARANGAY CLEARANCE'}
                    </h1>
                    <p className="text-xs font-mono font-bold text-slate-600 mt-3 font-sans">
                      CONTROL NO: <span className="text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">{selectedReq.tracking_number}</span>
                    </p>
                  </div>

                  {/* Main Legal Certification Body */}
                  <div className="text-sm text-slate-800 space-y-4 leading-relaxed font-sans px-2 sm:px-4">
                    <p className="font-bold text-slate-900">TO WHOM IT MAY CONCERN:</p>

                    <p className="indent-8 text-justify">
                      THIS IS TO CERTIFY that <span className="font-black uppercase text-slate-900 text-base underline">{selectedReq.resident_name}</span>, of legal age, Filipino citizen, and a bonafide resident of <span className="font-bold text-slate-900">Barangay Zapatera, Cebu City</span>, is known to be of good moral character, a law-abiding citizen, and has zero derogatory criminal record or adverse blotter complaints on file in this barangay.
                    </p>

                    <p className="indent-8 text-justify">
                      This official clearance is issued upon the request of the above-named resident for the following purpose:
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-slate-900 uppercase tracking-wide">
                      "{selectedReq.purpose || 'Local Employment Application'}"
                    </div>

                    <p className="indent-8 text-justify">
                      GIVEN AND ISSUED this <span className="font-bold">{new Date().getDate()}th</span> day of <span className="font-bold">{new Date().toLocaleString('default', { month: 'long' })}</span>, <span className="font-bold">{new Date().getFullYear()}</span> at Barangay Zapatera, Cebu City, Philippines.
                    </p>
                  </div>

                  {/* Signatures & Seal */}
                  <div className="pt-8 grid grid-cols-2 gap-8 text-center font-sans">
                    <div className="space-y-1 pt-6 border-t border-slate-300">
                      <p className="font-bold text-slate-900 text-xs uppercase">
                        {currentUser?.full_name || selectedReq.processed_by || 'MARIA SANTOS'}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Barangay Secretary / Admin</p>
                    </div>

                    <div className="space-y-1 pt-6 border-t border-slate-300">
                      <p className="font-bold text-slate-900 text-xs uppercase">HON. FRANCISCO R. BINGHAY</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Punong Barangay</p>
                    </div>
                  </div>

                  {/* Authenticity Footer */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                    <span className="flex items-center text-emerald-700 font-bold">
                      <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" /> Official Document Dry Seal Validated
                    </span>
                    <span>Issued: {formatDate(selectedReq.approved_at || new Date().toISOString())}</span>
                  </div>
                </div>

                {/* Step 2 Bottom Controls */}
                <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="w-full sm:w-auto px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Verification Review</span>
                  </button>

                  <div className="w-full sm:w-auto flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleOpenApproveConfirm}
                      className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Finalize Document</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 4. Approve Document Confirmation Modal */}
      <Modal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        title="Approve Document Request?"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Confirm Document Approval</h4>
              <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                Are you sure you want to approve this document request? Make sure all required documents have been verified.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <p className="font-bold text-slate-800">
              Tracking Ref: <span className="font-mono text-blue-700">{selectedReq?.tracking_number}</span>
            </p>
            <p className="text-slate-600">Applicant: <span className="font-semibold text-slate-800">{selectedReq?.resident_name}</span></p>
            <p className="text-slate-600">Document: <span className="font-semibold text-slate-800">{selectedReq?.document_title}</span></p>
            <p className="text-slate-600">Pick-up Interval: <span className="font-semibold text-slate-800">{selectedReq?.pickup_time_slot || '9:00 AM - 9:30 AM'}</span></p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowApproveConfirm(false)}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApproval}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Approval</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. Decline Request Modal */}
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

          {/* Reason for Declining (Select Dropdown) */}
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

          {/* Additional Details / Explanation Textarea */}
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
            <p className="text-[11px] text-slate-500 mt-1">
              Provide clear guidance to help the resident submit the correct requirements on their next application.
            </p>
          </div>

          {/* Buttons: Cancel | Confirm Decline */}
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

            {/* Simulated Document / ID Card Preview Box */}
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
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300 text-[11px]">
                Official digital copy attached during resident online registration. Complies with Republic Act 10173 (Data Privacy Act of 2012).
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
    </div>
  );
}
