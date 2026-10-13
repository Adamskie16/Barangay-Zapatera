// Admin/src/features/requests/ApprovedDocumentsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import ActionModal from '../../components/ActionModal';
import DataTable from '../../components/DataTable';
import {
  FileCheck2,
  PackageCheck,
  Package,
  RotateCcw,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../core/security';
import { TableSkeleton, useDelayedLoading } from '../../components/loaders';
import { DESIGN_TOKENS } from '../../core/designTokens';

export default function ApprovedDocumentsView({
  requests = [],
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

  // Counts
  const totalCount = approvedRequests.length;
  const claimedCount = approvedRequests.filter((r) => isClaimed(r)).length;
  const unclaimedCount = approvedRequests.filter((r) => !isClaimed(r)).length;

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

  // Prompt Toggle Claimed / Unclaimed status with Confirmation & Feedback
  const handlePromptToggleClaim = (req) => {
    const currentlyClaimed = isClaimed(req);
    const adminName = currentUser?.full_name || currentUser?.email || 'Barangay Administrator';

    if (!currentlyClaimed) {
      // Mark as Claimed confirmation
      setActionModal({
        isOpen: true,
        type: 'confirmation',
        title: 'Mark Document as Claimed?',
        message: `Confirm that ${req.resident_name || 'the resident'} has officially received document ${req.tracking_number}.`,
        confirmText: 'Mark as Claimed',
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
              updated_at: new Date().toISOString(),
            };

            if (onUpdateRequestStatus) {
              await onUpdateRequestStatus(updated);
            }

            setActionModal({
              isOpen: true,
              type: 'success',
              title: 'Document Marked as Claimed',
              message: `Tracking #${req.tracking_number} has been officially recorded as claimed.`,
              buttonText: 'OK',
              onClose: () => setActionModal({ isOpen: false }),
            });
          } catch (err) {
            console.error('Error updating claim status:', err);
            setActionModal({
              isOpen: true,
              type: 'error',
              title: 'Unable to Update Status',
              message: 'Something went wrong while updating the document claim status. Please try again.',
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

  // Prompt Delete Request with confirmation
  const handlePromptDelete = (req) => {
    setActionModal({
      isOpen: true,
      type: 'confirmation',
      title: 'Delete Document Record?',
      message: `Are you sure you want to delete tracking record ${req.tracking_number}? This action cannot be undone.`,
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      isDestructive: true,
      isLoading: false,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isLoading: true }));
        try {
          if (onDeleteRequest) {
            await onDeleteRequest(req.id, req.tracking_number);
          }
          setActionModal({
            isOpen: true,
            type: 'success',
            title: 'Record Deleted',
            message: `Document request ${req.tracking_number} was successfully removed.`,
            buttonText: 'OK',
            onClose: () => setActionModal({ isOpen: false }),
          });
        } catch (err) {
          console.error('Error deleting document request:', err);
          setActionModal({
            isOpen: true,
            type: 'error',
            title: 'Delete Failed',
            message: 'The request could not be deleted. Please try again.',
            buttonText: 'Close',
            onClose: () => setActionModal({ isOpen: false }),
          });
        }
      },
      onClose: () => setActionModal({ isOpen: false }),
    });
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
      header: 'Tracking Number',
      sortable: true,
      accessor: 'tracking_number',
      render: (req) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs inline-block">
          {req.tracking_number}
        </span>
      ),
    },
    {
      key: 'resident_name',
      header: 'Resident Applicant',
      sortable: true,
      accessor: 'resident_name',
      render: (req) => (
        <div>
          <p className="font-bold text-slate-800">{req.resident_name || 'Resident Applicant'}</p>
          <p className="text-[11px] text-slate-400">{req.resident_email || 'No email provided'}</p>
        </div>
      ),
    },
    {
      key: 'document_title',
      header: 'Document Issued',
      sortable: true,
      accessor: 'document_title',
      render: (req) => (
        <div>
          <p className="font-semibold text-slate-800">{req.document_title}</p>
          <p className="text-[11px] text-emerald-700 font-bold">
            {req.fee > 0 ? formatCurrency(req.fee) : 'Free'}
          </p>
        </div>
      ),
    },
    {
      key: 'pickup_time_slot',
      header: 'Pick-up Time Slot',
      sortable: true,
      accessor: 'pickup_time_slot',
      render: (req) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold">
          {req.pickup_time_slot || '9:00 AM - 9:30 AM'}
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
          className="text-slate-600 max-w-xs block truncate"
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
        <span className="text-slate-500 font-medium whitespace-nowrap">
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Claimed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs">
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
        return (
          <div className="flex items-center justify-end space-x-2">
            {/* Enhanced Civic Mark as Claim Button */}
            <button
              type="button"
              onClick={() => handlePromptToggleClaim(req)}
              className={
                claimed
                  ? 'px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 cursor-pointer active:scale-95'
                  : 'px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer active:scale-95'
              }
              title={claimed ? 'Revert to Unclaimed' : 'Mark Document as Claimed'}
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
              ) : (
                <>
                  <PackageCheck className="w-3.5 h-3.5 text-blue-100" />
                  <span>Mark Claimed</span>
                </>
              )}
            </button>

            {/* Standard Civic Delete Action Button (matches ReceiveRequestView) */}
            <button
              type="button"
              onClick={() => handlePromptDelete(req)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
              title="Delete Record"
              aria-label={`Delete record ${req.tracking_number || ''}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], [currentUser]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Cards (Strict 4px/8px rhythm, Civic neutral/accent) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Approved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved clearance certificates</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Claimed Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Claimed Documents</p>
            <h3 className="text-2xl font-black text-emerald-800 mt-1">{claimedCount}</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">Officially released to residents</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Unclaimed Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Unclaimed Documents</p>
            <h3 className="text-2xl font-black text-amber-800 mt-1">{unclaimedCount}</h3>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting resident pick-up</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Package className="w-6 h-6" />
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
    </div>
  );
}
