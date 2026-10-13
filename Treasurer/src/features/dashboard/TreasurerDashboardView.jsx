// Treasurer/src/features/dashboard/TreasurerDashboardView.jsx
import React from 'react';
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
  Landmark,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

export default function TreasurerDashboardView({
  metrics,
  requests = [],
  docTypes = [],
  onNavigateToCollections,
  onNavigateToReports,
}) {
  const recentTransactions = requests.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900/80 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            Treasury & Financial Auditing System
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Barangay Financial Overview
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time tracking of documentary fee revenues, official receipt issuances, and verified payments for Barangay Zapatera.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.totalRevenue)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {metrics.paidCount} Paid Transactions
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
              {formatCurrency(metrics.todayRevenue)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Today: {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.thisMonthRevenue)}
            </h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Current Fiscal Month
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Waived / Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Waived / Indigent</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.waivedAmount)}
            </h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              {metrics.waivedCount} Indigent Clearances
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Collections Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Breakdown by Document Type */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Collections by Document Type</h2>
              <p className="text-xs text-slate-500">Distribution of collected fees across official clearance templates</p>
            </div>
            <button
              onClick={onNavigateToReports}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Generate Audit Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
                      <span>{item.paidTransactions} of {item.totalTransactions} paid transactions</span>
                      <span className="font-semibold text-amber-700">{percentage}% of total</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No transaction records found yet.</p>
            )}
          </div>
        </div>

        {/* Right Col: Quick Auditing Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Auditing Checklist</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              As Barangay Treasurer, all financial collections are strictly read-only for audit, verification, and transparency reporting.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
                <span className="font-medium">Paid Transactions</span>
                <span className="font-black">{metrics.paidCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-between">
                <span className="font-medium">Unpaid / In Process</span>
                <span className="font-black">{metrics.unpaidCount} ({formatCurrency(metrics.unpaidAmount)})</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center justify-between">
                <span className="font-medium">Waived Clearances</span>
                <span className="font-black">{metrics.waivedCount} ({formatCurrency(metrics.waivedAmount)})</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={onNavigateToCollections}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>Open Collections Ledger</span>
            </button>
            <button
              onClick={onNavigateToReports}
              className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Official Print Statements</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Collections Activity</h2>
            <p className="text-xs text-slate-500">Most recent document clearance requests and payment records</p>
          </div>
          <button
            onClick={onNavigateToCollections}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Tracking No.</th>
                <th className="p-3">Resident / Requestor</th>
                <th className="p-3">Document Type</th>
                <th className="p-3 text-right">Fee (PHP)</th>
                <th className="p-3 text-center">Payment Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((req, idx) => {
                  const fee = Number(req.fee ?? req.amount ?? 0);
                  const isPaid = req.payment_status === 'paid' || req.is_paid === true || req.status === 'released' || req.status === 'completed';
                  const isWaived = req.payment_status === 'waived' || req.is_waived === true;

                  return (
                    <tr key={req.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {req.tracking_number || 'BZ-2026-PEND'}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {req.full_name || req.user_name || req.resident_name || 'Resident'}
                      </td>
                      <td className="p-3 text-slate-700">
                        {req.document_type || req.document_name || 'Official Clearance'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(fee)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : isWaived
                              ? 'bg-purple-50 text-purple-800 border border-purple-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isPaid ? 'Paid' : isWaived ? 'Waived' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {formatDate(req.created_at || req.payment_date)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
