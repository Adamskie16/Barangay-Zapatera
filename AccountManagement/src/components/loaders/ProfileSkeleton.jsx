import React from 'react';

/**
 * ProfileSkeleton
 * Comprehensive User Profile & Security Settings skeleton screen.
 * Covers user details, role permissions matrix, and audit session panels.
 *
 * @param {boolean} isDarkMode
 */
export function ProfileSkeleton({ isDarkMode = false, className = '' }) {
  const pulseBg = isDarkMode ? 'bg-slate-800/80' : 'bg-slate-200/80';
  const pulseSubtle = isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50';
  const cardBorder = isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`space-y-6 select-none ${className}`}
    >
      <span className="sr-only">Loading user profile & security details...</span>

      {/* Top Profile Header Banner Card */}
      <div className={`rounded-2xl border p-6 sm:p-8 ${cardBorder} shadow-sm space-y-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar Skeleton */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full animate-pulse ${pulseBg} border-4 ${isDarkMode ? 'border-slate-800' : 'border-white'} shadow-md`} />
            <div className={`absolute bottom-0 right-0 w-7 h-7 rounded-full animate-pulse ${pulseSubtle}`} />
          </div>

          {/* User Primary Info */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className={`h-7 w-48 rounded-lg animate-pulse ${pulseBg}`} />
              <div className={`h-6 w-24 rounded-full animate-pulse ${pulseSubtle}`} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className={`h-4 w-40 rounded animate-pulse ${pulseSubtle}`} />
              <div className={`h-4 w-32 rounded animate-pulse ${pulseSubtle}`} />
              <div className={`h-4 w-28 rounded animate-pulse ${pulseSubtle}`} />
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
            <div className={`h-10 w-28 rounded-xl animate-pulse ${pulseSubtle}`} />
            <div className={`h-10 w-32 rounded-xl animate-pulse ${pulseBg}`} />
          </div>
        </div>
      </div>

      {/* Grid: Details & Security Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Personal & Operational Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Block */}
          <div className={`rounded-2xl border p-6 ${cardBorder} shadow-sm space-y-5`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className={`h-5 w-44 rounded animate-pulse ${pulseBg}`} />
              <div className={`h-4 w-16 rounded animate-pulse ${pulseSubtle}`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className={`h-3 w-24 rounded animate-pulse ${pulseSubtle}`} />
                  <div className={`h-5 w-full rounded animate-pulse ${pulseBg}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Roles & Permissions Matrix Block */}
          <div className={`rounded-2xl border p-6 ${cardBorder} shadow-sm space-y-5`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className={`h-5 w-48 rounded animate-pulse ${pulseBg}`} />
              <div className={`h-4 w-20 rounded animate-pulse ${pulseSubtle}`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200/60 bg-slate-50'
                  }`}
                >
                  <div className={`h-3.5 w-24 rounded animate-pulse ${pulseBg}`} />
                  <div className={`w-4 h-4 rounded animate-pulse ${pulseSubtle}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Security & Login Sessions */}
        <div className="space-y-6">
          {/* Security & Authentication Status */}
          <div className={`rounded-2xl border p-6 ${cardBorder} shadow-sm space-y-5`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className={`h-5 w-36 rounded animate-pulse ${pulseBg}`} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className={`h-3.5 w-28 rounded animate-pulse ${pulseBg}`} />
                  <div className={`h-2.5 w-36 rounded animate-pulse ${pulseSubtle}`} />
                </div>
                <div className={`h-6 w-16 rounded-full animate-pulse ${pulseSubtle}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className={`h-3.5 w-32 rounded animate-pulse ${pulseBg}`} />
                  <div className={`h-2.5 w-40 rounded animate-pulse ${pulseSubtle}`} />
                </div>
                <div className={`h-6 w-20 rounded-full animate-pulse ${pulseSubtle}`} />
              </div>
            </div>
          </div>

          {/* Recent Login Sessions */}
          <div className={`rounded-2xl border p-6 ${cardBorder} shadow-sm space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className={`h-5 w-32 rounded animate-pulse ${pulseBg}`} />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDarkMode ? 'border-slate-800/80 bg-slate-800/20' : 'border-slate-100 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-3.5 w-24 rounded animate-pulse ${pulseBg}`} />
                    <div className={`h-3 w-16 rounded animate-pulse ${pulseSubtle}`} />
                  </div>
                  <div className={`h-3 w-36 rounded animate-pulse ${pulseSubtle}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
