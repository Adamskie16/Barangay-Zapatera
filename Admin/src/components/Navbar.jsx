// Admin/src/components/Navbar.jsx
import React from 'react';
import { Bell, Menu } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({
  activeTitle,
  pendingCount = 0,
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
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden cursor-pointer active:scale-95"
          title="Open navigation menu"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo (< 1024px) */}
        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 lg:hidden flex items-center justify-center p-0.5 bg-white border border-slate-200 shadow-xs">
          <img src="/logo.png" alt="Barangay Seal" className="w-full h-full object-contain" />
        </div>

        <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 tracking-tight truncate">{activeTitle}</h2>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="relative">
          <button
            title={pendingCount > 0 ? `${pendingCount} pending requests awaiting review` : 'Notifications'}
            className="p-2 sm:p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile User Avatar (< 1024px) */}
        <div className="lg:hidden pl-1">
          <UserAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || 'Barangay Admin'}
            role={currentUser?.role || 'admin'}
            size="xs"
            isDarkMode={false}
          />
        </div>
      </div>
    </header>
  );
}
