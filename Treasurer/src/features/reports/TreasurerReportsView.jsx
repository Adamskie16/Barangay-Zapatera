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
  Search,
  Sparkles,
  BarChart2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import PrintableFinancialModal, { PrintableFinancialDocument } from './PrintableFinancialModal';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../core/security';
import { StorageService } from '../../core/storage';

export default function TreasurerReportsView({
  requests = [],
  docTypes = [],
  config = {},
  currentUser = {},
  loading = false,
}) {
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'month' | 'year'
  const [activeBreakdownTab, setActiveBreakdownTab] = useState('documents'); // 'documents' | 'monthly'
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');

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
    const now = new Date();
    if (dateRange === 'today') {
      return `Today (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    }
    if (dateRange === 'month') {
      return `This Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
    }
    if (dateRange === 'year') {
      return `Fiscal Year ${now.getFullYear()}`;
    }
    return `All Records (Fiscal Year ${now.getFullYear()})`;
  }, [dateRange]);

  // Monthly Revenue Breakdown for interactive chart
  const monthlyRevenueData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const map = {};

    monthNames.forEach((m, idx) => {
      map[idx] = { month: m, revenue: 0, count: 0, waived: 0 };
    });

    filteredRequests.forEach((req) => {
      const d = new Date(req.payment_date || req.created_at || new Date());
      if (d.getFullYear() === currentYear) {
        const mIdx = d.getMonth();
        const fee = Number(req.fee ?? req.amount ?? 0);
        const isPaid = req.payment_status === 'paid' || req.is_paid === true || req.status === 'released' || req.status === 'completed';
        const isWaived = req.payment_status === 'waived' || req.is_waived === true;

        if (isPaid) {
          map[mIdx].revenue += fee;
          map[mIdx].count += 1;
        } else if (isWaived) {
          map[mIdx].waived += fee;
        }
      }
    });

    return Object.values(map);
  }, [filteredRequests]);

  const maxMonthlyRevenue = useMemo(() => {
    const max = Math.max(...monthlyRevenueData.map((m) => m.revenue), 1000);
    return max;
  }, [monthlyRevenueData]);

  // Status counts for filtered tabs
  const counts = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let waived = 0;

    filteredRequests.forEach((r) => {
      const isPaid = r.payment_status === 'paid' || r.is_paid === true || r.status === 'released' || r.status === 'completed';
      const isWaived = r.payment_status === 'waived' || r.is_waived === true;
      if (isPaid) paid++;
      else if (isWaived) waived++;
      else unpaid++;
    });

    return { all: filteredRequests.length, paid, unpaid, waived };
  }, [filteredRequests]);

  const statusTabs = {
    activeTab: statusFilter,
    onChange: setStatusFilter,
    tabs: [
      { id: 'all', label: 'All Records', count: counts.all },
      { id: 'paid', label: 'Paid', count: counts.paid },
      { id: 'unpaid', label: 'Waiting Payment', count: counts.unpaid },
      { id: 'waived', label: 'Free / Waived', count: counts.waived },
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
      value: docFilter,
      onChange: setDocFilter,
      options: docTypeOptions,
      filterFn: (row, val) => {
        if (val === 'all') return true;
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

    const rowsHtml = filteredRequests.slice(0, 150).map((r, i) => {
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
          <td style="padding: 6px 8px;">${r.or_number || '—'}</td>
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
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; }
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
              <th>OR Number</th>
              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No collection records found for this period.</td></tr>'}
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

  // Direct print handler
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
    const headers = ['Tracking Number', 'Resident Name', 'Document Type', 'Fee Amount (PHP)', 'Payment Status', 'OR Number', 'Payment Mode', 'Date'];
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
        `"${r.or_number || ''}"`,
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

  // Table Columns for DataTable
  const columns = [
    {
      key: 'tracking_number',
      header: 'Tracking No.',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded-lg border border-slate-200/80 text-[11px]">
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
          <p className="font-bold text-slate-900 leading-tight text-xs">
            {row.full_name || row.user_name || row.resident_name || 'Resident'}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.email || row.contact_number || ''}</p>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Document Type',
      sortable: true,
      accessor: (row) => row.document_type || row.document_name || 'Clearance',
      render: (row) => (
        <span className="font-semibold text-slate-700 text-xs">
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
        return <span className="font-extrabold text-slate-900 text-xs">{formatCurrency(fee)}</span>;
      },
    },
    {
      key: 'payment_status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (row) => {
        const isPaid = row.payment_status === 'paid' || row.is_paid === true || row.status === 'released' || row.status === 'completed';
        const isWaived = row.payment_status === 'waived' || row.is_waived === true;

        if (isPaid) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Paid
            </span>
          );
        }
        if (isWaived) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
              <Gift className="w-3 h-3 text-purple-600" />
              Waived
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
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
            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {or}
            </span>
          );
        }
        return <span className="text-slate-400 font-mono text-[11px]">—</span>;
      },
    },
    {
      key: 'payment_date',
      header: 'Date Logged',
      sortable: true,
      render: (row) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {formatDate(row.payment_date || row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Card matching Admin Reports */}
      <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3b5bfd] border border-blue-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Collections & Financial Reports
              </h1>
              <p className="text-xs text-slate-500">
                Official revenue statements, document breakdowns, and certified audit ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Period selector pills */}
          <div className="flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/70 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Year' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
            ].map((p) => {
              const active = dateRange === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateRange(p.id)}
                  className={`px-3 py-1.5 rounded-full transition-all text-xs cursor-pointer ${
                    active
                      ? 'bg-[#3b5bfd] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Export report summaries directly to Downloads"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3.5 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Official PDF Statement
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">Official Financial Statement (PDF)</p>
                      <p className="text-[10px] text-slate-400">Certified collections statement with control no.</p>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />
                  <div className="px-3.5 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Download className="w-3 h-3" /> Data Spreadsheets
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Collections Ledger (CSV)</p>
                      <p className="text-[10px] text-slate-400">Detailed line-by-line audit</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSummaryCSV}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Executive KPI Summary (CSV)</p>
                      <p className="text-[10px] text-slate-400">Totals, rates & aggregates</p>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Full Database Backup (JSON)</p>
                      <p className="text-[10px] text-slate-400">Complete raw records</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Direct Print Button */}
          <button
            type="button"
            onClick={handlePrintOfficialReport}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            title="Print Official Certified Report Directly"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 4 Colorful Gradient KPI Overview Cards matching Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Gross Collections */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#3b5bfd] via-[#4f6ef7] to-[#60a5fa] text-white shadow-[0_14px_30px_-12px_rgba(59,91,253,0.45)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Gross Collections
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight">
              {formatCurrency(filteredMetrics.totalRevenue)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              <span>{filteredMetrics.paidCount} Paid Clearances</span>
            </p>
          </div>
          {/* Subtle sparkline wave */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <span>Period: {periodLabel.split('(')[0]}</span>
            <span className="font-bold text-white">PHP Avg</span>
          </div>
        </div>

        {/* KPI 2: Paid Clearances */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#10b981] via-[#14b8a6] to-[#34d399] text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.45)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Paid Documents
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight">
              {filteredMetrics.paidCount}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-semibold">
              {filteredRequests.length > 0
                ? `${Math.round((filteredMetrics.paidCount / filteredRequests.length) * 100)}% Fulfillment Rate`
                : '0% Fulfillment'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <span>Official Receipts Issued</span>
            <span className="font-bold text-white">{filteredMetrics.paidCount} ORs</span>
          </div>
        </div>

        {/* KPI 3: Free / Indigent Waived */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#8b5cf6] via-[#a855f7] to-[#c084fc] text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.45)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Free / Waived Fees
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Gift className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight">
              {formatCurrency(filteredMetrics.waivedAmount)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-semibold">
              {filteredMetrics.waivedCount} Indigent / Senior / PWD
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <span>Civic Assistance</span>
            <span className="font-bold text-white">Waived 100%</span>
          </div>
        </div>

        {/* KPI 4: Pending Collections */}
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#f59e0b] via-[#f97316] to-[#fb923c] text-white shadow-[0_14px_30px_-12px_rgba(249,115,22,0.42)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Waiting for Payment
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight">
              {formatCurrency(filteredMetrics.unpaidAmount)}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-semibold">
              {filteredMetrics.unpaidCount} Pending at Cashier
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <span>Awaiting Pickup</span>
            <span className="font-bold text-white">{filteredMetrics.unpaidCount} Unpaid</span>
          </div>
        </div>
      </div>

      {/* Interactive Dual Breakdown Section */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Revenue & Collections Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Detailed breakdown of document distribution and monthly revenue flow.
            </p>
          </div>

          {/* Breakdown Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f4f7fb] rounded-full border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveBreakdownTab('documents')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBreakdownTab === 'documents'
                  ? 'bg-[#3b5bfd] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Document Type</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBreakdownTab('monthly')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBreakdownTab === 'monthly'
                  ? 'bg-[#3b5bfd] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Monthly Trend</span>
            </button>
          </div>
        </div>

        {/* Tab 1: By Document Type Breakdown Table & Progress Bars */}
        {activeBreakdownTab === 'documents' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMetrics.breakdownList && filteredMetrics.breakdownList.length > 0 ? (
                filteredMetrics.breakdownList.map((item, idx) => {
                  const share = filteredMetrics.totalRevenue > 0
                    ? Math.round((item.totalRevenue / filteredMetrics.totalRevenue) * 100)
                    : 0;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200/70 hover:border-blue-200 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {item.paidTransactions} of {item.totalTransactions} paid • {item.waivedTransactions || 0} waived
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-slate-900">
                            {formatCurrency(item.totalRevenue)}
                          </p>
                          <span className="text-[10px] font-bold text-[#3b5bfd]">
                            {share}% of revenue
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-linear-to-r from-[#3b5bfd] to-[#60a5fa] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(share, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                  No document collection records found for this period.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Monthly Trend Chart */}
        {activeBreakdownTab === 'monthly' && (
          <div className="space-y-4">
            <div className="h-64 w-full flex items-end gap-2 sm:gap-4 px-2 pt-8 pb-4">
              {monthlyRevenueData.map((d, i) => {
                const heightPct = Math.min(Math.round((d.revenue / maxMonthlyRevenue) * 100), 100);
                const hasRevenue = d.revenue > 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Floating Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                      {d.month}: {formatCurrency(d.revenue)} ({d.count} paid)
                    </div>

                    <div className="w-full flex justify-center items-end h-[85%]">
                      <div
                        className={`w-full max-w-[32px] rounded-t-xl transition-all duration-300 ${
                          hasRevenue
                            ? 'bg-linear-to-t from-[#3b5bfd] to-[#60a5fa] group-hover:from-blue-600 group-hover:to-blue-400 shadow-xs'
                            : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 mt-2">{d.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 px-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b5bfd]" />
                <span>Monthly Gross Collections (PHP)</span>
              </span>
              <span className="font-semibold text-slate-700">
                Peak: {formatCurrency(maxMonthlyRevenue)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Certified Collections Ledger Table (DataTable) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Collections Ledger & Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Line-by-line financial transaction records for Barangay Zapatera.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#3b5bfd]" />
            <span>Open Statement Modal</span>
          </button>
        </div>

        <DataTable
          data={filteredRequests}
          columns={columns}
          keyField="id"
          searchable={true}
          searchPlaceholder="Search tracking number, resident, document, or OR..."
          searchKeys={['tracking_number', 'full_name', 'user_name', 'resident_name', 'email', 'document_type', 'or_number']}
          statusTabs={statusTabs}
          filters={filters}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          defaultSortKey="payment_date"
          defaultSortDirection="desc"
          loading={loading}
          emptyTitle="No collection records found for this period"
          emptySubtitle="Try selecting another period or clearing your search filters."
        />
      </div>

      {/* Printable Statement Modal */}
      {isPrintModalOpen && (
        <PrintableFinancialModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          config={config}
          currentUser={currentUser}
          requests={filteredRequests}
          metrics={filteredMetrics}
          periodLabel={periodLabel}
        />
      )}

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
