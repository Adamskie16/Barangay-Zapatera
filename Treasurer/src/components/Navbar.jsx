// Treasurer/src/components/Navbar.jsx
import React from 'react';
import { RefreshCw, Database, Shield } from 'lucide-react';

export default function Navbar({ activeTitle, isRefreshing = false, onRefresh, paidTodayCount = 0 }) {
  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center space-x-3.5">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{activeTitle}</h2>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Auditing Mode
        </span>
      </div>

      <div className="flex items-center space-x-3">
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
      </div>
    </header>
  );
}
