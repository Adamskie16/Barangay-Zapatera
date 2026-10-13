// SuperAdmin/src/components/Navbar.jsx
import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({
  activeTitle,
  notificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
  onToggleMobileMenu,
  currentUser,
}) {
  return (
    <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200 backdrop-blur-md ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200/80 text-slate-900'
    }`}>
      {/* Title & Mobile Hamburger Button */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile Hamburger Button (< 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`p-2 -ml-1 rounded-xl transition-all lg:hidden cursor-pointer active:scale-95 ${
            isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Open menu"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo (< 1024px) */}
        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 lg:hidden flex items-center justify-center p-0.5 bg-white border border-slate-200 shadow-xs">
          <img src="/logo.png" alt="Barangay Seal" className="w-full h-full object-contain" />
        </div>

        <h2 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight truncate">{activeTitle}</h2>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 sm:space-x-2 border text-xs font-bold cursor-pointer active:scale-95 shadow-xs ${
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

        {/* Mobile User Avatar (< 1024px) */}
        <div className="lg:hidden pl-1">
          <UserAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || 'Super Admin'}
            role={currentUser?.role || 'super_admin'}
            size="xs"
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </header>
  );
}
