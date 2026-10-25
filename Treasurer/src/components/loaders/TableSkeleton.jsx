import React from 'react';

/**
 * TableSkeleton
 * Enterprise data table skeleton designed to eliminate Cumulative Layout Shift (CLS).
 * Matches the light civic theme of Barangay Zapatera with zero black/dark backgrounds.
 *
 * @param {number} rows - Number of skeleton rows (default: 10)
 * @param {number} columns - Number of columns (default: 6)
 */
export function TableSkeleton({
  rows = 10,
  columns = 6,
  className = '',
}) {
  const pulseBg = 'bg-slate-200/80';
  const pulseSubtle = 'bg-slate-200/50';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`w-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.03)] select-none ${className}`}
    >
      <span className="sr-only">Loading document records...</span>

      {/* Table Top Controls Skeleton */}
      <div className="px-6 py-4 border-b border-slate-100 bg-[#f8fafc]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar skeleton */}
          <div className={`h-9 w-64 rounded-full animate-pulse ${pulseBg}`} />
          {/* Filter dropdown skeleton */}
          <div className={`h-9 w-32 rounded-full animate-pulse ${pulseSubtle}`} />
        </div>
        {/* Right action / count skeleton */}
        <div className="flex items-center gap-2">
          <div className={`h-8 w-24 rounded-full animate-pulse ${pulseSubtle}`} />
          <div className={`h-8 w-8 rounded-full animate-pulse ${pulseBg}`} />
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Header row with simulated column titles */}
          <thead>
            <tr className="border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider bg-[#f8fafc]">
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
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rIdx) => {
              const idWidths = ['w-24', 'w-20', 'w-28', 'w-22'];
              const nameWidths = ['w-36', 'w-44', 'w-32', 'w-40'];
              const purposeWidths = ['w-48', 'w-56', 'w-40', 'w-52'];

              const idW = idWidths[rIdx % idWidths.length];
              const nameW = nameWidths[rIdx % nameWidths.length];
              const purpW = purposeWidths[rIdx % purposeWidths.length];

              return (
                <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
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
      <div className="px-6 py-4 border-t border-slate-100 bg-[#f8fafc]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
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
