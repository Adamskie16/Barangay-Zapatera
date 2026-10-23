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
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="p-8 rounded-[28px] bg-white border border-rose-100 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Restricted Area</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have permission to view the archive. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  const totalArchivedCount = archivedNews.length + archivedDocRequests.length + archivedDocs.length;

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
            Inspect, restore, or permanently purge deleted announcements, document requests, and approved certificates.
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

        {/* Card 3: Archived Document Requests */}
        <div
          onClick={() => setActiveTab('requests')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] shadow-amber-500/15 hover:scale-[1.01] ${
            activeTab === 'requests' ? 'ring-4 ring-offset-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-[#ea580c]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Requests
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{archivedDocRequests.length}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Document Requests Archive</p>
            <p className="text-[11px] text-white/75 mt-1">Removed resident applications</p>
          </div>
        </div>

        {/* Card 4: Archived Approved Documents */}
        <div
          onClick={() => setActiveTab('documents')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01] ${
            activeTab === 'documents' ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-5 h-5 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Approved
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{archivedDocs.length}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Approved Docs Archive</p>
            <p className="text-[11px] text-white/75 mt-1">Archived clearance records</p>
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
              { id: 'requests', label: 'Document Requests Archive', icon: FileText, count: archivedDocRequests.length },
              { id: 'documents', label: 'Approved Documents Archive', icon: FileCheck2, count: archivedDocs.length },
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
                    : 'Search tracking #, resident, document...'
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

          {/* 2. Document Requests Table */}
          {activeTab === 'requests' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('tracking_number')}>
                    <div className="flex items-center space-x-1">
                      <span>Tracking # / Document</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('resident_name')}>
                    <div className="flex items-center space-x-1">
                      <span>Resident Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                    <div className="flex items-center space-x-1">
                      <span>Status When Deleted</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Date Submitted</span>
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
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No Archived Document Requests Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deleted document requests will appear here and can be restored.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((req) => {
                    const residentName = req.resident_name || req.profiles?.full_name || 'Resident';
                    const docTitle = req.document_title || req.document_types?.title || req.document_type || 'Document Request';
                    const archivedByName = resolveActorName(req.archived_by_name || req.deleted_by);

                    return (
                      <tr key={req.id || req.tracking_number} className="hover:bg-[#f4f7fb]/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold font-mono text-slate-900 truncate">
                                {req.tracking_number || `#${req.id?.slice(0, 8)}`}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{docTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-extrabold text-slate-800">{residentName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{req.resident_email || req.profiles?.email || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                              req.status === 'declined'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : req.status === 'under_review' || req.status === 'processing'
                                ? 'bg-blue-50 text-[#3b5bfd] border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {req.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            {req.deleted_at ? formatDate(req.deleted_at) : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectItem({ ...req, _type: 'requests' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handlePromptRestore(req, 'requests')}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Document Request"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(req, 'requests')}
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

          {/* 3. Approved Documents Table */}
          {activeTab === 'documents' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('tracking_number')}>
                    <div className="flex items-center space-x-1">
                      <span>Tracking Number</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('resident_name')}>
                    <div className="flex items-center space-x-1">
                      <span>Resident Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('document_title')}>
                    <div className="flex items-center space-x-1">
                      <span>Document Title</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 cursor-pointer hover:text-slate-700" onClick={() => handleSort('approved_at')}>
                    <div className="flex items-center space-x-1">
                      <span>Approved Date</span>
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
                        <FileCheck2 className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No Archived Approved Documents Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Deleted approved certificates will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((doc) => {
                    const residentName = doc.resident_name || doc.profiles?.full_name || 'Resident';
                    const docTitle = doc.document_title || doc.document_types?.title || doc.document_type || 'Official Certificate';
                    const archivedByName = resolveActorName(doc.archived_by_name || doc.deleted_by);

                    return (
                      <tr key={doc.id || doc.tracking_number} className="hover:bg-[#f4f7fb]/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                              <FileCheck2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-extrabold font-mono text-slate-900">
                                {doc.tracking_number}
                              </p>
                              <span className="text-[10px] text-emerald-600 font-bold uppercase">Approved Clearance</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-extrabold text-slate-800">{residentName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{doc.resident_email || doc.profiles?.email || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">
                          {docTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          {formatDate(doc.approved_at || doc.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            {doc.deleted_at ? formatDate(doc.deleted_at) : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold text-[11px]">
                          {archivedByName}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectItem({ ...doc, _type: 'documents' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:text-[#3b5bfd] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handlePromptRestore(doc, 'documents')}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Restore Document Record"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handlePromptPurge(doc, 'documents')}
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

        {/* Pagination Footer */}
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
            inspectItem._type === 'announcements'
              ? 'Archived Announcement Details'
              : inspectItem._type === 'requests'
              ? 'Archived Document Request'
              : 'Archived Approved Certificate'
          }
          subtitle="Review archived record metadata before restoring"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info box */}
            <div className="p-4 bg-[#f4f7fb] rounded-[22px] space-y-1.5 border border-slate-200/70">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-extrabold text-slate-900 text-base">
                  {inspectItem.title || inspectItem.tracking_number}
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

            {/* A. Rich News & Bulletins View */}
            {inspectItem._type === 'announcements' && (
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
                      {inspectItem.author || inspectItem.created_by_name || 'Barangay Administration'}
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

            {/* B. Rich Document Requests View */}
            {inspectItem._type === 'requests' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracking Number</span>
                    <span className="font-extrabold font-mono text-[#3b5bfd] text-xs mt-1 block">
                      {inspectItem.tracking_number}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Type</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.document_title || inspectItem.document_types?.title || inspectItem.document_type || 'Certificate'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resident Name</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.resident_name || inspectItem.profiles?.full_name || 'Resident'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Email</span>
                    <span className="font-mono font-semibold text-slate-700 text-xs mt-1 block truncate">
                      {inspectItem.resident_email || inspectItem.profiles?.email || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose of Request</span>
                  <div className="p-3.5 bg-[#f4f7fb] border border-slate-200/60 rounded-2xl text-slate-800 font-bold">
                    {inspectItem.purpose || 'Local Requirement / Employment / Verification'}
                  </div>
                </div>

                {inspectItem.rejection_reason && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                    <span className="font-bold text-rose-800 uppercase text-[10px]">Decline Reason</span>
                    <p className="text-rose-700 font-medium">{inspectItem.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* C. Rich Approved Documents View */}
            {inspectItem._type === 'documents' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracking Number</span>
                    <span className="font-extrabold font-mono text-emerald-600 text-xs mt-1 block">
                      {inspectItem.tracking_number}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Title</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.document_title || inspectItem.document_types?.title || 'Official Document'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resident Recipient</span>
                    <span className="font-bold text-slate-800 text-xs mt-1 block">
                      {inspectItem.resident_name || inspectItem.profiles?.full_name || 'Resident'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#f4f7fb] rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Release Status</span>
                    <span className="font-bold text-emerald-600 text-xs uppercase mt-1 block">
                      {inspectItem.is_claimed ? 'Claimed & Released' : 'Ready for Pickup'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose / Remarks</span>
                  <div className="p-3.5 bg-[#f4f7fb] border border-slate-200/60 rounded-2xl text-slate-800 font-bold">
                    {inspectItem.purpose || 'Official Barangay Clearance & Certification'}
                  </div>
                </div>
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

      {/* Security Verification Modal for Restore & Purge Actions */}
      <SecurityVerificationModal
        isOpen={securityVerification.isOpen}
        onClose={() => setSecurityVerification({ isOpen: false, item: null, actionType: null, dataType: null })}
        onVerified={securityVerification.actionType === 'restore' ? executeVerifiedRestore : executeVerifiedPurge}
        currentUser={currentUser}
        title={securityVerification.actionType === 'restore' ? 'Restore Archived Record' : 'Permanently Delete Record'}
        message={
          securityVerification.actionType === 'restore'
            ? `Confirm your admin password to restore this ${securityVerification.dataType === 'announcements' ? 'announcement' : 'document record'} to active status.`
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

