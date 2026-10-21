// Treasurer/src/features/reports/TreasurerReportsView.jsx
import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  FileText,
  Clock,
  Gift,
  ChevronDown,
} from 'lucide-react';
import PrintableFinancialModal, { PrintableFinancialDocument } from './PrintableFinancialModal';
import { formatCurrency } from '../../core/security';
import { StorageService } from '../../core/storage';

export default function TreasurerReportsView({
  requests = [],
  docTypes = [],
  config = {},
  currentUser = {},
}) {
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'month' | 'year'

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Helper to build formal financial statement HTML
  const getFinancialReportHtml = () => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const barangayName = config.barangay_name || 'Barangay Zapatera';
    const punongBarangay = config.punong_barangay || 'HON. DAVID M. AGRAVANTE';
    const treasurerName = currentUser?.full_name || config.treasurer_name || 'HON. MA. LOURDES S. RAMOS';
    const controlNo = `BZ-FIN-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const rowsHtml = filteredRequests.slice(0, 100).map((r, i) => {
      const isPaid = r.payment_status === 'paid' || r.is_paid === true || r.status === 'released' || r.status === 'completed';
      const isWaived = r.payment_status === 'waived' || r.is_waived === true;
      const statusText = isPaid ? 'PAID' : isWaived ? 'WAIVED' : 'UNPAID';
      const statusColor = isPaid ? '#059669' : isWaived ? '#7c3aed' : '#d97706';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; font-family: monospace;">${r.tracking_number || `REQ-${i + 1}`}</td>
          <td style="padding: 6px 8px; font-weight: 600;">${r.full_name || r.user_name || r.resident_name || 'Resident'}</td>
          <td style="padding: 6px 8px;">${r.document_type || r.document_name || 'Barangay Clearance'}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700;">PHP ${Number(r.fee ?? r.amount ?? 0).toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: center; color: ${statusColor}; font-weight: 700;">${statusText}</td>
          <td style="padding: 6px 8px;">${r.payment_method || r.payment_mode || 'Cash on Pickup'}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Barangay Zapatera Financial Statement - ${controlNo}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; position: relative; }
          .logo { width: 64px; height: 64px; object-fit: contain; }
          .rep { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin: 0; }
          .title { font-size: 22px; font-weight: 900; margin: 2px 0; text-transform: uppercase; font-family: Georgia, serif; }
          .office { font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .sub { font-size: 10px; color: #64748b; margin-top: 4px; }
          .meta-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; font-size: 11px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .kpi-value { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; page-break-inside: avoid; }
          .sig-box { text-align: center; }
          .sig-line { border-bottom: 1.5px solid #0f172a; margin-top: 40px; margin-bottom: 4px; font-weight: 800; font-size: 13px; text-transform: uppercase; }
          .sig-title { font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 6px;">
            <img src="/logo.png" class="logo" alt="Seal" />
            <div>
              <p class="rep">Republic of the Philippines • City of Cebu</p>
              <h1 class="title">${barangayName}</h1>
              <p class="office">OFFICE OF THE BARANGAY TREASURER</p>
            </div>
          </div>
          <p class="sub">Barangay Hall, 197 D. Jakosalem St., Cebu City • zapatera.lnb24@gmail.com</p>
        </div>

        <div class="meta-box">
          <div>
            <strong style="font-size: 13px; text-transform: uppercase;">Official Statement of Collections & Fees</strong><br />
            <span style="color: #64748b;">Period Covered: <strong>${periodLabel}</strong></span>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <div>Control No: <strong>${controlNo}</strong></div>
            <div>Generated: ${dateFormatted} at ${timeFormatted}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Gross Revenue</div>
            <div class="kpi-value">PHP ${filteredMetrics.totalRevenue.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Paid Requests</div>
            <div class="kpi-value">${filteredMetrics.paidCount}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Waived / Indigent</div>
            <div class="kpi-value">PHP ${filteredMetrics.waivedAmount.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Audited</div>
            <div class="kpi-value">${filteredRequests.length}</div>
          </div>
        </div>

        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 14px; color: #334155;">
          Collections Audit Log (${filteredRequests.length} Transactions)
        </div>

        <table>
          <thead>
            <tr>
              <th>Tracking No.</th>
              <th>Resident Name</th>
              <th>Document Type</th>
              <th style="text-align: right;">Fee Amount</th>
              <th style="text-align: center;">Status</th>
              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No collection records found for this period.</td></tr>'}
          </tbody>
        </table>

        <div class="sig-grid">
          <div class="sig-box">
            <div class="sig-line">${treasurerName}</div>
            <div class="sig-title">Barangay Treasurer</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">${punongBarangay}</div>
            <div class="sig-title">Punong Barangay</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Download Financial Statement directly as PDF
  const handleDownloadPDF = () => {
    const printableHtml = getFinancialReportHtml();
    const filename = `Barangay_Zapatera_Financial_Statement_${new Date().toISOString().split('T')[0]}`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', filename);
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printableHtml);
    doc.close();

    if (iframe.contentWindow) {
      iframe.contentWindow.document.title = filename;
    }

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 350);

    setIsExportMenuOpen(false);
  };

  // Direct print handler with isolated iframe for clean official document printing
  const handlePrintOfficialReport = () => {
    const printableHtml = getFinancialReportHtml();

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
    doc.write(printableHtml);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  };

  // Direct export report handlers
  const handleExportCSV = () => {
    const headers = ['Tracking Number', 'Resident Name', 'Document Type', 'Fee Amount (PHP)', 'Payment Status', 'Payment Mode', 'Date'];
    const rows = filteredRequests.map((r) => {
      const isPaid = r.payment_status === 'paid' || r.is_paid === true || r.status === 'released' || r.status === 'completed';
      const isWaived = r.payment_status === 'waived' || r.is_waived === true;
      const statusStr = isPaid ? 'Paid' : isWaived ? 'Waived' : 'Unpaid';
      return [
        `"${r.tracking_number || ''}"`,
        `"${r.full_name || r.user_name || r.resident_name || 'Resident'}"`,
        `"${r.document_type || r.document_name || 'Clearance'}"`,
        Number(r.fee ?? r.amount ?? 0),
        `"${statusStr}"`,
        `"${r.payment_method || r.payment_mode || 'Cash'}"`,
        `"${r.payment_date || r.created_at || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barangay_Zapatera_Financial_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportSummaryCSV = () => {
    const summaryRows = [
      ['Metric', 'Value'],
      ['Period', `"${periodLabel}"`],
      ['Total Gross Collections (PHP)', filteredMetrics.totalRevenue],
      ['Total Paid Clearances', filteredMetrics.paidCount],
      ['Waived / Indigent Total (PHP)', filteredMetrics.waivedAmount],
      ['Waived Requests Count', filteredMetrics.waivedCount],
      ['Pending Unpaid Amount (PHP)', filteredMetrics.unpaidAmount],
      ['Pending Unpaid Count', filteredMetrics.unpaidCount],
      ['Total Document Requests Audited', filteredRequests.length],
      ['Report Date', `"${new Date().toLocaleString('en-US')}"`],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + summaryRows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barangay_Zapatera_Collections_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportJSON = () => {
    const payload = {
      period: periodLabel,
      generated_at: new Date().toISOString(),
      metrics: filteredMetrics,
      requests_count: filteredRequests.length,
      requests: filteredRequests,
    };
    const jsonString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `Barangay_Zapatera_Financial_Audit_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Filter requests based on selected date range
  const filteredRequests = useMemo(() => {
    if (dateRange === 'all') return requests;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return requests.filter((r) => {
      const d = new Date(r.payment_date || r.created_at || now);
      if (dateRange === 'today') {
        return d.toISOString().split('T')[0] === todayStr;
      }
      if (dateRange === 'month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (dateRange === 'year') {
        return d.getFullYear() === currentYear;
      }
      return true;
    });
  }, [requests, dateRange]);

  // Compute metrics for filtered requests
  const filteredMetrics = useMemo(() => {
    return StorageService.calculateFinancialMetrics(filteredRequests, docTypes);
  }, [filteredRequests, docTypes]);

  const periodLabel = useMemo(() => {
    if (dateRange === 'today') return 'Today (' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ')';
    if (dateRange === 'month') return 'This Month (' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ')';
    if (dateRange === 'year') return 'Year ' + new Date().getFullYear();
    return 'All Records (Fiscal Year ' + new Date().getFullYear() + ')';
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Collection Reports & Summaries</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View and print official certified financial collections statements for Barangay Zapatera.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-semibold text-slate-600 hidden md:inline">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All Records</option>
              <option value="today">Today's Collections</option>
              <option value="month">Current Month</option>
              <option value="year">Current Year</option>
            </select>
          </div>

          {/* Export to Downloads Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              title="Export report summaries directly to Downloads"
            >
              <Download className="w-4 h-4" />
              <span>Export Reports</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Official PDF Documents
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">Official Financial Statement (PDF)</p>
                    <p className="text-[10px] text-slate-400">Certified collections statement with control no.</p>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1.5" />
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="w-3 h-3" /> Data Spreadsheets & Backups
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Collections Ledger (CSV)</p>
                    <p className="text-[10px] text-slate-400">Detailed line-by-line transactions</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportSummaryCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Executive KPI Summary (CSV)</p>
                    <p className="text-[10px] text-slate-400">Total gross revenue & rates</p>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Complete Audit Payload (JSON)</p>
                    <p className="text-[10px] text-slate-400">Raw structured data backup</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Download Official Report PDF Directly */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            title="Download Official Financial Statement into PDF"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* Print Official Report Button (Direct Print) */}
          <button
            type="button"
            onClick={handlePrintOfficialReport}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            title="Print Official Report Directly"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Money Collected</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(filteredMetrics.totalRevenue)}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {filteredMetrics.paidCount} Paid Requests
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Documents</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {filteredRequests.length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Document Requests Processed
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Free / Waived</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(filteredMetrics.waivedAmount)}
          </h3>
          <p className="text-[11px] text-purple-600 font-semibold mt-1">
            {filteredMetrics.waivedCount} Indigent / Free
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Waiting for Payment</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(filteredMetrics.unpaidAmount)}
          </h3>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">
            {filteredMetrics.unpaidCount} Pending Collection
          </p>
        </div>
      </div>

      {/* Document Type Collections Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Collections Breakdown by Document Type</h2>
            <p className="text-xs text-slate-500">Summary totals for {periodLabel}</p>
          </div>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Document Type</th>
                <th className="p-3 text-center">Total Requests</th>
                <th className="p-3 text-center">Paid Count</th>
                <th className="p-3 text-right">Money Collected (PHP)</th>
                <th className="p-3 text-right">Share of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMetrics.breakdownList && filteredMetrics.breakdownList.length > 0 ? (
                filteredMetrics.breakdownList.map((item, idx) => {
                  const share = filteredMetrics.totalRevenue > 0
                    ? Math.round((item.totalRevenue / filteredMetrics.totalRevenue) * 100)
                    : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{item.name}</td>
                      <td className="p-3 text-center font-medium text-slate-600">{item.totalTransactions}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{item.paidTransactions}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(item.totalRevenue)}</td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-blue-700">{share}%</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No transactions found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredMetrics.breakdownList && filteredMetrics.breakdownList.length > 0 && (
              <tfoot className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                <tr>
                  <td className="p-3 uppercase">Total Money Collected:</td>
                  <td className="p-3 text-center">{filteredRequests.length}</td>
                  <td className="p-3 text-center text-emerald-800">{filteredMetrics.paidCount}</td>
                  <td className="p-3 text-right text-sm text-slate-900">{formatCurrency(filteredMetrics.totalRevenue)}</td>
                  <td className="p-3 text-right">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Hidden container on screen, rendered exclusively during window.print() */}
      <div className="print-only-container">
        <PrintableFinancialDocument
          config={config}
          currentUser={currentUser}
          requests={filteredRequests}
          metrics={filteredMetrics}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
