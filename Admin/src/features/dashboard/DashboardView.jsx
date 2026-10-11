// Admin/src/features/dashboard/DashboardView.jsx
import React, { useState, useMemo } from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  Inbox,
  CheckSquare,
  FileCheck2,
  Clock,
  Activity,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
} from 'lucide-react';
import { formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function DashboardView({ requests = [], events = [], logs = [], setActiveTab }) {
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const reviewRequests = requests.filter((r) => r.status === 'under_review');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const issuedRequests = requests.filter((r) => r.status === 'issued');

  // Search, Filter, Sort & 10-Row Pagination State for Incoming Applications Queue
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    let result = [...requests];

    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        const s = String(r.status || 'pending').toLowerCase().trim();
        if (statusFilter === 'pending') return s === 'pending';
        if (statusFilter === 'under_review') {
          return s === 'under_review' || s === 'under review' || s === 'processing';
        }
        if (statusFilter === 'approved') return s === 'approved' || s === 'ready_for_pickup';
        if (statusFilter === 'issued') return s === 'issued' || s === 'completed';
        if (statusFilter === 'declined') return s === 'declined' || s === 'rejected';
        return s === statusFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const tracking = String(r.tracking_number || '').toLowerCase();
        const name = String(r.resident_name || '').toLowerCase();
        const doc = String(r.document_title || '').toLowerCase();
        return tracking.includes(q) || name.includes(q) || doc.includes(q);
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
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <CheckSquare className="w-3.5 h-3.5 mr-1" /> Barangay Admin Desk
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">Barangay Zapatera Document Desk</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Review resident applications, check requirements, approve documents, and issue official certificates.
          </p>
        </div>

        <div className="hidden sm:flex space-x-3">
          <button
            onClick={() => setActiveTab('receive_request')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            Open Request Inbox ({pendingRequests.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="New Requests Inbox"
          value={pendingRequests.length}
          icon={Inbox}
          color="amber"
          subtitle="Waiting for review"
        />
        <StatCard
          title="Under Review"
          value={reviewRequests.length}
          icon={Clock}
          color="blue"
          subtitle="Checking IDs and requirements"
        />
        <StatCard
          title="Ready for Pickup"
          value={approvedRequests.length}
          icon={CheckSquare}
          color="emerald"
          subtitle="Approved certificates"
        />
        <StatCard
          title="Issued Documents"
          value={issuedRequests.length}
          icon={FileCheck2}
          color="purple"
          subtitle="Claimed by residents"
        />
      </div>

      {/* Monthly Analytics Widget */}
      <MonthlyAnalytics requests={requests} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incoming Applications Queue Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Incoming Applications Queue</h3>
                <p className="text-xs text-slate-500">Document requests submitted by residents waiting for review</p>
              </div>
              <button
                onClick={() => setActiveTab('receive_request')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer self-start sm:self-auto"
              >
                View All Queue &rarr;
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tracking, resident, or document..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Statuses ({requests.length})</option>
                  <option value="pending">Pending ({pendingRequests.length})</option>
                  <option value="under_review">Under Review ({reviewRequests.length})</option>
                  <option value="approved">Ready for Pickup ({approvedRequests.length})</option>
                  <option value="issued">Issued ({issuedRequests.length})</option>
                </select>
              </div>
            </div>

            {/* Table */}
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
                        <span>Applicant Name</span>
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
                        <span>Document Requested</span>
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
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => (
                      <tr key={req.id || req.tracking_number} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {req.tracking_number}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{req.resident_name}</p>
                          {req.purpose && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{req.purpose}</p>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {req.document_title}
                        </td>
                        <td className="p-3">
                          <Badge variant={req.status}>{req.status?.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveTab('process_documents')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Verify</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No applications found in the queue.
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

        {/* Operational Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Recent Activity Logs</h3>
              </div>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                    <Badge variant={log.level}>{log.level}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">Barangay Zapatera Document Issuance System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
