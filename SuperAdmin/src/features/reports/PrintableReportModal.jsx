// features/reports/PrintableReportModal.jsx
import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  FileText,
  Layers,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import {
  exportToCSV,
  exportToHTML,
  buildApplicationsCSV,
  buildMonthlyCSV,
  buildRevenueAuditCSV,
  buildSummaryKPIsCSV,
  generatePrintableHTML,
} from './reportUtils';
import { StorageService } from '../../core/storage';
import { formatCurrency, formatDate } from '../../core/security';

export default function PrintableReportModal({
  isOpen,
  onClose,
  title = 'Official Barangay Operations & Audit Report',
  config = {},
  currentUser = {},
  requests = [],
  docTypes = [],
  monthlyData = [],
  statusCounts = {},
  totalRevenue = 0,
  totalResidents = 0,
  periodLabel = 'All Time (2026)',
}) {
  if (!isOpen) return null;

  const [scope, setScope] = useState('all'); // 'all' | 'summary' | 'applications' | 'monthly' | 'revenue'
  const printAreaRef = useRef(null);

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
  const municipality = config.municipality || 'Cebu City';
  const province = config.province || 'Cebu';
  const hallAddress = config.hall_address || '197 D. Jakosalem St., Cebu City';
  const punongBarangay = config.punong_barangay || 'HON. DAVID M. AGRAVANTE';
  const sealUrl = config.seal_url || config.logo_url || '/logo.png';
  const adminName = currentUser?.full_name || currentUser?.email || 'Administrative Officer';
  const adminRole = currentUser?.role === 'super_admin' ? 'Super Administrator' : 'Barangay Administrator';
  const controlNo = `BZ-REP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const totalRequests = requests.length;
  const approvedTotal = (statusCounts.approved || 0) + (statusCounts.issued || 0);
  const completionRate = totalRequests > 0 ? `${Math.round((approvedTotal / totalRequests) * 100)}%` : '0%';

  const handlePrint = () => {
    // Generate isolated printable HTML in hidden iframe for perfect page isolation
    const html = generatePrintableHTML({
      title,
      config,
      currentUser,
      requests,
      docTypes,
      monthlyData,
      statusCounts,
      totalRevenue,
      totalResidents,
      periodLabel,
      scope,
    });

    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Printed Official Operations Report',
      feature: 'Reports & Analytics',
      details: `Generated and printed ${title} (${scope.toUpperCase()} scope)`,
      level: 'info',
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
        document.body.removeChild(iframe);
      }, 2000);
    }, 400);
  };

  const handleDownloadCSV = () => {
    const filenamePrefix = `Barangay_Zapatera_${scope.toUpperCase()}_Report_${now.toISOString().slice(0, 10)}`;

    if (scope === 'applications') {
      const rows = buildApplicationsCSV(requests);
      exportToCSV(`${filenamePrefix}_Applications_Log.csv`, rows);
    } else if (scope === 'monthly') {
      const rows = buildMonthlyCSV(monthlyData, now.getFullYear());
      exportToCSV(`${filenamePrefix}_Monthly_Analytics.csv`, rows);
    } else if (scope === 'revenue') {
      const rows = buildRevenueAuditCSV(docTypes, totalRevenue);
      exportToCSV(`${filenamePrefix}_Revenue_Audit.csv`, rows);
    } else {
      // Full summary KPI + consolidated
      const rows = buildSummaryKPIsCSV({
        totalRequests,
        pendingCount: statusCounts.pending || 0,
        underReviewCount: statusCounts.under_review || 0,
        approvedCount: statusCounts.approved || 0,
        issuedCount: statusCounts.issued || 0,
        declinedCount: statusCounts.declined || 0,
        totalRevenue,
        totalResidents,
        periodLabel,
      });
      exportToCSV(`${filenamePrefix}_Executive_Summary.csv`, rows);
    }

    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Printable Report CSV',
      feature: 'Reports & Analytics',
      details: `Downloaded official ${scope.toUpperCase()} report CSV (${filenamePrefix})`,
      level: 'info',
    });
  };

  const handleDownloadHTML = () => {
    const html = generatePrintableHTML({
      title,
      config,
      currentUser,
      requests,
      docTypes,
      monthlyData,
      statusCounts,
      totalRevenue,
      totalResidents,
      periodLabel,
      scope,
    });
    const filename = `Barangay_Zapatera_Printable_${scope}_Report_${now.toISOString().slice(0, 10)}.html`;
    exportToHTML(filename, html);

    StorageService.addLog({
      user_email: currentUser?.email,
      action: 'Downloaded Printable Report HTML',
      feature: 'Reports & Analytics',
      details: `Downloaded standalone formatted report HTML (${filename})`,
      level: 'info',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400 border border-blue-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Printable Official Report Preview</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  {controlNo}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Formal government letterhead, summary breakdown & signatory block</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Scope Filter */}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Full Report (All Sections)</option>
              <option value="summary">Summary of Totals Only</option>
              <option value="applications">Document Requests List Only</option>
              <option value="monthly">Monthly Requests Only</option>
              <option value="revenue">Revenue & Fees Only</option>
            </select>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            {/* CSV Download Button */}
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              title="Download spreadsheet to your computer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            {/* HTML Download Button */}
            <button
              onClick={handleDownloadHTML}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Download standalone HTML report"
            >
              <FileText className="w-4 h-4" />
              <span>HTML</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Document Preview Area */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white flex-1" ref={printAreaRef}>
          <div className="bg-white p-6 sm:p-10 rounded-xl border border-slate-300 shadow-md max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* Government Official Letterhead */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative flex items-center justify-center">
              <img
                src={sealUrl}
                alt="Barangay Seal"
                className="w-16 h-16 object-contain absolute left-0 top-0 hidden sm:block"
                onError={(e) => (e.target.style.display = 'none')}
              />
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  Republic of the Philippines • Province of {province} • City of {municipality}
                </p>
                <h1 className="text-xl font-extrabold tracking-wide text-slate-900 uppercase my-0.5">
                  {barangayName}
                </h1>
                <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  {title}
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">
                  {hallAddress} • Contact: {config.contact_phone || '(032) 503-6465'} • Email: {config.contact_email || 'zapatera.lnb24@gmail.com'}
                </p>
              </div>
            </div>

            {/* Report Metadata Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 flex flex-wrap items-center justify-between text-xs gap-2">
              <div>
                <span className="font-bold text-slate-900">Control No:</span>{' '}
                <span className="font-mono text-slate-700">{controlNo}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Scope:</span>{' '}
                <span className="text-slate-700 font-semibold">{periodLabel}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Date:</span>{' '}
                <span className="text-slate-700">{dateFormatted}, {timeFormatted}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Officer:</span>{' '}
                <span className="text-slate-700">{adminName} ({adminRole})</span>
              </div>
            </div>

            {/* SECTION 1: Executive KPI Summary */}
            {(scope === 'all' || scope === 'summary') && (
              <div className="mb-6">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    I. Executive Operations & Throughput Summary
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Key Indicators
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <p className="text-lg font-black text-slate-900">{totalRequests}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Total Applications</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                    <p className="text-lg font-black text-emerald-800">{approvedTotal}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Approved & Issued ({completionRate})</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-lg font-black text-amber-800">
                      {(statusCounts.pending || 0) + (statusCounts.under_review || 0)}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-amber-700">In Verification</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-lg font-black text-blue-900">{formatCurrency(totalRevenue)}</p>
                    <p className="text-[10px] font-bold uppercase text-blue-700">Revenue Collected</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Document Volume & Revenue Breakdown */}
            {(scope === 'all' || scope === 'revenue' || scope === 'summary') && docTypes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    II. Document Clearance Demand & Revenue Audit
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Financial & Demand Audit
                  </span>
                </div>

                <table className="w-full text-left text-[11px] border border-slate-300 border-collapse mb-2">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300 w-16">Code</th>
                      <th className="p-2 border border-slate-300">Document Classification</th>
                      <th className="p-2 border border-slate-300 text-right w-24">Fee</th>
                      <th className="p-2 border border-slate-300 text-right w-20">Requests</th>
                      <th className="p-2 border border-slate-300 text-right w-28">Revenue (PHP)</th>
                      <th className="p-2 border border-slate-300 text-right w-16">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docTypes.map((dt) => {
                      const reqCount = requests.filter((r) => r.document_type_id === dt.id || r.document_title === dt.title).length;
                      const rev = requests
                        .filter(
                          (r) =>
                            (r.document_type_id === dt.id || r.document_title === dt.title) &&
                            (r.status === 'approved' || r.status === 'issued' || r.status === 'ready_for_pickup' || r.status === 'completed')
                        )
                        .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
                      const pct = totalRevenue > 0 ? `${Math.round((rev / totalRevenue) * 100)}%` : '0%';

                      return (
                        <tr key={dt.id} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">{dt.code || 'N/A'}</td>
                          <td className="p-2 border border-slate-300 font-semibold text-slate-800">{dt.title}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">{formatCurrency(dt.fee || 0)}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono font-bold">{reqCount}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono font-bold text-blue-900">{formatCurrency(rev)}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono text-slate-600">{pct}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={3} className="p-2 border border-slate-300 text-right uppercase text-[10px]">
                        Grand Total:
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-black">{totalRequests}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-black text-blue-900">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* SECTION 3: Monthly Processing Quantities */}
            {(scope === 'all' || scope === 'monthly' || scope === 'summary') && monthlyData.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    III. Monthly Application Volume & Clearance Issuance Breakdown ({now.getFullYear()})
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Monthly Quantities
                  </span>
                </div>

                <table className="w-full text-left text-[11px] border border-slate-300 border-collapse mb-2">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300">Calendar Month</th>
                      <th className="p-2 border border-slate-300 text-right">Received Applications</th>
                      <th className="p-2 border border-slate-300 text-right">Approved / Issued</th>
                      <th className="p-2 border border-slate-300 text-right">In Progress</th>
                      <th className="p-2 border border-slate-300 text-right">Declined</th>
                      <th className="p-2 border border-slate-300 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m) => {
                      const total = Number(m.totalQuantity) || 0;
                      const app = Number(m.approvedQuantity) || 0;
                      const rate = total > 0 ? `${Math.round((app / total) * 100)}%` : '0%';

                      return (
                        <tr key={m.monthIndex} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="p-2 border border-slate-300 font-bold text-slate-800">{m.monthName}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono font-bold">{total}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-800">{app}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono text-amber-800">{m.pendingQuantity || 0}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono text-rose-800">{m.declinedQuantity || 0}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono font-semibold text-slate-700">{rate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECTION 4: Applications Pipeline Log */}
            {(scope === 'all' || scope === 'applications') && requests.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    IV. Document Requests Record Log ({requests.length} Entries)
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Audit Log
                  </span>
                </div>

                <table className="w-full text-left text-[10px] border border-slate-300 border-collapse mb-2">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[9.5px] border-b border-slate-300">
                    <tr>
                      <th className="p-1.5 border border-slate-300 w-24">Tracking No.</th>
                      <th className="p-1.5 border border-slate-300">Applicant</th>
                      <th className="p-1.5 border border-slate-300">Document Type</th>
                      <th className="p-1.5 border border-slate-300 text-right w-16">Fee</th>
                      <th className="p-1.5 border border-slate-300 w-24">Status</th>
                      <th className="p-1.5 border border-slate-300 w-24">Date Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 50).map((r) => (
                      <tr key={r.id} className="border-b border-slate-200">
                        <td className="p-1.5 border border-slate-300 font-mono font-bold text-slate-900">{r.tracking_number}</td>
                        <td className="p-1.5 border border-slate-300 font-semibold text-slate-800">{r.resident_name || 'N/A'}</td>
                        <td className="p-1.5 border border-slate-300 text-slate-700">{r.document_title}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-mono font-semibold">{formatCurrency(r.fee || 0)}</td>
                        <td className="p-1.5 border border-slate-300 uppercase font-bold text-[9px] text-slate-700">
                          {r.status}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-slate-500 font-mono text-[9px]">
                          {formatDate(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {requests.length > 50 && (
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    * Showing first 50 entries in document view. To view all {requests.length} records, download the Applications CSV.
                  </p>
                )}
              </div>
            )}

            {/* Official Signatory Section */}
            <div className="mt-10 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-center gap-6">
              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-8">Prepared & Verified By:</p>
                <div className="border-t border-slate-900 pt-1 font-bold text-xs uppercase text-slate-900">
                  {adminName}
                </div>
                <p className="text-[10px] text-slate-600">{adminRole} • Office of Operations</p>
              </div>

              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-8">Noted & Officially Approved By:</p>
                <div className="border-t border-slate-900 pt-1 font-bold text-xs uppercase text-slate-900">
                  {punongBarangay}
                </div>
                <p className="text-[10px] text-slate-600">{config.signatory_title || 'Punong Barangay'} • Barangay Zapatera</p>
              </div>
            </div>

            {/* Document Bottom Authentication Footer */}
            <div className="mt-8 pt-3 border-t border-slate-100 flex justify-between text-[9px] text-slate-400">
              <div>Official Republic of the Philippines Document • Barangay Zapatera</div>
              <div>System Authentication Code: {controlNo} • Generated on {dateFormatted}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
