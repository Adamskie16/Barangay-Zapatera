// SuperAdmin/src/components/MonthlyAnalytics.jsx
import React, { useState } from 'react';
import { BarChart3, Calendar, DollarSign, FileCheck, Filter, TrendingUp, Download } from 'lucide-react';
import { formatCurrency } from '../core/security';
import ErrorBoundary from './ErrorBoundary';

function MonthlyAnalyticsContent({ requests = [] }) {
  const [selectedMonth, setSelectedMonth] = useState('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const safeRequests = Array.isArray(requests) ? requests : [];
  const currentYear = new Date().getFullYear();

  const monthlyData = monthNames.map((monthName, idx) => {
    const monthRequests = safeRequests.filter((r) => {
      if (!r) return false;
      const dateStr = r.created_at || r.payment_date || r.updated_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d.getMonth() === idx;
    });

    const totalQuantity = monthRequests.length;
    const approvedQuantity = monthRequests.filter((r) => {
      const s = String(r?.status || '').toLowerCase().trim();
      return s === 'approved' || s === 'issued';
    }).length;
    const pendingQuantity = monthRequests.filter((r) => {
      const s = String(r?.status || '').toLowerCase().trim();
      return s === 'pending' || s === 'under_review' || s === 'processing';
    }).length;
    const declinedQuantity = monthRequests.filter((r) => {
      const s = String(r?.status || '').toLowerCase().trim();
      return s === 'declined' || s === 'rejected';
    }).length;
    const revenue = monthRequests
      .filter((r) => {
        const s = String(r?.status || '').toLowerCase().trim();
        return s === 'completed' || s === 'released' || Boolean(r?.is_claimed);
      })
      .reduce((sum, r) => sum + (Number(r?.fee ?? r?.amount) || 0), 0);

    return {
      monthIndex: idx,
      monthName,
      totalQuantity,
      approvedQuantity,
      pendingQuantity,
      declinedQuantity,
      revenue,
    };
  });

  // Calculate maximum quantity for scaling chart bars
  const maxQuantity = Math.max(...monthlyData.map((m) => m.totalQuantity), 10);

  // Filtered dataset for table or overview
  const filteredData = selectedMonth === 'all'
    ? monthlyData
    : monthlyData.filter((m) => m.monthIndex === Number(selectedMonth));

  const totalYtdQuantity = safeRequests.length;
  const totalYtdApproved = safeRequests.filter((r) => {
    const s = String(r?.status || '').toLowerCase().trim();
    return s === 'approved' || s === 'issued';
  }).length;
  const totalYtdRevenue = safeRequests
    .filter((r) => {
      const s = String(r?.status || '').toLowerCase().trim();
      return s === 'completed' || s === 'released' || Boolean(r?.is_claimed);
    })
    .reduce((sum, r) => sum + (Number(r?.fee ?? r?.amount) || 0), 0);

  const handleExportMonthlyCSV = () => {
    const dataToExport = filteredData.map((m) => {
      const total = Number(m.totalQuantity) || 0;
      const app = Number(m.approvedQuantity) || 0;
      const rate = total > 0 ? `${Math.round((app / total) * 100)}%` : '0%';
      return {
        'Month': `${m.monthName} ${currentYear}`,
        'Total Applications Received': total,
        'Approved & Issued Quantities': app,
        'Pending & Under Verification': Number(m.pendingQuantity) || 0,
        'Declined / Returned': Number(m.declinedQuantity) || 0,
        'Revenue Generated (PHP)': Number(m.revenue) || 0,
        'Completion Rate': rate,
      };
    });

    const separator = ',';
    const keys = Object.keys(dataToExport[0] || {});
    const headerLine = keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(separator);
    const dataLines = dataToExport.map((row) =>
      keys.map((k) => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(separator)
    );
    const csvContent = [headerLine, ...dataLines].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Barangay_Zapatera_Monthly_Analytics_${currentYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Monthly Document Issuance Analytics</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantitative breakdown of document request volume, approval rates, and revenue by month ({currentYear}).
          </p>
        </div>

        {/* Action Buttons & Filter Dropdown */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportMonthlyCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            title="Download Monthly Quantities as CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Months (Year {currentYear})</option>
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m} {currentYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart Visualization */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Monthly Quantity Volume Chart</span>
          <span className="text-slate-400 text-[11px] font-mono">Height scaled by total requests</span>
        </div>

        <div className="h-44 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-end justify-between space-x-2 overflow-x-auto">
          {monthlyData.map((m) => {
            const heightPercent = Math.round((m.totalQuantity / maxQuantity) * 100);
            const isSelected = selectedMonth !== 'all' && Number(selectedMonth) === m.monthIndex;

            return (
              <div
                key={m.monthIndex}
                onClick={() => setSelectedMonth(m.monthIndex.toString())}
                className="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end"
              >
                {/* Quantity Tooltip on hover */}
                <div className="mb-1 text-[10px] font-bold text-blue-800 opacity-80 group-hover:opacity-100 transition-opacity">
                  {m.totalQuantity > 0 ? `${m.totalQuantity} reqs` : '0'}
                </div>

                {/* Bar */}
                <div className="w-full max-w-[28px] bg-slate-200 rounded-t-md relative flex items-end overflow-hidden h-28">
                  <div
                    className={`w-full transition-all duration-500 rounded-t-md ${
                      isSelected
                        ? 'bg-blue-700 shadow-md shadow-blue-900/40'
                        : m.totalQuantity > 0
                        ? 'bg-blue-600 group-hover:bg-blue-500'
                        : 'bg-slate-300'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  />
                </div>

                {/* Month Name label */}
                <span className={`text-[10px] font-bold mt-2 tracking-tight ${isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-500'}`}>
                  {m.monthName.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quantitative Monthly Breakdown Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">Month</th>
              <th className="p-3 text-center">Total Reqs (Qty)</th>
              <th className="p-3 text-center">Approved (Qty)</th>
              <th className="p-3 text-center">Pending (Qty)</th>
              <th className="p-3 text-center">Declined (Qty)</th>
              <th className="p-3 text-right">Revenue (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredData.map((m) => (
              <tr key={m.monthIndex} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3 font-bold text-slate-900 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  {m.monthName} {currentYear}
                </td>
                <td className="p-3 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                  {m.totalQuantity}
                </td>
                <td className="p-3 text-center font-mono font-bold text-emerald-600">
                  {m.approvedQuantity}
                </td>
                <td className="p-3 text-center font-mono font-bold text-amber-600">
                  {m.pendingQuantity}
                </td>
                <td className="p-3 text-center font-mono font-bold text-rose-600">
                  {m.declinedQuantity}
                </td>
                <td className="p-3 text-right font-mono font-bold text-blue-700">
                  {formatCurrency(m.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-bold text-xs">
            <tr>
              <td className="p-3">YTD Total Summary</td>
              <td className="p-3 text-center font-mono text-blue-300">{totalYtdQuantity} Reqs</td>
              <td className="p-3 text-center font-mono text-emerald-400">{totalYtdApproved} Approved</td>
              <td className="p-3 text-center font-mono text-amber-300">
                {safeRequests.filter((r) => {
                  const s = String(r?.status || '').toLowerCase().trim();
                  return s === 'pending' || s === 'under_review' || s === 'processing';
                }).length} Pending
              </td>
              <td className="p-3 text-center font-mono text-rose-300">
                {safeRequests.filter((r) => {
                  const s = String(r?.status || '').toLowerCase().trim();
                  return s === 'declined' || s === 'rejected';
                }).length} Declined
              </td>
              <td className="p-3 text-right font-mono text-blue-300">{formatCurrency(totalYtdRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function MonthlyAnalytics(props) {
  return (
    <ErrorBoundary title="Monthly Document Analytics">
      <MonthlyAnalyticsContent {...props} />
    </ErrorBoundary>
  );
}
