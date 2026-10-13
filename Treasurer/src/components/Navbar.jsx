// Treasurer/src/components/Navbar.jsx
import React from 'react';
import { RefreshCw, Database, Shield, Menu } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({
  activeTitle,
  isRefreshing = false,
  onRefresh,
  paidTodayCount = 0,
  onToggleMobileMenu,
  currentUser,
}) {
  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Title & Mobile Hamburger Button */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile Hamburger Button (< 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 rounded-xl transition-all lg:hidden cursor-pointer active:scale-95 text-slate-600 hover:bg-slate-100"
          title="Open menu"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo (< 1024px) */}
        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 lg:hidden flex items-center justify-center p-0.5 bg-white border border-slate-200 shadow-xs">
          <img src="/logo.png" alt="Barangay Seal" className="w-full h-full object-contain" />
        </div>

        <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 tracking-tight truncate">{activeTitle}</h2>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          Auditing Mode
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Ledger Sync</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh financial data"
            disabled={isRefreshing}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Mobile User Avatar (< 1024px) */}
        <div className="lg:hidden pl-1">
          <UserAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || 'Barangay Treasurer'}
            role="treasurer"
            size="xs"
            isDarkMode={false}
          />
        </div>
      </div>
    </header>
  );
}
