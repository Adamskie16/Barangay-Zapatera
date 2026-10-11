// SuperAdmin/src/features/dashboard/DashboardView.jsx
import React, { useState, useMemo } from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import ActionModal from '../../components/ActionModal';
import {
  Users,
  FileCheck,
  AlertCircle,
  Calendar,
  Shield,
  Activity,
  DollarSign,
  Trash2,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function DashboardView({
  users = [],
  docTypes = [],
  requests = [],
  events = [],
  logs = [],
  config = {},
  onDeleteRequest,
}) {
  const totalUsers = users.length;
  const totalResidents = users.filter((u) => u.role === 'resident').length;
  const totalAdmins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;

  // Accurately compute Pending and Under Review requests based on the Admin folder
  const pendingCount = requests.filter((r) => {
    const s = String(r.status || 'pending').toLowerCase().trim();
    return s === 'pending';
  }).length;

  const underReviewCount = requests.filter((r) => {
    const s = String(r.status || '').toLowerCase().trim();
    return s === 'under_review' || s === 'under review' || s === 'processing';
  }).length;

  const pendingRequests = pendingCount + underReviewCount;

  const approvedRequests = requests.filter((r) => {
    const s = String(r.status || '').toLowerCase().trim();
    return s === 'approved' || s === 'issued' || s === 'ready_for_pickup' || s === 'completed';
  }).length;

  const declinedRequests = requests.filter((r) => {
    const s = String(r.status || '').toLowerCase().trim();
    return s === 'declined' || s === 'rejected';
  }).length;

  const totalFeesCollected = requests
    .filter((r) => {
      const s = String(r.status || '').toLowerCase().trim();
      return s === 'approved' || s === 'issued' || s === 'ready_for_pickup' || s === 'completed';
    })
    .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Confirmation modal for deleting request
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonText: 'OK',
    onConfirm: null,
    isDestructive: false,
  });

  const handlePromptDelete = (req) => {
    setActionModal({
      isOpen: true,
      type: 'warning',
      title: 'Delete Document Request?',
      message: `Are you sure you want to delete request "${req.tracking_number || req.id}" for applicant "${req.resident_name || req.resident_email}"? This will permanently remove the record.`,
      confirmText: 'Delete Request',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isOpen: false }));
        if (onDeleteRequest) {
          await onDeleteRequest(req.id, req.tracking_number);
        }
      },
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey('created_at');
        setSortDirection('desc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredRequests = useMemo(() => {
    let result = requests.filter((request) => {
      const s = String(request.status || 'pending').toLowerCase().trim();
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending_under_review') {
        return s === 'pending' || s === 'under_review' || s === 'under review' || s === 'processing';
      }
      if (statusFilter === 'pending') {
        return s === 'pending';
      }
      if (statusFilter === 'under_review') {
        return s === 'under_review' || s === 'under review' || s === 'processing';
      }
      if (statusFilter === 'approved') {
        return s === 'approved' || s === 'issued' || s === 'ready_for_pickup' || s === 'completed';
      }
      if (statusFilter === 'declined') {
        return s === 'declined' || s === 'rejected';
      }
      return s === statusFilter;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const tracking = String(r.tracking_number || '').toLowerCase();
        const name = String(r.resident_name || '').toLowerCase();
        const email = String(r.resident_email || '').toLowerCase();
        const doc = String(r.document_title || '').toLowerCase();
        return tracking.includes(q) || name.includes(q) || email.includes(q) || doc.includes(q);
      });
    }

    result.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'created_at') {
        const dateA = new Date(valA || 0).getTime();
        const dateB = new Date(valB || 0).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [requests, statusFilter, searchQuery, sortKey, sortDirection]);

  // 10-Row Pagination Calculations
  const totalEntries = filteredRequests.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRequests = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, safeCurrentPage, pageSize]);

  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);

  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin Control Console
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {config?.barangay_name || 'Barangay Zapatera'} Overview
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Monitor document requests, registered users, fee collections, and system logs in real time.
          </p>
        </div>
        <div className="hidden lg:block text-right border-l border-slate-700/60 pl-8">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">System Reference</p>
          <p className="text-lg font-mono font-bold text-blue-400 mt-0.5">{config?.doc_prefix || 'BZ-2026'}</p>
          <p className="text-xs text-slate-400 mt-1">{config?.office_hours || 'Mon-Fri 8AM-5PM'}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Registered Accounts"
          value={totalUsers}
          icon={Users}
          color="blue"
          subtitle={`${totalResidents} Residents | ${totalAdmins} Admins`}
        />
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'pending_under_review' ? 'all' : 'pending_under_review');
            setCurrentPage(1);
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to filter Pending / Under Review requests"
        >
          <StatCard
            title="Pending & Under Review"
            value={pendingRequests}
            icon={AlertCircle}
            color="amber"
            subtitle={`${pendingCount} Pending | ${underReviewCount} Under Review`}
          />
        </div>
        <div
          onClick={() => {
            setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved');
            setCurrentPage(1);
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to filter Approved requests"
        >
          <StatCard
            title="Approved & Issued Documents"
            value={approvedRequests}
            icon={FileCheck}
            color="purple"
            subtitle="Completed applications"
          />
        </div>
        <StatCard
          title="Document Fee Collections"
          value={formatCurrency(totalFeesCollected)}
          icon={DollarSign}
          color="emerald"
          subtitle="Total fees from issued clearance"
        />
      </div>

      {/* Monthly Analytics Overview Widget */}
      <MonthlyAnalytics requests={requests} />

      {/* Grid Section: System Health & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Requests Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Document Requests (Admin Operational Queue)
                </h3>
                <p className="text-xs text-slate-500">
                  Live requests submitted by residents and processed by admin staff
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status:
                  </span>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 border-none outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Requests ({requests.length})</option>
                    <option value="pending_under_review">Pending & Under Review ({pendingRequests})</option>
                    <option value="pending">Pending Only ({pendingCount})</option>
                    <option value="under_review">Under Review ({underReviewCount})</option>
                    <option value="approved">Approved / Issued ({approvedRequests})</option>
                    <option value="declined">Declined ({declinedRequests})</option>
                  </select>
                </div>

                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
                  {filteredRequests.length} Result{filteredRequests.length !== 1 && 's'}
                </span>
              </div>
            </div>

            {/* Quick Search Box */}
            <div className="mb-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tracking number, applicant name, email, or document..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('tracking_number')}
                        className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                      >
                        <span>Tracking No.</span>
                        {sortKey === 'tracking_number' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('resident_name')}
                        className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                      >
                        <span>Applicant</span>
                        {sortKey === 'resident_name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('document_title')}
                        className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                      >
                        <span>Document</span>
                        {sortKey === 'document_title' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                      >
                        <span>Status</span>
                        {sortKey === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => handleSort('created_at')}
                        className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                      >
                        <span>Date Submitted</span>
                        {sortKey === 'created_at' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </th>
                    {onDeleteRequest && (
                      <th className="p-3 text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => {
                      const normStatus = String(req.status || 'pending').toLowerCase().trim();
                      const isUnderRev =
                        normStatus === 'under_review' ||
                        normStatus === 'under review' ||
                        normStatus === 'processing';
                      return (
                        <tr key={req.id || req.tracking_number} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {req.tracking_number}
                          </td>

                          <td className="p-3">
                            <p className="font-semibold text-slate-800">
                              {req.resident_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {req.resident_email}
                            </p>
                          </td>

                          <td className="p-3 font-medium text-slate-700">
                            {req.document_title}
                          </td>

                          <td className="p-3">
                            {isUnderRev ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span>Under Review</span>
                              </span>
                            ) : (
                              <Badge variant={req.status}>
                                {req.status?.replace('_', ' ')}
                              </Badge>
                            )}
                          </td>

                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {formatDate(req.created_at)}
                          </td>

                          {onDeleteRequest && (
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handlePromptDelete(req)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Request Record"
                                aria-label={`Delete Request ${req.tracking_number || ''}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={onDeleteRequest ? 6 : 5}
                        className="p-6 text-center text-slate-400"
                      >
                        No document requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10-Row Pagination Footer */}
          {totalEntries > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-4">
              <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
                <span className="font-medium text-slate-600">
                  Showing <span className="font-bold text-slate-900">{startIndex}</span> to{' '}
                  <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalEntries}</span> entries
                </span>

                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="hidden md:inline text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    {[10, 25, 50].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {getPageNumbers().map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      safeCurrentPage === num
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Security Audit Log</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Live Logs</span>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                    <Badge variant={log.level}>{log.level}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>{log.user_email}</span>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500">System Logs synchronized in real time.</span>
          </div>
        </div>
      </div>

      {/* Confirmation ActionModal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={() => setActionModal({ isOpen: false })}
        isDestructive={actionModal.isDestructive}
      />
    </div>
  );
}
