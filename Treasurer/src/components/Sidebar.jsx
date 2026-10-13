// Treasurer/src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  User,
  LogOut,
  ShieldCheck,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Financial Dashboard', icon: LayoutDashboard },
    { id: 'collections', label: 'Collections Ledger', icon: Receipt },
    { id: 'reports', label: 'Financial Reports & Audit', icon: FileSpreadsheet },
    { id: 'account', label: 'Treasurer Profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col min-h-screen border-r border-slate-800 shadow-2xl shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3.5 bg-gradient-to-b from-slate-950/80 to-slate-900/60 backdrop-blur-md">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-2 ring-amber-500/30 bg-white shadow-md shadow-amber-950/50 flex items-center justify-center shrink-0 p-0.5">
          <img
            src="/logo.png"
            alt="Barangay Zapatera Official Seal"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <h1 className="font-extrabold text-base text-white tracking-tight leading-none">Zapatera</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider mt-0.5">Treasurer Portal</p>
        </div>
      </div>

      {/* Role Notice Pill */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">Financial Auditing & Ledger</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
          <span>Financial Navigation</span>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/30 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className="flex items-center space-x-2.5 min-w-0 text-left cursor-pointer p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors flex-1"
          >
            <UserAvatar
              src={currentUser?.avatar_url}
              name={currentUser?.full_name || 'Barangay Treasurer'}
              role="treasurer"
              size="sm"
              isDarkMode={true}
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentUser?.full_name || 'Barangay Treasurer'}</p>
              <p className="text-[10px] text-amber-400 font-semibold truncate mt-0.5">Barangay Treasurer</p>
            </div>
          </button>

          <button
            onClick={onLogout}
            title="Sign out of Treasurer Portal"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
