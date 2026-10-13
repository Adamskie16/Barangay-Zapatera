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
  DollarSign,
  Gift,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

export default function TreasurerDashboardView({
  metrics = {},
  requests = [],
  docTypes = [],
  config = {},
  onRefresh,
  onNavigateToCollections,
  onNavigateToReports,
}) {
  const recentTransactions = requests.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Blue Header Banner matching Zapatera system theme */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-3">
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            Barangay Zapatera Treasury
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Document Fee Collections
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Track document fees paid by residents, issue official receipts, and monitor total money collected for Barangay Zapatera.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Money Collected</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.totalRevenue || 0)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {metrics.paidCount || 0} Paid Requests
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
              {formatCurrency(metrics.todayRevenue || 0)}
            </h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Collected today
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month's Collections</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(metrics.thisMonthRevenue || 0)}
            </h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">
              Current month
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Free / Waived */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Free / Waived Requests</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {metrics.waivedCount || 0} Free
            </h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              {formatCurrency(metrics.waivedAmount || 0)} total waived
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Gift className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Collections by Document Type & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Breakdown by Document Type */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fees Collected by Document Type</h2>
              <p className="text-xs text-slate-500">Summary of payments received per document clearance</p>
            </div>
            <button
              onClick={onNavigateToReports}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Reports</span>
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
                      <span>{item.paidTransactions} of {item.totalTransactions} paid requests</span>
                      <span className="font-semibold text-blue-700">{percentage}% of total</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No payment records found yet.</p>
            )}
          </div>
        </div>

        {/* Right Col: Quick Overview & Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Payment Status Summary</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track pending payments and confirm receipts when residents claim their documents.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
                <span className="font-medium">Paid Documents</span>
                <span className="font-black">{metrics.paidCount || 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-between">
                <span className="font-medium">Waiting for Payment</span>
                <span className="font-black">{metrics.unpaidCount || 0} ({formatCurrency(metrics.unpaidAmount || 0)})</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center justify-between">
                <span className="font-medium">Free / Waived Requests</span>
                <span className="font-black">{metrics.waivedCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={onNavigateToCollections}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4 text-white" />
              <span>Record Payment & Issue Receipts</span>
            </button>
            <button
              onClick={onNavigateToReports}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Print Collection Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Document Payments</h2>
            <p className="text-xs text-slate-500">Latest document requests and payment status</p>
          </div>
          <button
            onClick={onNavigateToCollections}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All Payments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Tracking Number</th>
                <th className="p-3">Resident Name</th>
                <th className="p-3">Document</th>
                <th className="p-3 text-right">Fee</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Action</th>
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
                        {req.document_type || req.document_name || 'Clearance'}
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
                              : 'bg-blue-50 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {isPaid ? 'Paid' : isWaived ? 'Free (Waived)' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {formatDate(req.created_at || req.payment_date)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={onNavigateToCollections}
                          className="px-2.5 py-1 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {isPaid ? 'View Receipt' : 'Collect Fee'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No document payment records found.
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
