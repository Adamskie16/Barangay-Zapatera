// Admin/src/features/reports/ReportsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart2,
  Printer,
  CheckSquare,
  Clock,
  FileCheck,
  Download,
  Filter,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Layers,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Table as TableIcon,
  User,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDate, formatCurrency } from '../../core/security';

// Custom Floating Callout Tooltip matching DashboardView
function CustomReportTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const totalVal = payload[0]?.value ?? 0;
    const approvedVal = payload[1]?.value;
    return (
      <div className="relative flex flex-col items-center pointer-events-none -translate-y-2">
        <div className="bg-[#3b5bfd] text-white px-3.5 py-2 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-white text-[#3b5bfd] flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div className="leading-tight text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              {label}
            </div>
            <div className="text-xs font-extrabold">
              {totalVal} Received
              {approvedVal !== undefined ? ` • ${approvedVal} Approved` : ''}
            </div>
          </div>
        </div>
        <div className="w-2.5 h-2.5 bg-[#3b5bfd] rotate-45 -mt-1.5 rounded-[2px]" />
      </div>
    );
  }
  return null;
}

export default function ReportsView({
  requests = [],
  docTypes = [],
  currentUser = {},
  config = {},
}) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState('');

  // Interactive Chart & Breakdown Controls
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar' | 'table'
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const [breakdownTab, setBreakdownTab] = useState('demand'); // 'demand' | 'revenue'

  // Filters for applications pipeline log
  const [statusFilter, setStatusFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'this_month' | 'last_30_days'

  const currentYear = new Date().getFullYear();

  // Status Metrics
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

  const totalRequests = requests.length;
  const completedTotal = statusCounts.approved + statusCounts.issued;
  const activeVerification = statusCounts.pending + statusCounts.under_review;
  const fulfillmentRate = totalRequests > 0 ? Math.round((completedTotal / totalRequests) * 100) : 0;

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
        shortMonth: monthName.slice(0, 3),
        totalQuantity,
        approvedQuantity,
        pendingQuantity,
        declinedQuantity,
        revenue,
      };
    });
  }, [requests]);

  // Document Type Breakdown & Revenue
  const docTypeBreakdown = useMemo(() => {
    if (docTypes.length > 0) {
      return docTypes.map((dt) => {
        const matchedRequests = requests.filter(
          (r) => r.document_type_id === dt.id || r.document_title === dt.title
        );
        const approvedCount = matchedRequests.filter(
          (r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed
        ).length;
        const pendingCount = matchedRequests.filter(
          (r) => r.status === 'pending' || r.status === 'under_review'
        ).length;
        const revenue = matchedRequests
          .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed)
          .reduce((sum, r) => sum + getRequestRevenue(r), 0);

        return {
          ...dt,
          request_count: matchedRequests.length,
          approved_count: approvedCount,
          pending_count: pendingCount,
          total_revenue: revenue,
        };
      });
    }

    // Fallback dynamic grouping from requests if docTypes is empty
    const map = {};
    requests.forEach((r) => {
      const title = r.document_title || r.document_name || 'Barangay Clearance';
      if (!map[title]) {
        map[title] = { id: title, title, request_count: 0, approved_count: 0, pending_count: 0, total_revenue: 0 };
      }
      map[title].request_count += 1;
      if (r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed) {
        map[title].approved_count += 1;
        map[title].total_revenue += getRequestRevenue(r);
      } else if (r.status === 'pending' || r.status === 'under_review') {
        map[title].pending_count += 1;
      }
    });
    return Object.values(map);
  }, [requests, docTypes]);

  const totalRevenue = useMemo(() => {
    return requests
      .filter((r) => r.status === 'approved' || r.status === 'issued' || r.status === 'completed' || r.is_claimed)
      .reduce((sum, r) => sum + getRequestRevenue(r), 0);
  }, [requests]);

  // 2x2 Gradient KPI Cards for Reports
  const reportKpiCards = useMemo(() => {
    const verifShare = totalRequests > 0 ? ((activeVerification / totalRequests) * 100).toFixed(1) : '0.0';
    const appShare = totalRequests > 0 ? ((statusCounts.approved / totalRequests) * 100).toFixed(1) : '0.0';
    const issShare = totalRequests > 0 ? ((statusCounts.issued / totalRequests) * 100).toFixed(1) : '0.0';

    return [
      {
        id: 'total',
        title: 'Total Received',
        value: totalRequests,
        badge: `${currentYear} YTD`,
        icon: BarChart2,
        iconColor: 'text-[#38bdf8]',
        gradient: 'bg-gradient-to-br from-[#56ccf2] via-[#38bdf8] to-[#2f80ed]',
        shadow: 'shadow-sky-400/25',
        spark: [{ v: 10 }, { v: 18 }, { v: 15 }, { v: 25 }, { v: 22 }, { v: 30 }, { v: 28 }],
        onClick: () => setStatusFilter('all'),
      },
      {
        id: 'verification',
        title: 'In Verification',
        value: activeVerification,
        badge: `${verifShare}%`,
        icon: Clock,
        iconColor: 'text-[#10b981]',
        gradient: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669]',
        shadow: 'shadow-emerald-400/25',
        spark: [{ v: 14 }, { v: 20 }, { v: 16 }, { v: 12 }, { v: 19 }, { v: 15 }, { v: 21 }],
        onClick: () => setStatusFilter('pending'),
      },
      {
        id: 'approved',
        title: 'Approved & Ready',
        value: statusCounts.approved,
        badge: `${appShare}%`,
        icon: CheckSquare,
        iconColor: 'text-[#7c3aed]',
        gradient: 'bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
        shadow: 'shadow-violet-500/25',
        spark: [{ v: 8 }, { v: 14 }, { v: 19 }, { v: 17 }, { v: 24 }, { v: 22 }, { v: 27 }],
        onClick: () => setStatusFilter('approved'),
      },
      {
        id: 'issued',
        title: 'Claimed & Issued',
        value: statusCounts.issued,
        badge: `${issShare}%`,
        icon: FileCheck,
        iconColor: 'text-[#3b82f6]',
        gradient: 'bg-gradient-to-br from-[#4f8ff7] via-[#3b82f6] to-[#2563eb]',
        shadow: 'shadow-blue-500/25',
        spark: [{ v: 12 }, { v: 16 }, { v: 21 }, { v: 25 }, { v: 23 }, { v: 29 }, { v: 34 }],
        onClick: () => setStatusFilter('issued'),
      },
    ];
  }, [totalRequests, activeVerification, statusCounts.approved, statusCounts.issued, currentYear]);

  // Donut Chart Data for Status Split
  const statusDonutData = useMemo(() => {
    const total =
      statusCounts.issued +
      statusCounts.approved +
      statusCounts.pending +
      statusCounts.under_review +
      statusCounts.declined;

    if (total === 0) {
      return [
        { name: 'Issued', value: 45, color: '#3b5bfd' },
        { name: 'Approved', value: 25, color: '#38bdf8' },
        { name: 'Pending', value: 20, color: '#34d399' },
        { name: 'Declined', value: 10, color: '#e2e8f0' },
      ];
    }

    return [
      { name: 'Issued', value: statusCounts.issued, color: '#3b5bfd' },
      { name: 'Approved', value: statusCounts.approved, color: '#38bdf8' },
      { name: 'Pending', value: statusCounts.pending + statusCounts.under_review, color: '#34d399' },
      { name: 'Declined', value: statusCounts.declined, color: '#f43f5e' },
    ];
  }, [statusCounts]);

  // Filtered Applications Pipeline Log
  const filteredRequests = useMemo(() => {
    const now = new Date();
    return requests.filter((r) => {
      if (statusFilter !== 'all') {
        const s = String(r.status || '').toLowerCase().trim();
        if (statusFilter === 'pending' && s !== 'pending' && s !== 'under_review' && s !== 'under review') return false;
        if (statusFilter === 'under_review' && s !== 'under_review' && s !== 'under review') return false;
        if (statusFilter === 'approved' && s !== 'approved' && s !== 'ready_for_pickup') return false;
        if (statusFilter === 'issued' && s !== 'issued' && s !== 'completed') return false;
        if (statusFilter === 'declined' && s !== 'declined' && s !== 'rejected') return false;
      }

      if (docFilter !== 'all') {
        if (r.document_title !== docFilter && r.document_type_id !== docFilter) return false;
      }

      if (selectedMonthFilter !== 'all' && r.created_at) {
        const d = new Date(r.created_at);
        if (d.getMonth() !== Number(selectedMonthFilter)) return false;
      }

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

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = String(r.tracking_number || '').toLowerCase();
        const name = String(r.resident_name || '').toLowerCase();
        const doc = String(r.document_title || '').toLowerCase();
        if (!tracking.includes(q) && !name.includes(q) && !doc.includes(q)) return false;
      }

      return true;
    });
  }, [requests, statusFilter, docFilter, selectedMonthFilter, dateRange, searchQuery]);

  // Sorting & 10-Row Pagination Logic
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, docFilter, selectedMonthFilter, dateRange, searchQuery, pageSize]);

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

      const cmp = String(valA || '').localeCompare(String(valB || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRequests, sortKey, sortDirection]);

  const totalEntries = sortedRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);
  const paginatedRequests = sortedRequests.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

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

  // Safe Export Executor (Prevents UI lockup, double-clicks, and provides visual feedback)
  const executeExport = async (statusLabel, fn) => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    setExportStatusText(statusLabel);
    try {
      await fn();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  // Export Handlers
  const handleExportFullSummaryCSV = () => {
    executeExport('Exporting Summary CSV...', () => {
      const rows = buildSummaryKPIsCSV({
        requests,
        statusCounts,
        totalRevenue,
        totalResidents: 0,
        periodLabel: `Calendar Year ${currentYear}`,
      });
      exportToCSV(`Barangay_Zapatera_Operations_Summary_${currentYear}`, rows);
    });
  };

  const handleExportApplicationsCSV = () => {
    executeExport('Exporting Applications CSV...', () => {
      const rows = buildApplicationsCSV(filteredRequests);
      exportToCSV(`Barangay_Zapatera_Document_Requests_${currentYear}`, rows);
    });
  };

  const handleExportMonthlyCSV = () => {
    executeExport('Exporting Monthly Analytics CSV...', () => {
      const rows = buildMonthlyCSV(monthlyData, currentYear);
      exportToCSV(`Barangay_Zapatera_Monthly_Processing_${currentYear}`, rows);
    });
  };

  const handleExportDocAuditCSV = () => {
    executeExport('Exporting Clearances Audit CSV...', () => {
      const rows = buildRevenueAuditCSV(docTypeBreakdown, requests.length);
      exportToCSV(`Barangay_Zapatera_Document_Clearances_Audit_${currentYear}`, rows);
    });
  };

  const handleExportJSON = () => {
    executeExport('Exporting JSON Backup...', () => {
      const payload = {
        barangay: config.barangay_name || 'Barangay Zapatera',
        generated_at: new Date().toISOString(),
        generated_by: currentUser.full_name || currentUser.email || 'Admin',
        statistics: {
          total_received: requests.length,
          status_breakdown: statusCounts,
          total_revenue: totalRevenue,
        },
        monthly_distribution: monthlyData,
        document_types: docTypeBreakdown,
        applications: filteredRequests,
      };
      exportToJSON(`Barangay_Zapatera_Operations_Audit_${currentYear}`, payload);
    });
  };

  // PDF Export Handlers
  const handleExportFullReportPDF = () => {
    executeExport('Generating Official Report PDF...', async () => {
      const html = generatePrintableHTML({
        title: 'Official Barangay Operations & Audit Report',
        config,
        currentUser,
        requests: filteredRequests.length > 0 ? filteredRequests : requests,
        docTypes,
        monthlyData,
        statusCounts,
        totalRevenue,
        totalResidents: 0,
        periodLabel: `Calendar Year ${currentYear}`,
        scope: 'all',
      });
      await downloadReportAsPDF(html, `Barangay_Zapatera_Official_Report_${currentYear}`);
    });
  };

  const handleExportSummaryPDF = () => {
    executeExport('Generating KPI Summary PDF...', async () => {
      const html = generatePrintableHTML({
        title: 'Barangay Executive KPI Summary',
        subtitle: 'Official Summary of Operations & Revenue Audit',
        config,
        currentUser,
        requests,
        docTypes,
        monthlyData,
        statusCounts,
        totalRevenue,
        totalResidents: 0,
        periodLabel: `Calendar Year ${currentYear}`,
        scope: 'summary',
      });
      await downloadReportAsPDF(html, `Barangay_Zapatera_Executive_Summary_${currentYear}`);
    });
  };

  const handleExportApplicationsPDF = () => {
    executeExport('Generating Document Requests PDF...', async () => {
      const html = generatePrintableHTML({
        title: 'Document Requests List',
        subtitle: `Log of Document Applications (${filteredRequests.length} Record(s))`,
        config,
        currentUser,
        requests: filteredRequests,
        docTypes,
        monthlyData,
        statusCounts,
        totalRevenue,
        totalResidents: 0,
        periodLabel: `Calendar Year ${currentYear}`,
        scope: 'applications',
      });
      await downloadReportAsPDF(html, `Barangay_Zapatera_Document_Requests_${currentYear}`);
    });
  };

  const handleExportMonthlyPDF = () => {
    executeExport('Generating Monthly Processing PDF...', async () => {
      const html = generatePrintableHTML({
        title: 'Monthly Document Processing Report',
        subtitle: `Annual Issuance Quantities & Approval Rates (Year ${currentYear})`,
        config,
        currentUser,
        requests,
        docTypes,
        monthlyData,
        statusCounts,
        totalRevenue,
        totalResidents: 0,
        periodLabel: `Calendar Year ${currentYear}`,
        scope: 'monthly',
      });
      await downloadReportAsPDF(html, `Barangay_Zapatera_Monthly_Processing_${currentYear}`);
    });
  };

  const handleDirectPrintOfficialReport = () => {
    const html = generatePrintableHTML({
      title: 'Official Barangay Operations & Audit Report',
      config,
      currentUser,
      requests: filteredRequests.length > 0 ? filteredRequests : requests,
      docTypes,
      monthlyData,
      statusCounts,
      totalRevenue,
      totalResidents: 0,
      periodLabel: `Calendar Year ${currentYear}`,
      scope: 'all',
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  };

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Top Header & Global Export/Print Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/70 text-[10px] font-extrabold uppercase tracking-wider text-[#3b5bfd] shadow-2xs mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Analytics &amp; Official Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Operational Processing Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track monthly issuance volume, document demand, and exportable audit records ({currentYear}).
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-[#3b5bfd] border border-slate-200/80 rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Export report summaries directly to Downloads"
            >
              <Download className={`w-4 h-4 text-[#38bdf8] ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Reports'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isExportMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-2.5 w-72 bg-white rounded-3xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <div className="px-4 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Official PDF Documents
                  </p>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleExportFullReportPDF}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-rose-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Official Barangay Report (PDF)</p>
                      <p className="text-[10px] text-slate-400">Complete certified audit document</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSummaryPDF}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-rose-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Overall Summary Report (PDF)</p>
                      <p className="text-[10px] text-slate-400">Summary counts &amp; revenue distribution</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportApplicationsPDF}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-rose-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-violet-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Document Requests List (PDF)</p>
                      <p className="text-[10px] text-slate-400">{filteredRequests.length} active filtered record(s)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthlyPDF}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-rose-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Monthly Processing Report (PDF)</p>
                      <p className="text-[10px] text-slate-400">12-Month processing volume</p>
                    </div>
                  </button>
                </div>

                <div className="px-4 py-1.5 border-y border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="w-3 h-3" /> Spreadsheets &amp; Backups
                  </p>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleExportFullSummaryCSV}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-blue-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Overall Summary Report (CSV)</p>
                      <p className="text-[10px] text-slate-400">Total counts, rates &amp; metrics</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportApplicationsCSV}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-blue-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#3b5bfd] shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Document Requests List (CSV)</p>
                      <p className="text-[10px] text-slate-400">{filteredRequests.length} matching record(s)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthlyCSV}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-blue-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-violet-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Monthly Quantities Log (CSV)</p>
                      <p className="text-[10px] text-slate-400">12-Month processing volume</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDocAuditCSV}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-blue-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Document Types &amp; Fees (CSV)</p>
                      <p className="text-[10px] text-slate-400">Issuance breakdown by document</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">All Records Backup (JSON)</p>
                      <p className="text-[10px] text-slate-400">Complete data backup</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Print Button */}
          <button
            type="button"
            onClick={handleDirectPrintOfficialReport}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#3b5bfd] hover:bg-blue-600 text-white rounded-full text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:-translate-y-0.5"
            title="Print Official Barangay Operations & Audit Report Directly"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* ================= DASHBOARD-STYLE 2-COLUMN ANALYTICS GRID ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 Cols): 2x2 Gradient KPIs + Document Demand & Status Donut */}
        <div className="xl:col-span-5 space-y-6">
          {/* 1. 2x2 Gradient KPI Cards with Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportKpiCards.map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={card.onClick}
                  className={`${card.gradient} ${card.shadow} rounded-[26px] p-5 text-white shadow-lg relative overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <IconComp className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <span className="bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white">
                      {card.badge}
                    </span>
                  </div>

                  <div className="h-9 w-24 ml-auto -my-1 opacity-75 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={card.spark}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#ffffff"
                          strokeWidth={2.2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-1">
                    <div className="text-2xl sm:text-[28px] font-extrabold leading-none tracking-tight">
                      {card.value.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-white/90 mt-1.5">
                      {card.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Document Demand & Status Split Card */}
          <div className="bg-white rounded-[26px] p-5 shadow-xs border border-slate-100/80 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Document Breakdown
                </h3>
                <p className="text-[11px] text-slate-400">
                  Distribution by certificate type &amp; status
                </p>
              </div>
              <div className="flex items-center gap-1 bg-[#f4f7fb] p-1 rounded-full border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setBreakdownTab('demand')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    breakdownTab === 'demand'
                      ? 'bg-[#3b5bfd] text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Demand
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownTab('status')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    breakdownTab === 'status'
                      ? 'bg-[#3b5bfd] text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Status Split
                </button>
              </div>
            </div>

            {breakdownTab === 'demand' ? (
              <div className="space-y-3.5">
                {docTypeBreakdown.slice(0, 4).map((dt, idx) => {
                  const pct =
                    totalRequests > 0
                      ? Math.round((dt.request_count / totalRequests) * 100)
                      : 0;
                  const barColors = [
                    'bg-[#38bdf8]',
                    'bg-[#3b5bfd]',
                    'bg-[#34d399]',
                    'bg-[#8b5cf6]',
                  ];
                  return (
                    <div key={dt.id || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 truncate max-w-[190px]">
                          {dt.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-slate-800">
                            {dt.request_count} reqs
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-1">
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-slate-800">
                      {fulfillmentRate}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Completed
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 max-w-[180px]">
                  {statusDonutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="font-semibold text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 Cols): Monthly Volume Recharts + Executive Metrics Strip */}
        <div className="xl:col-span-7 space-y-6">
          {/* 1. Monthly Processing Volume Chart Card */}
          <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-xs border border-slate-100/80 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Monthly Processing Volume ({currentYear})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Received applications vs. approved &amp; issued quantities by month
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Area Chart Button */}
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    chartType === 'area'
                      ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-xs'
                      : 'bg-[#f4f7fb] text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                  title="Smooth Area Chart"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>

                {/* Bar Chart Button */}
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    chartType === 'bar'
                      ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-xs'
                      : 'bg-[#f4f7fb] text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                  title="Bar Chart"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Compact Table Toggle */}
                <button
                  type="button"
                  onClick={() => setChartType('table')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    chartType === 'table'
                      ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] shadow-xs'
                      : 'bg-[#f4f7fb] text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                  title="Monthly Summary Table"
                >
                  <TableIcon className="w-4 h-4" />
                </button>

                {/* Month Filter Selector */}
                <div className="bg-[#f4f7fb] rounded-xl border border-slate-200/70 px-3 py-1.5">
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#3b5bfd] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {monthlyData.map((m) => (
                      <option key={m.monthIndex} value={m.monthIndex}>
                        {m.monthName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {chartType === 'table' ? (
              <div className="overflow-x-auto max-h-64 border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-slate-400 uppercase tracking-wider text-[10px] font-extrabold sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="p-3">Month</th>
                      <th className="p-3 text-center">Received</th>
                      <th className="p-3 text-center">Approved</th>
                      <th className="p-3 text-center">Pending</th>
                      <th className="p-3 text-center">Declined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.map((m) => (
                      <tr key={m.monthIndex} className="hover:bg-[#f8fafc]">
                        <td className="p-3 font-bold text-slate-800">{m.monthName}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {m.totalQuantity}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">
                          {m.approvedQuantity}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">
                          {m.pendingQuantity}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-rose-500">
                          {m.declinedQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart
                      data={monthlyData}
                      margin={{ top: 28, right: 16, left: -22, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="reportTotalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="reportApprovedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b5bfd" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b5bfd" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortMonth"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomReportTooltip />}
                        cursor={{ stroke: '#bae6fd', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalQuantity"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#reportTotalGrad)"
                        activeDot={{ r: 6, fill: '#ffffff', stroke: '#38bdf8', strokeWidth: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="approvedQuantity"
                        stroke="#3b5bfd"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#reportApprovedGrad)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 28, right: 16, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortMonth"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomReportTooltip />}
                        cursor={{ fill: '#f0f9ff', radius: 8 }}
                      />
                      <Bar
                        dataKey="totalQuantity"
                        fill="#38bdf8"
                        radius={[6, 6, 6, 6]}
                        barSize={14}
                      />
                      <Bar
                        dataKey="approvedQuantity"
                        fill="#3b5bfd"
                        radius={[6, 6, 6, 6]}
                        barSize={14}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2. Executive Performance Strip (3 Compact Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-[24px] p-4 border border-slate-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fulfillment Rate
                </p>
                <p className="text-lg font-black text-slate-800 leading-tight mt-0.5">
                  {fulfillmentRate}%
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 truncate">
                  {completedTotal} of {totalRequests} completed
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-4 border border-slate-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#38bdf8] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Revenue
                </p>
                <p className="text-lg font-black text-slate-800 leading-tight mt-0.5 truncate">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 truncate">
                  Approved &amp; issued fees
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-4 border border-slate-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Filtered Records
                </p>
                <p className="text-lg font-black text-slate-800 leading-tight mt-0.5">
                  {filteredRequests.length} Items
                </p>
                <p className="text-[10px] font-semibold text-violet-600 truncate">
                  Ready for CSV / PDF
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION: DOCUMENT REQUESTS AUDIT REGISTRY ================= */}
      <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-5">
        {/* Table Header and Quick Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="font-extrabold text-slate-800 text-base">
                Document Requests Audit Registry
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-sky-50 text-[#38bdf8] border border-sky-200/60 rounded-full">
                {filteredRequests.length} of {requests.length} records
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filterable transaction log of resident clearance requests, fees, and verification timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(statusFilter !== 'all' ||
              docFilter !== 'all' ||
              selectedMonthFilter !== 'all' ||
              dateRange !== 'all' ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setDocFilter('all');
                  setSelectedMonthFilter('all');
                  setDateRange('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f4f7fb] text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={handleExportApplicationsCSV}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-[#3b5bfd] bg-blue-50 hover:bg-[#3b5bfd] hover:text-white rounded-full transition-all cursor-pointer"
              title="Download currently filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Table CSV</span>
            </button>
          </div>
        </div>

        {/* Pill Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking, resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f4f7fb] border border-slate-200/70 rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/30 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-[#f4f7fb] border border-slate-200/70 px-3.5 py-2 rounded-full">
            <Filter className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending &amp; Verification</option>
              <option value="under_review">Under Review Only</option>
              <option value="approved">Approved &amp; Ready</option>
              <option value="issued">Officially Issued</option>
              <option value="declined">Declined / Returned</option>
            </select>
          </div>

          {/* Document Filter */}
          <div className="flex items-center space-x-2 bg-[#f4f7fb] border border-slate-200/70 px-3.5 py-2 rounded-full">
            <Layers className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Document Types</option>
              {docTypeBreakdown.map((dt) => (
                <option key={dt.id || dt.title} value={dt.title}>
                  {dt.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-2 bg-[#f4f7fb] border border-slate-200/70 px-3.5 py-2 rounded-full">
            <Calendar className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-slate-400 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-100">
              <tr>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('tracking_number')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Tracking No.</span>
                    {sortKey === 'tracking_number' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('resident_name')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Applicant Name</span>
                    {sortKey === 'resident_name' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('document_title')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Document Requested</span>
                    {sortKey === 'document_title' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('fee')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none ml-auto"
                  >
                    <span>Fee</span>
                    {sortKey === 'fee' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Status</span>
                    {sortKey === 'status' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Submitted</span>
                    {sortKey === 'created_at' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('updated_at')}
                    className="inline-flex items-center gap-1.5 font-extrabold hover:text-[#3b5bfd] transition-colors uppercase tracking-wider cursor-pointer group select-none"
                  >
                    <span>Updated</span>
                    {sortKey === 'updated_at' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((r) => (
                  <tr key={r.id || r.tracking_number} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono text-[11px] font-bold text-[#3b5bfd] bg-blue-50 px-2.5 py-1 rounded-full">
                        {r.tracking_number}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{r.resident_name || 'N/A'}</div>
                      {r.resident_email && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {r.resident_email}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 font-semibold">{r.document_title}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(r.fee || 0)}
                    </td>
                    <td className="p-3.5">
                      <Badge variant={r.status}>{r.status}</Badge>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {r.created_at ? formatDate(r.created_at).split(',')[0] : 'N/A'}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {formatDate(r.updated_at || r.created_at).split(',')[0]}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 font-medium">
                    No application records match your selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 10-Row Pagination Footer */}
        {totalEntries > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
              <span className="font-medium">
                Showing <span className="font-extrabold text-slate-800">{startIndex}</span> to{' '}
                <span className="font-extrabold text-slate-800">{endIndex}</span> of{' '}
                <span className="font-extrabold text-slate-800">{totalEntries}</span> entries
              </span>

              <div className="flex items-center space-x-1.5 text-xs">
                <span className="hidden md:inline text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 text-xs bg-[#f4f7fb] border border-slate-200/80 rounded-full font-bold text-slate-700 focus:outline-none cursor-pointer"
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
                className="w-7 h-7 rounded-full border border-slate-200/80 flex items-center justify-center hover:bg-[#f4f7fb] text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="w-7 h-7 rounded-full border border-slate-200/80 flex items-center justify-center hover:bg-[#f4f7fb] text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                      className={`min-w-[28px] h-7 px-2 text-xs font-extrabold rounded-full transition-colors cursor-pointer ${
                        safeCurrentPage === num
                          ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                          : 'hover:bg-[#f4f7fb] text-slate-600'
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
                className="w-7 h-7 rounded-full border border-slate-200/80 flex items-center justify-center hover:bg-[#f4f7fb] text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="w-7 h-7 rounded-full border border-slate-200/80 flex items-center justify-center hover:bg-[#f4f7fb] text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
        totalResidents={0}
        periodLabel={`Calendar Year ${currentYear}`}
      />
      {/* Non-intrusive floating export progress toast */}
      {isExporting && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/90 text-white text-xs font-semibold rounded-full shadow-2xl backdrop-blur-sm border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{exportStatusText || 'Preparing download...'}</span>
        </div>
      )}
    </div>
  );
}
