// Admin/src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FileCheck2,
  FileText,
  Printer,
  Calendar,
  Newspaper,
  BarChart2,
  History,
  LogOut,
  User,
  Users,
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receive_request', label: 'Document Requests', icon: Inbox },
    { id: 'approved_documents', label: 'Approved Documents', icon: FileCheck2 },
    { id: 'doc_info', label: 'Official Document Generator', icon: Printer },
    { id: 'news', label: 'News & Bulletins', icon: Newspaper },
    { id: 'events', label: 'Barangay Events', icon: Calendar },
    { id: 'reports', label: 'Processing Reports', icon: BarChart2 },
    { id: 'users', label: 'User Account Security', icon: Users },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'account', label: 'My Account Profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col min-h-screen border-r border-slate-800 shadow-2xl shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center space-x-3.5 bg-gradient-to-b from-slate-950/80 to-slate-900/60 backdrop-blur-md">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-2 ring-blue-500/30 bg-white shadow-md shadow-blue-950/50 flex items-center justify-center shrink-0">
          <img
            src="/logo.jpg"
            alt="Zapatera Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <h1 className="font-extrabold text-base text-white tracking-tight leading-none">Zapatera</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
          <span>Operational Queue</span>
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
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/30 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
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
              name={currentUser?.full_name || 'Barangay Admin'}
              role={currentUser?.role || 'admin'}
              size="sm"
              isDarkMode={true}
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentUser?.full_name || 'Barangay Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser?.email}</p>
            </div>
          </button>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
