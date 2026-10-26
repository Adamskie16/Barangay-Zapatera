import React from 'react';

/**
 * CivicPageLoader
 * Enterprise civic loader utilizing the official Barangay Zapatera seal.
 * Designed for initial application bootstrap, full-page route transitions,
 * and high-priority database synchronization.
 *
 * @param {string} message - Primary status message (default: 'Loading records...')
 * @param {string} submessage - Secondary descriptive text
 * @param {boolean} fullScreen - Covers viewport when true (default: true)
 * @param {boolean} showProgressBar - Renders subtle top-of-page progress indicator
 * @param {boolean} isDarkMode
 */
export function CivicPageLoader({
  message = 'Loading Barangay Records...',
  submessage = 'Connecting to municipal database',
  fullScreen = true,
  showProgressBar = true,
  isDarkMode = false,
  logoSrc = '/logo.png',
  className = '',
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`
        ${fullScreen ? 'fixed inset-0 z-50' : 'relative min-h-[360px] w-full'}
        flex flex-col items-center justify-center p-6
        bg-slate-900/40 text-slate-900 backdrop-blur-xs
        select-none ${className}
      `}
    >
      <span className="sr-only">{message}</span>

      {/* Top Route Progress Bar (GitHub / NProgress Civic Style) */}
      {showProgressBar && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-50 overflow-hidden">
          <div className="h-full bg-blue-500 animate-[pulse_1.5s_ease-in-out_infinite] w-full origin-left" />
        </div>
      )}

      {/* Centered Civic Card */}
      <div
        className="relative flex flex-col items-center p-8 sm:p-10 rounded-3xl border shadow-2xl max-w-sm w-full text-center bg-white/95 border-slate-200/90 shadow-slate-900/10"
      >
        {/* Logo Container with Dignified Spin Ring */}
        <div className="relative mb-6">
          {/* Subtle Outer Spinner Ring */}
          <div className="w-24 h-24 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin" />

          {/* Official Seal Logo in Center */}
          <div className="absolute inset-1.5 rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center p-1.5 border border-slate-100">
            <img
              src={logoSrc}
              alt="Barangay Zapatera Official Seal"
              className="w-full h-full object-contain animate-[pulse_3s_ease-in-out_infinite]"
              onError={(e) => {
                e.target.src = '/logo.jpg';
              }}
            />
          </div>
        </div>

        {/* Civic Typography */}
        <h3
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900"
        >
          {message}
        </h3>

        {submessage && (
          <p
            className="mt-1.5 text-xs font-medium tracking-wide text-slate-500"
          >
            {submessage}
          </p>
        )}

        {/* Municipal Verification Badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
          <span>Barangay Zapatera System</span>
        </div>
      </div>
    </div>
  );
}

export default CivicPageLoader;
