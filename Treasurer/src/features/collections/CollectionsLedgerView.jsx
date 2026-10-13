// Treasurer/src/features/collections/CollectionsLedgerView.jsx
import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  User,
  Calendar,
  FileText,
  DollarSign,
  Download,
  Gift,
  Check,
  Printer,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../core/security';
import { StorageService } from '../../core/storage';

export default function CollectionsLedgerView({
  requests = [],
  docTypes = [],
  config = {},
  loading = false,
  currentUser = {},
  onRefresh,
  onNavigateToReports,
}) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

  // Modal States
  const [paymentModalTx, setPaymentModalTx] = useState(null);
  const [waiveModalTx, setWaiveModalTx] = useState(null);
  const [receiptModalTx, setReceiptModalTx] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Payment Form Fields
  const [payMethod, setPayMethod] = useState('Cash');
  const [payOrNumber, setPayOrNumber] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [markCompletedOnPay, setMarkCompletedOnPay] = useState(true);

  // Waive Form Fields
  const [waiveReason, setWaiveReason] = useState('Indigent Resident');
  const [waiveNotes, setWaiveNotes] = useState('');
  const [markCompletedOnWaive, setMarkCompletedOnWaive] = useState(true);

  // Compute status counts for status tabs
  const counts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let waived = 0;

    requests.forEach((r) => {
      const isPaid = r.payment_status === 'paid' || r.is_paid === true || r.status === 'released' || r.status === 'completed';
      const isWaived = r.payment_status === 'waived' || r.is_waived === true;
      if (isPaid) paid++;
      else if (isWaived) waived++;
      else unpaid++;
    });

    return { all: requests.length, paid, unpaid, waived };
  }, [requests]);

  const statusTabs = {
    activeTab: statusFilter,
    onChange: setStatusFilter,
    tabs: [
      { id: 'all', label: 'All Requests', count: counts.all },
      { id: 'paid', label: 'Paid', count: counts.paid },
      { id: 'unpaid', label: 'Waiting for Payment', count: counts.unpaid },
      { id: 'waived', label: 'Free / Waived', count: counts.waived },
    ],
  };

  const docTypeOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Documents' }];
    docTypes.forEach((d) => {
      list.push({ value: d.title || d.code, label: d.title || d.code });
    });
    return list;
  }, [docTypes]);

  const filters = [
    {
      id: 'docType',
      label: 'Document Type',
      value: docTypeFilter,
      onChange: setDocTypeFilter,
      options: docTypeOptions,
      filterFn: (row, val) => {
        const rowDoc = row.document_type || row.document_name || '';
        return rowDoc.toLowerCase() === val.toLowerCase();
      },
    },
    {
      id: 'status',
      value: statusFilter,
      onChange: setStatusFilter,
      filterFn: (row, val) => {
        if (val === 'all') return true;
        const isPaid = row.payment_status === 'paid' || row.is_paid === true || row.status === 'released' || row.status === 'completed';
        const isWaived = row.payment_status === 'waived' || row.is_waived === true;
        if (val === 'paid') return isPaid;
        if (val === 'waived') return isWaived;
        if (val === 'unpaid') return !isPaid && !isWaived;
        return true;
      },
    },
  ];

  // Open Payment Modal
  const handleOpenPaymentModal = (req) => {
    const fee = Number(req.fee ?? req.amount ?? 0);
    const generatedOr = StorageService.generateNextOrNumber(requests);
    setPaymentModalTx(req);
    setPayMethod('Cash');
    setPayOrNumber(generatedOr);
    setPayAmount(String(fee));
    setPayNotes('');
    setMarkCompletedOnPay(true);
  };

  // Submit Payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!paymentModalTx) return;

    setIsSubmitting(true);
    try {
      const updated = await StorageService.recordPaymentAsync({
        requestId: paymentModalTx.id,
        trackingNumber: paymentModalTx.tracking_number,
        amount: Number(payAmount) || 0,
        paymentMethod: payMethod,
        orNumber: payOrNumber.trim() || StorageService.generateNextOrNumber(requests),
        notes: payNotes.trim(),
        markCompleted: markCompletedOnPay,
      });

      if (onRefresh) await onRefresh();

      setNotification({
        type: 'success',
        message: `Payment of ${formatCurrency(Number(payAmount) || 0)} recorded for ${paymentModalTx.resident_name || paymentModalTx.full_name || 'resident'}. Official Receipt #${payOrNumber} issued.`,
      });

      // Close payment modal and open Official Receipt for printing
      setPaymentModalTx(null);
      if (updated) {
        setReceiptModalTx(updated);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Could not record payment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Open Waive Modal
  const handleOpenWaiveModal = (req) => {
    setWaiveModalTx(req);
    setWaiveReason('Indigent Resident');
    setWaiveNotes('');
    setMarkCompletedOnWaive(true);
  };

  // Submit Waiver
  const handleConfirmWaive = async (e) => {
    e.preventDefault();
    if (!waiveModalTx) return;

    setIsSubmitting(true);
    try {
      await StorageService.waivePaymentAsync({
        requestId: waiveModalTx.id,
        trackingNumber: waiveModalTx.tracking_number,
        reason: waiveReason,
        notes: waiveNotes.trim(),
        markCompleted: markCompletedOnWaive,
      });

      if (onRefresh) await onRefresh();

      setNotification({
        type: 'success',
        message: `Document fee waived (${waiveReason}) for ${waiveModalTx.resident_name || waiveModalTx.full_name || 'resident'}.`,
      });

      setWaiveModalTx(null);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Could not waive fee. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Table Columns
  const columns = [
    {
      key: 'tracking_number',
      header: 'Tracking Number',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">
          {row.tracking_number || 'BZ-2026-PEND'}
        </span>
      ),
    },
    {
      key: 'full_name',
      header: 'Resident Name',
      sortable: true,
      accessor: (row) => row.full_name || row.user_name || row.resident_name || 'Resident',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 leading-tight">
            {row.full_name || row.user_name || row.resident_name || 'Resident'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.email || row.contact_number || ''}</p>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Document Requested',
      sortable: true,
      accessor: (row) => row.document_type || row.document_name || 'Clearance',
      render: (row) => (
        <span className="font-medium text-slate-800">
          {row.document_type || row.document_name || 'Clearance'}
        </span>
      ),
    },
    {
      key: 'fee',
      header: 'Fee (PHP)',
      sortable: true,
      align: 'right',
      accessor: (row) => Number(row.fee ?? row.amount ?? 0),
      render: (row) => {
        const fee = Number(row.fee ?? row.amount ?? 0);
        return <span className="font-black text-slate-900">{formatCurrency(fee)}</span>;
      },
    },
    {
      key: 'payment_status',
      header: 'Payment Status',
      sortable: true,
      align: 'center',
      render: (row) => {
        const isPaid = row.payment_status === 'paid' || row.is_paid === true || row.status === 'released' || row.status === 'completed';
        const isWaived = row.payment_status === 'waived' || row.is_waived === true;

        if (isPaid) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Paid
            </span>
          );
        }
        if (isWaived) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
              <Gift className="w-3 h-3 text-purple-600" />
              Free (Waived)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 text-blue-600" />
            Unpaid
          </span>
        );
      },
    },
    {
      key: 'or_number',
      header: 'OR Number',
      sortable: true,
      render: (row) => {
        const or = row.or_number || row.official_receipt_number;
        if (or) {
          return (
            <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {or}
            </span>
          );
        }
        return <span className="text-slate-400 font-mono text-[11px]">—</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {formatDate(row.payment_date || row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'center',
      render: (row) => {
        const isPaid = row.payment_status === 'paid' || row.is_paid === true || row.status === 'released' || row.status === 'completed';
        const isWaived = row.payment_status === 'waived' || row.is_waived === true;

        if (isPaid) {
          return (
            <button
              onClick={() => setReceiptModalTx(row)}
              title="View & Print Official Receipt"
              className="px-2.5 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>View Receipt</span>
            </button>
          );
        }

        if (isWaived) {
          return (
            <button
              onClick={() => setSelectedTx(row)}
              title="View Waiver Details"
              className="px-2.5 py-1 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
            >
              <Gift className="w-3.5 h-3.5 text-purple-600" />
              <span>Waiver Info</span>
            </button>
          );
        }

        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => handleOpenPaymentModal(row)}
              title="Collect Fee & Issue Official Receipt"
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5 text-white" />
              <span>Collect Fee</span>
            </button>
            <button
              onClick={() => handleOpenWaiveModal(row)}
              title="Mark as Free / Waived (Indigent/Senior/PWD)"
              className="px-2 py-1 rounded-lg text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer text-xs font-medium"
            >
              Waive
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Document Payments & Receipts</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Collect fees from residents, issue official receipts, and record payment waivers.
          </p>
        </div>

        <button
          onClick={onNavigateToReports}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>Print Collection Report</span>
        </button>
      </div>

      {/* DataTable */}
      <DataTable
        data={requests}
        columns={columns}
        keyField="id"
        searchable={true}
        searchPlaceholder="Search by tracking number, resident name, document, or OR..."
        searchKeys={['tracking_number', 'full_name', 'user_name', 'resident_name', 'email', 'document_type', 'or_number']}
        statusTabs={statusTabs}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        loading={loading}
        emptyTitle="No document payment records found"
        emptySubtitle="Try selecting another tab or clearing your search filters."
      />

      {/* MODAL 1: RECORD PAYMENT & ISSUE OFFICIAL RECEIPT */}
      {paymentModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Document Payment</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {paymentModalTx.tracking_number || 'BZ-2026-PEND'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalTx(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
              {/* Summary of request */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Resident:</span>
                  <span className="font-bold text-slate-900">
                    {paymentModalTx.resident_name || paymentModalTx.full_name || 'Resident'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Document:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentModalTx.document_type || paymentModalTx.document_name || 'Clearance'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Standard Fee:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(Number(paymentModalTx.fee ?? paymentModalTx.amount ?? 0))}
                  </span>
                </div>
              </div>

              {/* OR Number */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Official Receipt (OR) Number
                </label>
                <input
                  type="text"
                  required
                  value={payOrNumber}
                  onChange={(e) => setPayOrNumber(e.target.value)}
                  placeholder="e.g. OR-2026-0001"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Amount to Collect */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Amount Collected (PHP)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                >
                  <option value="Cash">Cash (Counter)</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Received at Barangay Hall Cashier"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Checkbox: Mark as Completed */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markCompletedOnPay"
                  checked={markCompletedOnPay}
                  onChange={(e) => setMarkCompletedOnPay(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="markCompletedOnPay" className="text-slate-700 font-medium cursor-pointer">
                  Mark document as completed & released upon payment
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalTx(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WAIVE FEE */}
      {waiveModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Waive Document Fee</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {waiveModalTx.tracking_number || 'BZ-2026-PEND'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWaiveModalTx(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmWaive} className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-purple-900 space-y-1">
                <p className="font-semibold">
                  Resident: {waiveModalTx.resident_name || waiveModalTx.full_name || 'Resident'}
                </p>
                <p className="text-[11px] text-purple-700">
                  Document: {waiveModalTx.document_type || waiveModalTx.document_name || 'Clearance'} • Fee: {formatCurrency(Number(waiveModalTx.fee ?? waiveModalTx.amount ?? 0))}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Fee Exemption
                </label>
                <select
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 cursor-pointer"
                >
                  <option value="Indigent Resident">Indigent Resident (Certificate of Indigency)</option>
                  <option value="Senior Citizen">Senior Citizen (RA 9994)</option>
                  <option value="Person with Disability">Person with Disability (PWD)</option>
                  <option value="First-Time Jobseeker">First-Time Jobseeker (RA 11261)</option>
                  <option value="Barangay Privilege">Barangay Official / Privilege</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={waiveNotes}
                  onChange={(e) => setWaiveNotes(e.target.value)}
                  placeholder="e.g. Verified with Barangay Social Welfare Office"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markCompletedOnWaive"
                  checked={markCompletedOnWaive}
                  onChange={(e) => setMarkCompletedOnWaive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="markCompletedOnWaive" className="text-slate-700 font-medium cursor-pointer">
                  Mark document as completed upon waiving fee
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaiveModalTx(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Waiving...' : 'Confirm Fee Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OFFICIAL RECEIPT (PRINTABLE & VIEWABLE) */}
      {receiptModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            {/* Modal Controls (Hidden during print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Official Barangay Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setReceiptModalTx(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Printable Receipt Document */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs font-sans">
              {/* Header */}
              <div className="text-center border-b border-slate-300 pb-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Republic of the Philippines</p>
                <p className="text-xs font-bold text-slate-700">City of Cebu • {config.barangay_name || 'Barangay Zapatera'}</p>
                <h2 className="text-base font-black text-slate-900 tracking-tight mt-1 uppercase">
                  Official Receipt
                </h2>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-mono font-bold text-xs">
                  <span>OR NO:</span>
                  <span>{receiptModalTx.or_number || receiptModalTx.official_receipt_number || 'OR-2026-0001'}</span>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Tracking Number:</span>
                  <span className="font-mono font-bold text-slate-800">{receiptModalTx.tracking_number || 'BZ-2026-PEND'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Received From:</span>
                  <span className="font-bold text-slate-900">
                    {receiptModalTx.resident_name || receiptModalTx.full_name || 'Resident'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Document Clearance:</span>
                  <span className="font-semibold text-slate-800">
                    {receiptModalTx.document_type || receiptModalTx.document_name || 'Barangay Clearance'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Payment Mode:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {receiptModalTx.payment_method || 'Cash'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Date & Time:</span>
                  <span className="font-mono text-slate-700">
                    {formatDate(receiptModalTx.payment_date || receiptModalTx.created_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-700 text-sm">Amount Paid:</span>
                  <span className="font-black text-slate-900 text-lg">
                    {formatCurrency(Number(receiptModalTx.fee ?? receiptModalTx.amount ?? 0))}
                  </span>
                </div>
              </div>

              {/* Footer Signatures */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-[11px]">
                <div>
                  <p className="text-slate-400">Status:</p>
                  <p className="text-emerald-700 font-bold uppercase">PAID & VERIFIED</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 underline decoration-slate-400">
                    {currentUser?.full_name || config.treasurer_name || 'HON. MA. LOURDES S. RAMOS'}
                  </p>
                  <p className="text-slate-500 font-medium text-[10px]">Barangay Treasurer</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 print:hidden">
              <button
                onClick={() => setReceiptModalTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WAIVER DETAILS */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Fee Exemption Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedTx.tracking_number || 'BZ-2026-PEND'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Resident:</span>
                <span className="font-bold text-slate-900">
                  {selectedTx.resident_name || selectedTx.full_name || 'Resident'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Document:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTx.document_type || selectedTx.document_name || 'Clearance'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Exemption Category:</span>
                <span className="font-bold text-purple-700">
                  {selectedTx.waived_reason || 'Indigent Resident Exemption'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Fee Waived:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(Number(selectedTx.fee ?? selectedTx.amount ?? 0))}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Recorded Date:</span>
                <span className="font-mono text-slate-700">
                  {formatDate(selectedTx.payment_date || selectedTx.created_at)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
