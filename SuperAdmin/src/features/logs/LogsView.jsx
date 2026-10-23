// SuperAdmin/src/features/logs/LogsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Terminal, Calendar, FileText, Newspaper, UserPlus, Clock, Settings, Trash2 } from 'lucide-react';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { TableSkeleton } from '../../components/SkeletonLoader';
import DataTable from '../../components/DataTable';
import ActionModal from '../../components/ActionModal';
import { StorageService, STORAGE_KEYS } from '../../core/storage';

/**
 * Filter activity logs for creations, edits, and deletions:
 * 1. Events
 * 2. Bulletins / Announcements / News
 * 3. User Accounts & Profiles
 * 4. Document Templates & Types
 * 5. System Configurations
 */
export const isPermittedActivityLog = (log) => {
  if (!log) return false;
  const action = (log.action || '').toLowerCase();
  const feature = (log.feature || '').toLowerCase();
  const details = (log.details || '').toLowerCase();

  const isCreateAction =
    action.includes('creat') ||
    action.includes('add') ||
    action.includes('post') ||
    action.includes('publish') ||
    action.includes('register') ||
    details.includes('created') ||
    details.includes('registered') ||
    details.includes('published');

  const isEditAction =
    action.includes('edit') ||
    action.includes('updat') ||
    action.includes('modif') ||
    action.includes('change') ||
    details.includes('edited') ||
    details.includes('updated') ||
    details.includes('modified') ||
    details.includes('changed');

  const isDeleteAction =
    action.includes('delet') ||
    action.includes('remov') ||
    action.includes('trash') ||
    action.includes('archive') ||
    details.includes('deleted') ||
    details.includes('removed');

  if (!isCreateAction && !isEditAction && !isDeleteAction) return false;

  const isEvent =
    action.includes('event') ||
    feature.includes('event') ||
    feature.includes('calendar') ||
    details.includes('event');

  const isBulletin =
    action.includes('bulletin') ||
    action.includes('announcement') ||
    action.includes('news') ||
    feature.includes('bulletin') ||
    feature.includes('news') ||
    details.includes('bulletin') ||
    details.includes('announcement');

  const isAccount =
    action.includes('account') ||
    action.includes('user') ||
    action.includes('profile') ||
    feature.includes('account') ||
    feature.includes('user') ||
    feature.includes('profile') ||
    details.includes('account') ||
    details.includes('profile');

  const isDocTemplate =
    action.includes('template') ||
    feature.includes('template') ||
    action.includes('document info') ||
    (action.includes('document') && (action.includes('template') || details.includes('template') || feature.includes('template') || details.includes('document type')));

  const isConfig =
    action.includes('config') ||
    feature.includes('config') ||
    details.includes('config');

  return isEvent || isBulletin || isAccount || isDocTemplate || isConfig;
};

export const getLogCategory = (log) => {
  const action = (log.action || '').toLowerCase();
  const feature = (log.feature || '').toLowerCase();
  const details = (log.details || '').toLowerCase();

  if (action.includes('config') || feature.includes('config') || details.includes('config')) {
    return 'System Config';
  }
  if (action.includes('template') || feature.includes('template') || details.includes('template') || action.includes('document info')) {
    return 'Document Template';
  }
  if (action.includes('event') || feature.includes('event') || feature.includes('calendar') || details.includes('event')) {
    return 'Event';
  }
  if (action.includes('bulletin') || action.includes('announcement') || action.includes('news') || feature.includes('bulletin') || feature.includes('news')) {
    return 'Bulletin';
  }
  if (action.includes('account') || action.includes('user') || action.includes('profile') || feature.includes('account') || feature.includes('user') || feature.includes('profile')) {
    return 'User Account';
  }
  return 'General';
};

export default function LogsView({ logs, currentUser }) {
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Delete Action Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    log: null,
    isProcessing: false,
  });

  // Action Feedback Modal state
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Date Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  const fetchLiveLogs = async () => {
    setLoading(true);
    try {
      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('zapatera_deleted_activity_logs') || '[]');
      } catch {}

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const filtered = data.filter((log) => {
            if (log.is_archived === true || log.deleted_at != null) return false;
            if (deletedIds.includes(String(log.id))) return false;
            return isPermittedActivityLog(log);
          });
          setLogsList(filtered);
          setLoading(false);
          return;
        } else if (error) {
          console.warn('Supabase activity_logs query error:', error.message);
        }
      }
    } catch (err) {
      console.warn('Error fetching live activity logs from Supabase:', err);
    } finally {
      setLoading(false);
    }

    // Local storage fallback
    let localLogs = [];
    try {
      localLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    } catch {}
    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('zapatera_deleted_activity_logs') || '[]');
    } catch {}
    const filtered = localLogs.filter((log) => {
      if (log.is_archived === true || log.deleted_at != null) return false;
      if (deletedIds.includes(String(log.id))) return false;
      return isPermittedActivityLog(log);
    });
    setLogsList(filtered);
  };

  useEffect(() => {
    fetchLiveLogs();
  }, []);

  const promptDeleteLog = (log) => {
    setDeleteModal({
      isOpen: true,
      log,
      isProcessing: false,
    });
  };

  const confirmDeleteLog = async () => {
    if (!deleteModal.log) return;
    setDeleteModal((prev) => ({ ...prev, isProcessing: true }));
    try {
      await StorageService.archiveActivityLog(deleteModal.log.id, currentUser, deleteModal.log);
      setDeleteModal({ isOpen: false, log: null, isProcessing: false });
      await fetchLiveLogs();
      setFeedbackModal({
        isOpen: true,
        type: 'success',
        title: 'Activity Log Moved to Archive',
        message: 'The selected activity log record has been moved to Archive & Trash where authorized administrators can restore or permanently purge it.',
      });
    } catch (err) {
      console.error('Failed to archive activity log:', err);
      setDeleteModal({ isOpen: false, log: null, isProcessing: false });
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Archive Log',
        message: 'An error occurred while moving the activity log to the Archive. Please try again.',
      });
    }
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const processedLogs = useMemo(() => {
    return logsList
      .filter((log) => {
        const category = getLogCategory(log);
        if (activeCategory === 'events' && category !== 'Event') return false;
        if (activeCategory === 'bulletins' && category !== 'Bulletin') return false;
        if (activeCategory === 'accounts' && category !== 'User Account') return false;
        if (activeCategory === 'templates' && category !== 'Document Template') return false;
        if (activeCategory === 'config' && category !== 'System Config') return false;

        if (log.created_at) {
          const logDate = new Date(log.created_at);
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) return false;
          }
        }

        return true;
      })
      .map((log) => ({
        ...log,
        rowTitle: `${log.action || 'Activity'} | Performed by: ${log.user_email || log.user || 'Admin'} | Date: ${formatDate(log.created_at)} | Details: ${log.details || 'No details'}`,
      }));
  }, [logsList, activeCategory, startDate, endDate]);

  const tabCounts = useMemo(() => {
    const counts = { all: logsList.length, events: 0, bulletins: 0, accounts: 0, templates: 0, config: 0 };
    logsList.forEach((log) => {
      const cat = getLogCategory(log);
      if (cat === 'Event') counts.events++;
      else if (cat === 'Bulletin') counts.bulletins++;
      else if (cat === 'User Account') counts.accounts++;
      else if (cat === 'Document Template') counts.templates++;
      else if (cat === 'System Config') counts.config++;
    });
    return counts;
  }, [logsList]);

  const columns = useMemo(() => [
    {
      key: 'created_at',
      label: 'Date & Time',
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono text-xs whitespace-nowrap">{formatDate(log.created_at)}</span>
        </div>
      ),
    },
    {
      key: 'user_email',
      label: 'Performed By',
      sortable: true,
      render: (log) => {
        const userEmail = log.user_email || log.user || 'superadmin@zapatera.gov.ph';
        const initial = userEmail.charAt(0).toUpperCase();
        return (
          <div className="flex items-center space-x-2.5" title={`Performed by: ${userEmail}`}>
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#38bdf8] to-[#3b5bfd] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
              {initial}
            </div>
            <span className="font-bold text-slate-800 text-xs font-sans truncate max-w-[190px]">
              {userEmail}
            </span>
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      getValue: (log) => getLogCategory(log),
      render: (log) => {
        const cat = getLogCategory(log);
        if (cat === 'Event') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Calendar className="w-3 h-3 text-purple-600" /> Event
            </span>
          );
        }
        if (cat === 'Bulletin') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#3b5bfd] border border-blue-200">
              <Newspaper className="w-3 h-3 text-[#3b5bfd]" /> Bulletin
            </span>
          );
        }
        if (cat === 'User Account') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <UserPlus className="w-3 h-3 text-amber-600" /> User Account
            </span>
          );
        }
        if (cat === 'System Config') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Settings className="w-3 h-3 text-indigo-600" /> System Config
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileText className="w-3 h-3 text-emerald-600" /> Document Template
          </span>
        );
      },
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (log) => {
        const actionLower = (log.action || '').toLowerCase();
        const isDelete = actionLower.includes('delet') || actionLower.includes('remov') || actionLower.includes('trash') || actionLower.includes('archive');
        const isEdit = actionLower.includes('edit') || actionLower.includes('updat') || actionLower.includes('modif') || actionLower.includes('change');

        if (isDelete) {
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {log.action}
            </span>
          );
        }
        if (isEdit) {
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {log.action}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {log.action}
          </span>
        );
      },
    },
    {
      key: 'details',
      label: 'Activity Details',
      sortable: false,
      render: (log) => (
        <span className="text-slate-600 text-xs font-medium max-w-sm line-clamp-2 leading-relaxed" title={log.details}>
          {log.details || 'Activity record successfully committed to system database.'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (log) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              promptDeleteLog(log);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 transition-colors cursor-pointer group"
            title="Move Activity Log to Archive & Trash"
          >
            <Trash2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      ),
    },
  ], []);

  const statusTabs = {
    activeTab: activeCategory,
    onChange: (tabId) => setActiveCategory(tabId),
    tabs: [
      { id: 'all', label: 'All Activity Logs', count: tabCounts.all },
      { id: 'events', label: 'Events', count: tabCounts.events },
      { id: 'bulletins', label: 'Bulletins', count: tabCounts.bulletins },
      { id: 'accounts', label: 'Accounts', count: tabCounts.accounts },
      { id: 'templates', label: 'Templates', count: tabCounts.templates },
    ],
  };

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <Terminal className="w-3.5 h-3.5" />
            <span>System Audit & Telemetry</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            Activity Logs & Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            System audit trail capturing creation, edit, and deletion actions across events, bulletins, accounts, and templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{tabCounts.all} Logged Actions</span>
          </div>
          <button
            onClick={fetchLiveLogs}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Activity Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* 4 Interactive Gradient KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Audit Logs */}
        <div
          onClick={() => setActiveCategory('all')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01] ${
            activeCategory === 'all' ? 'ring-4 ring-offset-2 ring-sky-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Terminal className="w-5 h-5 text-[#0284c7]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              All Activity
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{tabCounts.all}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Total Audit Events</p>
            <p className="text-[11px] text-white/75 mt-1">Complete administrative trail</p>
          </div>
        </div>

        {/* Card 2: Bulletins & Events */}
        <div
          onClick={() => setActiveCategory(activeCategory === 'bulletins' ? 'events' : 'bulletins')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${
            activeCategory === 'bulletins' || activeCategory === 'events' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Newspaper className="w-5 h-5 text-[#4f46e5]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Public Comms
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{tabCounts.bulletins + tabCounts.events}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Bulletins & Events</p>
            <p className="text-[11px] text-white/75 mt-1">
              {tabCounts.bulletins} bulletins • {tabCounts.events} events
            </p>
          </div>
        </div>

        {/* Card 3: User Account Actions */}
        <div
          onClick={() => setActiveCategory(activeCategory === 'accounts' ? 'all' : 'accounts')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] shadow-amber-500/15 hover:scale-[1.01] ${
            activeCategory === 'accounts' ? 'ring-4 ring-offset-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <UserPlus className="w-5 h-5 text-[#ea580c]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Access Control
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{tabCounts.accounts}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Account Logs</p>
            <p className="text-[11px] text-white/75 mt-1">Profile & lockout actions</p>
          </div>
        </div>

        {/* Card 4: Document Templates */}
        <div
          onClick={() => setActiveCategory(activeCategory === 'templates' ? 'all' : 'templates')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01] ${
            activeCategory === 'templates' ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Catalog Changes
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{tabCounts.templates}</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Template Updates</p>
            <p className="text-[11px] text-white/75 mt-1">Document service modifications</p>
          </div>
        </div>
      </div>

      {/* Date Filter Toolbar Card */}
      <div className="bg-white p-4 sm:p-5 rounded-[26px] border border-slate-100/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
            <Calendar className="w-4 h-4 text-[#3b5bfd]" />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/70 focus:bg-white focus:border-[#3b5bfd] rounded-full text-slate-700 font-semibold outline-none transition-all"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/70 focus:bg-white focus:border-[#3b5bfd] rounded-full text-slate-700 font-semibold outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                datePreset === p.id
                  ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                  : 'bg-[#f4f7fb] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {p.label}
            </button>
          ))}

          {(startDate || endDate) && (
            <button
              onClick={() => handlePresetChange('all')}
              className="px-3.5 py-2 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Clear Dates ✕
            </button>
          )}
        </div>
      </div>

      {/* Production Civic DataTable with 10-row pagination and sorting */}
      <DataTable
        data={processedLogs}
        columns={columns}
        keyField="id"
        searchable={true}
        searchPlaceholder="Search by user, action, details..."
        searchKeys={['user_email', 'action', 'details', 'feature']}
        statusTabs={statusTabs}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        loading={loading}
        loadingSkeleton={<TableSkeleton rows={8} cols={6} isDarkMode={false} />}
        emptyTitle="No Activity Logs Found"
        emptySubtitle="Activity logs for events, bulletins, user accounts, and templates will appear here."
        onResetFilters={() => {
          setActiveCategory('all');
          handlePresetChange('all');
        }}
      />

      {/* Confirmation Modal for Moving Activity Log to Archive */}
      <ActionModal
        isOpen={deleteModal.isOpen}
        type="confirmation"
        isDestructive={true}
        isProcessing={deleteModal.isProcessing}
        title="Move Activity Log to Archive & Trash"
        message={`Are you sure you want to delete this activity log: "${deleteModal.log?.action || 'Activity'}"? It will be forwarded to Archive & Trash where authorized administrators can restore or permanently purge it.`}
        confirmText="Delete & Archive"
        cancelText="Cancel"
        onConfirm={confirmDeleteLog}
        onClose={() => setDeleteModal({ isOpen: false, log: null, isProcessing: false })}
      />

      {/* Action Feedback Modal */}
      <ActionModal
        isOpen={feedbackModal.isOpen}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        buttonText="OK"
        onClose={() => setFeedbackModal({ isOpen: false, type: 'success', title: '', message: '' })}
      />
    </div>
  );
}
