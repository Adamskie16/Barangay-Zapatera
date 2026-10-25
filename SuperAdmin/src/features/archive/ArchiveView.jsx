// SuperAdmin/src/features/archive/ArchiveView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Newspaper,
  Users,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Tag,
  Flame,
  AlertCircle,
  Activity,
} from 'lucide-react';
import Modal from '../../components/Modal';
import ActionModal from '../../components/ActionModal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';
import UserAvatar from '../../components/UserAvatar';
import { StorageService } from '../../core/storage';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { getLogCategory } from '../logs/LogsView';
import { ArchiveSkeleton, TableSkeleton } from '../../components/SkeletonLoader';

export default function ArchiveView({ currentUser, isDarkMode = false }) {
  // RBAC Guard - strictly accessible ONLY by admin and super_admin
  const userRole = (currentUser?.role || '').toLowerCase();
  const hasAccess = userRole === 'super_admin' || userRole === 'admin';

  // Active Tab state: 'announcements' | 'users' | 'activity_logs'
  const [activeTab, setActiveTab] = useState('announcements');

  // Datasets
  const [archivedNews, setArchivedNews] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedActivityLogs, setArchivedActivityLogs] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Table Sorting & 10-Row Standard Pagination
  const [sortKey, setSortKey] = useState('deleted_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Security Verification Modal State
  const [securityVerification, setSecurityVerification] = useState({
    isOpen: false,
    item: null,
    actionType: null, // 'restore' | 'purge'
    dataType: null,   // 'announcements' | 'users' | 'activity_logs'
  });

  // Action Confirmation & Feedback Modal
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonText: 'OK',
    isDestructive: false,
    isLoading: false,
    onConfirm: null,
    onClose: null,
  });

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Item Inspection / Details Modal
  const [inspectItem, setInspectItem] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Resolve actor name from UUID or object
  const resolveActorName = (actorIdOrName) => {
    if (!actorIdOrName) return 'Super Admin';
    if (typeof actorIdOrName === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorIdOrName)) {
      const match = profilesMap[actorIdOrName];
      if (match?.full_name) return match.full_name;
      if (match?.email) return match.email;
    }
    return actorIdOrName;
  };

  // Load archived datasets from StorageService & Supabase
  const loadArchivedData = async () => {
    setLoading(true);
    try {
      const lookup = {};
      try {
        if (isSupabaseConfigured()) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name, email, role');
          if (Array.isArray(profs)) {
            profs.forEach((p) => {
              lookup[p.id] = p;
            });
          }
        }
      } catch (e) {}

      const localUsers = StorageService.getUsers ? StorageService.getUsers() : [];
      localUsers.forEach((u) => {
        if (u.id) lookup[u.id] = u;
      });
      setProfilesMap(lookup);

      const [newsData, usersData, activityLogsData] = await Promise.all([
        StorageService.getArchivedAnnouncementsAsync ? StorageService.getArchivedAnnouncementsAsync() : Promise.resolve([]),
        StorageService.getArchivedUsersAsync ? StorageService.getArchivedUsersAsync() : Promise.resolve([]),
        StorageService.getArchivedActivityLogsAsync ? StorageService.getArchivedActivityLogsAsync() : Promise.resolve([]),
      ]);

      setArchivedNews(Array.isArray(newsData) ? newsData : []);
      setArchivedUsers(Array.isArray(usersData) ? usersData : []);
      setArchivedActivityLogs(Array.isArray(activityLogsData) ? activityLogsData : []);
    } catch (err) {
      console.error('Failed to load archived records:', err);
      showToast('Failed to load archive repository data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchivedData();
  }, []);

  // Reset page to 1 whenever tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, pageSize]);

  // Handle Sort Toggle
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter and sort the active dataset
  const processedData = useMemo(() => {
    let dataset = [];
    if (activeTab === 'announcements') dataset = [...archivedNews];
    else if (activeTab === 'users') dataset = [...archivedUsers];
    else if (activeTab === 'activity_logs') dataset = [...archivedActivityLogs];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      if (activeTab === 'announcements') {
        dataset = dataset.filter(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q) ||
            (item.author || '').toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (item.content || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'users') {
        dataset = dataset.filter(
          (u) =>
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.role || '').toLowerCase().includes(q) ||
            (u.phone || u.contact_number || '').toLowerCase().includes(q) ||
            (u.address || '').toLowerCase().includes(q) ||
            (u.sitio || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'activity_logs') {
        dataset = dataset.filter(
          (l) =>
            (l.action || '').toLowerCase().includes(q) ||
            (l.feature || '').toLowerCase().includes(q) ||
            (l.details || '').toLowerCase().includes(q) ||
            (l.user_email || l.user || '').toLowerCase().includes(q) ||
            (l.category || '').toLowerCase().includes(q)
        );
      }
    }

    // Sort
    dataset.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'deleted_at' || sortKey === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return dataset;
  }, [activeTab, archivedNews, archivedUsers, archivedActivityLogs, searchQuery, sortKey, sortDirection]);

  // Strict 10-Row Pagination Calculations
  const totalEntries = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, safeCurrentPage, pageSize]);

  // Page Numbers Builder
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (safeCurrentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // Trigger Security Verification for Restore
  const handlePromptRestore = (item, type) => {
    setSecurityVerification({
      isOpen: true,
      item,
      actionType: 'restore',
      dataType: type || activeTab,
    });
  };

  // Trigger Security Verification for Permanent Purge
  const handlePromptPurge = (item, type) => {
    setSecurityVerification({
      isOpen: true,
      item,
      actionType: 'purge',
      dataType: type || activeTab,
    });
  };

  // Execute Verified Restore Action
  const executeVerifiedRestore = async () => {
    const { item, dataType } = securityVerification;
    if (!item) return;

    try {
      if (dataType === 'announcements') {
        await StorageService.restoreNews(item.id, currentUser);
      } else if (dataType === 'users') {
        await StorageService.restoreUser(item.id, currentUser);
      } else if (dataType === 'activity_logs') {
        await StorageService.restoreActivityLog(item.id, currentUser);
      }

      await loadArchivedData();
      if (inspectItem?.id === item.id) {
        setInspectItem(null);
      }

      const itemLabel = dataType === 'announcements' ? 'announcement' : dataType === 'users' ? 'user account' : 'activity log';
      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Record Restored Successfully',
        message: `The ${itemLabel} has been restored back to active status.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Failed to restore record:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Restore Failed',
        message: 'Could not restore the item from archive. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    }
  };

  // Execute Verified Purge Action
  const executeVerifiedPurge = async () => {
    const { item, dataType } = securityVerification;
    if (!item) return;

    try {
      if (dataType === 'announcements') {
        await StorageService.purgeNews(item.id, currentUser);
      } else if (dataType === 'users') {
        await StorageService.purgeUser(item.id, currentUser);
      } else if (dataType === 'activity_logs') {
        await StorageService.purgeActivityLog(item.id, currentUser);
      }

      await loadArchivedData();
      if (inspectItem?.id === item.id) {
        setInspectItem(null);
      }

      const itemLabel = dataType === 'announcements' ? 'announcement' : dataType === 'users' ? 'user account' : 'activity log';
      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Record Permanently Deleted',
        message: `The ${itemLabel} has been permanently erased from the database.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      console.error('Failed to purge record:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Purge Failed',
        message: 'Could not permanently delete the record. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    }
  };

  // Unauthorized Access Guard UI
  if (!hasAccess) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="p-8 rounded-[28px] bg-white border border-rose-100 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Restricted Area</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have permission to view the archive. Please contact a super administrator.
          </p>
        </div>
      </div>
    );
  }

  const totalArchivedCount = archivedNews.length + archivedUsers.length + archivedActivityLogs.length;

  if (loading && !archivedNews.length && !archivedUsers.length && !archivedActivityLogs.length) {
    return <ArchiveSkeleton isDarkMode={isDarkMode} />;
  }

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-full shadow-xl border flex items-center space-x-3 text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <Archive className="w-3.5 h-3.5" />
            <span>Data Recovery & Retention</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            Archive & Trash Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Inspect, restore, or permanently purge archived news announcements, soft-deleted user accounts, and activity logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700">
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>{totalArchivedCount} Total Archived</span>
          </div>
          <button
            type="button"
            onClick={loadArchivedData}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Archive</span>
          </button>
        </div>
      </div>

      {/* 4 Colorful Gradient KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Archived Repository */}
        <div
          onClick={() => setSearchQuery('')}
          className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Archive className="w-5 h-5 text-[#0284c7]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              All Vaults
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{totalArchivedCount}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Total Archived Items</p>
            <p className="text-[11px] text-white/75 mt-1">Recoverable with admin password</p>
          </div>
        </div>

        {/* Card 2: Archived Bulletins */}
        <div
          onClick={() => setActiveTab('announcements')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${
            activeTab === 'announcements' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Newspaper className="w-5 h-5 text-[#4f46e5]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Bulletins
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{archivedNews.length}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Announcements Archive</p>
            <p className="text-[11px] text-white/75 mt-1">Deleted news & advisories</p>
          </div>
        </div>

        {/* Card 3: Archived User Accounts */}
        <div
          onClick={() => setActiveTab('users')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] shadow-amber-500/15 hover:scale-[1.01] ${
            activeTab === 'users' ? 'ring-4 ring-offset-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-[#ea580c]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Accounts
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{archivedUsers.length}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">User Accounts Archive</p>
            <p className="text-[11px] text-white/75 mt-1">Soft-deleted citizen & staff profiles</p>
          </div>
        </div>

        {/* Card 4: Archived Activity Logs */}
        <div
          onClick={() => setActiveTab('activity_logs')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01] ${
            activeTab === 'activity_logs' ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Audit Logs
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{archivedActivityLogs.length}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Activity Logs Archive</p>
            <p className="text-[11px] text-white/75 mt-1">Archived system audit records</p>
          </div>
        </div>
      </div>

      {/* Main Content Card: Category Tabs + Search + Table + Pagination */}
      <div className="bg-white rounded-[26px] border border-slate-100/80 shadow-xs overflow-hidden">
        {/* Top Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'announcements', label: 'Announcements Archive', icon: Newspaper, count: archivedNews.length },
              { id: 'users', label: 'User Accounts Archive', icon: Users, count: archivedUsers.length },
              { id: 'activity_logs', label: 'Activity Logs Archive', icon: Activity, count: archivedActivityLogs.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                      : 'bg-[#f4f7fb] text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'announcements'
                    ? 'Search title, category, author...'
                    : activeTab === 'users'
                    ? 'Search name, email, role, phone...'
                    : 'Search action, actor, details...'
                }
                className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-full bg-[#f4f7fb] border border-transparent focus:border-blue-200 focus:bg-white text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => handleSort('deleted_at')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                sortKey === 'deleted_at'
                  ? 'bg-blue-50 border-blue-200 text-[#3b5bfd]'
                  : 'bg-[#f4f7fb] border-transparent text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Date Archived</span>
              {sortKey === 'deleted_at' &&
                (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-w-full">
          {/* 1. Announcements Table */}
          {activeTab === 'announcements' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('title')}>
                    <div className="flex items-center space-x-1">
                      <span>Announcement / Title</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('category')}>
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('author')}>
                    <div className="flex items-center space-x-1">
                      <span>Author</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date Posted</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Archived By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Archive className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No Archived Announcements Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deleted announcements from News & Bulletins will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const archivedByName = resolveActorName(item.archived_by_name || item.deleted_by);
                    return (
                      <tr key={item.id} className="hover:bg-[#f4f7fb]/60 transition-colors">
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex items-center space-x-3">
                            {item.banner_url ? (
                              <img src={item.banner_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center shrink-0 border border-blue-100">
                                <Newspaper className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate">{item.title}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{item.description || item.content}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-blue-50 text-[#3b5bfd] border border-blue-100">
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700">
                          {item.author || item.created_by_name || 'Administration'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            {item.deleted_at ? formatDate(item.deleted_at) : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectItem({ ...item, _type: 'announcements' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handlePromptRestore(item, 'announcements')}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Announcement"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(item, 'announcements')}
                              className="p-2 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* 2. User Accounts Table */}
          {activeTab === 'users' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center space-x-1">
                      <span>User Account</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('email')}>
                    <div className="flex items-center space-x-1">
                      <span>Email</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('role')}>
                    <div className="flex items-center space-x-1">
                      <span>Role</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Contact / Sitio</th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Archived By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No Archived User Accounts Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deleted user accounts will appear here and can be restored anytime.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((u) => {
                    const archivedByName = resolveActorName(u.archived_by_name || u.deleted_by);
                    return (
                      <tr key={u.id} className="hover:bg-[#f4f7fb]/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <UserAvatar user={u} size="sm" />
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate">{u.full_name || 'Barangay Citizen'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {u.id?.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                              u.role === 'admin' || u.role === 'super_admin'
                                ? 'bg-blue-50 text-[#3b5bfd] border-blue-200'
                                : u.role === 'treasurer'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {u.role || 'resident'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-[11px]">
                          <p className="font-semibold text-slate-700">{u.phone || u.contact_number || 'No phone'}</p>
                          <p className="text-[10px] text-slate-400">{u.sitio || u.address || 'Zapatera'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            {u.deleted_at ? formatDate(u.deleted_at) : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectItem({ ...u, _type: 'users' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Inspect Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handlePromptRestore(u, 'users')}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore User Account"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(u, 'users')}
                              className="p-2 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* 3. Activity Logs Table */}
          {activeTab === 'activity_logs' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('user_email')}>
                    <div className="flex items-center space-x-1">
                      <span>Performed By</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('category')}>
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('action')}>
                    <div className="flex items-center space-x-1">
                      <span>Action</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Activity Details</th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Archived By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Activity className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No Archived Activity Logs Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deleted activity logs will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const archivedByName = resolveActorName(item.archived_by_name || item.deleted_by);
                    const userEmail = item.user_email || item.user || 'admin@zapatera.gov';
                    const initial = userEmail.charAt(0).toUpperCase();
                    const cat = item.category || getLogCategory(item);
                    return (
                      <tr
                        key={item.id}
                        title={`Archived Activity: ${item.action || 'Activity'} by ${userEmail} (${formatDate(item.created_at)})`}
                        className="hover:bg-[#f4f7fb]/60 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#3b5bfd] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[170px]" title={userEmail}>
                              {userEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                              cat === 'Event'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : cat === 'Bulletin'
                                ? 'bg-blue-50 text-[#3b5bfd] border-blue-200'
                                : cat === 'User Account'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {cat}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-900">
                          {item.action || 'Log Entry'}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-slate-600 text-xs line-clamp-2 leading-relaxed" title={item.details}>
                            {item.details || 'Activity record successfully committed.'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            {item.deleted_at ? formatDate(item.deleted_at) : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectItem({ ...item, _type: 'activity_logs' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handlePromptRestore(item, 'activity_logs')}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Activity Log"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(item, 'activity_logs')}
                              className="p-2 rounded-full text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Circular Pagination Footer */}
        <div className="px-6 py-4 bg-[#f8fafc] border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="font-medium">
            Showing <span className="font-extrabold text-slate-800">{paginatedData.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-extrabold text-slate-800">{Math.min(safeCurrentPage * pageSize, totalEntries)}</span> of{' '}
            <span className="font-extrabold text-slate-800">{totalEntries}</span> records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1.5">
              {getPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`dots-${i}`} className="px-2 py-1 text-slate-400 font-bold">…</span>
                ) : (
                  <button
                    key={`page-${num}`}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 text-xs font-bold rounded-full transition-all cursor-pointer ${
                      safeCurrentPage === num
                        ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                        : 'bg-white border border-slate-200 hover:bg-[#f4f7fb] text-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#f4f7fb] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Simplified & Organized Archived Item Details Modal */}
      {inspectItem && (
        <Modal
          isOpen={!!inspectItem}
          onClose={() => setInspectItem(null)}
          title={
            inspectItem._type === 'users'
              ? 'Archived User Profile'
              : inspectItem._type === 'activity_logs'
              ? 'Archived Activity Log Details'
              : 'Archived Announcement Details'
          }
          subtitle="Review archived record metadata before restoring"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info box */}
            <div className="p-4 bg-[#f4f7fb] rounded-[22px] space-y-1.5 border border-slate-200/70">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-extrabold text-slate-900 text-base">
                  {inspectItem.full_name || inspectItem.action || inspectItem.title || inspectItem.email}
                </p>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                  Archived Record
                </span>
              </div>
              <p className="text-slate-500 text-xs">
                Archived on{' '}
                <span className="font-bold text-slate-700">
                  {formatDate(inspectItem.deleted_at)}
                </span>{' '}
                by{' '}
                <span className="font-bold text-slate-800">
                  {resolveActorName(inspectItem.archived_by_name || inspectItem.deleted_by)}
                </span>
              </p>
            </div>

            {/* A. Rich Activity Log View */}
            {inspectItem._type === 'activity_logs' ? (
              <div className="space-y-4">
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center space-x-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-lg border border-purple-100 shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base truncate">
                      {inspectItem.action || 'Activity Log'}
                    </h3>
                    <p className="text-slate-500 font-mono text-xs truncate">
                      {inspectItem.user_email || inspectItem.user || 'admin@zapatera.gov'}
                    </p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-purple-50 text-purple-700 border border-purple-200">
                      Category: {inspectItem.category || getLogCategory(inspectItem)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Performed By</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.user_email || inspectItem.user || 'Admin'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date & Time Logged</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feature / Module</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.feature || 'General'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Log Reference ID</span>
                    <span className="font-mono text-slate-800 text-xs mt-1 block truncate">
                      {inspectItem.id}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Details</span>
                  <div className="p-3.5 bg-[#f4f7fb] border border-slate-200/60 rounded-2xl text-slate-800 leading-relaxed font-medium">
                    {inspectItem.details || 'Activity record successfully committed to system database.'}
                  </div>
                </div>
              </div>
            ) : inspectItem._type === 'users' ? (
              <div className="space-y-4">
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center space-x-4 shadow-2xs">
                  <UserAvatar user={inspectItem} size="lg" />
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {inspectItem.full_name || `${inspectItem.first_name || ''} ${inspectItem.last_name || ''}`}
                    </h3>
                    <p className="text-slate-500 font-mono text-xs">{inspectItem.email}</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-blue-50 text-[#3b5bfd] border border-blue-200">
                      Role: {inspectItem.role || 'resident'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.phone || inspectItem.contact_number || 'Not provided'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sitio / Cluster</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.sitio || 'Sitio Zapatera Proper'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Address</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.address || inspectItem.office || 'Barangay Zapatera, Cebu City'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Civil Status</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.civil_status || 'Single'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Voter Status</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.voter_status || 'Registered Voter'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Created</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* B. Rich Announcement View */
              <div className="space-y-4">
                {inspectItem.banner_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-48">
                    <img
                      src={inspectItem.banner_url}
                      alt={inspectItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#3b5bfd] border border-blue-100 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{inspectItem.category || 'General Advisory'}</span>
                  </span>

                  {inspectItem.is_emergency && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency Alert</span>
                    </span>
                  )}

                  {inspectItem.is_important && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Important Notice</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Author</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.author || inspectItem.created_by_name || 'Administration'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Audience</span>
                    <span className="font-bold text-slate-800 text-xs capitalize mt-1 block">
                      {inspectItem.target_audience || 'All Residents'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.location || 'Barangay Zapatera, Cebu City'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Posted</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                </div>

                {inspectItem.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Summary</span>
                    <div className="p-3.5 bg-[#f4f7fb] border border-slate-200/60 rounded-2xl text-slate-700 leading-relaxed font-medium">
                      {inspectItem.description}
                    </div>
                  </div>
                )}

                {inspectItem.content && inspectItem.content !== inspectItem.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Content</span>
                    <div className="p-3.5 bg-[#f4f7fb] border border-slate-200/60 rounded-2xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {inspectItem.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const it = inspectItem;
                  handlePromptRestore(it, it._type);
                }}
                className="px-5 py-2.5 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Record</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-6 py-2.5 rounded-full text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Security Verification Modal for Restore & Purge */}
      <SecurityVerificationModal
        isOpen={securityVerification.isOpen}
        onClose={() => setSecurityVerification({ isOpen: false, item: null, actionType: null, dataType: null })}
        onVerified={securityVerification.actionType === 'restore' ? executeVerifiedRestore : executeVerifiedPurge}
        currentUser={currentUser}
        item={securityVerification.item}
        targetUser={securityVerification.dataType === 'users' ? securityVerification.item : null}
        title={securityVerification.actionType === 'restore' ? 'Restore Archived Record' : 'Permanently Delete Record'}
        message={
          securityVerification.actionType === 'restore'
            ? `Confirm your admin password to restore this ${
                securityVerification.dataType === 'announcements'
                  ? 'announcement'
                  : securityVerification.dataType === 'users'
                  ? 'user account'
                  : 'activity log'
              } to active status.`
            : `Warning: This will permanently erase this record from the database. Enter your password to confirm.`
        }
        confirmText={securityVerification.actionType === 'restore' ? 'Verify & Restore' : 'Verify & Delete'}
        isDestructive={securityVerification.actionType === 'purge'}
        isDarkMode={false}
      />

      {/* Global Accessible Action Confirmation Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        isDestructive={actionModal.isDestructive}
        isLoading={actionModal.isLoading}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose || (() => setActionModal({ isOpen: false }))}
      />
    </div>
  );
}
