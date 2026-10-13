// Treasurer/src/features/collections/CollectionsLedgerView.jsx
import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  X,
  ShieldCheck,
  CreditCard,
  User,
  Calendar,
  FileText,
  DollarSign,
  Download,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../core/security';

export default function CollectionsLedgerView({
  requests = [],
  docTypes = [],
  loading = false,
  onNavigateToReports,
}) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

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
      { id: 'all', label: 'All Transactions', count: counts.all },
      { id: 'paid', label: 'Paid Collections', count: counts.paid },
      { id: 'unpaid', label: 'Unpaid / Pending', count: counts.unpaid },
      { id: 'waived', label: 'Waived / Indigent', count: counts.waived },
    ],
  };

  const docTypeOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Document Types' }];
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

  // Table Columns
  const columns = [
    {
      key: 'tracking_number',
      header: 'Tracking No.',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">
          {row.tracking_number || 'BZ-2026-PEND'}
        </span>
      ),
    },
    {
      key: 'full_name',
      header: 'Resident / Requestor',
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
      header: 'Document Type',
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
              Waived (Indigent)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Unpaid
          </span>
        );
      },
    },
    {
      key: 'payment_method',
      header: 'Method',
      sortable: true,
      render: (row) => {
        const method = row.payment_method || row.payment_mode || 'Cash';
        return <span className="text-slate-600 font-medium capitalize">{method}</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Date & Time',
      sortable: true,
      render: (row) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {formatDate(row.payment_date || row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Audit Action',
      sortable: false,
      align: 'center',
      render: (row) => (
        <button
          onClick={() => setSelectedTx(row)}
          title="View Official Receipt & Audit Details"
          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Receipt</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">Official Collections Ledger</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Read-only financial audit of all documentary clearance fee collections, official receipts, and waivers.
          </p>
        </div>

        <button
          onClick={onNavigateToReports}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>Print Financial Summary</span>
        </button>
      </div>

      {/* 10-Row Standard Civic DataTable */}
      <DataTable
        data={requests}
        columns={columns}
        keyField="id"
        searchable={true}
        searchPlaceholder="Search by tracking number, resident name, or email..."
        searchKeys={['tracking_number', 'full_name', 'user_name', 'email', 'document_type', 'reference_number']}
        statusTabs={statusTabs}
        filters={filters}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        loading={loading}
        emptyTitle="No financial transactions matching the selected criteria"
        emptySubtitle="Try selecting another status tab or clearing your search filters."
      />

      {/* View Transaction / Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Receipt Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedTx.tracking_number || 'BZ-2026-PEND'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Resident Requestor:</span>
                <span className="font-bold text-slate-900">
                  {selectedTx.full_name || selectedTx.user_name || selectedTx.resident_name || 'Resident'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Document Clearance:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTx.document_type || selectedTx.document_name || 'Clearance'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Clearance Purpose:</span>
                <span className="font-medium text-slate-800">
                  {selectedTx.purpose || 'Official Requirement'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {selectedTx.payment_method || selectedTx.payment_mode || 'Cash'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Payment Date:</span>
                <span className="font-mono text-slate-700">
                  {formatDate(selectedTx.payment_date || selectedTx.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 text-sm">
                <span className="font-bold text-slate-700">Assessed Fee Total:</span>
                <span className="font-black text-slate-900 text-base">
                  {formatCurrency(Number(selectedTx.fee ?? selectedTx.amount ?? 0))}
                </span>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Auditor Note: As Barangay Treasurer, this transaction record is permanently signed and read-only.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
