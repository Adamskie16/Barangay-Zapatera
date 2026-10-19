// AccountManagement/src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Navbar({
  activeTitle = 'User Account Provisioning & Roles',
  notificationsCount = 0,
  onToggleMobileMenu,
  currentUser,
  onLogout,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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
        {/* User Avatar & Profile Dropdown (All Screen Sizes: Desktop & CP) */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="flex items-center p-1 rounded-full hover:ring-2 hover:ring-blue-500/30 active:scale-95 transition-all cursor-pointer"
            title="Profile & Options"
            aria-label="User Profile Menu"
            aria-expanded={isProfileMenuOpen}
          >
            <UserAvatar
              src={currentUser?.avatar_url}
              name={currentUser?.full_name || 'Admin User'}
              role={currentUser?.role || 'super_admin'}
              size="xs"
              isDarkMode={false}
            />
          </button>

          {/* Profile Dropdown Menu on Mobile / CP */}
          {isProfileMenuOpen && (
            <>
              {/* Backdrop for mobile touch dismissal */}
              <div
                className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-xs"
                onClick={() => setIsProfileMenuOpen(false)}
                aria-hidden="true"
              />

              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                {/* Profile Identity Details */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-3">
                  <UserAvatar
                    src={currentUser?.avatar_url}
                    name={currentUser?.full_name || 'Admin User'}
                    role={currentUser?.role || 'super_admin'}
                    size="sm"
                    isDarkMode={false}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser?.full_name || 'Admin User'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                      {currentUser?.email}
                    </p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mt-1">
                      {currentUser?.role?.replace('_', ' ') || 'Admin User'}
                    </span>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="p-1.5 space-y-1">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
