// AccountManagement/src/components/Navbar.jsx
import React from 'react';
import { Menu } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({
  activeTitle = 'User Account Provisioning & Roles',
  notificationsCount = 0,
  onToggleMobileMenu,
  currentUser,
}) {
  return (
    <header className="h-16 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200 backdrop-blur-md bg-white/90 border-slate-200/80 text-slate-900">
      {/* Title & Mobile Hamburger Button */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile Hamburger Button (< 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 rounded-xl transition-all lg:hidden cursor-pointer active:scale-95 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
        {/* Mobile User Avatar (< 1024px) */}
        <div className="lg:hidden pl-1">
          <UserAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || 'Admin User'}
            role={currentUser?.role || 'super_admin'}
            size="xs"
            isDarkMode={false}
          />
        </div>
      </div>
    </header>
  );
}
