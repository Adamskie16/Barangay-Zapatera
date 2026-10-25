import React from 'react';

/**
 * ProfileSkeleton
 * Comprehensive User Profile & Security Settings skeleton screen.
 * Matches light theme with zero dark/black backgrounds.
 */
export function ProfileSkeleton({ className = '' }) {
  const pulseBg = 'bg-slate-200/80';
  const pulseSubtle = 'bg-slate-200/50';
  const cardBorder = 'border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.03)]';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`space-y-6 select-none ${className}`}
    >
      <span className="sr-only">Loading user profile & security details...</span>

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`p-5 rounded-[24px] border ${cardBorder} animate-pulse flex items-center justify-between`}
          >
            <div className="space-y-2">
              <div className={`h-3 w-24 rounded animate-pulse ${pulseSubtle}`} />
              <div className={`h-6 w-32 rounded-lg animate-pulse ${pulseBg}`} />
              <div className={`h-2.5 w-20 rounded animate-pulse ${pulseSubtle}`} />
            </div>
            <div className={`w-12 h-12 rounded-2xl animate-pulse ${pulseSubtle} shrink-0`} />
          </div>
        ))}
      </div>

      {/* Main 2-Column Grid matching Admin */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className={`rounded-[26px] border p-6 sm:p-7 space-y-6 ${cardBorder}`}>
            {/* Light Banner Skeleton */}
            <div className="p-5 rounded-[22px] bg-[#f4f7fb] border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className={`w-20 h-20 rounded-2xl animate-pulse ${pulseBg} border-2 border-white shadow-md shrink-0`} />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-48 rounded-lg animate-pulse ${pulseBg}`} />
                  <div className={`h-5 w-24 rounded-full animate-pulse ${pulseSubtle}`} />
                </div>
                <div className={`h-3.5 w-24 rounded animate-pulse ${pulseSubtle}`} />
                <div className={`h-3 w-40 rounded animate-pulse ${pulseSubtle}`} />
              </div>
            </div>

            {/* Inputs Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className={`h-3 w-24 rounded animate-pulse ${pulseSubtle}`} />
                  <div className={`h-10 w-full rounded-2xl animate-pulse ${pulseBg}`} />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <div className={`h-10 w-36 rounded-full animate-pulse ${pulseBg}`} />
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className={`rounded-[26px] border p-6 sm:p-7 space-y-4 ${cardBorder}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className={`h-4 w-40 rounded animate-pulse ${pulseBg}`} />
              <div className={`h-5 w-20 rounded-full animate-pulse ${pulseSubtle}`} />
            </div>
            <div className="space-y-3 pt-1">
              <div className={`h-10 w-full rounded-2xl animate-pulse ${pulseBg}`} />
              <div className={`h-10 w-full rounded-2xl animate-pulse ${pulseBg}`} />
              <div className={`h-10 w-full rounded-2xl animate-pulse ${pulseBg}`} />
            </div>
            <div className="pt-2">
              <div className={`h-10 w-full rounded-full animate-pulse ${pulseBg}`} />
            </div>
          </div>

          <div className={`rounded-[26px] border p-6 space-y-3 ${cardBorder}`}>
            <div className={`h-4 w-32 rounded animate-pulse ${pulseBg}`} />
            <div className={`h-10 w-full rounded-full animate-pulse ${pulseSubtle}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
