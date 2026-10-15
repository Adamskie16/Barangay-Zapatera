// Treasurer/src/features/reports/PrintableFinancialModal.jsx
import React from 'react';
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Landmark,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

export function PrintableFinancialDocument({
  config = {},
  currentUser = {},
  requests = [],
  metrics = {},
  periodLabel = 'All Time',
}) {
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
  const punongBarangay = config.punong_barangay || 'HON. DAVID M. AGRAVANTE';
  const treasurerName = currentUser?.full_name || config.treasurer_name || 'HON. MA. LOURDES S. RAMOS';
  const controlNo = `BZ-FIN-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white font-sans text-slate-900" id="printable-document-root">
      
      {/* Official Letterhead */}
      <div className="text-center border-b-2 border-slate-900 pb-5 mb-6 relative">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img
            src="/logo.png"
            alt="Barangay Zapatera Seal"
            className="w-16 h-16 object-contain shrink-0"
          />
          <div>
            <p className="text-xs uppercase font-serif tracking-widest text-slate-600">
              Republic of the Philippines • City of Cebu
            </p>
            <h1 className="text-xl sm:text-2xl font-black font-serif uppercase tracking-tight text-slate-900">
              BARANGAY ZAPATERA
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
              OFFICE OF THE BARANGAY TREASURER
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-serif">
          Barangay Hall, 197 D. Jakosalem St., Cebu City • Contact: zapatera.lnb24@gmail.com
        </p>
      </div>

      {/* Statement Meta & Control Number */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs mb-6 pb-3 border-b border-slate-200 gap-2">
        <div>
          <p className="font-bold text-slate-900 text-sm">
            OFFICIAL STATEMENT OF COLLECTIONS & FEES
          </p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Audit Period: <strong className="text-slate-800">{periodLabel}</strong>
          </p>
        </div>
        <div className="text-right sm:text-right text-[11px] text-slate-600 font-mono">
          <p>Control No: <strong className="text-slate-900">{controlNo}</strong></p>
          <p>Generated: {dateFormatted} at {timeFormatted}</p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Collected</p>
          <p className="text-base font-black text-slate-900 mt-1">{formatCurrency(metrics.totalRevenue)}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid Clearances</p>
          <p className="text-base font-black text-slate-900 mt-1">{metrics.paidCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Waived / Indigent</p>
          <p className="text-base font-black text-slate-900 mt-1">{formatCurrency(metrics.waivedAmount)}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Audited</p>
          <p className="text-base font-black text-slate-900 mt-1">{requests.length}</p>
        </div>
      </div>

      {/* Revenue Breakdown Table */}
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Collections Breakdown By Clearance Document Type
        </h4>
        <table className="w-full text-xs text-left border border-slate-200">
          <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th className="p-2.5">Clearance Title</th>
              <th className="p-2.5 text-center">Total Requests</th>
              <th className="p-2.5 text-center">Paid Count</th>
              <th className="p-2.5 text-right">Revenue (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {metrics.breakdownList && metrics.breakdownList.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                <td className="p-2.5 font-medium text-slate-900">{item.name}</td>
                <td className="p-2.5 text-center text-slate-600">{item.totalTransactions}</td>
                <td className="p-2.5 text-center font-bold text-emerald-700">{item.paidTransactions}</td>
                <td className="p-2.5 text-right font-black text-slate-900">{formatCurrency(item.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
            <tr>
              <td className="p-2.5 uppercase font-bold">Total Collections:</td>
              <td className="p-2.5 text-center">{requests.length}</td>
              <td className="p-2.5 text-center">{metrics.paidCount}</td>
              <td className="p-2.5 text-right text-sm">{formatCurrency(metrics.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detailed Transaction Ledger Table */}
      <div className="mb-8">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Audited Collections Journal Ledger
        </h4>
        <table className="w-full text-[11px] text-left border border-slate-200">
          <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th className="p-2">Tracking No.</th>
              <th className="p-2">Resident / Payor</th>
              <th className="p-2">Clearance Type</th>
              <th className="p-2 text-right">Fee (PHP)</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {requests.slice(0, 25).map((r, idx) => {
              const fee = Number(r.fee ?? r.amount ?? 0);
              const isPaid = r.payment_status === 'paid' || r.is_paid === true || r.status === 'released' || r.status === 'completed';
              const isWaived = r.payment_status === 'waived' || r.is_waived === true;

              return (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="p-2 font-mono font-bold text-slate-900">{r.tracking_number || 'BZ-2026-PEND'}</td>
                  <td className="p-2 font-medium text-slate-800">{r.full_name || r.user_name || r.resident_name || 'Resident'}</td>
                  <td className="p-2 text-slate-700">{r.document_type || r.document_name || 'Clearance'}</td>
                  <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(fee)}</td>
                  <td className="p-2 text-center font-bold">
                    {isPaid ? 'PAID' : isWaived ? 'WAIVED' : 'UNPAID'}
                  </td>
                  <td className="p-2 text-slate-500 font-mono text-[10px]">
                    {formatDate(r.payment_date || r.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {requests.length > 25 && (
          <p className="text-[10px] text-slate-400 italic text-right mt-1">
            Showing first 25 transactions of {requests.length}. Complete ledger archived in Barangay Zapatera records.
          </p>
        )}
      </div>

      {/* OFFICIAL SIGNATORY BLOCKS */}
      <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
        {/* Prepared By Block */}
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-8">
            Prepared & Certified Correct:
          </p>
          <p className="font-serif font-black uppercase text-sm text-slate-900 tracking-wide border-b border-slate-900 pb-1 inline-block min-w-48">
            {treasurerName}
          </p>
          <p className="text-xs text-slate-600 font-bold uppercase mt-1">
            Barangay Treasurer
          </p>
          <p className="text-[10px] text-slate-400">Barangay Zapatera, Cebu City</p>
        </div>

        {/* Attested By Block */}
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-8">
            Attested & Noted By:
          </p>
          <p className="font-serif font-black uppercase text-sm text-slate-900 tracking-wide border-b border-slate-900 pb-1 inline-block min-w-48">
            {punongBarangay}
          </p>
          <p className="text-xs text-slate-600 font-bold uppercase mt-1">
            Punong Barangay
          </p>
          <p className="text-[10px] text-slate-400">Barangay Zapatera, Cebu City</p>
        </div>
      </div>

      {/* Footer Official Notice */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-serif">
        This document is an official financial transparency statement of Barangay Zapatera under the Local Government Code of 1991 (RA 7160).
      </div>
    </div>
  );
}

export default function PrintableFinancialModal({
  isOpen,
  onClose,
  config = {},
  currentUser = {},
  requests = [],
  metrics = {},
  periodLabel = 'All Time',
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Tracking Number', 'Resident Name', 'Document Type', 'Fee Amount (PHP)', 'Payment Status', 'Payment Mode', 'Date'];
    const rows = requests.map((r) => {
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
        `"${r.created_at || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barangay_Zapatera_Financial_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Printable Financial Ledger & Statement</h3>
              <p className="text-[11px] text-slate-400">Official Audited Statement • Ready for Legal / A4 Printing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Report</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Statement</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <PrintableFinancialDocument
          config={config}
          currentUser={currentUser}
          requests={requests}
          metrics={metrics}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
