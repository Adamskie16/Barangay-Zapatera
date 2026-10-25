// Treasurer/src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import {
  Home,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { SidebarSkeleton } from './SkeletonLoader';

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  loading = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('zapatera_treasurer_active_tab', tabId);
    } catch {}
    if (onCloseMobile) onCloseMobile();
  };

  // Primary Treasury Workspace Navigation Items
  const topLevelItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'reports', label: 'Collection Reports', icon: FileBarChart2 },
  ];

  const isAccountActive = activeTab === 'account';

  if (loading) {
    return <SidebarSkeleton isCollapsed={isCollapsed} isMobileOpen={isMobileOpen} />;
  }

  return (
    <>
      {/* Mobile Backdrop Overlay (< 1024px) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-40 ${
          isCollapsed ? 'lg:w-20 overflow-visible' : 'lg:w-64'
        } w-64 bg-[#f3f4f8] text-slate-800 flex flex-col h-screen border-r border-slate-200/80 shrink-0 select-none transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Card (Zapatera Seal + Treasurer Office badge indicator) */}
        <div
          className={`${
            isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
          } py-4 bg-white/90 rounded-b-3xl shadow-[0_2px_12px_rgba(15,23,42,0.03)] border-b border-slate-200/50 flex items-center relative`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar Collapse / Drawer Button matching the [|<] icon */}
            <div className="relative group/collapse">
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="w-8 h-8 rounded-lg border-[1.8px] border-slate-700 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 relative overflow-hidden"
                aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <span className="absolute left-1.5 top-0 bottom-0 w-[1.5px] bg-slate-700" />
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 ml-1.5 stroke-[2.5]" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5 ml-1.5 stroke-[2.5]" />
                )}
              </button>

              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold whitespace-nowrap opacity-0 translate-x-1 group-hover/collapse:opacity-100 group-hover/collapse:translate-x-0 transition-all duration-150 shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-slate-200/80 z-50">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-b border-slate-200/80 rotate-45" />
                  <span className="relative text-[#3b5bfd]">Expand Sidebar</span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/logo.png"
                  alt="Zapatera"
                  className="w-7 h-7 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <span className="block font-semibold text-base tracking-[0.14em] text-slate-800 uppercase leading-none truncate">
                    ZAPATERA
                  </span>
                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/70 text-[9px] font-bold uppercase tracking-wider text-[#3b5bfd]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd] animate-pulse" />
                    Treasurer Office
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button (< 1024px) */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 lg:hidden cursor-pointer transition-colors"
            title="Close navigation drawer"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav
          className={`flex-1 px-4 py-4 flex flex-col justify-between ${
            isCollapsed ? 'overflow-visible' : 'overflow-y-auto'
          }`}
        >
          {/* UPPER SECTION: Main Treasury Operations */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Workspace
              </div>
            )}

            {topLevelItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group/nav">
                  <button
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    aria-label={item.label}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'space-x-3.5 px-4'
                    } py-2.5 rounded-full text-[13px] transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? 'bg-[#3b5bfd] text-white font-semibold shadow-md shadow-blue-600/25'
                        : 'text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? 'text-white stroke-[2.2]' : 'text-slate-900 stroke-[2]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>

                  {/* Collapsed Floating Tooltip (Light UI Pill) */}
                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold whitespace-nowrap opacity-0 translate-x-1 group-hover/nav:opacity-100 group-hover/nav:translate-x-0 transition-all duration-150 shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-slate-200/80 z-50 flex items-center gap-1.5">
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-b border-slate-200/80 rotate-45" />
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd]" />}
                      <span className={`relative ${isActive ? 'text-[#3b5bfd]' : 'text-slate-800'}`}>
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* LOWER SECTION: Account & Settings */}
          <div className="pt-3 mt-3 border-t border-slate-200/80 space-y-1">
            {!isCollapsed && (
              <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Preferences
              </div>
            )}

            {/* Dedicated Settings Pill Item */}
            <div className="relative group/settings">
              <button
                type="button"
                onClick={() => handleSelectTab('account')}
                aria-label="Settings"
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'space-x-3.5 px-4'
                } py-2.5 rounded-full text-[13px] transition-all duration-200 cursor-pointer group ${
                  isAccountActive
                    ? 'bg-[#3b5bfd] text-white font-semibold shadow-md shadow-blue-600/25'
                    : 'text-slate-700 hover:bg-white/70 hover:text-slate-950 font-medium'
                }`}
              >
                <Settings
                  className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:rotate-45 ${
                    isAccountActive ? 'text-white stroke-[2.2]' : 'text-slate-900 stroke-[2]'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Settings</span>}
              </button>

              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-1.5 rounded-full bg-white text-slate-800 text-xs font-bold whitespace-nowrap opacity-0 translate-x-1 group-hover/settings:opacity-100 group-hover/settings:translate-x-0 transition-all duration-150 shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-slate-200/80 z-50 flex items-center gap-1.5">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-b border-slate-200/80 rotate-45" />
                  {isAccountActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd]" />}
                  <span className={`relative ${isAccountActive ? 'text-[#3b5bfd]' : 'text-slate-800'}`}>
                    Settings
                  </span>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom Floating User Profile Card */}
        <div className="p-3 pt-1">
          <div
            className={`bg-white rounded-3xl ${
              isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'
            } shadow-[0_4px_16px_rgba(15,23,42,0.04)] border border-slate-200/70 transition-all`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? 'flex-col gap-2' : 'justify-between gap-2 min-w-0'
              }`}
            >
              <div className={`relative group/profile ${isCollapsed ? '' : 'min-w-0 flex-1 overflow-hidden'}`}>
                <button
                  type="button"
                  onClick={() => handleSelectTab('account')}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center' : 'space-x-2.5 w-full'
                  } min-w-0 text-left cursor-pointer rounded-2xl transition-colors group`}
                  aria-label="Open Account Profile & Settings"
                  title={!isCollapsed ? `${currentUser?.full_name || 'Barangay Treasurer'} (${currentUser?.email || 'treasurer@zapatera.gov.ph'})` : undefined}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={currentUser?.avatar_url}
                      name={currentUser?.full_name || 'Barangay Treasurer'}
                      role="treasurer"
                      size="sm"
                      isDarkMode={false}
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                      title="Online Session"
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 group-hover:text-[#3b5bfd] transition-colors truncate leading-tight">
                          {currentUser?.full_name || 'Barangay Treasurer'}
                        </p>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                        {currentUser?.email || 'treasurer@zapatera.gov.ph'}
                      </p>
                    </div>
                  )}
                </button>

                {/* Collapsed Tooltip for User Profile (Light UI Card) */}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3.5 py-2.5 rounded-2xl bg-white text-slate-800 whitespace-nowrap opacity-0 translate-x-1 group-hover/profile:opacity-100 group-hover/profile:translate-x-0 transition-all duration-150 shadow-[0_10px_28px_rgba(15,23,42,0.12)] border border-slate-200/80 z-50">
                    <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-slate-200/80 rotate-45" />
                    <div className="relative">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                        <span>{currentUser?.full_name || 'Barangay Treasurer'}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3b5bfd]" />
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {currentUser?.email || 'treasurer@zapatera.gov.ph'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="w-8 h-8 rounded-xl bg-slate-100/90 text-slate-500 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-500/25 flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              ) : (
                <div className="relative group/logout">
                  <button
                    type="button"
                    onClick={onLogout}
                    aria-label="Sign Out"
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3.5 py-1.5 rounded-full bg-white text-rose-600 text-xs font-bold whitespace-nowrap opacity-0 translate-x-1 group-hover/logout:opacity-100 group-hover/logout:translate-x-0 transition-all duration-150 shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-rose-200/80 z-50">
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-b border-rose-200/80 rotate-45" />
                    <span className="relative">Sign Out</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
