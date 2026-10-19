// Admin/src/features/archive/ArchiveView.jsx
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
  FileText,
  Newspaper,
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
  DollarSign,
} from 'lucide-react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import ActionModal from '../../components/ActionModal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';
import { StorageService } from '../../core/storage';
import { formatDate, formatCurrency } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

export default function ArchiveView({ currentUser, isDarkMode = false }) {
  // RBAC Guard - strictly accessible ONLY by admin and super_admin
  const userRole = (currentUser?.role || '').toLowerCase();
  const hasAccess = userRole === 'admin' || userRole === 'super_admin';

  // Active Tab state: 'announcements' | 'requests' | 'documents'
  const [activeTab, setActiveTab] = useState('announcements');

  // Datasets
  const [archivedNews, setArchivedNews] = useState([]);
  const [archivedDocRequests, setArchivedDocRequests] = useState([]);
  const [archivedDocs, setArchivedDocs] = useState([]);
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
    dataType: null,   // 'announcements' | 'requests' | 'documents'
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
    if (!actorIdOrName) return 'Administrator';
    if (typeof actorIdOrName === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorIdOrName)) {
      const match = profilesMap[actorIdOrName];
      if (match?.full_name) return match.full_name;
      if (match?.email) return match.email;
    }
    return actorIdOrName;
  };

  // Load archived datasets & user profiles lookup from StorageService & Supabase
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

      const [newsData, reqsData, docsData] = await Promise.all([
        StorageService.getArchivedAnnouncementsAsync ? StorageService.getArchivedAnnouncementsAsync() : Promise.resolve([]),
        StorageService.getArchivedDocumentRequestsAsync ? StorageService.getArchivedDocumentRequestsAsync() : Promise.resolve([]),
        StorageService.getArchivedApprovedDocumentsAsync ? StorageService.getArchivedApprovedDocumentsAsync() : Promise.resolve([]),
      ]);

      setArchivedNews(Array.isArray(newsData) ? newsData : []);
      setArchivedDocRequests(Array.isArray(reqsData) ? reqsData : []);
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
    else if (activeTab === 'requests') dataset = [...archivedDocRequests];
    else if (activeTab === 'documents') dataset = [...archivedDocs];

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
      } else if (activeTab === 'requests') {
        dataset = dataset.filter(
          (r) =>
            (r.tracking_number || '').toLowerCase().includes(q) ||
            (r.resident_name || r.profiles?.full_name || '').toLowerCase().includes(q) ||
            (r.resident_email || r.profiles?.email || '').toLowerCase().includes(q) ||
            (r.document_title || r.document_types?.title || r.document_type || '').toLowerCase().includes(q) ||
            (r.purpose || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'documents') {
        dataset = dataset.filter(
          (d) =>
            (d.tracking_number || '').toLowerCase().includes(q) ||
            (d.resident_name || d.profiles?.full_name || '').toLowerCase().includes(q) ||
            (d.document_title || d.document_types?.title || d.document_type || '').toLowerCase().includes(q) ||
            (d.purpose || '').toLowerCase().includes(q)
        );
      }
    }

    // Sort
    dataset.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

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
  }, [activeTab, archivedNews, archivedDocRequests, archivedDocs, searchQuery, sortKey, sortDirection]);

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
      } else if (dataType === 'requests') {
        await StorageService.restoreDocumentRequest(item.id, item.tracking_number, currentUser);
      } else if (dataType === 'documents') {
        await StorageService.restoreApprovedDocument(item.id, item.tracking_number, currentUser);
      }

      await loadArchivedData();
      if (inspectItem?.id === item.id) {
        setInspectItem(null);
      }

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Record Restored Successfully',
        message: `The ${dataType === 'announcements' ? 'announcement' : 'document record'} has been restored back to active records.`,
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
      } else if (dataType === 'requests') {
        await StorageService.purgeDocumentRequest(item.id, item.tracking_number, currentUser);
      } else if (dataType === 'documents') {
        await StorageService.purgeApprovedDocument(item.id, item.tracking_number, currentUser);
      }

      await loadArchivedData();
      if (inspectItem?.id === item.id) {
        setInspectItem(null);
      }

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Record Permanently Deleted',
        message: `The ${dataType === 'announcements' ? 'announcement' : 'document record'} has been permanently erased from the database.`,
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
            You do not have permission to view the archive. Please contact an administrator.
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
              Centralized repository for deleted announcements, document requests, and approved documents. Items can be inspected, restored, or permanently deleted with password authorization.
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
          { id: 'requests', label: 'Document Requests Archive', icon: FileText, count: archivedDocRequests.length, color: 'indigo' },
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
                : activeTab === 'requests'
                ? 'by tracking number, resident, document type...'
                : 'by tracking number, resident name...'
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
          {/* 1. Announcements Table */}
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
                      <p className="text-xs">Deleted announcements from News & Bulletins will appear here.</p>
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

          {/* 2. Document Requests Table */}
          {activeTab === 'requests' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('tracking_number')}>
                    <div className="flex items-center space-x-1">
                      <span>Tracking # / Document</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('resident_name')}>
                    <div className="flex items-center space-x-1">
                      <span>Resident Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center space-x-1">
                      <span>Status When Deleted</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date Submitted</span>
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
                      <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived document requests found</p>
                      <p className="text-xs">Deleted document requests will appear here and can be restored.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((req) => {
                    const residentName = req.resident_name || req.profiles?.full_name || 'Resident';
                    const docTitle = req.document_title || req.document_types?.title || req.document_type || 'Document Request';
                    const archivedByName = resolveActorName(req.archived_by_name || req.deleted_by);

                    return (
                      <tr key={req.id || req.tracking_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/60">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold font-mono text-slate-900 dark:text-white truncate">
                                {req.tracking_number || `#${req.id?.slice(0, 8)}`}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{docTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{residentName}</p>
                          <p className="text-[10px] text-slate-400">{req.resident_email || req.profiles?.email || 'N/A'}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                            req.status === 'declined'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : req.status === 'under_review' || req.status === 'processing'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.status || 'pending'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {req.deleted_at ? formatDate(req.deleted_at) : 'Archived'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setInspectItem({ ...req, _type: 'requests' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptRestore(req, 'requests')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Document Request"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(req, 'requests')}
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

          {/* 3. Approved Documents Table */}
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
                      <span>Document Title</span>
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
                      <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-sm">No archived approved documents found</p>
                      <p className="text-xs">Deleted approved certificates will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((doc) => {
                    const residentName = doc.resident_name || doc.profiles?.full_name || 'Resident';
                    const docTitle = doc.document_title || doc.document_types?.title || doc.document_type || 'Official Certificate';
                    const archivedByName = resolveActorName(doc.archived_by_name || doc.deleted_by);

                    return (
                      <tr key={doc.id || doc.tracking_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900/60">
                              <FileCheck2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold font-mono text-slate-900 dark:text-white">
                                {doc.tracking_number}
                              </p>
                              <span className="text-[10px] text-emerald-600 font-semibold uppercase">Approved Clearance</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{residentName}</p>
                          <p className="text-[10px] text-slate-400">{doc.resident_email || doc.profiles?.email || 'N/A'}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {docTitle}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {formatDate(doc.approved_at || doc.created_at)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {doc.deleted_at ? formatDate(doc.deleted_at) : 'Archived'}
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setInspectItem({ ...doc, _type: 'documents' })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptRestore(doc, 'documents')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Document Record"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(doc, 'documents')}
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

      {/* Rich Human-Readable Item Details Modal */}
      {inspectItem && (
        <Modal
          isOpen={!!inspectItem}
          onClose={() => setInspectItem(null)}
          title={
            inspectItem._type === 'announcements'
              ? 'Archived Announcement Details'
              : inspectItem._type === 'requests'
              ? 'Archived Document Request Details'
              : inspectItem._type === 'documents'
              ? 'Archived Document Record Details'
              : 'Archived Item Details'
          }
          darkMode={isDarkMode}
        >
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info box */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl space-y-1.5 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-extrabold text-slate-900 dark:text-white text-base">
                  {inspectItem.title || inspectItem.tracking_number}
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

            {/* A. Rich News & Bulletins View */}
            {inspectItem._type === 'announcements' && (
              <div className="space-y-4">
                {/* Banner Preview if available */}
                {inspectItem.banner_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                    <img
                      src={inspectItem.banner_url}
                      alt={inspectItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Badges / Category bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{inspectItem.category || 'General Advisory'}</span>
                  </span>

                  {inspectItem.is_emergency && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center space-x-1.5 animate-pulse">
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency Alert</span>
                    </span>
                  )}

                  {inspectItem.is_important && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Important Notice</span>
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Author</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.author || inspectItem.created_by_name || 'Barangay Administration'}
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

                {/* Description Box */}
                {inspectItem.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</span>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {inspectItem.description}
                    </div>
                  </div>
                )}

                {/* Content Box */}
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

            {/* B. Rich Document Requests View */}
            {inspectItem._type === 'requests' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tracking Number</span>
                    <span className="font-bold font-mono text-blue-600 dark:text-blue-400 text-xs">
                      {inspectItem.tracking_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Document Type</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.document_title || inspectItem.document_types?.title || inspectItem.document_type || 'Certificate'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Resident Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.resident_name || inspectItem.profiles?.full_name || 'Resident'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Contact Email</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {inspectItem.resident_email || inspectItem.profiles?.email || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {inspectItem.resident_phone || inspectItem.profiles?.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Sitio / Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      {inspectItem.sitio || inspectItem.profiles?.sitio || inspectItem.resident_address || 'Barangay Zapatera'}
                    </span>
                  </div>
                </div>

                {/* Purpose and details */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purpose of Request</span>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold">
                    {inspectItem.purpose || 'Local Requirement / Employment / Verification'}
                  </div>
                </div>

                {inspectItem.rejection_reason && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                    <span className="font-bold text-rose-900 dark:text-rose-200 uppercase text-[10px]">Decline Reason</span>
                    <p className="text-rose-700 dark:text-rose-300">{inspectItem.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* C. Rich Approved Documents View */}
            {inspectItem._type === 'documents' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tracking Number</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                      {inspectItem.tracking_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Document Title</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.document_title || inspectItem.document_types?.title || 'Official Document'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Resident Recipient</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {inspectItem.resident_name || inspectItem.profiles?.full_name || 'Resident'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Approved Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {formatDate(inspectItem.approved_at || inspectItem.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Processed By</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {inspectItem.processed_by || 'Barangay Administrator'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Release Status</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase">
                      {inspectItem.is_claimed ? 'Claimed & Released' : 'Ready for Pickup'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purpose / Remarks</span>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold">
                    {inspectItem.purpose || 'Official Barangay Clearance & Certification'}
                  </div>
                </div>
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

      {/* Security Verification Modal for Restore & Purge Actions */}
      <SecurityVerificationModal
        isOpen={securityVerification.isOpen}
        onClose={() => setSecurityVerification({ isOpen: false, item: null, actionType: null, dataType: null })}
        onVerified={securityVerification.actionType === 'restore' ? executeVerifiedRestore : executeVerifiedPurge}
        currentUser={currentUser}
        title={securityVerification.actionType === 'restore' ? 'Security Verification: Restore Record' : 'Security Verification: Permanent Deletion'}
        message={
          securityVerification.actionType === 'restore'
            ? `Please confirm your password to verify restoring this ${securityVerification.dataType === 'announcements' ? 'announcement' : 'document record'} to active status.`
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
