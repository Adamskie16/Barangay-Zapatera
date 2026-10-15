// Treasurer/src/features/dashboard/TreasurerDashboardView.jsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Gift,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function TreasurerDashboardView({
  metrics = {},
  requests = [],
  docTypes = [],
  config = {},
  onRefresh,
  onNavigateToReports,
}) {
  // Sorting & Filtering State for Recent Document Payments Table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Process & filter payments
  const processedPayments = useMemo(() => {
    return requests.filter((req) => {
      const s = String(req.status || '').toLowerCase().trim();
      const isWaived = req.payment_status === 'waived' || req.is_waived === true;
      const isPaid = !isWaived && (
        req.payment_status === 'paid' ||
        req.is_paid === true ||
        s === 'released' ||
        s === 'completed' ||
        Boolean(req.is_claimed)
      );
      const isDeclined = s === 'declined' || s === 'rejected';
      const isUnpaid = !isPaid && !isWaived && !isDeclined;

      if (statusFilter === 'paid' && !isPaid) return false;
      if (statusFilter === 'unpaid' && !isUnpaid) return false;
      if (statusFilter === 'waived' && !isWaived) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const tracking = String(req.tracking_number || '').toLowerCase();
        const name = String(req.full_name || req.user_name || req.resident_name || '').toLowerCase();
        const doc = String(req.document_type || req.document_title || req.document_name || '').toLowerCase();
        const orNum = String(req.or_number || '').toLowerCase();
        return tracking.includes(query) || name.includes(query) || doc.includes(query) || orNum.includes(query);
      }

      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  // Sort payments
  const sortedPayments = useMemo(() => {
    return [...processedPayments].sort((a, b) => {
      let valA, valB;

      if (sortField === 'tracking') {
        valA = a.tracking_number || '';
        valB = b.tracking_number || '';
      } else if (sortField === 'name') {
        valA = a.full_name || a.user_name || a.resident_name || '';
        valB = b.full_name || b.user_name || b.resident_name || '';
      } else if (sortField === 'doc') {
        valA = a.document_type || a.document_name || '';
        valB = b.document_type || b.document_name || '';
      } else if (sortField === 'or') {
        valA = a.or_number || '';
        valB = b.or_number || '';
      } else if (sortField === 'fee') {
        valA = Number(a.fee ?? a.amount ?? 0);
        valB = Number(b.fee ?? b.amount ?? 0);
      } else if (sortField === 'status') {
        valA = a.payment_status || (a.is_paid ? 'paid' : 'unpaid');
        valB = b.payment_status || (b.is_paid ? 'paid' : 'unpaid');
      } else {
        // Date sort
        valA = new Date(a.payment_date || a.created_at || 0).getTime();
        valB = new Date(b.payment_date || b.created_at || 0).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedPayments, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage) || 1;
  const paginatedPayments = sortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Blue Header Banner matching Zapatera system theme */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Document Fee Collections & Treasury
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Monitor document fee collections, monthly processing volumes, official receipts, and financial transparency records for Barangay Zapatera.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Money Collected</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.totalRevenue || 0)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {metrics.paidCount || 0} Paid Requests
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Collections</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.todayRevenue || 0)}
            </h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Collected today
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month's Collections</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.thisMonthRevenue || 0)}
            </h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">
              Current month
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Free / Waived */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Free / Waived Requests</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {metrics.waivedCount || 0} Free
            </h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              {formatCurrency(metrics.waivedAmount || 0)} total waived
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Gift className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Monthly Processing Volume & Quantities Component */}
      <MonthlyAnalytics requests={requests} />

      {/* Grid: Fees Collected by Document Type & Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Breakdown by Document Type */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fees Collected by Document Type</h2>
              <p className="text-xs text-slate-500">Summary of payments received per document clearance</p>
            </div>
            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {metrics.breakdownList && metrics.breakdownList.length > 0 ? (
              metrics.breakdownList.map((item, idx) => {
                const percentage = metrics.totalRevenue > 0
                  ? Math.round((item.totalRevenue / metrics.totalRevenue) * 100)
                  : 0;

                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <span className="font-black text-slate-900">{formatCurrency(item.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.paidTransactions} of {item.totalTransactions} paid requests</span>
                      <span className="font-semibold text-blue-700">{percentage}% of total</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No payment records found yet.</p>
            )}
          </div>
        </div>

        {/* Right Col: Payment Status Summary & Action */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Payment Status Summary</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time audit breakdown of collected document clearance fees across all active requests.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
                <span className="font-medium">Paid Documents</span>
                <span className="font-black">{metrics.paidCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-between">
                <span className="font-medium">Waiting for Payment</span>
                <span className="font-black">{metrics.unpaidCount || 0} ({formatCurrency(metrics.unpaidAmount || 0)})</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center justify-between">
                <span className="font-medium">Free / Waived Requests</span>
                <span className="font-black">{metrics.waivedCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>View Financial Reports</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Document Payments: Sorted, Filtered Table with No Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Document Payments</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive ledger of document clearance requests and payment records
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tracking, resident, OR#..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-52 sm:w-64"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'paid', label: 'Paid' },
                { id: 'unpaid', label: 'Unpaid' },
                { id: 'waived', label: 'Waived' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setStatusFilter(filter.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    statusFilter === filter.id
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Rows Per Page Filter */}
            <div className="flex items-center space-x-1.5 text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <span className="text-slate-500 font-semibold">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={5}>5 rows</option>
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sortable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[10px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('tracking')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tracking Number</span>
                    {renderSortIndicator('tracking')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Resident Name</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('doc')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Document Type</span>
                    {renderSortIndicator('doc')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('or')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Official Receipt (OR#)</span>
                    {renderSortIndicator('or')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Payment / Issued Date</span>
                    {renderSortIndicator('date')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fee')}
                  className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Fee (PHP)</span>
                    {renderSortIndicator('fee')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Payment Status</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPayments.length > 0 ? (
                paginatedPayments.map((req, idx) => {
                  let fee = Number(req.fee ?? req.amount ?? req.amount_paid ?? 0);
                  if (fee === 0 && docTypes?.length) {
                    const match = docTypes.find((d) => d.id === req.document_type_id || d.title === req.document_type || d.title === req.document_title);
                    if (match && Number(match.fee) > 0) fee = Number(match.fee);
                  }
                  const s = String(req.status || '').toLowerCase().trim();
                  const isWaived = req.payment_status === 'waived' || req.is_waived === true;
                  const isPaid = !isWaived && (
                    req.payment_status === 'paid' ||
                    req.is_paid === true ||
                    s === 'released' ||
                    s === 'completed' ||
                    Boolean(req.is_claimed)
                  );

                  return (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {req.tracking_number || `BZ-REQ-${String(req.id || idx).slice(0, 6)}`}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {req.full_name || req.user_name || req.resident_name || 'Resident Account'}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                          {req.document_type || req.document_name || 'Barangay Clearance'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {req.or_number ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {req.or_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unissued</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {formatDate(req.payment_date || req.created_at)}
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-slate-900">
                        {formatCurrency(fee)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : isWaived
                              ? 'bg-purple-50 text-purple-800 border border-purple-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid</span>
                            </>
                          ) : isWaived ? (
                            <>
                              <Gift className="w-3 h-3 text-purple-600" />
                              <span>Free (Waived)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Unpaid</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No document payment transactions found</p>
                    <p className="text-[11px] mt-1">Try adjusting your search query or status filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count Footer */}
        {sortedPayments.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 text-xs">
            <div className="flex items-center flex-wrap gap-3">
              <span className="text-slate-500">
                Showing <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * itemsPerPage, sortedPayments.length)}
                </span>{' '}
                of <span className="font-bold text-slate-800">{sortedPayments.length}</span> payments
              </span>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-2 border-l border-slate-200">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1 self-center md:self-auto">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((p, idx) => (
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                  title="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
