// SuperAdmin/src/features/archive/ArchiveView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Newspaper,
  Users,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Info,
  ShieldCheck,
  Tag,
  Mail,
  Phone,
  Hash,
  MapPin,
  Flame,
  AlertCircle,
  FileBadge,
  Activity,
} from 'lucide-react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import ActionModal from '../../components/ActionModal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';
import UserAvatar from '../../components/UserAvatar';
import { StorageService } from '../../core/storage';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { getLogCategory } from '../logs/LogsView';

export default function ArchiveView({ currentUser, isDarkMode = false }) {
  // RBAC Guard - strictly accessible ONLY by admin and super_admin
  const userRole = (currentUser?.role || '').toLowerCase();
  const hasAccess = userRole === 'super_admin' || userRole === 'admin';

  // Active Tab state: 'announcements' | 'users'
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
    dataType: null,   // 'announcements' | 'users'
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
      // Build profiles lookup map
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
      <div className="p-6 max-w-4xl mx-auto mt-12">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Area</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You do not have permission to view the archive. Please contact a super administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen ${
      isDarkMode ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-3 text-xs font-bold ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
              : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
          }`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border-slate-800'
          : 'bg-gradient-to-br from-white via-slate-50 to-blue-50/30 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Archive & Trash Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Inspect archived news announcements, soft-deleted user accounts, and activity logs. Authorized administrators can inspect full details, restore records, or permanently purge them.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={loadArchivedData}
              disabled={loading}
              className={`px-4 py-2.5 rounded-2xl border font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Horizontal Tabs with Dynamic Badges */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap gap-1.5 shadow-xs transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        {[
          { id: 'announcements', label: 'Announcements Archive', icon: Newspaper, count: archivedNews.length, color: 'blue' },
          { id: 'users', label: 'User Accounts Archive', icon: Users, count: archivedUsers.length, color: 'indigo' },
          { id: 'activity_logs', label: 'Activity Logs Archive', icon: Activity, count: archivedActivityLogs.length, color: 'purple' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${
              activeTab === 'announcements'
                ? 'by title, category, author...'
                : 'by name, email, role, phone...'
            }`}
            className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto justify-end">
          <span>Sort:</span>
          <button
            onClick={() => handleSort('deleted_at')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
              sortKey === 'deleted_at'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                : isDarkMode
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Date Archived</span>
            {sortKey === 'deleted_at' && (
              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto min-w-full">
          {/* Announcements Table */}
          {activeTab === 'announcements' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>
                    <div className="flex items-center space-x-1">
                      <span>Announcement / Title</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('category')}>
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('author')}>
                    <div className="flex items-center space-x-1">
                      <span>Author</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date Posted</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Archived By</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Archive className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived announcements found</p>
                      <p className="text-xs">Deleted announcements will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const archivedByName = resolveActorName(item.archived_by_name || item.deleted_by);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 max-w-xs">
                          <div className="flex items-center space-x-3">
                            {item.banner_url ? (
                              <img src={item.banner_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Newspaper className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{item.description || item.content}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                          {item.author || item.created_by_name || 'Administration'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {item.deleted_at ? formatDate(item.deleted_at) : 'Archived'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setInspectItem({ ...item, _type: 'announcements' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptRestore(item, 'announcements')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Announcement"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(item, 'announcements')}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* User Accounts Table */}
          {activeTab === 'users' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center space-x-1">
                      <span>User Account</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('email')}>
                    <div className="flex items-center space-x-1">
                      <span>Email</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('role')}>
                    <div className="flex items-center space-x-1">
                      <span>Role</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4">Contact / Sitio</th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Archived By</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived accounts found</p>
                      <p className="text-xs">Deleted accounts will appear here and can be restored anytime.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((u) => {
                    const archivedByName = resolveActorName(u.archived_by_name || u.deleted_by);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <UserAvatar user={u} size="sm" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{u.full_name || 'Barangay Citizen'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {u.id?.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                            u.role === 'admin' || u.role === 'super_admin'
                              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200'
                              : u.role === 'treasurer'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200'
                          }`}>
                            {u.role || 'resident'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500 text-[11px]">
                          <p>{u.phone || u.contact_number || 'No phone'}</p>
                          <p className="text-[10px] text-slate-400">{u.sitio || u.address || 'Zapatera'}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {u.deleted_at ? formatDate(u.deleted_at) : 'Archived'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setInspectItem({ ...u, _type: 'users' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                              title="Inspect Full Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptRestore(u, 'users')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore User Account"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(u, 'users')}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Activity Logs Table */}
          {activeTab === 'activity_logs' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date & Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('user_email')}>
                    <div className="flex items-center space-x-1">
                      <span>Performed By</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('category')}>
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('action')}>
                    <div className="flex items-center space-x-1">
                      <span>Action</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4">Activity Details</th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Archived</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Archived By</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Archive className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived activity logs found</p>
                      <p className="text-xs">Deleted activity logs will appear here.</p>
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[170px]" title={userEmail}>
                              {userEmail}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            cat === 'Event'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : cat === 'Bulletin'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : cat === 'User Account'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {cat}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {item.action || 'Log Entry'}
                        </td>
                        <td className="p-4 max-w-xs">
                          <span className="text-slate-600 dark:text-slate-300 text-xs line-clamp-2 leading-relaxed" title={item.details}>
                            {item.details || 'Activity record successfully committed.'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {item.deleted_at ? formatDate(item.deleted_at) : 'Archived'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setInspectItem({ ...item, _type: 'activity_logs' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptRestore(item, 'activity_logs')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Activity Log"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(item, 'activity_logs')}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* 10-Row Standard Pagination Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${
          isDarkMode ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div>
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{paginatedData.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(safeCurrentPage * pageSize, totalEntries)}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalEntries}</span> records
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1">
              {getPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`dots-${i}`} className="px-2 py-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={`page-${num}`}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      safeCurrentPage === num
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-700'
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
              className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Human-Readable Item Inspection Modal */}
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
          darkMode={isDarkMode}
        >
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Header banner */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl space-y-1.5 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-extrabold text-slate-900 dark:text-white text-base">
                  {inspectItem.full_name || inspectItem.action || inspectItem.title || inspectItem.email}
                </p>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Archived Record
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Archived at:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(inspectItem.deleted_at)}
                </span>{' '}
                by{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {resolveActorName(inspectItem.archived_by_name || inspectItem.deleted_by)}
                </span>
              </p>
            </div>

            {/* A. Rich Activity Log View */}
            {inspectItem._type === 'activity_logs' ? (
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center space-x-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-lg border border-purple-200 dark:border-purple-800 shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {inspectItem.action || 'Activity Log'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs truncate">
                      {inspectItem.user_email || inspectItem.user || 'admin@zapatera.gov'}
                    </p>
                    <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Category: {inspectItem.category || getLogCategory(inspectItem)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Performed By</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.user_email || inspectItem.user || 'Admin'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Date & Time Logged</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Feature / Module</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.feature || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Log Reference ID</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.id}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activity Details</span>
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {inspectItem.details || 'Activity record successfully committed to system database.'}
                  </div>
                </div>
              </div>
            ) : inspectItem._type === 'users' ? (
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center space-x-4 shadow-2xs">
                  <UserAvatar user={inspectItem} size="lg" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {inspectItem.full_name || `${inspectItem.first_name || ''} ${inspectItem.last_name || ''}`}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs">{inspectItem.email}</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Role: {inspectItem.role || 'resident'}
                    </span>
                  </div>
                </div>

                {/* Structured Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.phone || inspectItem.contact_number || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Sitio / Cluster</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.sitio || 'Sitio Zapatera Proper'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Full Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.address || inspectItem.office || 'Barangay Zapatera, Cebu City'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Civil Status</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.civil_status || 'Single'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Voter Status</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.voter_status || 'Registered Voter'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Gender & Age</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.gender || 'Not specified'} {inspectItem.age ? `(${inspectItem.age} yrs)` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Valid ID Presented</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.id_type || 'Government ID'}: {inspectItem.id_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Account Created</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* B. Rich Announcement View */
              <div className="space-y-4">
                {inspectItem.banner_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                    <img
                      src={inspectItem.banner_url}
                      alt={inspectItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{inspectItem.category || 'General Advisory'}</span>
                  </span>

                  {inspectItem.is_emergency && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center space-x-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency Alert</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Author</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.author || inspectItem.created_by_name || 'Administration'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Target Audience</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs capitalize">
                      {inspectItem.target_audience || 'All Residents'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Location</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.location || 'Barangay Zapatera, Cebu City'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Date Posted</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {formatDate(inspectItem.created_at)}
                    </span>
                  </div>
                </div>

                {inspectItem.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</span>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {inspectItem.description}
                    </div>
                  </div>
                )}

                {inspectItem.content && inspectItem.content !== inspectItem.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Content</span>
                    <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {inspectItem.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const it = inspectItem;
                  handlePromptRestore(it, it._type);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Now</span>
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
        title={securityVerification.actionType === 'restore' ? 'Security Verification: Restore Record' : 'Security Verification: Permanent Deletion'}
        message={
          securityVerification.actionType === 'restore'
            ? `Please confirm your password to verify restoring this ${
                securityVerification.dataType === 'announcements'
                  ? 'announcement'
                  : securityVerification.dataType === 'users'
                  ? 'user account'
                  : 'activity log'
              } to active status.`
            : `Warning: This will permanently delete this record from the database. Please enter your password to confirm.`
        }
        confirmText={securityVerification.actionType === 'restore' ? 'Verify & Restore' : 'Verify & Permanently Delete'}
        isDestructive={securityVerification.actionType === 'purge'}
        isDarkMode={isDarkMode}
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
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
