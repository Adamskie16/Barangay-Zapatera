// Admin/src/features/requests/ApprovedDocumentsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import ActionModal from '../../components/ActionModal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import {
  FileCheck2,
  PackageCheck,
  Package,
  RotateCcw,
  Trash2,
  CheckCheck,
  DollarSign,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../core/security';
import { StorageService } from '../../core/storage';
import { TableSkeleton, useDelayedLoading } from '../../components/loaders';
import MonthlyDemandReport from '../reports/MonthlyDemandReport';

export default function ApprovedDocumentsView({
  requests = [],
  docTypes = [],
  onUpdateRequestStatus,
  onDeleteRequest,
  config,
  currentUser,
  loading = false,
  initialTarget = null,
  onClearTarget = null,
}) {
  const [claimFilter, setClaimFilter] = useState('all'); // 'all' | 'unclaimed' | 'claimed'
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [targetTracking, setTargetTracking] = useState('');
  const [showDemandTracker, setShowDemandTracker] = useState(false);
  const showSkeleton = useDelayedLoading(loading, 150);

  useEffect(() => {
    if (initialTarget) {
      if (initialTarget.trackingNumber) {
        setTargetTracking(initialTarget.trackingNumber);
      }
      if (onClearTarget) onClearTarget();
    }
  }, [initialTarget]);

  // Action feedback / confirmation modal state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonText: 'OK',
    onConfirm: null,
    onClose: null,
    isDestructive: false,
    isLoading: false,
  });

  // Security Verification Modal State for Deletion
  const [securityModal, setSecurityModal] = useState({
    isOpen: false,
    item: null,
  });

  // Claim Fee Collection Prompt Modal State
  const [claimFeeModal, setClaimFeeModal] = useState({
    isOpen: false,
    req: null,
    feeAmount: '',
    isVariable: false,
    defaultFee: 0,
    error: '',
    isLoading: false,
  });

  // Resolve active document types for fee metadata
  const allDocTypes = useMemo(() => {
    if (docTypes && docTypes.length > 0) return docTypes;
    try {
      return StorageService.getDocTypes();
    } catch {
      return [];
    }
  }, [docTypes]);

  // Filter only approved, issued, or completed requests
  const approvedRequests = useMemo(() => {
    return requests.filter(
      (r) =>
        r.status === 'approved' ||
        r.status === 'issued' ||
        r.status === 'ready_for_pickup' ||
        r.status === 'completed'
    );
  }, [requests]);

  // Helper to check if a document is claimed/issued
  const isClaimed = (req) => {
    return req.status === 'issued' || req.status === 'completed' || !!req.is_claimed;
  };

  // Counts & Collections Metric
  const totalCount = approvedRequests.length;
  const claimedCount = approvedRequests.filter((r) => isClaimed(r)).length;
  const unclaimedCount = approvedRequests.filter((r) => !isClaimed(r)).length;

  // Total claimed fees collected for released documents
  const totalClaimedFees = useMemo(() => {
    return approvedRequests
      .filter((r) => isClaimed(r))
      .reduce((sum, r) => {
        const feeVal = r.claimed_fee !== undefined && r.claimed_fee !== null
          ? Number(r.claimed_fee)
          : (r.amount_paid !== undefined && r.amount_paid !== null ? Number(r.amount_paid) : Number(r.fee || 0));
        return sum + (isNaN(feeVal) ? 0 : feeVal);
      }, 0);
  }, [approvedRequests]);

  // Extract unique document types for secondary dropdown filter
  const docTypeOptions = useMemo(() => {
    const types = new Set();
    approvedRequests.forEach((r) => {
      if (r.document_title) types.add(r.document_title);
    });
    return [
      { value: 'all', label: 'All Document Types' },
      ...Array.from(types).map((t) => ({ value: t, label: t })),
    ];
  }, [approvedRequests]);

  // Prompt Toggle Claimed / Unclaimed status with Fee Assessment & Feedback
  const handlePromptToggleClaim = (req) => {
    const currentlyClaimed = isClaimed(req);
    const adminName = currentUser?.name || currentUser?.full_name || currentUser?.email || 'Barangay Administrator';

    if (!currentlyClaimed) {
      // Find matching document type to check fee policy
      const matchingDoc = allDocTypes.find(
        (d) => d.id === req.document_type_id || d.title === req.document_title || d.code === req.document_type
      );
      
      // Determine if fee was already assessed manually by staff during processing
      const wasAssessedDuringProcessing = req.fee_assessed || (req.claimed_fee !== undefined && req.claimed_fee !== null) || (req.fee !== undefined && req.fee !== null && req.is_variable_fee === false);
      const isVar = !wasAssessedDuringProcessing && Boolean(req.is_variable_fee || matchingDoc?.is_variable_fee || matchingDoc?.fee_type === 'variable');
      
      const assessedFee = req.claimed_fee !== undefined && req.claimed_fee !== null
        ? Number(req.claimed_fee)
        : (req.fee !== undefined && req.fee !== null
          ? Number(req.fee)
          : (matchingDoc?.fee !== undefined ? Number(matchingDoc.fee) : 0));

      // ONLY if fee is variable AND was not already inputted during processing, open manual fee collection modal
      if (isVar) {
        setClaimFeeModal({
          isOpen: true,
          req,
          feeAmount: assessedFee > 0 ? String(assessedFee) : '',
          isVariable: true,
          defaultFee: assessedFee,
          error: '',
          isLoading: false,
        });
        return;
      }

      // ASSESSED / FIXED FEE OPTION:
      // Directly confirm document claim using fee assessed during processing
      const fixedFee = assessedFee;
      const docStampsFee = req.doc_stamps !== undefined ? Number(req.doc_stamps) : (fixedFee > 0 ? 30 : 0);
      const totalCollected = fixedFee > 0 ? fixedFee + docStampsFee : 0;

      setActionModal({
        isOpen: true,
        type: 'confirmation',
        title: 'Confirm Document Claim & Fee',
        message: `Mark document ${req.tracking_number} (${req.document_title}) as claimed by resident? Processing fee set during processing is ${fixedFee > 0 ? formatCurrency(fixedFee) : 'FREE'}${fixedFee > 0 && docStampsFee > 0 ? ` + ₱${docStampsFee} Doc Stamps (Total: ${formatCurrency(totalCollected)})` : ''}.`,
        confirmText: 'Confirm Claim',
        cancelText: 'Cancel',
        isDestructive: false,
        isLoading: false,
        onConfirm: async () => {
          setActionModal((prev) => ({ ...prev, isLoading: true }));
          try {
            const updated = {
              ...req,
              status: 'completed',
              is_claimed: true,
              issued_at: new Date().toISOString(),
              claimed_at: new Date().toISOString(),
              claimed_by_admin: adminName,
              claimed_fee: fixedFee,
              fee: fixedFee,
              amount_paid: fixedFee,
              doc_stamps: docStampsFee,
              is_paid: true,
              payment_status: fixedFee > 0 ? 'paid' : (req.payment_status || 'free'),
              updated_at: new Date().toISOString(),
            };

            if (onUpdateRequestStatus) {
              await onUpdateRequestStatus(updated);
            }

            setActionModal({
              isOpen: true,
              type: 'success',
              title: 'Document Claimed Successfully',
              message: `Document ${req.tracking_number} has been released and marked as claimed. Fee collected: ${fixedFee > 0 ? formatCurrency(fixedFee) : 'FREE'}.`,
              buttonText: 'OK',
              onClose: () => setActionModal({ isOpen: false }),
            });
          } catch (err) {
            console.error('Error claiming document:', err);
            setActionModal({
              isOpen: true,
              type: 'error',
              title: 'Claim Failed',
              message: 'Unable to mark document as claimed. Please try again.',
              buttonText: 'Close',
              onClose: () => setActionModal({ isOpen: false }),
            });
          }
        },
        onClose: () => setActionModal({ isOpen: false }),
      });
    } else {
      // Mark as Unclaimed confirmation
      setActionModal({
        isOpen: true,
        type: 'confirmation',
        title: 'Mark as Unclaimed?',
        message: `Return document ${req.tracking_number} back to approved queue awaiting resident pick-up?`,
        confirmText: 'Mark Unclaimed',
        cancelText: 'Cancel',
        isDestructive: false,
        isLoading: false,
        onConfirm: async () => {
          setActionModal((prev) => ({ ...prev, isLoading: true }));
          try {
            const updated = {
              ...req,
              status: 'approved',
              is_claimed: false,
              issued_at: null,
              claimed_at: null,
              claimed_by_admin: null,
              claimed_fee: null,
              updated_at: new Date().toISOString(),
            };

            if (onUpdateRequestStatus) {
              await onUpdateRequestStatus(updated);
            }

            setActionModal({
              isOpen: true,
              type: 'success',
              title: 'Document Status Reverted',
              message: 'The document has been marked as unclaimed and is awaiting resident pickup.',
              buttonText: 'OK',
              onClose: () => setActionModal({ isOpen: false }),
            });
          } catch (err) {
            console.error('Error updating claim status:', err);
            setActionModal({
              isOpen: true,
              type: 'error',
              title: 'Unable to Update Status',
              message: 'Something went wrong while updating the status. Please try again.',
              buttonText: 'Close',
              onClose: () => setActionModal({ isOpen: false }),
            });
          }
        },
        onClose: () => setActionModal({ isOpen: false }),
      });
    }
  };

  // Confirm Claim Fee and Mark Document as Claimed
  const handleConfirmClaimFee = async (e) => {
    if (e) e.preventDefault();
    if (!claimFeeModal.req) return;

    const rawAmount = String(claimFeeModal.feeAmount).trim();
    if (rawAmount === '') {
      setClaimFeeModal((prev) => ({
        ...prev,
        error: 'Please enter the total fee collected (enter 0 for Free / Exempt).',
      }));
      return;
    }

    const numFee = parseFloat(rawAmount);
    if (isNaN(numFee) || numFee < 0) {
      setClaimFeeModal((prev) => ({
        ...prev,
        error: 'Please enter a valid claimed fee amount (₱0.00 or higher).',
      }));
      return;
    }

    setClaimFeeModal((prev) => ({ ...prev, isLoading: true, error: '' }));
    try {
      const adminName =
        currentUser?.name ||
        currentUser?.full_name ||
        currentUser?.email ||
        'Barangay Administrator';

      const updated = {
        ...claimFeeModal.req,
        status: 'completed',
        is_claimed: true,
        issued_at: new Date().toISOString(),
        claimed_at: new Date().toISOString(),
        claimed_by_admin: adminName,
        claimed_fee: numFee,
        fee: numFee,
        amount_paid: numFee,
        payment_status: numFee > 0 ? 'paid' : (claimFeeModal.req.payment_status || 'free'),
        is_paid: true,
        updated_at: new Date().toISOString(),
      };

      if (onUpdateRequestStatus) {
        await onUpdateRequestStatus(updated);
      }

      const trackingNum = claimFeeModal.req.tracking_number;
      setClaimFeeModal({
        isOpen: false,
        req: null,
        feeAmount: '',
        isVariable: false,
        defaultFee: 0,
        error: '',
        isLoading: false,
      });

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Document Claimed & Fee Recorded',
        message: `Tracking #${trackingNum} was officially recorded as claimed. Total fee of ${formatCurrency(numFee)} was recorded and added to all document fee collections.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Error confirming claim fee:', err);
      setClaimFeeModal((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to record document claim. Please try again.',
      }));
    }
  };

  // Prompt Delete Request with Security Verification
  const handlePromptDelete = (req) => {
    setSecurityModal({
      isOpen: true,
      item: req,
    });
  };

  const handleConfirmVerifiedDelete = async (req) => {
    if (!req) return;
    try {
      if (onDeleteRequest) {
        await onDeleteRequest(req.id, req.tracking_number);
      }
      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Moved to Archive',
        message: `Approved document tracking record #${req.tracking_number} was safely moved to Archive & Trash.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Error deleting document request:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Archive Failed',
        message: 'The approved document could not be moved to archive. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    }
  };

  // Filter dataset by claimFilter and docTypeFilter
  const processedData = useMemo(() => {
    let list = approvedRequests.filter((req) => {
      const claimed = isClaimed(req);
      const matchesClaim =
        claimFilter === 'all' ||
        (claimFilter === 'claimed' && claimed) ||
        (claimFilter === 'unclaimed' && !claimed);

      const matchesDocType =
        docTypeFilter === 'all' || req.document_title === docTypeFilter;

      return matchesClaim && matchesDocType;
    });

    if (targetTracking) {
      list = [...list].sort((a, b) => {
        if (a.tracking_number === targetTracking) return -1;
        if (b.tracking_number === targetTracking) return 1;
        return 0;
      });
    }

    return list;
  }, [approvedRequests, claimFilter, docTypeFilter, targetTracking]);

  // Define Enterprise Civic Table Columns
  const columns = useMemo(() => [
    {
      key: 'tracking_number',
      header: 'Tracking No.',
      sortable: true,
      accessor: 'tracking_number',
      render: (req) => (
        <span className="font-mono font-bold text-slate-800 bg-[#f4f7fb] px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px] inline-block">
          {req.tracking_number}
        </span>
      ),
    },
    {
      key: 'resident_name',
      header: 'Resident Applicant',
      sortable: true,
      accessor: 'resident_name',
      render: (req) => {
        const residentInitials = (req.resident_name || 'R')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('');
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3b5bfd] font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-blue-100">
              {residentInitials || 'RA'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{req.resident_name || 'Resident Applicant'}</p>
              <p className="text-[11px] text-slate-400 truncate">{req.resident_email || 'No email provided'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'document_title',
      header: 'Document Issued',
      sortable: true,
      accessor: 'document_title',
      render: (req) => {
        const claimed = isClaimed(req);
        const matchingDoc = allDocTypes.find(
          (d) =>
            d.id === req.document_type_id ||
            (d.code && (d.code === req.document_type_id || d.code === req.document_type)) ||
            (d.title || '').toLowerCase().trim() === (req.document_title || '').toLowerCase().trim()
        );
        const isVar = Boolean(req.is_variable_fee || matchingDoc?.is_variable_fee || matchingDoc?.fee_type === 'variable');
        const claimedFee = req.claimed_fee !== undefined && req.claimed_fee !== null
          ? Number(req.claimed_fee)
          : (req.amount_paid !== undefined && req.amount_paid !== null ? Number(req.amount_paid) : Number(req.fee || 0));
        const catalogFee = (matchingDoc && matchingDoc.fee !== undefined && matchingDoc.fee !== null)
          ? Number(matchingDoc.fee)
          : Number(req.fee || 0);

        return (
          <div>
            <p className="font-bold text-slate-800">{req.document_title}</p>
            {claimed ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Claimed Fee: {claimedFee > 0 ? formatCurrency(claimedFee) : 'FREE'}</span>
              </span>
            ) : isVar ? (
              <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold mt-0.5">
                Fee: Depends on claim
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-bold mt-0.5">
                Fee: {catalogFee > 0 ? formatCurrency(catalogFee) : 'Free'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'pickup_time_slot',
      header: 'Pick-up Slot',
      sortable: true,
      accessor: 'pickup_time_slot',
      render: (req) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 text-[#3b5bfd] border border-blue-100 font-mono text-[11px] font-bold">
          <Clock className="w-3 h-3" />
          <span>{req.pickup_time_slot || '9:00 AM - 9:30 AM'}</span>
        </span>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose',
      sortable: true,
      accessor: 'purpose',
      render: (req) => (
        <span
          className="text-slate-600 font-medium max-w-xs block truncate"
          title={req.purpose || 'Official Verification'}
        >
          {req.purpose || 'Official Verification'}
        </span>
      ),
    },
    {
      key: 'approved_at',
      header: 'Date Approved',
      sortable: true,
      accessor: (req) => req.approved_at || req.updated_at || req.created_at,
      render: (req) => (
        <span className="text-slate-500 font-semibold whitespace-nowrap">
          {req.approved_at
            ? formatDate(req.approved_at)
            : req.updated_at
            ? formatDate(req.updated_at)
            : formatDate(new Date())}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Claim Status',
      sortable: true,
      sortFn: (a, b, direction) => {
        const statusA = isClaimed(a) ? 1 : 0;
        const statusB = isClaimed(b) ? 1 : 0;
        return direction === 'asc' ? statusA - statusB : statusB - statusA;
      },
      render: (req) => {
        const claimed = isClaimed(req);
        return claimed ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Claimed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Unclaimed</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      render: (req) => {
        const claimed = isClaimed(req);
        const matchingDoc = allDocTypes.find(
          (d) => d.id === req.document_type_id || d.title === req.document_title || d.code === req.document_type
        );
        const isVar = Boolean(
          req.is_variable_fee ||
          req.fee_type === 'variable' ||
          matchingDoc?.is_variable_fee ||
          matchingDoc?.fee_type === 'variable'
        );

        return (
          <div className="flex items-center justify-end space-x-2">
            {/* Enhanced Mark as Claim Pill Button */}
            <button
              type="button"
              onClick={() => handlePromptToggleClaim(req)}
              className={
                claimed
                  ? 'px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all bg-[#f4f7fb] hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 cursor-pointer active:scale-95'
                  : 'px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all bg-[#3b5bfd] hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 cursor-pointer active:scale-95'
              }
              title={claimed ? 'Revert to Unclaimed' : isVar ? 'Confirm Claim & Fee Collection' : 'Mark Document as Claimed'}
              aria-label={
                claimed
                  ? `Mark request ${req.tracking_number} as unclaimed`
                  : `Mark request ${req.tracking_number} as claimed`
              }
            >
              {claimed ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mark Unclaimed</span>
                </>
              ) : isVar ? (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-blue-100" />
                  <span>Confirm Claim & Fee</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-3.5 h-3.5 text-blue-100" />
                  <span>Mark Claimed</span>
                </>
              )}
            </button>

            {/* Delete Action Button */}
            <button
              type="button"
              onClick={() => handlePromptDelete(req)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              title="Delete Record"
              aria-label={`Delete record ${req.tracking_number || ''}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], [currentUser, allDocTypes]);

  const claimRate = totalCount > 0 ? Math.round((claimedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Release & Claim Registry</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            Approved Documents
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Track printed certificates, confirm resident pick-ups, and record claim fees upon release.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{unclaimedCount} Awaiting Pick-up</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{claimedCount} Claimed ({claimRate}%)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDemandTracker((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
              showDemandTracker
                ? 'bg-[#3b5bfd] text-white shadow-blue-500/20'
                : 'bg-white border border-blue-200 text-[#3b5bfd] hover:bg-blue-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{showDemandTracker ? 'Hide Demand & Revenue Tracker' : 'Certificate Demand & Revenue Tracker'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Certificate Demand & Service Improvement Tracker (Treasurer Portal) */}
      {showDemandTracker && (
        <MonthlyDemandReport
          requests={requests}
          docTypes={allDocTypes}
          currentUser={currentUser}
          config={config}
        />
      )}

      {/* 4 Colorful Gradient KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Approved */}
        <div
          onClick={() => setClaimFilter('all')}
          className={`relative overflow-hidden rounded-[26px] p-5 bg-gradient-to-br from-[#4f46e5] via-[#3b5bfd] to-[#2563eb] text-white shadow-lg shadow-blue-500/20 flex flex-col justify-between min-h-[148px] cursor-pointer transition-all hover:-translate-y-0.5 ${
            claimFilter === 'all' ? 'ring-4 ring-blue-500/30' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-[10px] font-bold">
              Approved Total
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80">Total Approved</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {totalCount}
              </p>
            </div>
            <span className="text-[11px] font-bold text-white/85 bg-white/15 px-2.5 py-1 rounded-full">
              Certificates
            </span>
          </div>
        </div>

        {/* Card 2: Claimed Documents */}
        <div
          onClick={() => setClaimFilter('claimed')}
          className={`relative overflow-hidden rounded-[26px] p-5 bg-gradient-to-br from-[#0ea5e9] via-[#38bdf8] to-[#0284c7] text-white shadow-lg shadow-sky-500/20 flex flex-col justify-between min-h-[148px] cursor-pointer transition-all hover:-translate-y-0.5 ${
            claimFilter === 'claimed' ? 'ring-4 ring-sky-500/30' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white text-sky-500 flex items-center justify-center shadow-md">
              <PackageCheck className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-[10px] font-bold">
              Released
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80">Claimed Documents</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {claimedCount}
              </p>
            </div>
            <span className="text-[11px] font-bold text-white/85 bg-white/15 px-2.5 py-1 rounded-full">
              {claimRate}% Claimed
            </span>
          </div>
        </div>

        {/* Card 3: Unclaimed Documents */}
        <div
          onClick={() => setClaimFilter('unclaimed')}
          className={`relative overflow-hidden rounded-[26px] p-5 bg-gradient-to-br from-[#f59e0b] via-[#fb923c] to-[#f97316] text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between min-h-[148px] cursor-pointer transition-all hover:-translate-y-0.5 ${
            claimFilter === 'unclaimed' ? 'ring-4 ring-orange-500/30' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-[10px] font-bold">
              For Pick-up
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80">Unclaimed Documents</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {unclaimedCount}
              </p>
            </div>
            <span className="text-[11px] font-bold text-white/85 bg-white/15 px-2.5 py-1 rounded-full">
              Ready at Hall
            </span>
          </div>
        </div>

        {/* Card 4: Claimed Fee Collections (Green) */}
        <div className="relative overflow-hidden rounded-[26px] p-5 bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between min-h-[148px]">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-[10px] font-bold">
              Collections
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80">Claimed Fee Collections</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {formatCurrency(totalClaimedFees)}
              </p>
            </div>
            <span className="text-[11px] font-bold text-white/85 bg-white/15 px-2.5 py-1 rounded-full">
              On Release
            </span>
          </div>
        </div>
      </div>

      {/* Reusable Civic Enterprise DataTable with Flash-Free Skeleton */}
      {showSkeleton ? (
        <TableSkeleton rows={10} columns={6} isDarkMode={false} />
      ) : (
        <DataTable
          data={processedData}
          columns={columns}
          keyField="id"
          searchable={true}
          initialSearch={targetTracking}
          searchPlaceholder="Search tracking no, resident, or purpose..."
          searchKeys={[
            'tracking_number',
            'resident_name',
            'resident_email',
            'document_title',
            'purpose',
          ]}
          statusTabs={{
            tabs: [
              { id: 'all', label: 'All Approved', count: totalCount },
              { id: 'unclaimed', label: 'Unclaimed', count: unclaimedCount },
              { id: 'claimed', label: 'Claimed', count: claimedCount },
            ],
            activeTab: claimFilter,
            onChange: setClaimFilter,
          }}
          filters={[
            {
              id: 'docType',
              label: 'Document Type',
              value: docTypeFilter,
              onChange: setDocTypeFilter,
              options: docTypeOptions,
              filterFn: (row, val) => val === 'all' || row.document_title === val,
            },
          ]}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          defaultSortKey="approved_at"
          defaultSortDirection="desc"
          emptyTitle="No approved documents found."
          emptySubtitle="Documents will appear here once processed and approved by the barangay staff."
          onResetFilters={() => {
            setClaimFilter('all');
            setDocTypeFilter('all');
          }}
        />
      )}

      {/* Accessible Action Feedback / Confirmation Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose || (() => setActionModal({ isOpen: false }))}
        isDestructive={actionModal.isDestructive}
        isLoading={actionModal.isLoading}
      />

      {/* Security Verification Modal for Deleting Approved Documents */}
      <SecurityVerificationModal
        isOpen={securityModal.isOpen}
        onClose={() => setSecurityModal({ isOpen: false, item: null })}
        onVerified={() => handleConfirmVerifiedDelete(securityModal.item)}
        currentUser={currentUser}
        title="Security Verification Required"
        message={`Please confirm your administrator password to move approved document #${securityModal.item?.tracking_number} to Archive & Trash.`}
        confirmText="Verify & Move to Archive"
        isDestructive={true}
      />

      {/* Claim Fee Collection Assessment Modal */}
      <Modal
        isOpen={claimFeeModal.isOpen}
        onClose={() => {
          if (!claimFeeModal.isLoading) {
            setClaimFeeModal({ isOpen: false, req: null, feeAmount: '', isVariable: false, defaultFee: 0, error: '', isLoading: false });
          }
        }}
        title="Confirm Claim & Fee Collection"
        maxWidth="max-w-md"
      >
        {claimFeeModal.req && (
          <form onSubmit={handleConfirmClaimFee} className="space-y-4 text-xs">
            {/* Document & Resident Context Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200">
                  {claimFeeModal.req.tracking_number}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Processing Fee: Depends on Claim
                </span>
              </div>
              <p className="font-bold text-slate-900 text-sm mt-1">{claimFeeModal.req.document_title}</p>
              <p className="text-slate-600">
                Applicant: <span className="font-semibold text-slate-800">{claimFeeModal.req.resident_name || claimFeeModal.req.resident_email}</span>
              </p>
            </div>

            {/* Variable Fee Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                This document's processing fee option is set to <strong>Depends on Claim</strong>. Please enter the total fee collected from the resident upon release. This amount will be added to all document fee collections.
              </p>
            </div>

            {/* Fee Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Total Claimed Fee Collected (PHP) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={claimFeeModal.feeAmount}
                  onChange={(e) => setClaimFeeModal((prev) => ({ ...prev, feeAmount: e.target.value, error: '' }))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Enter 0.00 if this issuance was free or exempt.</p>
            </div>

            {/* Quick Helper Buttons */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setClaimFeeModal((prev) => ({ ...prev, feeAmount: '0.00', error: '' }))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Free (₱0.00)
              </button>
              {claimFeeModal.defaultFee > 0 && (
                <button
                  type="button"
                  onClick={() => setClaimFeeModal((prev) => ({ ...prev, feeAmount: String(claimFeeModal.defaultFee), error: '' }))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                >
                  Standard (₱{claimFeeModal.defaultFee.toFixed(2)})
                </button>
              )}
            </div>

            {claimFeeModal.error && (
              <p className="text-xs font-semibold text-rose-600">{claimFeeModal.error}</p>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={claimFeeModal.isLoading}
                onClick={() => setClaimFeeModal({ isOpen: false, req: null, feeAmount: '', isVariable: false, defaultFee: 0, error: '', isLoading: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={claimFeeModal.isLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {claimFeeModal.isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirm & Mark Claimed</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
