// SuperAdmin/src/components/SkeletonLoader.jsx
import React from 'react';
import ProfileSkeleton from './loaders/ProfileSkeleton';
import CivicPageLoader from './loaders/CivicPageLoader';
import Button from './loaders/Button';
import Spinner from './loaders/Spinner';
import useDelayedLoading from './loaders/useDelayedLoading';
import EnterpriseTableSkeleton from './loaders/TableSkeleton';

export function SkeletonBox({ className = '', isDarkMode = false }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

export function SkeletonCircle({ size = 'w-10 h-10', isDarkMode = false, className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-full ${size} bg-slate-200/80 ${className}`}
    />
  );
}

export function SkeletonBadge({ className = 'w-20 h-6', isDarkMode = false }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-slate-200/70 ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5, isDarkMode = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse border-b border-slate-100">
          <td className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <SkeletonCircle size="w-9 h-9" isDarkMode={isDarkMode} />
              <div className="space-y-2">
                <SkeletonBox className="w-32 h-3.5" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-48 h-2.5 opacity-60" isDarkMode={isDarkMode} />
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <SkeletonBox className="w-24 h-6 rounded-full" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4 space-y-1.5">
            <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
            <SkeletonBox className="w-36 h-2.5 opacity-60" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4">
            <SkeletonBox className="w-28 h-6 rounded-full" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end space-x-2">
              <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function StatCardSkeleton({ isDarkMode = false }) {
  return (
    <div
      className="p-5 sm:p-6 rounded-3xl border transition-all animate-pulse bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2.5">
          <SkeletonBox className="w-24 h-3.5" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-20 h-7" isDarkMode={isDarkMode} />
        </div>
        <SkeletonCircle size="w-12 h-12" isDarkMode={isDarkMode} />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
        <SkeletonBox className="w-12 h-3" isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

/**
 * Superadmin Dashboard Skeleton
 * Precisely mirrors the Superadmin Dashboard architecture:
 * 1. Top welcome header + live date badge
 * 2. 4 Stat cards (Users, Pending, Issued, Collections)
 * 3. 2-column middle grid (Analytics chart card + Calendar schedule card)
 * 4. 2-column bottom grid (Recent applications table queue + Emergency alerts card)
 */
export function DashboardSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Welcome Bar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox className="w-48 h-6 sm:h-7" isDarkMode={isDarkMode} />
            <SkeletonBadge className="w-24 h-5" isDarkMode={isDarkMode} />
          </div>
          <SkeletonBox className="w-72 sm:w-96 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBox className="w-32 h-9 rounded-2xl" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-24 h-9 rounded-2xl" isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* 2. 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} isDarkMode={isDarkMode} />
        ))}
      </div>

      {/* 3. Middle Section: Analytics Chart (left) & Schedule Calendar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Document Issuance Analytics Area Chart Skeleton */}
        <div className={`lg:col-span-8 p-6 rounded-3xl border space-y-5 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <SkeletonBox className="w-48 h-5" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-64 h-3 opacity-60" isDarkMode={isDarkMode} />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBox className="w-24 h-8 rounded-full" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-20 h-8 rounded-full" isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Simulated chart waveform */}
          <div className="w-full h-64 rounded-2xl p-4 flex flex-col justify-end space-y-3 bg-slate-50/70 border border-slate-100">
            <div className="flex items-end justify-between gap-2 h-44 px-2">
              {[40, 65, 30, 85, 55, 95, 70, 45, 80, 60, 90, 75].map((h, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t-lg transition-all bg-blue-200/70"
                  />
                  <SkeletonBox className="w-4 h-2 opacity-40" isDarkMode={isDarkMode} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <SkeletonCircle size="w-2.5 h-2.5" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-20 h-3" isDarkMode={isDarkMode} />
              </div>
              <div className="flex items-center gap-1.5">
                <SkeletonCircle size="w-2.5 h-2.5" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-20 h-3" isDarkMode={isDarkMode} />
              </div>
            </div>
            <SkeletonBox className="w-28 h-3.5" isDarkMode={isDarkMode} />
          </div>
        </div>

        {/* Right: Calendar & Schedule Card Skeleton */}
        <div className={`lg:col-span-4 p-6 rounded-3xl border flex flex-col justify-between space-y-5 ${cardBg}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-36 h-5" isDarkMode={isDarkMode} />
              <div className="flex items-center gap-1.5">
                <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Days pills row */}
            <div className="grid grid-cols-7 gap-1 text-center py-1">
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={d} className="flex flex-col items-center gap-1.5 py-2 rounded-xl bg-slate-50">
                  <SkeletonBox className="w-3 h-2.5" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-4 h-4 rounded-md" isDarkMode={isDarkMode} />
                </div>
              ))}
            </div>

            {/* Event list */}
            <div className="space-y-2.5 pt-1">
              {Array.from({ length: 3 }).map((_, e) => (
                <div
                  key={e}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <SkeletonBox className="w-32 h-3.5" isDarkMode={isDarkMode} />
                    <SkeletonBox className="w-24 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                  </div>
                  <SkeletonBadge className="w-16 h-5" isDarkMode={isDarkMode} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
            <SkeletonCircle size="w-8 h-8" isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recent Applications Queue Table & Security/Emergency Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (8 cols): Recent Document Applications Queue */}
        <div className={`lg:col-span-8 p-6 rounded-3xl border space-y-4 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="space-y-1">
              <SkeletonBox className="w-44 h-5" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-56 h-3 opacity-60" isDarkMode={isDarkMode} />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBox className="w-20 h-7 rounded-full" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-20 h-7 rounded-full" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-24 h-8 rounded-xl" isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, r) => (
              <div
                key={r}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <SkeletonCircle size="w-9 h-9" isDarkMode={isDarkMode} />
                  <div className="space-y-1.5 min-w-0">
                    <SkeletonBox className="w-36 h-3.5" isDarkMode={isDarkMode} />
                    <SkeletonBox className="w-28 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                  </div>
                </div>
                <div className="hidden sm:block space-y-1">
                  <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-20 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                </div>
                <SkeletonBadge className="w-24 h-6" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-16 h-7 rounded-lg" isDarkMode={isDarkMode} />
              </div>
            ))}
          </div>
        </div>

        {/* Right (4 cols): System Bulletins & Alerts Card */}
        <div className={`lg:col-span-4 p-6 rounded-3xl border space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <SkeletonBox className="w-36 h-5" isDarkMode={isDarkMode} />
            <SkeletonBadge className="w-16 h-5" isDarkMode={isDarkMode} />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, a) => (
              <div
                key={a}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <SkeletonBadge className="w-20 h-4" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-14 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                </div>
                <SkeletonBox className="w-full h-3.5" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-4/5 h-3 opacity-70" isDarkMode={isDarkMode} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Documents / Document Management Skeleton
 */
export function DocumentsSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonBox className="w-56 h-6 sm:h-7" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-80 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-48 h-10 rounded-2xl" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-36 h-10 rounded-2xl" isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${cardBg}`}>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="w-20 h-8 rounded-full" isDarkMode={isDarkMode} />
          ))}
        </div>
        <SkeletonBox className="w-32 h-8 rounded-xl" isDarkMode={isDarkMode} />
      </div>

      {/* Document Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`p-6 rounded-3xl border space-y-4 ${cardBg}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size="w-12 h-12" isDarkMode={isDarkMode} />
                <div className="space-y-1.5">
                  <SkeletonBox className="w-32 h-4" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-20 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                </div>
              </div>
              <SkeletonBadge className="w-16 h-6" isDarkMode={isDarkMode} />
            </div>

            <div className="space-y-2 py-1">
              <SkeletonBox className="w-full h-3 opacity-80" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-4/5 h-3 opacity-60" isDarkMode={isDarkMode} />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <SkeletonBox className="w-24 h-3.5" isDarkMode={isDarkMode} />
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-16 h-8 rounded-xl" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-20 h-8 rounded-xl" isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * News & Bulletins Skeleton
 */
export function NewsSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonBox className="w-60 h-6 sm:h-7" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-80 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-44 h-10 rounded-2xl" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-36 h-10 rounded-2xl" isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Bulletin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`rounded-3xl border overflow-hidden space-y-4 ${cardBg}`}>
            {/* Banner Image Placeholder */}
            <div className="w-full h-44 bg-slate-200/80 animate-pulse relative">
              <div className="absolute top-3 left-3">
                <SkeletonBadge className="w-20 h-6" isDarkMode={isDarkMode} />
              </div>
            </div>

            <div className="p-5 pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <SkeletonBox className="w-24 h-2.5 opacity-60" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-16 h-2.5 opacity-60" isDarkMode={isDarkMode} />
              </div>

              <SkeletonBox className="w-full h-4" isDarkMode={isDarkMode} />
              <div className="space-y-1.5">
                <SkeletonBox className="w-full h-3 opacity-70" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-3/4 h-3 opacity-50" isDarkMode={isDarkMode} />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SkeletonCircle size="w-7 h-7" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-20 h-3" isDarkMode={isDarkMode} />
                </div>
                <SkeletonBox className="w-16 h-7 rounded-xl" isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Users Management Skeleton
 */
export function UsersSkeleton({ isDarkMode = false }) {
  return <EnterpriseTableSkeleton rows={8} columns={6} isDarkMode={isDarkMode} />;
}

/**
 * Archive & Trash Skeleton
 */
export function ArchiveSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonBox className="w-56 h-6 sm:h-7" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-72 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-28 h-9 rounded-2xl" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-24 h-9 rounded-2xl" isDarkMode={isDarkMode} />
        </div>
      </div>

      <div className={`p-4 rounded-3xl border flex items-center gap-3 ${cardBg}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="w-28 h-8 rounded-full" isDarkMode={isDarkMode} />
        ))}
      </div>

      <EnterpriseTableSkeleton rows={6} columns={5} isDarkMode={isDarkMode} />;
    </div>
  );
}

/**
 * System Configurations Skeleton
 */
export function ConfigSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonBox className="w-64 h-6 sm:h-7" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-80 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <SkeletonBox className="w-36 h-10 rounded-2xl" isDarkMode={isDarkMode} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`p-6 rounded-3xl border space-y-5 ${cardBg}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <SkeletonBox className="w-40 h-4" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-56 h-2.5 opacity-60" isDarkMode={isDarkMode} />
              </div>
              <SkeletonCircle size="w-8 h-8" isDarkMode={isDarkMode} />
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-full h-10 rounded-2xl" isDarkMode={isDarkMode} />
              </div>
              <div className="space-y-1.5">
                <SkeletonBox className="w-36 h-3" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-full h-10 rounded-2xl" isDarkMode={isDarkMode} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <SkeletonBox className="w-32 h-3" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-12 h-6 rounded-full" isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reports & Analytics Skeleton
 */
export function ReportsSkeleton({ isDarkMode = false }) {
  const cardBg = 'bg-white border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonBox className="w-60 h-6 sm:h-7" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-80 h-3.5 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBox className="w-32 h-9 rounded-2xl" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-32 h-9 rounded-2xl" isDarkMode={isDarkMode} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} isDarkMode={isDarkMode} />
        ))}
      </div>

      <div className={`p-6 rounded-3xl border space-y-4 ${cardBg}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <SkeletonBox className="w-44 h-5" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-24 h-8 rounded-xl" isDarkMode={isDarkMode} />
        </div>
        <div className="w-full h-48 rounded-2xl bg-slate-50 border border-slate-100 p-4" />
      </div>

      <EnterpriseTableSkeleton rows={5} columns={6} isDarkMode={isDarkMode} />
    </div>
  );
}

/**
 * Logs & Audit Trail Skeleton
 */
export function LogsSkeleton({ isDarkMode = false }) {
  return <EnterpriseTableSkeleton rows={10} columns={5} isDarkMode={isDarkMode} />;
}

/**
 * Global Page Skeleton Dispatcher
 * Instantly resolves the precise skeleton screen for any active tab across Superadmin and Admin.
 */
export function GlobalPageSkeleton({ page = 'dashboard', isDarkMode = false }) {
  switch (page) {
    case 'dashboard':
      return <DashboardSkeleton isDarkMode={isDarkMode} />;
    case 'documents':
    case 'doc_info':
      return <DocumentsSkeleton isDarkMode={isDarkMode} />;
    case 'news':
      return <NewsSkeleton isDarkMode={isDarkMode} />;
    case 'users':
      return <UsersSkeleton isDarkMode={isDarkMode} />;
    case 'archive':
      return <ArchiveSkeleton isDarkMode={isDarkMode} />;
    case 'config':
      return <ConfigSkeleton isDarkMode={isDarkMode} />;
    case 'reports':
      return <ReportsSkeleton isDarkMode={isDarkMode} />;
    case 'logs':
      return <LogsSkeleton isDarkMode={isDarkMode} />;
    case 'account':
      return <ProfileSkeleton isDarkMode={isDarkMode} />;
    case 'receive_request':
    case 'approved_documents':
      return <EnterpriseTableSkeleton rows={8} columns={6} isDarkMode={isDarkMode} />;
    default:
      return <DashboardSkeleton isDarkMode={isDarkMode} />;
  }
}

export function CardGridSkeleton({ count = 6, isDarkMode = false }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border space-y-4 animate-pulse bg-white border-slate-200"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <SkeletonBox className="w-36 h-4" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-20 h-3 opacity-60" isDarkMode={isDarkMode} />
            </div>
            <SkeletonBox className="w-16 h-6 rounded-full" isDarkMode={isDarkMode} />
          </div>
          <SkeletonBox className="w-full h-16 rounded-lg opacity-60" isDarkMode={isDarkMode} />
          <div className="pt-3 border-t border-slate-100 flex justify-between">
            <SkeletonBox className="w-24 h-4" isDarkMode={isDarkMode} />
            <SkeletonBox className="w-20 h-8 rounded-lg" isDarkMode={isDarkMode} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton({ isCollapsed = false, isMobileOpen = false }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-40 ${
        isCollapsed ? 'lg:w-20 overflow-visible' : 'lg:w-64'
      } w-64 bg-[#f3f4f8] text-slate-800 flex flex-col h-screen border-r border-slate-200/80 shrink-0 select-none animate-pulse transition-all duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Top Header Card */}
      <div
        className={`${
          isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
        } py-4 bg-white/90 rounded-b-3xl shadow-[0_2px_12px_rgba(15,23,42,0.03)] border-b border-slate-200/50 flex items-center`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-200/80 shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="w-20 h-3.5 rounded bg-slate-200/80" />
                <div className="w-16 h-2.5 rounded-full bg-slate-200/70" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-4 flex flex-col justify-between overflow-hidden">
        {/* Upper items */}
        <div className="space-y-2">
          {!isCollapsed && (
            <div className="px-3 pb-1">
              <div className="w-16 h-2 rounded bg-slate-200/70" />
            </div>
          )}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-full ${
                isCollapsed ? 'h-11 justify-center px-0' : 'h-11 px-3.5'
              } rounded-full bg-white/80 border border-slate-200/60 shadow-[0_2px_8px_rgba(15,23,42,0.02)] flex items-center gap-3`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-200/80 shrink-0" />
              {!isCollapsed && <div className="w-24 h-3.5 rounded bg-slate-200/80" />}
            </div>
          ))}

          {/* Group Header */}
          <div className="pt-3">
            {!isCollapsed && (
              <div className="px-3 pb-2 flex items-center justify-between">
                <div className="w-20 h-2 rounded bg-slate-200/70" />
                <div className="w-3 h-3 rounded bg-slate-200/70" />
              </div>
            )}
            <div className="space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-full ${
                    isCollapsed ? 'h-9 justify-center px-0' : 'h-9 pl-6 pr-3.5'
                  } rounded-full flex items-center gap-3`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-200/80 shrink-0" />
                  {!isCollapsed && <div className="w-20 h-3 rounded bg-slate-200/70" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Profile Pill */}
        <div className="pt-3">
          <div
            className={`w-full p-2.5 rounded-[24px] bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.03)] flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-200/80 shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="w-24 h-3.5 rounded bg-slate-200/80" />
                <div className="w-28 h-2.5 rounded bg-slate-200/60" />
                <div className="w-16 h-3 rounded-full bg-slate-200/70" />
              </div>
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export { default as ProfileSkeleton } from './loaders/ProfileSkeleton';
export { default as CivicPageLoader } from './loaders/CivicPageLoader';
export { default as Button } from './loaders/Button';
export { default as Spinner } from './loaders/Spinner';
export { default as useDelayedLoading } from './loaders/useDelayedLoading';
export { default as EnterpriseTableSkeleton } from './loaders/TableSkeleton';

export default {
  SkeletonBox,
  SkeletonCircle,
  SkeletonBadge,
  TableSkeleton,
  StatCardSkeleton,
  DashboardSkeleton,
  DocumentsSkeleton,
  NewsSkeleton,
  UsersSkeleton,
  ArchiveSkeleton,
  ConfigSkeleton,
  ReportsSkeleton,
  LogsSkeleton,
  GlobalPageSkeleton,
  CardGridSkeleton,
  SidebarSkeleton,
};
