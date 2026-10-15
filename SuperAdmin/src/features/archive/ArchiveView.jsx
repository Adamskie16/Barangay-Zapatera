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
  FileCheck2,
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
} from 'lucide-react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import ActionModal from '../../components/ActionModal';
import UserAvatar from '../../components/UserAvatar';
import { StorageService } from '../../core/storage';
import { formatDate } from '../../core/security';

export default function ArchiveView({ currentUser, isDarkMode = false }) {
  // RBAC Guard - strictly accessible ONLY by admin and super_admin
  const userRole = (currentUser?.role || '').toLowerCase();
  const hasAccess = userRole === 'super_admin' || userRole === 'admin';

  // Active Tab state: 'announcements' | 'users' | 'documents'
  const [activeTab, setActiveTab] = useState('announcements');

  // Datasets
  const [archivedNews, setArchivedNews] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Table Sorting & 10-Row Standard Pagination
  const [sortKey, setSortKey] = useState('deleted_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Feedback & Action Modals
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
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

  // Load archived datasets from StorageService
  const loadArchivedData = async () => {
    setLoading(true);
    try {
      const [newsData, usersData, docsData] = await Promise.all([
        StorageService.getArchivedAnnouncementsAsync ? StorageService.getArchivedAnnouncementsAsync() : Promise.resolve([]),
        StorageService.getArchivedUsersAsync ? StorageService.getArchivedUsersAsync() : Promise.resolve([]),
        StorageService.getArchivedApprovedDocumentsAsync ? StorageService.getArchivedApprovedDocumentsAsync() : Promise.resolve([]),
      ]);

      setArchivedNews(Array.isArray(newsData) ? newsData : []);
      setArchivedUsers(Array.isArray(usersData) ? usersData : []);
      setArchivedDocs(Array.isArray(docsData) ? docsData : []);
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
    else if (activeTab === 'documents') dataset = [...archivedDocs];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      if (activeTab === 'announcements') {
        dataset = dataset.filter(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q) ||
            (item.author || '').toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'users') {
        dataset = dataset.filter(
          (u) =>
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.role || '').toLowerCase().includes(q) ||
            (u.phone || u.contact_number || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'documents') {
        dataset = dataset.filter(
          (d) =>
            (d.tracking_number || '').toLowerCase().includes(q) ||
            (d.resident_name || d.profiles?.full_name || '').toLowerCase().includes(q) ||
            (d.document_title || d.document_types?.name || '').toLowerCase().includes(q) ||
            (d.purpose || '').toLowerCase().includes(q)
        );
      }
    }

    // Sort
    dataset.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle nested or date fields
      if (sortKey === 'deleted_at' || sortKey === 'created_at' || sortKey === 'approved_at') {
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
  }, [activeTab, archivedNews, archivedUsers, archivedDocs, searchQuery, sortKey, sortDirection]);

  // Strict 10-Row Pagination Calculations
  const totalEntries = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);
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

  // Restore Action Handler
  const handlePromptRestore = (item, type) => {
    const itemTitle =
      type === 'announcements'
        ? `announcement "${item.title}"`
        : type === 'users'
        ? `user account "${item.full_name || item.email}"`
        : `approved document tracking record #${item.tracking_number}`;

    setActionModal({
      isOpen: true,
      type: 'confirmation',
      title: 'Restore Record?',
      message: (
        <div className="space-y-2 text-left">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to restore <strong>{itemTitle}</strong>?
          </p>
          <p className="text-xs text-slate-500">
            This will remove the item from the recycling bin and return it to its active status in the system.
          </p>
        </div>
      ),
      confirmText: 'Restore Record',
      cancelText: 'Cancel',
      isDestructive: false,
      isLoading: false,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isLoading: true }));
        try {
          if (type === 'announcements') {
            await StorageService.restoreNews(item.id, currentUser);
          } else if (type === 'users') {
            await StorageService.restoreUser(item.id, currentUser);
          } else if (type === 'documents') {
            await StorageService.restoreApprovedDocument(item.id, item.tracking_number, currentUser);
          }
          await loadArchivedData();
          setActionModal({ isOpen: false });
          showToast(`Successfully restored ${itemTitle} to active records!`, 'success');
        } catch (err) {
          console.error('Failed to restore item:', err);
          setActionModal({ isOpen: false });
          showToast('Failed to restore item. Please try again.', 'error');
        }
      },
      onClose: () => setActionModal({ isOpen: false }),
    });
  };

  // Permanent Purge Action Handler
  const handlePromptPurge = (item, type) => {
    const itemTitle =
      type === 'announcements'
        ? `announcement "${item.title}"`
        : type === 'users'
        ? `user account "${item.full_name || item.email}"`
        : `document #${item.tracking_number}`;

    setActionModal({
      isOpen: true,
      type: 'warning',
      title: 'Permanently Purge Record?',
      message: (
        <div className="space-y-3 text-left">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <span className="font-bold">CRITICAL WARNING:</span> This operation is completely permanent and cannot be undone. All database records and history will be irreversibly erased.
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you completely sure you want to permanently delete <strong>{itemTitle}</strong>?
          </p>
        </div>
      ),
      confirmText: 'Permanently Erase',
      cancelText: 'Keep in Archive',
      isDestructive: true,
      isLoading: false,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isLoading: true }));
        try {
          if (type === 'announcements') {
            await StorageService.purgeNews(item.id, currentUser);
          } else if (type === 'users') {
            await StorageService.purgeUser(item.id, currentUser);
          } else if (type === 'documents') {
            await StorageService.purgeApprovedDocument(item.id, item.tracking_number, currentUser);
          }
          await loadArchivedData();
          setActionModal({ isOpen: false });
          showToast(`Permanently deleted ${itemTitle} from the database.`, 'success');
        } catch (err) {
          console.error('Failed to purge item:', err);
          setActionModal({ isOpen: false });
          showToast('Failed to purge record. Please try again.', 'error');
        }
      },
      onClose: () => setActionModal({ isOpen: false }),
    });
  };

  // Unauthorized Access Guard UI
  if (!hasAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-12">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-rose-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restricted Administrator Area</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You do not have administrative privileges to access the Archive & Trash Management recycling bin. Please contact Barangay Zapatera administration.
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
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold uppercase tracking-wider">
              <Archive className="w-3.5 h-3.5" />
              <span>System Recycling Bin & Recovery Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Archive & Trash Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Inspect soft-deleted announcements, user accounts, and approved document requests. Items safely remain here for full recovery or permanent database purging.
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
              <span>Refresh Repository</span>
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
          { id: 'documents', label: 'Approved Documents Archive', icon: FileCheck2, count: archivedDocs.length, color: 'emerald' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-slate-950/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
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
                : activeTab === 'users'
                ? 'by name, email, role, phone...'
                : 'by tracking number, resident, document type...'
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                      <p className="text-xs">Deleted announcements and expired bulletins will appear in this recycling bin.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 max-w-xs">
                        <div className="flex items-center space-x-3">
                          {item.banner_url ? (
                            <img src={item.banner_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border" />
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
                      <td className="p-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {item.archived_by_name || item.profiles?.full_name || 'System Auto-Expire'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
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
                  ))
                )}
              </tbody>
            </table>
          )}

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
                  <th className="p-4">Contact Number</th>
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
                      <p className="font-bold text-sm">No archived user accounts found</p>
                      <p className="text-xs">Soft-deleted accounts will appear here and can be restored anytime.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((u) => (
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
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          u.role === 'admin' || u.role === 'super_admin'
                            ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200'
                            : u.role === 'treasurer'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200'
                        }`}>
                          {u.role || 'resident'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {u.phone || u.contact_number || 'N/A'}
                      </td>
                      <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                        {u.deleted_at ? formatDate(u.deleted_at) : 'Archived'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {u.archived_by_name || u.deleted_by || 'Admin'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setInspectItem({ ...u, _type: 'users' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                            title="Inspect Profile"
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
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'documents' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('tracking_number')}>
                    <div className="flex items-center space-x-1">
                      <span>Tracking Number</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('resident_name')}>
                    <div className="flex items-center space-x-1">
                      <span>Resident Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('document_title')}>
                    <div className="flex items-center space-x-1">
                      <span>Document Type</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('approved_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Approved Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('deleted_at')}>
                    <div className="flex items-center space-x-1 text-rose-500">
                      <span>Date Deleted</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Deleted By</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived approved documents found</p>
                      <p className="text-xs">Approved records deleted by Barangay Admin are preserved here for audit compliance.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((d) => (
                    <tr key={d.id || d.tracking_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                        {d.tracking_number}
                      </td>
                      <td className="p-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {d.resident_name || d.profiles?.full_name || 'Resident Applicant'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {d.document_title || d.document_types?.name || 'Barangay Certificate'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {formatDate(d.approved_at || d.created_at)}
                      </td>
                      <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                        {d.deleted_at ? formatDate(d.deleted_at) : 'Archived'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {d.archived_by_name || d.deleted_by_profile?.full_name || 'Barangay Admin'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setInspectItem({ ...d, _type: 'documents' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                            title="Inspect Request"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePromptRestore(d, 'documents')}
                            className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Restore Document Record"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handlePromptPurge(d, 'documents')}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 10-Row Standard Consistent Pagination Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${
          isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="font-medium">
              Showing <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{startIndex}</span> to{' '}
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{endIndex}</span> of{' '}
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalEntries}</span> entries
            </span>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="hidden md:inline text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 text-xs border rounded-md font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {[10, 25, 50].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                isDarkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
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
                isDarkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1">
              {getPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`dots-${i}`} className="px-2 py-1 text-slate-400">
                    …
                  </span>
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
                isDarkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
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
                isDarkMode
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Item Inspect Modal */}
      {inspectItem && (
        <Modal
          isOpen={!!inspectItem}
          onClose={() => setInspectItem(null)}
          title="Archived Entity Inspection"
          darkMode={isDarkMode}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {inspectItem.title || inspectItem.full_name || inspectItem.tracking_number}
              </p>
              <p className="text-slate-500">
                Archived at: {formatDate(inspectItem.deleted_at)} by{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {inspectItem.archived_by_name || inspectItem.deleted_by || 'System'}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Full Item Metadata
              </h4>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono max-h-60">
                {JSON.stringify(inspectItem, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const it = inspectItem;
                    setInspectItem(null);
                    handlePromptRestore(it, it._type);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Now</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Global Action Confirmation Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        isDestructive={actionModal.isDestructive}
        isLoading={actionModal.isLoading}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
