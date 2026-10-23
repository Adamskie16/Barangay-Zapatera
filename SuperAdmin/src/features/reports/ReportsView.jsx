import React, { useState, useMemo } from 'react';
import Badge from '../../components/Badge';
import PrintableReportModal from './PrintableReportModal';
import {
  exportToCSV,
  exportToJSON,
  downloadReportAsPDF,
  buildApplicationsCSV,
  buildMonthlyCSV,
  buildRevenueAuditCSV,
  buildSummaryKPIsCSV,
  generatePrintableHTML,
} from './reportUtils';
import {
  BarChart3,
  Download,
  Printer,
  PieChart as PieChartIcon,
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

const DONUT_COLORS = ['#10b981', '#3b5bfd', '#f59e0b', '#06b6d4', '#f43f5e'];

export default function ReportsView({
  requests = [],
  docTypes = [],
  users = [],
  config = {},
  currentUser = {},
}) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Interactive Chart Mode States
  const [monthlyViewMode, setMonthlyViewMode] = useState('area'); // 'area' | 'bar' | 'table'
  const [docBreakdownTab, setDocBreakdownTab] = useState('volume'); // 'volume' | 'status' | 'table'

  // Table filters for applications pipeline
  const [statusFilter, setStatusFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');

  // Issuance Volume by Document Type Table & Filter States
  const [docTypeSearch, setDocTypeSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all'); // 'all' | 'with_volume' | 'paid' | 'free'
  const [docTypeSort, setDocTypeSort] = useState('volume_desc'); // 'volume_desc' | 'volume_asc' | 'revenue_desc' | 'name_asc' | 'fee_desc'
  const [docTypePage, setDocTypePage] = useState(1);
  const [docTypePageSize, setDocTypePageSize] = useState(5);

  // Document Requests Audit Registry Pagination & Sorting
  const [auditSortKey, setAuditSortKey] = useState('created_at');
  const [auditSortDir, setAuditSortDir] = useState('desc');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(8);

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

  // Helper to resolve actual fee or claimed fee for a request
  const getRequestRevenue = (r) => {
    if (r.claimed_fee !== undefined && r.claimed_fee !== null && !isNaN(Number(r.claimed_fee))) {
      return Number(r.claimed_fee);
    }
    if (r.amount_paid !== undefined && r.amount_paid !== null && !isNaN(Number(r.amount_paid))) {
      return Number(r.amount_paid);
    }
    return Number(r.fee) || 0;
  };

  // Monthly Processing Data
  const monthlyData = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((monthName, idx) => {
      const monthRequests = requests.filter((r) => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        return d.getMonth() === idx;
      });

      const totalQuantity = monthRequests.length;
      const approvedQuantity = monthRequests.filter(
        (r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed
      ).length;
      const pendingQuantity = monthRequests.filter(
        (r) => r.status === 'pending' || r.status === 'under_review'
      ).length;
      const declinedQuantity = monthRequests.filter(
        (r) => r.status === 'declined' || r.status === 'rejected'
      ).length;
      const revenue = monthRequests
        .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed)
        .reduce((sum, r) => sum + getRequestRevenue(r), 0);

      return {
        monthIndex: idx,
        monthName,
        shortMonth: shortNames[idx],
        totalQuantity,
        approvedQuantity,
        pendingQuantity,
        declinedQuantity,
        revenue,
      };
    });
  }, [requests]);

  // Sparkline data for KPI cards (last 6 active or recent months)
  const sparklineData = useMemo(() => {
    const currentMonthIdx = new Date().getMonth();
    const slice = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      slice.push({
        name: monthlyData[idx]?.shortMonth || '',
        requests: monthlyData[idx]?.totalQuantity || 0,
        completed: monthlyData[idx]?.approvedQuantity || 0,
        revenue: monthlyData[idx]?.revenue || 0,
      });
    }
    return slice;
  }, [monthlyData]);

  // Helper to generate SVG sparkline path & area from array of values
  const buildSparklinePaths = (values, width = 180, height = 42) => {
    if (!values || values.length === 0) return { line: '', area: '' };
    const maxVal = Math.max(...values, 1);
    const stepX = width / Math.max(values.length - 1, 1);
    const pts = values.map((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(height - 6 - (v / maxVal) * (height - 14));
      return { x, y };
    });
    const line = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`;
    return { line, area };
  };

  // Document Type Counts & Revenue
  const docTypeCounts = useMemo(() => {
    return docTypes.map((dt) => {
      const matchedRequests = requests.filter(
        (r) => r.document_type_id === dt.id || r.document_title === dt.title
      );
      const approvedCount = matchedRequests.filter(
        (r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed
      ).length;
      const pendingCount = matchedRequests.filter(
        (r) => r.status === 'pending' || r.status === 'under_review' || r.status === 'under review' || r.status === 'processing'
      ).length;
      const declinedCount = matchedRequests.filter(
        (r) => r.status === 'declined' || r.status === 'rejected'
      ).length;
      const revenue = matchedRequests
        .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed)
        .reduce((sum, r) => sum + getRequestRevenue(r), 0);

      const totalReqs = matchedRequests.length;
      const sharePercentage = requests.length ? Math.round((totalReqs / requests.length) * 100) : 0;

      return {
        ...dt,
        request_count: totalReqs,
        approved_count: approvedCount,
        pending_count: pendingCount,
        declined_count: declinedCount,
        total_revenue: revenue,
        share_percentage: sharePercentage,
      };
    });
  }, [docTypes, requests]);

  // Filtered & Sorted Document Types for Table View
  const filteredDocTypeCounts = useMemo(() => {
    const result = docTypeCounts.filter((dt) => {
      if (docTypeSearch.trim()) {
        const q = docTypeSearch.toLowerCase().trim();
        const titleMatch = (dt.title || '').toLowerCase().includes(q);
        const codeMatch = (dt.code || '').toLowerCase().includes(q);
        if (!titleMatch && !codeMatch) return false;
      }
      if (docTypeFilter === 'with_volume' && dt.request_count === 0) return false;
      if (docTypeFilter === 'paid' && (!dt.fee || Number(dt.fee) <= 0)) return false;
      if (docTypeFilter === 'free' && Number(dt.fee) > 0) return false;
      return true;
    });

    result.sort((a, b) => {
      if (docTypeSort === 'volume_desc') return b.request_count - a.request_count;
      if (docTypeSort === 'volume_asc') return a.request_count - b.request_count;
      if (docTypeSort === 'revenue_desc') return b.total_revenue - a.total_revenue;
      if (docTypeSort === 'name_asc') return (a.title || '').localeCompare(b.title || '');
      if (docTypeSort === 'fee_desc') return (Number(b.fee) || 0) - (Number(a.fee) || 0);
      return 0;
    });

    return result;
  }, [docTypeCounts, docTypeSearch, docTypeFilter, docTypeSort]);

  const docTypeTotalPages =
    docTypePageSize === 'all'
      ? 1
      : Math.max(1, Math.ceil(filteredDocTypeCounts.length / Number(docTypePageSize)));
  const safeDocTypePage = Math.min(Math.max(1, docTypePage), docTypeTotalPages);
  const paginatedDocTypeCounts =
    docTypePageSize === 'all'
      ? filteredDocTypeCounts
      : filteredDocTypeCounts.slice(
          (safeDocTypePage - 1) * Number(docTypePageSize),
          safeDocTypePage * Number(docTypePageSize)
        );

  const docTypeTotals = useMemo(() => {
    return filteredDocTypeCounts.reduce(
      (acc, dt) => ({
        requests: acc.requests + dt.request_count,
        approved: acc.approved + dt.approved_count,
        pending: acc.pending + dt.pending_count,
        declined: acc.declined + (dt.declined_count || 0),
        revenue: acc.revenue + dt.total_revenue,
      }),
      { requests: 0, approved: 0, pending: 0, declined: 0, revenue: 0 }
    );
  }, [filteredDocTypeCounts]);

  const totalRevenue = useMemo(() => {
    return requests
      .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed)
      .reduce((sum, r) => sum + getRequestRevenue(r), 0);
  }, [requests]);

  const totalResidents = useMemo(() => {
    return users.filter((u) => u.role === 'resident').length;
  }, [users]);

  const completedCount = statusCounts.approved + statusCounts.issued;
  const fulfillmentRate = requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0;

  // Status Distribution Donut Data
  const statusChartData = useMemo(() => {
    return [
      { name: 'Issued / Completed', value: statusCounts.issued, color: DONUT_COLORS[0] },
      { name: 'Approved / Ready', value: statusCounts.approved, color: DONUT_COLORS[1] },
      { name: 'Pending Queue', value: statusCounts.pending, color: DONUT_COLORS[2] },
      { name: 'Under Review', value: statusCounts.under_review, color: DONUT_COLORS[3] },
      { name: 'Declined', value: statusCounts.declined, color: DONUT_COLORS[4] },
    ].filter((d) => d.value > 0);
  }, [statusCounts]);

  // Filtered Requests for Table
  const filteredRequests = useMemo(() => {
    const now = new Date();
    return requests.filter((r) => {
      if (statusFilter !== 'all') {
        const s = String(r.status || '').toLowerCase().trim();
        if (statusFilter === 'pending' && s !== 'pending') return false;
        if (
          statusFilter === 'under_review' &&
          s !== 'under_review' &&
          s !== 'under review' &&
          s !== 'processing'
        )
          return false;
        if (statusFilter === 'approved' && s !== 'approved' && s !== 'ready_for_pickup') return false;
        if (statusFilter === 'issued' && s !== 'issued' && s !== 'completed') return false;
        if (statusFilter === 'declined' && s !== 'declined' && s !== 'rejected') return false;
      }

      if (docFilter !== 'all') {
        if (r.document_type_id !== docFilter && r.document_title !== docFilter) return false;
      }

      if (dateRange !== 'all' && r.created_at) {
        const createdDate = new Date(r.created_at);
        const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        if (dateRange === '7d' && diffDays > 7) return false;
        if (dateRange === '30d' && diffDays > 30) return false;
        if (dateRange === 'this_month' && createdDate.getMonth() !== now.getMonth()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTracking = (r.tracking_number || '').toLowerCase().includes(q);
        const matchName = (r.resident_name || '').toLowerCase().includes(q);
        const matchDoc = (r.document_title || '').toLowerCase().includes(q);
        const matchPurpose = (r.purpose || '').toLowerCase().includes(q);
        if (!matchTracking && !matchName && !matchDoc && !matchPurpose) return false;
      }

      return true;
    });
  }, [requests, statusFilter, docFilter, dateRange, searchQuery]);

  // Sort & Paginate Audit Requests
  const sortedAuditRequests = useMemo(() => {
    const arr = [...filteredRequests];
    arr.sort((a, b) => {
      let valA = a[auditSortKey];
      let valB = b[auditSortKey];

      if (auditSortKey === 'created_at') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (auditSortKey === 'fee') {
        valA = getRequestRevenue(a);
        valB = getRequestRevenue(b);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return auditSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return auditSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRequests, auditSortKey, auditSortDir]);

  const auditTotalPages = Math.max(1, Math.ceil(sortedAuditRequests.length / auditPageSize));
  const safeAuditPage = Math.min(Math.max(1, auditPage), auditTotalPages);
  const paginatedAuditRequests = useMemo(() => {
    const start = (safeAuditPage - 1) * auditPageSize;
    return sortedAuditRequests.slice(start, start + auditPageSize);
  }, [sortedAuditRequests, safeAuditPage, auditPageSize]);

  const handleAuditSort = (key) => {
    if (auditSortKey === key) {
      setAuditSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAuditSortKey(key);
      setAuditSortDir('asc');
    }
  };

  // Export Handlers
  const handleExportApplicationsCSV = () => {
    const csvData = buildApplicationsCSV(filteredRequests);
    exportToCSV(csvData, 'Barangay_Zapatera_Document_Requests_Report');
    setIsExportMenuOpen(false);
  };

  const handleExportMonthlyCSV = () => {
    const csvData = buildMonthlyCSV(monthlyData, currentYear);
    exportToCSV(csvData, `Barangay_Zapatera_Monthly_Summary_${currentYear}`);
    setIsExportMenuOpen(false);
  };

  const handleExportRevenueAuditCSV = () => {
    const csvData = buildRevenueAuditCSV(docTypeCounts);
    exportToCSV(csvData, 'Barangay_Zapatera_Document_Type_Revenue_Audit');
    setIsExportMenuOpen(false);
  };

  const handleExportSummaryKPIsCSV = () => {
    const csvData = buildSummaryKPIsCSV({
      totalRequests: requests.length,
      completedCount,
      pendingCount: statusCounts.pending + statusCounts.under_review,
      declinedCount: statusCounts.declined,
      totalRevenue,
      totalResidents,
      year: currentYear,
    });
    exportToCSV(csvData, 'Barangay_Zapatera_Executive_KPI_Summary');
    setIsExportMenuOpen(false);
  };

  const handleExportFullJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      barangay: config.barangay_name || 'Barangay Zapatera',
      city: config.city_municipality || 'Cebu City',
      summary: {
        totalRequests: requests.length,
        statusCounts,
        totalRevenue,
        totalResidents,
      },
      monthlyAnalytics: monthlyData,
      documentBreakdown: docTypeCounts,
      applications: filteredRequests,
    };
    exportToJSON(payload, 'Barangay_Zapatera_Full_Analytics_Backup');
    setIsExportMenuOpen(false);
  };

  const handleDirectPDFDownload = () => {
    const htmlContent = generatePrintableHTML({
      config,
      currentUser,
      requests: filteredRequests,
      docTypeCounts,
      monthlyData,
      statusCounts,
      totalRevenue,
      totalResidents,
      year: currentYear,
      reportTitle: 'Official Executive Analytics & Accomplishment Report',
      sections: {
        kpis: true,
        statusBreakdown: true,
        monthlyTable: true,
        docTypeBreakdown: true,
        applicationsList: true,
        signatories: true,
      },
    });
    downloadReportAsPDF(htmlContent, `Barangay_Zapatera_Official_Report_${currentYear}`);
    setIsExportMenuOpen(false);
  };

  // Precomputed Sparklines
  const reqSpark = buildSparklinePaths(sparklineData.map((d) => d.requests));
  const compSpark = buildSparklinePaths(sparklineData.map((d) => d.completed));
  const revSpark = buildSparklinePaths(sparklineData.map((d) => d.revenue));
  const resSpark = buildSparklinePaths(sparklineData.map((d, idx) => Math.max(1, totalResidents - (5 - idx))));

  // Monthly SVG chart geometry
  const maxMonthlyVal = Math.max(...monthlyData.map((m) => Math.max(m.totalQuantity, m.approvedQuantity)), 4);

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Intelligence & Analytics</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            System Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Comprehensive service fulfillment metrics, revenue collection audits, and official LGU accomplishment reports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#3b5bfd]" />
              <span>Export Dataset</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isExportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-[22px] shadow-xl border border-slate-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Spreadsheet Exports (CSV / Excel)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportApplicationsCSV}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Applications Log (.CSV)</p>
                      <p className="text-[10px] text-slate-400">
                        Export {filteredRequests.length} filtered document requests
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthlyCSV}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Monthly Volume & Revenue (.CSV)</p>
                      <p className="text-[10px] text-slate-400">
                        Jan–Dec {currentYear} processing breakdown
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportRevenueAuditCSV}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Document Type Revenue Audit (.CSV)</p>
                      <p className="text-[10px] text-slate-400">
                        Volume & collections per certificate type
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSummaryKPIsCSV}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Executive KPI Summary (.CSV)</p>
                      <p className="text-[10px] text-slate-400">High-level metrics & status totals</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-4 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Document & System Formats
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDirectPDFDownload}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Download Official Report (PDF)</p>
                      <p className="text-[10px] text-slate-400">Formatted LGU report with signatories</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportFullJSON}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f4f7fb] flex items-center space-x-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Full Analytics Backup (.JSON)</p>
                      <p className="text-[10px] text-slate-400">Raw structured data for archiving</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Open Printable Report Studio Modal */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF Studio</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): 2x2 Gradient KPI Cards + Document Demand & Status Donut */}
        <div className="xl:col-span-5 space-y-6">
          {/* 2x2 Gradient KPI Cards with Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Total Requests */}
            <div className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 transition-transform hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-[#0284c7]" />
                </div>
                <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  All-Time Volume
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight">{requests.length}</p>
                <p className="text-xs font-semibold text-white/90 mt-0.5">Total Document Requests</p>
              </div>
              <div className="mt-3 h-11 -mx-2">
                <svg viewBox="0 0 180 42" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="saSparkReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={reqSpark.area} fill="url(#saSparkReq)" />
                  <path d={reqSpark.line} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Completed & Issued */}
            <div className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 transition-transform hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <FileCheck className="w-5 h-5 text-[#059669]" />
                </div>
                <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  {fulfillmentRate}% Fulfilled
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight">{completedCount}</p>
                <p className="text-xs font-semibold text-white/90 mt-0.5">Completed & Issued</p>
              </div>
              <div className="mt-3 h-11 -mx-2">
                <svg viewBox="0 0 180 42" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="saSparkComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={compSpark.area} fill="url(#saSparkComp)" />
                  <path d={compSpark.line} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Total Revenue */}
            <div className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] shadow-amber-500/15 transition-transform hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-[#ea580c]" />
                </div>
                <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  Verified Fees
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs font-semibold text-white/90 mt-0.5">Total Fees Collected</p>
              </div>
              <div className="mt-3 h-11 -mx-2">
                <svg viewBox="0 0 180 42" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="saSparkRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={revSpark.area} fill="url(#saSparkRev)" />
                  <path d={revSpark.line} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: Registered Residents */}
            <div className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 transition-transform hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-[#4f46e5]" />
                </div>
                <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  Active Directory
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight">{totalResidents}</p>
                <p className="text-xs font-semibold text-white/90 mt-0.5">Registered Residents</p>
              </div>
              <div className="mt-3 h-11 -mx-2">
                <svg viewBox="0 0 180 42" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="saSparkRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity="0.45" />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={resSpark.area} fill="url(#saSparkRes)" />
                  <path d={resSpark.line} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Document Demand & Status Breakdown Card */}
          <div className="bg-white rounded-[26px] p-6 border border-slate-100/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Document Breakdown</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Service demand & status distribution
                </p>
              </div>

              {/* Pill Switcher */}
              <div className="inline-flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/60 self-start">
                {[
                  { id: 'volume', label: 'Demand' },
                  { id: 'status', label: 'Status' },
                  { id: 'table', label: 'Audit Table' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDocBreakdownTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      docBreakdownTab === tab.id
                        ? 'bg-[#3b5bfd] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab 1: Demand Progress Bars */}
            {docBreakdownTab === 'volume' && (
              <div className="space-y-4">
                <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                  {docTypeCounts.slice(0, 6).map((dt, idx) => {
                    const barColors = [
                      'from-[#3b5bfd] to-[#38bdf8]',
                      'from-[#10b981] to-[#34d399]',
                      'from-[#f59e0b] to-[#fbbf24]',
                      'from-[#6366f1] to-[#818cf8]',
                      'from-[#ec4899] to-[#f472b6]',
                      'from-[#06b6d4] to-[#22d3ee]',
                    ];
                    return (
                      <div key={dt.id || idx} className="p-3.5 rounded-2xl bg-[#f4f7fb]/70 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 truncate">{dt.title}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Fee: {Number(dt.fee) > 0 ? formatCurrency(dt.fee) : 'Free'} • Collected:{' '}
                              <span className="text-emerald-600 font-bold">{formatCurrency(dt.total_revenue)}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-slate-900">
                              {dt.request_count} reqs
                            </span>
                            <span className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#3b5bfd] border border-blue-100">
                              {dt.share_percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                          <div
                            className={`bg-linear-to-r ${barColors[idx % barColors.length]} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(dt.share_percentage, dt.request_count > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Status Donut Chart (Pure SVG) */}
            {docBreakdownTab === 'status' && (
              <div className="space-y-4">
                <div className="h-52 relative flex items-center justify-center">
                  {statusChartData.length > 0 ? (
                    <svg viewBox="0 0 200 200" className="w-48 h-48 -rotate-90">
                      <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f5f9" strokeWidth="22" />
                      {(() => {
                        const circumference = 2 * Math.PI * 70;
                        let offset = 0;
                        return statusChartData.map((entry, index) => {
                          const frac = requests.length > 0 ? entry.value / requests.length : 0;
                          const dash = frac * circumference;
                          const circle = (
                            <circle
                              key={`slice-${index}`}
                              cx="100"
                              cy="100"
                              r="70"
                              fill="none"
                              stroke={entry.color}
                              strokeWidth="22"
                              strokeDasharray={`${dash} ${circumference - dash}`}
                              strokeDashoffset={-offset}
                              strokeLinecap="round"
                            />
                          );
                          offset += dash;
                          return circle;
                        });
                      })()}
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400 font-semibold">
                      No status data available
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900">{requests.length}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Requests
                    </span>
                  </div>
                </div>

                {/* Status Legend Pills */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Issued / Completed', count: statusCounts.issued, color: 'bg-emerald-500' },
                    { label: 'Approved / Ready', count: statusCounts.approved, color: 'bg-[#3b5bfd]' },
                    { label: 'Pending Queue', count: statusCounts.pending, color: 'bg-amber-500' },
                    { label: 'Under Review', count: statusCounts.under_review, color: 'bg-cyan-500' },
                    { label: 'Declined', count: statusCounts.declined, color: 'bg-rose-500' },
                  ].map((st) => {
                    const pct = requests.length ? Math.round((st.count / requests.length) * 100) : 0;
                    return (
                      <div
                        key={st.label}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-[#f4f7fb] border border-slate-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.color}`} />
                          <span className="text-[11px] font-bold text-slate-600 truncate">{st.label}</span>
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 ml-1">
                          {st.count}{' '}
                          <span className="text-[10px] text-slate-400 font-semibold">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Compact Audit Table */}
            {docBreakdownTab === 'table' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={docTypeSearch}
                      onChange={(e) => {
                        setDocTypeSearch(e.target.value);
                        setDocTypePage(1);
                      }}
                      placeholder="Filter certificate..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f7fb] rounded-full border border-slate-200/70 focus:outline-none focus:border-[#3b5bfd]"
                    />
                  </div>
                  <select
                    value={docTypeFilter}
                    onChange={(e) => {
                      setDocTypeFilter(e.target.value);
                      setDocTypePage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-[#f4f7fb] rounded-full border border-slate-200/70 text-slate-700 cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="with_volume">With Requests</option>
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f4f7fb] text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-2.5 px-3">Certificate</th>
                        <th className="py-2.5 px-2 text-center">Reqs</th>
                        <th className="py-2.5 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedDocTypeCounts.map((dt) => (
                        <tr key={dt.id || dt.code} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800 truncate max-w-[170px]">{dt.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {Number(dt.fee) > 0 ? formatCurrency(dt.fee) : 'Free'}
                            </p>
                          </td>
                          <td className="py-2.5 px-2 text-center font-extrabold text-slate-800">
                            {dt.request_count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                            {formatCurrency(dt.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {docTypeTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Page {safeDocTypePage} of {docTypeTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDocTypePage((p) => Math.max(1, p - 1))}
                        disabled={safeDocTypePage === 1}
                        className="w-7 h-7 rounded-full bg-[#f4f7fb] flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocTypePage((p) => Math.min(docTypeTotalPages, p + 1))}
                        disabled={safeDocTypePage === docTypeTotalPages}
                        className="w-7 h-7 rounded-full bg-[#f4f7fb] flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Monthly Analytics Chart + Performance Summary Cards */}
        <div className="xl:col-span-7 space-y-6">
          {/* Monthly Processing & Revenue Analytics Card */}
          <div className="bg-white rounded-[26px] p-6 border border-slate-100/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Monthly Processing Volume ({currentYear})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Comparison of total submitted requests vs. fulfilled certificates across Jan–Dec
                </p>
              </div>

              {/* View Switcher: Area | Bar | Table */}
              <div className="inline-flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/60 self-start">
                {[
                  { id: 'area', label: 'Area Trend' },
                  { id: 'bar', label: 'Bar Chart' },
                  { id: 'table', label: 'Monthly Table' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setMonthlyViewMode(mode.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      monthlyViewMode === mode.id
                        ? 'bg-[#3b5bfd] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend Strip */}
            {monthlyViewMode !== 'table' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#3b5bfd]" />
                    <span className="text-xs font-bold text-slate-600">Total Requests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
                    <span className="text-xs font-bold text-slate-600">Approved & Issued</span>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Annual Collection:{' '}
                  <span className="text-emerald-600 font-extrabold">{formatCurrency(totalRevenue)}</span>
                </div>
              </div>
            )}

            {/* Pure SVG Area Chart */}
            {monthlyViewMode === 'area' && (
              <div className="h-[310px] w-full pt-2 flex flex-col justify-between">
                <svg viewBox="0 0 660 240" className="w-full h-56 overflow-visible">
                  <defs>
                    <linearGradient id="saAreaTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b5bfd" stopOpacity="0.28" />
                      <stop offset="95%" stopColor="#3b5bfd" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="saAreaApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity="0.28" />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const y = Math.round(20 + t * 190);
                    const val = Math.round(maxMonthlyVal * (1 - t));
                    return (
                      <g key={i}>
                        <line x1="34" y1={y} x2="645" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                        <text x="26" y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-bold">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {(() => {
                    const stepX = (645 - 45) / 11;
                    const totalPts = monthlyData.map((m, idx) => ({
                      x: Math.round(45 + idx * stepX),
                      y: Math.round(210 - (m.totalQuantity / maxMonthlyVal) * 190),
                      val: m.totalQuantity,
                    }));
                    const appPts = monthlyData.map((m, idx) => ({
                      x: Math.round(45 + idx * stepX),
                      y: Math.round(210 - (m.approvedQuantity / maxMonthlyVal) * 190),
                      val: m.approvedQuantity,
                    }));

                    const totalLine = totalPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const totalArea = `${totalLine} L ${totalPts[11].x} 210 L ${totalPts[0].x} 210 Z`;

                    const appLine = appPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const appArea = `${appLine} L ${appPts[11].x} 210 L ${appPts[0].x} 210 Z`;

                    return (
                      <>
                        <path d={totalArea} fill="url(#saAreaTotal)" />
                        <path d={appArea} fill="url(#saAreaApproved)" />
                        <path d={totalLine} fill="none" stroke="#3b5bfd" strokeWidth="3" strokeLinecap="round" />
                        <path d={appLine} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                        {totalPts.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#3b5bfd" strokeWidth="2.5" />
                            <circle cx={appPts[i].x} cy={appPts[i].y} r="3.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                <div className="grid grid-cols-12 gap-1 pl-8 pr-2">
                  {monthlyData.map((m) => (
                    <div key={m.shortMonth} className="text-center">
                      <p className="text-[11px] font-bold text-slate-400">{m.shortMonth}</p>
                      <p className="text-[10px] font-extrabold text-slate-700">{m.totalQuantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pure SVG / Flex Bar Chart */}
            {monthlyViewMode === 'bar' && (
              <div className="h-[310px] w-full pt-4 flex flex-col justify-end">
                <div className="grid grid-cols-12 gap-2 items-end h-60 px-2 border-b border-slate-100 pb-2">
                  {monthlyData.map((m) => {
                    const totalH = Math.max(Math.round((m.totalQuantity / maxMonthlyVal) * 100), m.totalQuantity > 0 ? 8 : 2);
                    const appH = Math.max(Math.round((m.approvedQuantity / maxMonthlyVal) * 100), m.approvedQuantity > 0 ? 8 : 2);
                    return (
                      <div key={m.shortMonth} className="flex flex-col items-center h-full justify-end group">
                        <div className="text-[10px] font-extrabold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.totalQuantity}/{m.approvedQuantity}
                        </div>
                        <div className="w-full flex items-end justify-center gap-1 h-48">
                          <div
                            className="w-3 sm:w-3.5 rounded-t-md bg-[#3b5bfd] transition-all duration-300"
                            style={{ height: `${totalH}%` }}
                            title={`Total Requests: ${m.totalQuantity}`}
                          />
                          <div
                            className="w-3 sm:w-3.5 rounded-t-md bg-[#38bdf8] transition-all duration-300"
                            style={{ height: `${appH}%` }}
                            title={`Approved & Issued: ${m.approvedQuantity}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-12 gap-2 px-2 pt-2">
                  {monthlyData.map((m) => (
                    <div key={m.shortMonth} className="text-center">
                      <span className="text-[11px] font-bold text-slate-400">{m.shortMonth}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Breakdown Table */}
            {monthlyViewMode === 'table' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[310px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#f4f7fb] z-10">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-2.5 px-4">Month</th>
                      <th className="py-2.5 px-3 text-center">Submitted</th>
                      <th className="py-2.5 px-3 text-center">Fulfilled</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {monthlyData.map((m) => (
                      <tr key={m.monthIndex} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-bold text-slate-800">{m.monthName}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">
                          {m.totalQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          {m.approvedQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                          {m.pendingQuantity}
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-slate-900">
                          {formatCurrency(m.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3-Card Executive Performance Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-[24px] p-5 border border-slate-100/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Fulfillment Rate
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{fulfillmentRate}%</p>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  {completedCount} of {requests.length} requests
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 border border-slate-100/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Active Queue
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {statusCounts.pending + statusCounts.under_review}
                </p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  {statusCounts.pending} pending • {statusCounts.under_review} review
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 border border-slate-100/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Top Requested
                </p>
                <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                  {[...docTypeCounts].sort((a, b) => b.request_count - a.request_count)[0]?.title ||
                    'Barangay Clearance'}
                </p>
                <p className="text-[11px] text-[#3b5bfd] font-semibold">
                  {[...docTypeCounts].sort((a, b) => b.request_count - a.request_count)[0]
                    ?.request_count || 0}{' '}
                  total applications
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Document Requests Audit Log with Pill Filters */}
      <div className="bg-white rounded-[28px] border border-slate-100/80 shadow-xs overflow-hidden">
        {/* Table Header & Filter Bar */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Document Requests Audit Registry
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Showing {filteredRequests.length} of {requests.length} official transactions (filtered view is used when exporting)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportApplicationsCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Filtered CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Pill Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resident, tracking #, purpose..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#f4f7fb] border border-slate-200/70 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd]"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-[#f4f7fb] border border-slate-200/70 rounded-full text-slate-700 focus:outline-none focus:border-[#3b5bfd] cursor-pointer"
              >
                <option value="all">All Statuses ({requests.length})</option>
                <option value="pending">Pending ({statusCounts.pending})</option>
                <option value="under_review">Under Review ({statusCounts.under_review})</option>
                <option value="approved">Approved ({statusCounts.approved})</option>
                <option value="issued">Issued / Completed ({statusCounts.issued})</option>
                <option value="declined">Declined ({statusCounts.declined})</option>
              </select>
            </div>

            {/* Document Type Filter */}
            <div>
              <select
                value={docFilter}
                onChange={(e) => {
                  setDocFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-4 py-2 text-xs font-semibold bg-[#f4f7fb] border border-slate-200/70 rounded-full text-slate-700 focus:outline-none focus:border-[#3b5bfd] cursor-pointer"
              >
                <option value="all">All Document Types</option>
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Period Filter */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-[#f4f7fb] border border-slate-200/70 rounded-full text-slate-700 focus:outline-none focus:border-[#3b5bfd] cursor-pointer"
              >
                <option value="all">All Time Periods</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Modern Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f7fb]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th
                  onClick={() => handleAuditSort('tracking_number')}
                  className="py-3.5 px-6 cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Tracking #</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleAuditSort('resident_name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Resident Applicant</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleAuditSort('document_title')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Document Type</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Purpose</th>
                <th
                  onClick={() => handleAuditSort('fee')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Fee</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleAuditSort('status')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleAuditSort('created_at')}
                  className="py-3.5 px-6 text-right cursor-pointer hover:text-slate-700 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Date Filed</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedAuditRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No document requests match your current filters.
                  </td>
                </tr>
              ) : (
                paginatedAuditRequests.map((row) => (
                  <tr key={row.id || row.tracking_number} className="hover:bg-[#f4f7fb]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="font-mono font-bold text-[#3b5bfd] bg-blue-50 px-2.5 py-1 rounded-full text-[11px]">
                        {row.tracking_number || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{row.resident_name || 'Resident'}</p>
                      <p className="text-[11px] text-slate-400">{row.resident_email || ''}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {row.document_title || 'Barangay Certificate'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">
                      {row.purpose || 'Personal / Legal Requirement'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                      {formatCurrency(getRequestRevenue(row))}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={row.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400 font-semibold">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Circular Pagination Footer */}
        <div className="px-6 py-4 bg-[#f4f7fb]/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Rows per page:</span>
            <select
              value={auditPageSize}
              onChange={(e) => {
                setAuditPageSize(Number(e.target.value));
                setAuditPage(1);
              }}
              className="pl-3 pr-6 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
            >
              {[5, 8, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="ml-2">
              Page <strong className="text-slate-800">{safeAuditPage}</strong> of{' '}
              <strong className="text-slate-800">{auditTotalPages}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAuditPage(1)}
              disabled={safeAuditPage === 1}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              disabled={safeAuditPage === 1}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 py-1 rounded-full bg-[#3b5bfd] text-white text-xs font-bold">
              {safeAuditPage}
            </span>
            <button
              type="button"
              onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
              disabled={safeAuditPage === auditTotalPages}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAuditPage(auditTotalPages)}
              disabled={safeAuditPage === auditTotalPages}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Official Report Studio Modal */}
      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        config={config}
        currentUser={currentUser}
        requests={filteredRequests}
        docTypeCounts={docTypeCounts}
        monthlyData={monthlyData}
        statusCounts={statusCounts}
        totalRevenue={totalRevenue}
        totalResidents={totalResidents}
        year={currentYear}
      />
    </div>
  );
}
