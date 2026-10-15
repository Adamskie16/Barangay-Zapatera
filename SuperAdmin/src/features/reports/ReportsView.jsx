import React, { useState, useEffect, useMemo } from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';
import PrintableReportModal from './PrintableReportModal';
import {
  exportToCSV,
  exportToJSON,
  buildApplicationsCSV,
  buildMonthlyCSV,
  buildRevenueAuditCSV,
  buildSummaryKPIsCSV,
} from './reportUtils';
import { StorageService } from '../../core/storage';
import {
  BarChart3,
  Download,
  Printer,
  PieChart,
  Users,
  DollarSign,
  FileCheck,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  Filter,
  Calendar,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

export default function ReportsView({
  requests = [],
  docTypes = [],
  users = [],
  config = {},
  currentUser = {},
}) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Table filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const currentYear = new Date().getFullYear();

  // Status Counts
  const statusCounts = useMemo(() => {
    return {
      pending: requests.filter((r) => {
        const s = String(r.status || 'pending').toLowerCase().trim();
        return s === 'pending';
      }).length,
      under_review: requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'under_review' || s === 'under review' || s === 'processing';
      }).length,
      approved: requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'approved' || s === 'ready_for_pickup';
      }).length,
      issued: requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'issued' || s === 'completed';
      }).length,
      declined: requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'declined' || s === 'rejected';
      }).length,
    };
  }, [requests]);

  // Monthly Processing Data
  const monthlyData = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return monthNames.map((monthName, idx) => {
      const monthRequests = requests.filter((r) => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        return d.getMonth() === idx;
      });

      const totalQuantity = monthRequests.length;
      const approvedQuantity = monthRequests.filter(
        (r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed'
      ).length;
      const pendingQuantity = monthRequests.filter(
        (r) => r.status === 'pending' || r.status === 'under_review'
      ).length;
      const declinedQuantity = monthRequests.filter(
        (r) => r.status === 'declined' || r.status === 'rejected'
      ).length;
      const revenue = monthRequests
        .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed')
        .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

      return {
        monthIndex: idx,
        monthName,
        totalQuantity,
        approvedQuantity,
        pendingQuantity,
        declinedQuantity,
        revenue,
      };
    });
  }, [requests]);

  // Document Type Counts & Revenue
  const docTypeCounts = useMemo(() => {
    return docTypes.map((dt) => {
      const matchedRequests = requests.filter(
        (r) => r.document_type_id === dt.id || r.document_title === dt.title
      );
      const approvedCount = matchedRequests.filter(
        (r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed'
      ).length;
      const pendingCount = matchedRequests.filter(
        (r) => r.status === 'pending' || r.status === 'under_review'
      ).length;
      const revenue = matchedRequests
        .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed')
        .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

      return {
        ...dt,
        request_count: matchedRequests.length,
        approved_count: approvedCount,
        pending_count: pendingCount,
        total_revenue: revenue,
      };
    });
  }, [docTypes, requests]);

  const totalRevenue = useMemo(() => {
    return requests
      .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed')
      .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
  }, [requests]);

  const totalResidents = useMemo(() => {
    return users.filter((u) => u.role === 'resident').length;
  }, [users]);

  // Filtered Requests for Table
  const filteredRequests = useMemo(() => {
    const now = new Date();
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== 'all') {
        const s = String(r.status || '').toLowerCase().trim();
        if (statusFilter === 'pending' && s !== 'pending') return false;
        if (statusFilter === 'under_review' && s !== 'under_review' && s !== 'under review') return false;
        if (statusFilter === 'approved' && s !== 'approved' && s !== 'ready_for_pickup') return false;
        if (statusFilter === 'issued' && s !== 'issued' && s !== 'completed') return false;
        if (statusFilter === 'declined' && s !== 'declined' && s !== 'rejected') return false;
      }

      // Document filter
      if (docFilter !== 'all') {
        if (r.document_title !== docFilter && r.document_type_id !== docFilter) return false;
      }

      // Date range filter
      if (dateRange !== 'all' && r.created_at) {
        const d = new Date(r.created_at);
        if (dateRange === 'today') {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateRange === 'this_month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRange === 'last_30_days') {
          const diffDays = (now - d) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = String(r.tracking_number || '').toLowerCase();
        const name = String(r.resident_name || '').toLowerCase();
        const doc = String(r.document_title || '').toLowerCase();
        if (!tracking.includes(q) && !name.includes(q) && !doc.includes(q)) return false;
      }

      return true;
    });
  }, [requests, statusFilter, docFilter, dateRange, searchQuery]);

  // Sorting & 10-Row Pagination Logic matching Document Requests & User Accounts
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, docFilter, dateRange, searchQuery, pageSize]);

  const handleSort = (columnKey) => {
    if (!columnKey) return;
    if (sortKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey('created_at');
        setSortDirection('desc');
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'created_at' || sortKey === 'updated_at') {
        const dateA = new Date(valA || 0).getTime();
        const dateB = new Date(valB || 0).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortKey === 'fee') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const cmp = String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRequests, sortKey, sortDirection]);

  const totalEntries = sortedRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);
  const paginatedRequests = sortedRequests.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Direct CSV / JSON Exports
  const handleExportFullSummaryCSV = () => {
    const rows = buildSummaryKPIsCSV({
      requests,
      statusCounts,
      totalRevenue,
      totalResidents,
      periodLabel: `Calendar Year ${currentYear}`,
    });
    exportToCSV(`Barangay_Zapatera_Executive_Summary_${currentYear}`, rows);
    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Executive Summary Report',
      feature: 'Reports & Analytics',
      details: `Exported Executive Summary Report (CSV) for Calendar Year ${currentYear}`,
      level: 'info',
    });
    setIsExportMenuOpen(false);
  };

  const handleExportApplicationsCSV = () => {
    const rows = buildApplicationsCSV(filteredRequests);
    exportToCSV(`Barangay_Zapatera_Applications_Pipeline_${currentYear}`, rows);
    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Applications Pipeline Report',
      feature: 'Reports & Analytics',
      details: `Exported Document Applications Pipeline Report (CSV) with ${filteredRequests.length} records`,
      level: 'info',
    });
    setIsExportMenuOpen(false);
  };

  const handleExportMonthlyCSV = () => {
    const rows = buildMonthlyCSV(monthlyData, currentYear);
    exportToCSV(`Barangay_Zapatera_Monthly_Processing_${currentYear}`, rows);
    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Monthly Processing Report',
      feature: 'Reports & Analytics',
      details: `Exported Monthly Processing & Financial Report (CSV) for ${currentYear}`,
      level: 'info',
    });
    setIsExportMenuOpen(false);
  };

  const handleExportDocAuditCSV = () => {
    const rows = buildRevenueAuditCSV(docTypeCounts, requests.length);
    exportToCSV(`Barangay_Zapatera_Document_Clearances_Audit_${currentYear}`, rows);
    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Document Clearance Audit Report',
      feature: 'Reports & Analytics',
      details: `Exported Document Clearances & Revenue Audit Report (CSV) for ${currentYear}`,
      level: 'info',
    });
    setIsExportMenuOpen(false);
  };

  const handleExportJSON = () => {
    const payload = {
      barangay: config.barangay_name || 'Barangay Zapatera',
      generated_at: new Date().toISOString(),
      generated_by: currentUser.full_name || currentUser.email || 'SuperAdmin',
      statistics: {
        total_received: requests.length,
        completed_issuances: statusCounts.approved + statusCounts.issued,
        total_revenue: totalRevenue,
        registered_residents: totalResidents,
        status_breakdown: statusCounts,
      },
      monthly_distribution: monthlyData,
      document_types: docTypeCounts,
      applications: filteredRequests,
    };
    exportToJSON(`Barangay_Zapatera_Comprehensive_Report_${currentYear}`, payload);
    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Comprehensive System Report',
      feature: 'Reports & Analytics',
      details: `Exported Comprehensive System Data Backup (JSON) with full issuance and financial metrics`,
      level: 'info',
    });
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Global Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Barangay System Reports & Analytics</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full">
              SuperAdmin Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Issuance metrics breakdown, document demand statistics, monthly quantities, revenue audit reports, and resident engagement.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Export to Downloads Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Export report summaries directly to Downloads"
            >
              <Download className="w-4 h-4" />
              <span>Export to Downloads</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Download Format
                  </p>
                </div>

                <button
                  onClick={handleExportFullSummaryCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Executive KPI Summary (CSV)</p>
                    <p className="text-[10px] text-slate-400">Total volume, revenue & rates</p>
                  </div>
                </button>

                <button
                  onClick={handleExportApplicationsCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-semibold">Applications Pipeline Log (CSV)</p>
                    <p className="text-[10px] text-slate-400">
                      {filteredRequests.length} record(s) matching filter
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleExportMonthlyCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-semibold">Monthly Quantities Log (CSV)</p>
                    <p className="text-[10px] text-slate-400">12-Month quantities & revenue</p>
                  </div>
                </button>

                <button
                  onClick={handleExportDocAuditCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="font-semibold">Document Clearances Audit (CSV)</p>
                    <p className="text-[10px] text-slate-400">Demand & fee collections</p>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <div>
                    <p className="font-semibold">Complete Audit Payload (JSON)</p>
                    <p className="text-[10px] text-slate-400">Raw structured data backup</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Print Formal Government Report Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Open printable official Barangay Zapatera document preview"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Applications Received" value={requests.length} icon={BarChart3} color="purple" />
        <StatCard
          title="Completed Issuances"
          value={statusCounts.approved + statusCounts.issued}
          icon={FileCheck}
          color="emerald"
        />
        <StatCard title="Total Revenue Generated" value={formatCurrency(totalRevenue)} icon={DollarSign} color="blue" />
        <StatCard title="Registered Residents" value={totalResidents} icon={Users} color="amber" />
      </div>

      {/* Dedicated Monthly Quantity Analytics Component */}
      <MonthlyAnalytics requests={requests} />

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Issuance Volume by Document Type</h3>
              <p className="text-[11px] text-slate-400">Clearances breakdown and fee audit ({currentYear})</p>
            </div>
            <button
              onClick={handleExportDocAuditCSV}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
              title="Download Document Clearance Breakdown CSV"
            >
              <Download className="w-3 h-3" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="space-y-4">
            {docTypeCounts.map((dt) => {
              const percentage = requests.length ? Math.round((dt.request_count / requests.length) * 100) : 0;
              return (
                <div key={dt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {dt.title} {dt.code ? `(${dt.code})` : ''}
                    </span>
                    <div className="space-x-2">
                      <span className="font-mono text-slate-600 font-semibold">{dt.request_count} reqs</span>
                      <span className="font-bold text-blue-600">{formatCurrency(dt.total_revenue)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Processing Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Request Status Pipeline</h3>
              <p className="text-[11px] text-slate-400">Current active workload across verification stages</p>
            </div>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <p className="text-2xl font-extrabold text-amber-700">{statusCounts.pending}</p>
              <p className="text-[11px] font-semibold uppercase text-amber-800 mt-1">Pending Queue</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <p className="text-2xl font-extrabold text-blue-700">{statusCounts.under_review}</p>
              <p className="text-[11px] font-semibold uppercase text-blue-800 mt-1">Under Verification</p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <p className="text-2xl font-extrabold text-emerald-700">{statusCounts.approved}</p>
              <p className="text-[11px] font-semibold uppercase text-emerald-800 mt-1">Approved & Ready</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <p className="text-2xl font-extrabold text-purple-700">{statusCounts.issued}</p>
              <p className="text-[11px] font-semibold uppercase text-purple-800 mt-1">Officially Issued</p>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center col-span-2 sm:col-span-1">
              <p className="text-2xl font-extrabold text-rose-700">{statusCounts.declined}</p>
              <p className="text-[11px] font-semibold uppercase text-rose-800 mt-1">Declined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Pipeline Log with Live Filtering & Section Export */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Table Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Applications Pipeline & Clearance Log</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full">
                {filteredRequests.length} of {requests.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive log of document requests across Barangay Zapatera residents.
            </p>
          </div>

          {/* Quick Export Button for Table */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportApplicationsCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Download currently filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Table CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking, resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Queue</option>
              <option value="under_review">Under Verification</option>
              <option value="approved">Approved & Ready</option>
              <option value="issued">Officially Issued</option>
              <option value="declined">Declined / Returned</option>
            </select>
          </div>

          {/* Document Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Document Types</option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.title}>
                  {dt.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
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
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('fee')}
                    className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none ml-auto"
                  >
                    <span>Fee</span>
                    {sortKey === 'fee' ? (
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
                    <span>Submission Date</span>
                    {sortKey === 'created_at' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('updated_at')}
                    className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Last Updated</span>
                    {sortKey === 'updated_at' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{r.tracking_number}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      <div>{r.resident_name || 'N/A'}</div>
                      {r.resident_email && (
                        <div className="text-[10px] text-slate-400 font-normal">{r.resident_email}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{r.document_title}</td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-700">
                      {formatCurrency(r.fee || 0)}
                    </td>
                    <td className="p-3">
                      <Badge variant={r.status}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-slate-500">
                      {r.created_at ? formatDate(r.created_at) : 'N/A'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {formatDate(r.updated_at || r.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No application records match your selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 10-Row Pagination Footer */}
        {totalEntries > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
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

              <div className="flex items-center space-x-1">
                {getPageNumbers().map((num, i) =>
                  num === '...' ? (
                    <span key={`dots-${i}`} className="px-2 py-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        safeCurrentPage === num
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>

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

      {/* Official Government Printable Report Modal */}
      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Official Barangay Operations & Verification Summary Report"
        config={config}
        currentUser={currentUser}
        requests={filteredRequests.length > 0 ? filteredRequests : requests}
        docTypes={docTypes}
        monthlyData={monthlyData}
        statusCounts={statusCounts}
        totalRevenue={totalRevenue}
        totalResidents={totalResidents}
        periodLabel={`Calendar Year ${currentYear}`}
      />
    </div>
  );
}
