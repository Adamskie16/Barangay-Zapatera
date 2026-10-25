// Treasurer/src/components/SkeletonLoader.jsx
import React from 'react';
import ProfileSkeleton from './loaders/ProfileSkeleton';
import CivicPageLoader from './loaders/CivicPageLoader';
import Button from './loaders/Button';
import Spinner from './loaders/Spinner';
import useDelayedLoading from './loaders/useDelayedLoading';
import EnterpriseTableSkeleton from './loaders/TableSkeleton';

export function SkeletonBox({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

export function SkeletonCircle({ size = 'w-10 h-10', className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-full ${size} bg-slate-200/80 ${className}`}
    />
  );
}

export function SkeletonBadge({ className = 'w-20 h-6' }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-slate-200/70 ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 sm:p-6 rounded-[24px] border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all animate-pulse">
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-28 h-3.5" />
        <SkeletonCircle size="w-8 h-8" />
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonBox className="w-36 h-7" />
        <SkeletonBox className="w-24 h-3 opacity-70" />
      </div>
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <SkeletonBox className="w-20 h-2.5 opacity-60" />
        <SkeletonBox className="w-16 h-2.5 opacity-60" />
      </div>
    </div>
  );
}

/**
 * Treasurer Dashboard Skeleton
 * Accurately mirrors the exact 2-column layout of TreasurerDashboardView:
 * - Left column (5 cols): Activity 2x2 gradient KPI cards + Payment response rate donut card
 * - Right column (7 cols): Weekly calendar schedule strip + Revenue area/bar chart + Recent document payment queue
 */
export function DashboardSkeleton() {
  const cardStyle = 'bg-white rounded-[26px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)]';

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 text-slate-800 font-sans animate-in fade-in duration-200">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Activity (2x2 KPI) & Response Donut ================= */}
        <div className="xl:col-span-5 space-y-7">
          {/* 1. Treasury Activity Header + 2x2 Gradient KPI Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <SkeletonBox className="w-36 h-5" />
              <SkeletonBox className="w-28 h-4 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[22px] p-4 bg-white border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.03)] h-[135px] flex flex-col justify-between animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonCircle size="w-8 h-8" />
                    <SkeletonBadge className="w-14 h-5" />
                  </div>
                  <div className="space-y-1.5 my-auto">
                    <SkeletonBox className="w-28 h-6" />
                    <SkeletonBox className="w-20 h-3 opacity-60" />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <SkeletonBox className="w-16 h-2.5 opacity-50" />
                    <SkeletonBox className="w-12 h-2.5 opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Payment Response & Settlement Rate Donut Card */}
          <div className={`${cardStyle} space-y-5 animate-pulse`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SkeletonBox className="w-40 h-4" />
                <SkeletonBox className="w-32 h-2.5 opacity-60" />
              </div>
              <SkeletonBadge className="w-16 h-5" />
            </div>

            <div className="flex items-center justify-center py-3">
              <div className="w-36 h-36 rounded-full border-8 border-slate-200/70 flex items-center justify-center">
                <div className="space-y-1 text-center">
                  <SkeletonBox className="w-12 h-5 mx-auto" />
                  <SkeletonBox className="w-16 h-2.5 mx-auto opacity-60" />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <SkeletonBox className="w-24 h-3" />
                <SkeletonBox className="w-12 h-3" />
              </div>
              <SkeletonBox className="w-full h-2 rounded-full" />
              <div className="flex items-center justify-between">
                <SkeletonBox className="w-28 h-3" />
                <SkeletonBox className="w-12 h-3" />
              </div>
              <SkeletonBox className="w-full h-2 rounded-full" />
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Calendar Strip, Revenue Chart & Recent Payments ================= */}
        <div className="xl:col-span-7 space-y-7">
          {/* 1. Calendar Schedule & Week Strip Card */}
          <div className={`${cardStyle} space-y-5 animate-pulse`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SkeletonBox className="w-44 h-4" />
                <SkeletonBox className="w-32 h-2.5 opacity-60" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-8 h-8 rounded-xl" />
                <SkeletonBox className="w-8 h-8 rounded-xl" />
              </div>
            </div>

            {/* 7-Day Week Strip */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, d) => (
                <div
                  key={d}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <SkeletonBox className="w-6 h-2.5" />
                  <SkeletonCircle size="w-7 h-7" />
                </div>
              ))}
            </div>
          </div>

          {/* 2. Collections Revenue Trend Chart Card */}
          <div className={`${cardStyle} space-y-5 animate-pulse`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <SkeletonBox className="w-48 h-4 sm:h-5" />
                <SkeletonBox className="w-56 h-3 opacity-60" />
              </div>
              <div className="flex items-center gap-1.5">
                <SkeletonBox className="w-20 h-7 rounded-full" />
                <SkeletonBox className="w-20 h-7 rounded-full" />
              </div>
            </div>

            {/* SVG Chart Placeholder */}
            <div className="w-full h-56 rounded-2xl p-4 flex flex-col justify-end space-y-3 bg-slate-50/70 border border-slate-100">
              <div className="flex items-end justify-between gap-2 h-40 px-2">
                {[35, 60, 45, 75, 50, 90, 65, 80, 55, 70, 85, 95].map((h, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${h}%` }}
                      className="w-full rounded-t-lg transition-all bg-blue-200/70"
                    />
                    <SkeletonBox className="w-4 h-2 opacity-40" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <SkeletonBox className="w-32 h-3" />
              <SkeletonBox className="w-24 h-3.5" />
            </div>
          </div>

          {/* 3. Recent Document Payment Transactions Queue Card */}
          <div className={`${cardStyle} space-y-4 animate-pulse`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <SkeletonBox className="w-48 h-4" />
                <SkeletonBox className="w-36 h-2.5 opacity-60" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-16 h-7 rounded-full" />
                <SkeletonBox className="w-16 h-7 rounded-full" />
                <SkeletonBox className="w-16 h-7 rounded-full" />
              </div>
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, r) => (
                <div
                  key={r}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 border border-slate-100"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <SkeletonCircle size="w-9 h-9" />
                    <div className="space-y-1.5 min-w-0">
                      <SkeletonBox className="w-36 h-3.5" />
                      <SkeletonBox className="w-48 h-2.5 opacity-60" />
                    </div>
                  </div>
                  <div className="hidden sm:block space-y-1 text-right">
                    <SkeletonBox className="w-20 h-3" />
                    <SkeletonBox className="w-16 h-2.5 opacity-60 ml-auto" />
                  </div>
                  <SkeletonBadge className="w-18 h-6" />
                  <SkeletonBox className="w-20 h-8 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reports & Collections Skeleton
 */
export function ReportsSkeleton() {
  const cardStyle = 'bg-white rounded-[24px] border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)]';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card Skeleton */}
      <div className={`p-5 sm:p-6 rounded-[24px] border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardStyle}`}>
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonBox className="w-64 h-5" />
            <SkeletonBox className="w-80 h-3 opacity-60" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-36 h-8 rounded-full" />
          <SkeletonBox className="w-24 h-8 rounded-full" />
          <SkeletonBox className="w-28 h-8 rounded-full" />
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Dual Breakdown Card Skeleton */}
      <div className={`p-6 rounded-[24px] border space-y-4 ${cardStyle}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <SkeletonBox className="w-48 h-4 sm:h-5" />
          <div className="flex items-center gap-2">
            <SkeletonBox className="w-32 h-7 rounded-full" />
            <SkeletonBox className="w-28 h-7 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <SkeletonBox className="w-32 h-3.5" />
                <SkeletonBox className="w-20 h-4" />
              </div>
              <SkeletonBox className="w-full h-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 10-Row Table Skeleton */}
      <EnterpriseTableSkeleton rows={10} columns={6} />
    </div>
  );
}

/**
 * Account Settings Skeleton
 */
export function AccountSkeleton() {
  const cardStyle = 'bg-white rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)]';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* 2-Column Form Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className={`rounded-[26px] border p-6 sm:p-7 space-y-6 ${cardStyle}`}>
            {/* Light Banner Skeleton */}
            <div className="p-5 rounded-[22px] bg-[#f4f7fb] border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
              <SkeletonCircle size="w-20 h-20" />
              <div className="space-y-2 flex-1">
                <SkeletonBox className="w-48 h-5" />
                <SkeletonBox className="w-28 h-3.5 opacity-70" />
                <SkeletonBox className="w-40 h-3 opacity-50" />
              </div>
            </div>

            {/* Inputs Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <SkeletonBox className="w-24 h-3" />
                  <SkeletonBox className="w-full h-10 rounded-2xl" />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <SkeletonBox className="w-36 h-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className={`rounded-[26px] border p-6 sm:p-7 space-y-4 ${cardStyle}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <SkeletonBox className="w-40 h-4" />
              <SkeletonBadge className="w-20 h-5" />
            </div>
            <div className="space-y-3 pt-1">
              <SkeletonBox className="w-full h-10 rounded-2xl" />
              <SkeletonBox className="w-full h-10 rounded-2xl" />
              <SkeletonBox className="w-full h-10 rounded-2xl" />
            </div>
            <div className="pt-2">
              <SkeletonBox className="w-full h-10 rounded-full" />
            </div>
          </div>

          <div className={`rounded-[26px] border p-6 space-y-3 ${cardStyle}`}>
            <SkeletonBox className="w-32 h-4" />
            <SkeletonBox className="w-full h-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Global Page Skeleton for Treasurer
 */
export function GlobalPageSkeleton({ page = 'dashboard' }) {
  switch (page) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'reports':
    case 'collections':
      return <ReportsSkeleton />;
    case 'account':
      return <AccountSkeleton />;
    default:
      return <DashboardSkeleton />;
  }
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
                <div className="w-20 h-2.5 rounded-full bg-slate-200/70" />
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
          {Array.from({ length: 3 }).map((_, i) => (
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
  StatCardSkeleton,
  DashboardSkeleton,
  ReportsSkeleton,
  AccountSkeleton,
  GlobalPageSkeleton,
  SidebarSkeleton,
};
