// AccountManagement/src/components/Navbar.jsx
import React from 'react';
import { Bell, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Navbar({
  activeTitle = 'User Account Provisioning & Roles',
  notificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
}) {
  return (
    <header className={`h-16 border-b px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200 backdrop-blur-md ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200/80 text-slate-900'
    }`}>
      {/* Title */}
      <div className="flex items-center space-x-3.5">
        <h2 className="text-lg font-extrabold tracking-tight">{activeTitle}</h2>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
          System Governance Active
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-2 border text-xs font-bold cursor-pointer active:scale-95 shadow-xs ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden md:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="hidden md:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button className={`p-2.5 rounded-xl transition-all relative cursor-pointer active:scale-95 ${
            isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}>
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
                {notificationsCount > 99 ? '99+' : notificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
