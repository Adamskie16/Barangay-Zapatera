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
} from 'lucide-react';
import PrintableFinancialModal from './PrintableFinancialModal';
import { formatCurrency } from '../../core/security';
import { StorageService } from '../../core/storage';

export default function TreasurerReportsView({
  requests = [],
  docTypes = [],
  config = {},
  currentUser = {},
}) {
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'month' | 'year'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
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

      {/* Printable Financial Modal */}
      <PrintableFinancialModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        config={config}
        currentUser={currentUser}
        requests={filteredRequests}
        metrics={filteredMetrics}
        periodLabel={periodLabel}
      />
    </div>
  );
}
