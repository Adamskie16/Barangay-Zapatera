// Admin/src/components/Navbar.jsx
import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function Navbar({ activeTitle, pendingCount = 0 }) {
  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center space-x-3.5">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{activeTitle}</h2>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Desk Verification Active
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative">
          <button
            title={pendingCount > 0 ? `${pendingCount} pending requests awaiting review` : 'Notifications'}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
