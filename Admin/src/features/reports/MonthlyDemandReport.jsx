// Admin/src/features/reports/MonthlyDemandReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  Target,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  BarChart2,
  Layers,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { formatCurrency } from '../../core/security';
import {
  computeDemandTrackerMetrics,
  buildDemandRankingCSV,
  buildApplicationsCSV,
  exportToCSV,
  exportDemandTrackerWorkbookCSV,
  generateDemandTrackerPrintableHTML,
  downloadReportAsPDF,
} from './reportUtils';

// Only call the optional PostgreSQL RPC when explicitly enabled via VITE_ENABLE_DEMAND_RPC=true,
// preventing HTTP 400 console errors while computeDemandTrackerMetrics aggregates live records directly.
let isDemandRpcAvailable =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_ENABLE_DEMAND_RPC === 'true';
let isDemandRpcInFlight = false;

export default function MonthlyDemandReport({
  requests = [],
  docTypes = [],
  currentUser = {},
  config = {},
  defaultPeriod = 'all',
}) {
  const currentYear = new Date().getFullYear();
  const [periodFilter, setPeriodFilter] = useState(defaultPeriod); // 'all' | '0'..'11' | 'Q1'..'Q4' | 'custom'
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Optional RPC data from PostgreSQL function get_monthly_demand_metrics
  const [rpcMetrics, setRpcMetrics] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showCsvMenu, setShowCsvMenu] = useState(false);
  const [showPrintableModal, setShowPrintableModal] = useState(false);

  // Table Sorting & 10-Row Pagination State
  const [sortKey, setSortKey] = useState('demand_rank');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Compute full demand, bottleneck, Sitio/Purok, and Purpose metrics
  const trackerData = useMemo(() => {
    return computeDemandTrackerMetrics({
      requests,
      docTypes,
      periodFilter,
      selectedYear,
      customStartDate,
      customEndDate,
      rpcMetrics,
    });
  }, [requests, docTypes, periodFilter, selectedYear, customStartDate, customEndDate, rpcMetrics]);

  const startIso = trackerData.startDate ? trackerData.startDate.toISOString() : '';
  const endIso = trackerData.endDate ? trackerData.endDate.toISOString() : '';

  // Query PostgreSQL RPC get_monthly_demand_metrics(p_start_date, p_end_date) when period changes
  useEffect(() => {
    let isMounted = true;
    async function fetchRpcDemandMetrics() {
      if (!isSupabaseConfigured() || !isDemandRpcAvailable || isDemandRpcInFlight || !startIso || !endIso) return;
      isDemandRpcInFlight = true;
      try {
        const { data, error } = await supabase.rpc('get_monthly_demand_metrics', {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (error) {
          // Disable further calls if RPC signature/schema hasn't been updated yet (400/404/42703/PGRST)
          isDemandRpcAvailable = false;
          if (isMounted) setRpcMetrics(null);
          return;
        }
        if (Array.isArray(data) && data.length > 0 && isMounted) {
          setRpcMetrics(data);
        } else if (isMounted) {
          setRpcMetrics(null);
        }
      } catch {
        isDemandRpcAvailable = false;
        if (isMounted) setRpcMetrics(null);
      } finally {
        isDemandRpcInFlight = false;
      }
    }
    fetchRpcDemandMetrics();
    return () => {
      isMounted = false;
    };
  }, [startIso, endIso]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, selectedYear, customStartDate, customEndDate]);

  const demandList = useMemo(() => {
    const base = trackerData.demandMetrics || [];
    return [...base].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
  }, [trackerData.demandMetrics, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(demandList.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedDemand = demandList.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'demand_rank' || key === 'document_title' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#3b5bfd]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#3b5bfd]" />
    );
  };

  // Print Official Monthly Demand Report via isolated iframe
  const handlePrintOfficialLedger = () => {
    const html = generateDemandTrackerPrintableHTML({
      config,
      currentUser,
      trackerData,
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

  // Download Official Monthly Demand Report as Binary PDF
  const handleDownloadOfficialPDF = async () => {
    setIsExporting(true);
    try {
      const html = generateDemandTrackerPrintableHTML({
        config,
        currentUser,
        trackerData,
      });
      const safePeriod = trackerData.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadReportAsPDF(html, `Barangay_Zapatera_Certificate_Demand_Report_${safePeriod}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Multi-Tab CSV Workbook (Tab 1 Summary + Tab 2 Demographics/Purpose + Tab 3 Detailed Logs)
  const handleExportWorkbookCSV = () => {
    setShowCsvMenu(false);
    const safePeriod = trackerData.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    exportDemandTrackerWorkbookCSV({
      filename: `Barangay_Zapatera_Demand_Improvement_Workbook_${safePeriod}`,
      trackerData,
    });
  };

  // Export Tab 1 Only (Aggregated Demand Summary CSV)
  const handleExportTab1SummaryCSV = () => {
    setShowCsvMenu(false);
    const safePeriod = trackerData.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rows = buildDemandRankingCSV(trackerData.demandMetrics, trackerData.periodLabel);
    exportToCSV(`Barangay_Zapatera_Demand_Summary_${safePeriod}`, rows);
  };

  // Export Tab 2 Only (Detailed Request Logs CSV)
  const handleExportTab2DetailedLogsCSV = () => {
    setShowCsvMenu(false);
    const safePeriod = trackerData.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rows = buildApplicationsCSV(trackerData.filteredPeriodRequests);
    exportToCSV(`Barangay_Zapatera_Detailed_Request_Logs_${safePeriod}`, rows);
  };

  const { kpis, sitioBreakdown = [], purposeBreakdown = [], recommendations = [] } = trackerData;

  const monthOptions = [
    { value: '0', label: `January ${selectedYear}` },
    { value: '1', label: `February ${selectedYear}` },
    { value: '2', label: `March ${selectedYear}` },
    { value: '3', label: `April ${selectedYear}` },
    { value: '4', label: `May ${selectedYear}` },
    { value: '5', label: `June ${selectedYear}` },
    { value: '6', label: `July ${selectedYear}` },
    { value: '7', label: `August ${selectedYear}` },
    { value: '8', label: `September ${selectedYear}` },
    { value: '9', label: `October ${selectedYear}` },
    { value: '10', label: `November ${selectedYear}` },
    { value: '11', label: `December ${selectedYear}` },
  ];

  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-xs border border-slate-100/90 space-y-6">
      {/* 1. TOP HEADER, MONTHLY/QUARTERLY SELECTOR & EXPORT TRIGGERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[10px] font-extrabold uppercase tracking-wider border border-blue-100 mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Business Intelligence &amp; Treasurer Ledger</span>
            {rpcMetrics && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px]">
                PostgreSQL RPC Live
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Certificate Demand &amp; Service Improvement Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track which certificates are in highest demand, identify Sitio/Purok &amp; purpose spikes, monitor processing turnaround bottlenecks, and export formal ledgers.
          </p>
        </div>

        {/* Filter & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Monthly / Quarterly Period Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#3b5bfd] shrink-0" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Select Reporting Period"
            >
              <option value="all">All Months ({selectedYear})</option>
              <optgroup label="Quarterly Intervals">
                <option value="Q1">Q1 {selectedYear} (Jan – Mar)</option>
                <option value="Q2">Q2 {selectedYear} (Apr – Jun)</option>
                <option value="Q3">Q3 {selectedYear} (Jul – Sep)</option>
                <option value="Q4">Q4 {selectedYear} (Oct – Dec)</option>
              </optgroup>
              <optgroup label="Monthly Intervals">
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Window">
                <option value="custom">Custom Date Range...</option>
              </optgroup>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
              aria-label="Select Year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Preview Printable Ledger Button */}
          <button
            type="button"
            onClick={() => setShowPrintableModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-full text-xs font-bold transition-all cursor-pointer"
            title="Preview Formal Printable A4 Ledger"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Preview Ledger</span>
          </button>

          {/* Export CSV Dropdown (Tab 1 Summary + Tab 2 Detailed Logs) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCsvMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {showCsvMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs"
                onMouseLeave={() => setShowCsvMenu(false)}
              >
                <div className="px-3.5 py-1.5 border-b border-slate-100 font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
                  Excel / CSV Export Options
                </div>
                <button
                  type="button"
                  onClick={handleExportWorkbookCSV}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 flex items-start gap-2.5 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800">Full Multi-Tab Workbook (CSV)</p>
                    <p className="text-[10px] text-slate-400">
                      Tab 1 Demand Summary + Tab 2 Sitio/Purpose + Tab 3 Request Logs
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportTab1SummaryCSV}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 flex items-start gap-2.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#3b5bfd] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800">Tab 1: Aggregated Demand Summary</p>
                    <p className="text-[10px] text-slate-400">
                      Rankings, MoM %, turnaround, decline rates &amp; revenue
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportTab2DetailedLogsCSV}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 flex items-start gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800">Tab 2: Detailed Request Logs</p>
                    <p className="text-[10px] text-slate-400">
                      Timestamps, document types, Sitios &amp; status ({trackerData.filteredPeriodRequests.length} rows)
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Download Official PDF Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadOfficialPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          {/* Print Official Monthly Report (PDF) Button */}
          <button
            type="button"
            onClick={handlePrintOfficialLedger}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Monthly Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (when 'custom' is selected) */}
      {periodFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs">
          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
            Custom Date Window:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-semibold">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-semibold">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            />
          </div>
          <span className="text-[11px] text-slate-500 ml-auto font-medium">
            Showing <strong>{trackerData.grandTotal}</strong> requests in window
          </span>
        </div>
      )}

      {/* 2. HIGH-LEVEL KPI CARDS: Most Demanded, Fastest Processed, Highest Backlog, Peak Request Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Most Demanded Document */}
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#3b5bfd] via-[#2563eb] to-[#1d4ed8] text-white shadow-md shadow-blue-500/15 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-white" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold">
              #1 Most Demanded
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              Most Demanded Document
            </p>
            <p className="text-lg font-extrabold tracking-tight truncate mt-0.5" title={kpis.mostDemanded?.title}>
              {kpis.mostDemanded?.title || 'N/A'}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-white/90 font-semibold">
              <span>
                {kpis.mostDemanded?.count || 0} reqs ({kpis.mostDemanded?.sharePct || 0}% share)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">
                {kpis.mostDemanded?.momPct >= 0 ? `+${kpis.mostDemanded?.momPct}%` : `${kpis.mostDemanded?.momPct}%`} MoM
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Fastest Processed */}
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] text-white shadow-md shadow-emerald-500/15 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold">
              Turnaround Leader
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              Fastest Processed
            </p>
            <p className="text-lg font-extrabold tracking-tight truncate mt-0.5" title={kpis.fastestProcessed?.title}>
              {kpis.fastestProcessed?.title || 'N/A'}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-white/90 font-semibold">
              <span>Avg: {kpis.fastestProcessed?.turnaroundLabel || '—'}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">
                {kpis.fastestProcessed?.approvalRate || 0}% Approved
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Highest Backlog / Bottleneck */}
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#f59e0b] via-[#ea580c] to-[#c2410c] text-white shadow-md shadow-orange-500/15 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold">
              Queue Watch
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              Highest Backlog / Bottleneck
            </p>
            <p className="text-lg font-extrabold tracking-tight truncate mt-0.5" title={kpis.highestBacklog?.title}>
              {kpis.highestBacklog?.pendingCount > 0 || kpis.highestBacklog?.declinedCount > 0
                ? kpis.highestBacklog?.title
                : 'Zero Active Backlog'}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-white/90 font-semibold">
              <span>{kpis.highestBacklog?.pendingCount || 0} Pending in Queue</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">
                {kpis.highestBacklog?.declineRate || 0}% Declined
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Peak Request Day of the Month */}
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] text-white shadow-md shadow-violet-500/15 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold">
              Peak Traffic
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              Peak Request Day
            </p>
            <p className="text-lg font-extrabold tracking-tight truncate mt-0.5">
              {kpis.peakRequestDay?.dateLabel || 'No peak recorded'}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-white/90 font-semibold">
              <span>{kpis.peakRequestDay?.count || 0} requests submitted</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold">
                ₱{Number(trackerData.totalPeriodRevenue || 0).toLocaleString()} Rev
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE HORIZONTAL DEMAND DISTRIBUTION + DEMOGRAPHIC & PURPOSE TRACKER */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 6 Cols: Horizontal Bar Distribution ("What Certificate is in Demand") */}
        <div className="xl:col-span-6 bg-[#f8fafc] rounded-3xl p-5 border border-slate-200/70 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#3b5bfd]" />
                <span>Certificate Demand Ranking (&ldquo;What Certificate is in Demand&rdquo;)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Volume share, ranking &amp; Month-over-Month (MoM) growth rate ({trackerData.periodLabel})
              </p>
            </div>
            <span className="text-xs font-extrabold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200">
              {trackerData.grandTotal} Total
            </span>
          </div>

          <div className="space-y-3">
            {trackerData.demandMetrics.slice(0, 7).map((item, idx) => {
              const barColors = [
                'bg-[#3b5bfd]',
                'bg-[#0ea5e9]',
                'bg-[#10b981]',
                'bg-[#8b5cf6]',
                'bg-[#f59e0b]',
                'bg-[#ec4899]',
                'bg-[#64748b]',
              ];
              const isPositiveMoM = item.mom_growth_pct >= 0;
              return (
                <div key={item.document_type_id || idx} className="bg-white p-3 rounded-2xl border border-slate-200/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#3b5bfd] font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        #{item.demand_rank}
                      </span>
                      <span className="font-extrabold text-slate-800 truncate">
                        {item.document_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-slate-900">
                        {item.total_requests} reqs
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        ({item.pct_of_total_volume}%)
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPositiveMoM
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPositiveMoM ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isPositiveMoM ? `+${item.mom_growth_pct}%` : `${item.mom_growth_pct}%`}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct_of_total_volume, item.total_requests > 0 ? 6 : 2)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span>Avg Turnaround: <strong className="text-slate-600">{item.turnaround_label}</strong></span>
                    <span>Top Zone: <strong className="text-slate-600">{item.top_sitio_purok}</strong></span>
                    <span>Revenue: <strong className="text-emerald-700">{formatCurrency(item.total_revenue)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Cols: Demographic (Sitio / Purok) & Primary Purpose Trend Tracker + Recommendations */}
        <div className="xl:col-span-6 space-y-4">
          {/* Sitio / Purok & Primary Purpose Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Demand Breakdown by Sitio / Purok / Zone */}
            <div className="bg-[#f8fafc] rounded-3xl p-4 border border-slate-200/70 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Demand by Sitio / Purok
                  </h4>
                  <p className="text-[10px] text-slate-400">Geographic request concentration</p>
                </div>
              </div>

              <div className="space-y-2">
                {(sitioBreakdown.length > 0 ? sitioBreakdown.slice(0, 5) : [
                  { rank: 1, sitio: 'Zapatera Proper (Central)', request_count: 0, share_pct: 0, top_document: 'Barangay Clearance' },
                ]).map((s) => (
                  <div key={s.sitio} className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{s.sitio}</p>
                      <p className="text-[10px] text-slate-400 truncate">Top: {s.top_document}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-slate-900">{s.request_count}</p>
                      <p className="text-[10px] font-bold text-[#3b5bfd]">{s.share_pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Purpose Distribution */}
            <div className="bg-[#f8fafc] rounded-3xl p-4 border border-slate-200/70 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Primary Purpose Trends
                  </h4>
                  <p className="text-[10px] text-slate-400">Top stated resident purposes</p>
                </div>
              </div>

              <div className="space-y-2">
                {(purposeBreakdown.length > 0 ? purposeBreakdown.slice(0, 5) : [
                  { rank: 1, purpose: 'Employment / Legal Requirement', request_count: 0, share_pct: 0, primary_certificate: 'Barangay Clearance' },
                ]).map((p) => (
                  <div key={p.purpose} className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate" title={p.purpose}>{p.purpose}</p>
                      <p className="text-[10px] text-slate-400 truncate">Cert: {p.primary_certificate}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-slate-900">{p.request_count}</p>
                      <p className="text-[10px] font-bold text-violet-600">{p.share_pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Automated Operational Recommendations & Bottleneck Insights */}
          <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-3xl p-4 sm:p-5 border border-blue-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#3b5bfd] text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Actionable Service Improvement Insights
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Automated bottleneck detection &amp; workflow recommendations
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#3b5bfd] text-[10px] font-extrabold border border-blue-200">
                {recommendations.length} Insight(s)
              </span>
            </div>

            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-white/90 p-3 rounded-2xl border border-blue-100/90 text-xs space-y-1 shadow-2xs"
                >
                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3b5bfd] shrink-0" />
                    <span>{rec.title}</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-3.5">
                    {rec.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CERTIFICATE DEMAND & TRENDS ANALYSIS TABLE (10-Row Pagination & Sortable Columns) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Certificate Demand &amp; Operational Health Table
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any column header to sort • Ranked by volume share, MoM growth, turnaround &amp; approval rate
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Showing {paginatedDemand.length} of {demandList.length} Certificate Types
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th
                  onClick={() => handleSort('demand_rank')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Rank</span>
                    {renderSortIcon('demand_rank')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('document_title')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Document Type</span>
                    {renderSortIcon('document_title')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_requests')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Requests</span>
                    {renderSortIcon('total_requests')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pct_of_total_volume')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% of Volume</span>
                    {renderSortIcon('pct_of_total_volume')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('mom_growth_pct')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>MoM Change</span>
                    {renderSortIcon('mom_growth_pct')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_turnaround_hours')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg. Turnaround</span>
                    {renderSortIcon('avg_turnaround_hours')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('approval_rate_pct')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Approval / Decline</span>
                    {renderSortIcon('approval_rate_pct')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_revenue')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue (₱)</span>
                    {renderSortIcon('total_revenue')}
                  </div>
                </th>
                <th className="py-3.5 px-4">Operational Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDemand.map((row) => {
                const isTop3 = row.demand_rank <= 3 && row.total_requests > 0;
                return (
                  <tr key={row.document_type_id || row.document_title} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] ${
                          isTop3
                            ? 'bg-blue-50 text-[#3b5bfd] border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{row.demand_rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-800">{row.document_title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Code: <span className="font-mono font-semibold">{row.document_code}</span> • Top Sitio: {row.top_sitio_purok}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                      {row.total_requests}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                      {row.pct_of_total_volume}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          row.mom_growth_pct >= 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {row.mom_growth_pct >= 0 ? `+${row.mom_growth_pct}%` : `${row.mom_growth_pct}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                      {row.turnaround_label}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> {row.approval_rate_pct}% App
                        </span>
                        {row.declined_count > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[10px]"
                            title={`Primary Rejection Reason: ${row.top_rejection_reason}`}
                          >
                            <XCircle className="w-2.5 h-2.5" /> {row.decline_rate_pct}% Dec ({row.top_rejection_reason})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-700">
                      {formatCurrency(row.total_revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-xs">
                      {row.recommendation_insight}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-200">
                <td colSpan={2} className="py-3 px-4 text-right uppercase text-[11px] tracking-wider">
                  Period Total / Overall Summary:
                </td>
                <td className="py-3 px-4 text-right font-mono">{trackerData.grandTotal}</td>
                <td className="py-3 px-4 text-right font-mono">100%</td>
                <td className="py-3 px-4 text-right font-mono">—</td>
                <td className="py-3 px-4 text-right font-mono">—</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700">
                  {trackerData.overallApprovalRate}% Approved
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800">
                  {formatCurrency(trackerData.totalPeriodRevenue)}
                </td>
                <td className="py-3 px-4 text-[10px] text-slate-500">
                  {trackerData.totalPendingPeriod} Pending • {trackerData.totalDeclinedPeriod} Declined
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 10-Row Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-500 font-medium">
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. FORMAL PRINTABLE LEDGER PREVIEW MODAL */}
      {showPrintableModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Official Printable Certificate Demand &amp; Improvement Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Formatted for standard A4 / Letter paper with Barangay Zapatera letterhead &amp; sign-off blocks
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadOfficialPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintOfficialLedger}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintableModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Live A4 Printable HTML Preview */}
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 flex justify-center">
              <div className="bg-white shadow-lg border border-slate-200 w-full max-w-[800px] rounded-xl overflow-hidden">
                <iframe
                  title="Printable Certificate Demand Ledger Preview"
                  srcDoc={generateDemandTrackerPrintableHTML({
                    config,
                    currentUser,
                    trackerData,
                  })}
                  className="w-full h-[720px] border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

