import React from 'react';

/**
 * TableSkeleton
 * Enterprise 10-row data table skeleton designed to eliminate Cumulative Layout Shift (CLS).
 * Mirrors the exact geometry, column paddings, and height of Barangay Zapatera's
 * Document Requests and Transaction tables.
 *
 * @param {number} rows - Number of skeleton rows (default: 10)
 * @param {number} columns - Number of columns (default: 6)
 * @param {boolean} isDarkMode
 */
export function TableSkeleton({
  rows = 10,
  columns = 6,
  isDarkMode = false,
  className = '',
}) {
  const pulseBg = isDarkMode ? 'bg-slate-800/80' : 'bg-slate-200/80';
  const pulseSubtle = isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`w-full overflow-hidden rounded-2xl border ${
        isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
      } shadow-sm select-none ${className}`}
    >
      <span className="sr-only">Loading document records...</span>

      {/* Optional Table Top Controls Skeleton */}
      <div
        className={`px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar skeleton */}
          <div className={`h-10 w-64 rounded-xl animate-pulse ${pulseBg}`} />
          {/* Filter dropdown skeleton */}
          <div className={`h-10 w-32 rounded-xl animate-pulse ${pulseSubtle}`} />
        </div>
        {/* Right action / count skeleton */}
        <div className="flex items-center gap-2">
          <div className={`h-8 w-24 rounded-lg animate-pulse ${pulseSubtle}`} />
          <div className={`h-8 w-8 rounded-lg animate-pulse ${pulseBg}`} />
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Header row with simulated column titles */}
          <thead>
            <tr
              className={`border-b text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <th className="px-6 py-3.5">
                <div className={`h-3 w-20 rounded animate-pulse ${pulseBg}`} />
              </th>
              <th className="px-6 py-3.5">
                <div className={`h-3 w-28 rounded animate-pulse ${pulseBg}`} />
              </th>
              <th className="px-6 py-3.5">
                <div className={`h-3 w-24 rounded animate-pulse ${pulseBg}`} />
              </th>
              <th className="px-6 py-3.5">
                <div className={`h-3 w-32 rounded animate-pulse ${pulseBg}`} />
              </th>
              <th className="px-6 py-3.5">
                <div className={`h-3 w-16 rounded animate-pulse ${pulseBg}`} />
              </th>
              <th className="px-6 py-3.5 text-right">
                <div className={`h-3 w-14 rounded ml-auto animate-pulse ${pulseBg}`} />
              </th>
            </tr>
          </thead>

          {/* 10 Data Rows matching exact geometry */}
          <tbody
            className={`divide-y ${
              isDarkMode ? 'divide-slate-800/70' : 'divide-slate-100'
            }`}
          >
            {Array.from({ length: rows }).map((_, rIdx) => {
              // Vary widths slightly across rows for natural skeleton aesthetic
              const idWidths = ['w-24', 'w-20', 'w-28', 'w-22'];
              const nameWidths = ['w-36', 'w-44', 'w-32', 'w-40'];
              const purposeWidths = ['w-48', 'w-56', 'w-40', 'w-52'];

              const idW = idWidths[rIdx % idWidths.length];
              const nameW = nameWidths[rIdx % nameWidths.length];
              const purpW = purposeWidths[rIdx % purposeWidths.length];

              return (
                <tr
                  key={rIdx}
                  className={`transition-colors ${
                    isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Column 1: Tracking Number Pill */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`h-5 ${idW} rounded-md animate-pulse ${pulseBg}`} />
                    </div>
                  </td>

                  {/* Column 2: Avatar Circle + Resident Name & Subtitle */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full shrink-0 animate-pulse ${pulseBg}`} />
                      <div className="space-y-1.5 min-w-0">
                        <div className={`h-3.5 ${nameW} rounded animate-pulse ${pulseBg}`} />
                        <div className={`h-2.5 w-28 rounded animate-pulse ${pulseSubtle}`} />
                      </div>
                    </div>
                  </td>

                  {/* Column 3: Document Type Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className={`h-6 w-32 rounded-full animate-pulse ${pulseBg}`} />
                    </div>
                  </td>

                  {/* Column 4: Purpose / Notes Block */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className={`h-3 ${purpW} rounded animate-pulse ${pulseBg}`} />
                      <div className={`h-2.5 w-24 rounded animate-pulse ${pulseSubtle}`} />
                    </div>
                  </td>

                  {/* Column 5: Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`h-6 w-20 rounded-full animate-pulse ${pulseBg}`} />
                  </td>

                  {/* Column 6: Action Buttons */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className={`w-8 h-8 rounded-lg animate-pulse ${pulseSubtle}`} />
                      <div className={`w-8 h-8 rounded-lg animate-pulse ${pulseBg}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Skeleton */}
      <div
        className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
        }`}
      >
        <div className={`h-4 w-48 rounded animate-pulse ${pulseSubtle}`} />
        <div className="flex items-center gap-2">
          <div className={`h-8 w-20 rounded-lg animate-pulse ${pulseSubtle}`} />
          <div className={`h-8 w-8 rounded-lg animate-pulse ${pulseBg}`} />
          <div className={`h-8 w-8 rounded-lg animate-pulse ${pulseSubtle}`} />
          <div className={`h-8 w-20 rounded-lg animate-pulse ${pulseSubtle}`} />
        </div>
      </div>
    </div>
  );
}

export default TableSkeleton;
