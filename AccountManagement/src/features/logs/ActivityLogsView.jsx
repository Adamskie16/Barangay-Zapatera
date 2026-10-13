// AccountManagement/src/features/logs/ActivityLogsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Badge from '../../components/Badge';
import {
  RefreshCw,
  Terminal,
  Calendar,
  Clock,
  User,
  FileText,
  Newspaper,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import DataTable from '../../components/DataTable';

/**
 * Filter strictly for creation actions:
 * 1. Creating an event
 * 2. Creating bulletins / announcements
 * 3. Creating an account
 * 4. Creating a document template
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

  if (!isCreateAction) return false;

  // 1. Creating an event
  const isEvent =
    action.includes('event') ||
    feature.includes('event') ||
    feature.includes('calendar') ||
    details.includes('event');

  // 2. Creating bulletins / announcements
  const isBulletin =
    action.includes('bulletin') ||
    action.includes('announcement') ||
    action.includes('news') ||
    feature.includes('bulletin') ||
    feature.includes('news') ||
    details.includes('bulletin') ||
    details.includes('announcement');

  // 3. Creating an account
  const isAccount =
    action.includes('account') ||
    action.includes('user') ||
    action.includes('profile') ||
    feature.includes('account') ||
    feature.includes('user') ||
    details.includes('account') ||
    details.includes('profile');

  // 4. Creating a document template
  const isDocTemplate =
    action.includes('template') ||
    feature.includes('template') ||
    (action.includes('document') &&
      (action.includes('template') || details.includes('template') || feature.includes('template')));

  return isEvent || isBulletin || isAccount || isDocTemplate;
};

export const getLogCategory = (log) => {
  const action = (log.action || '').toLowerCase();
  const feature = (log.feature || '').toLowerCase();
  const details = (log.details || '').toLowerCase();

  if (action.includes('template') || feature.includes('template') || details.includes('template')) {
    return 'Document Template';
  }
  if (
    action.includes('event') ||
    feature.includes('event') ||
    feature.includes('calendar') ||
    details.includes('event')
  ) {
    return 'Event';
  }
  if (
    action.includes('bulletin') ||
    action.includes('announcement') ||
    action.includes('news') ||
    feature.includes('bulletin') ||
    feature.includes('news')
  ) {
    return 'Bulletin';
  }
  if (
    action.includes('account') ||
    action.includes('user') ||
    action.includes('profile') ||
    feature.includes('account') ||
    feature.includes('user')
  ) {
    return 'User Account';
  }
  return 'General Creation';
};

export default function ActivityLogsView({ currentUser, isDarkMode }) {
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Date Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  const fetchLiveLogs = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Strictly filter so it only stores creation of event, bulletin, account, document template
          const filtered = data.filter(isPermittedActivityLog);
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
    setLogsList([]);
  };

  useEffect(() => {
    fetchLiveLogs();
  }, []);

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

  // Filter logs by category and date
  const processedLogs = useMemo(() => {
    return logsList.filter((log) => {
      // Category filter
      const category = getLogCategory(log);
      if (activeCategory === 'events' && category !== 'Event') return false;
      if (activeCategory === 'bulletins' && category !== 'Bulletin') return false;
      if (activeCategory === 'accounts' && category !== 'User Account') return false;
      if (activeCategory === 'templates' && category !== 'Document Template') return false;

      // Date filter
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
    });
  }, [logsList, activeCategory, startDate, endDate]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: logsList.length, events: 0, bulletins: 0, accounts: 0, templates: 0 };
    logsList.forEach((log) => {
      const cat = getLogCategory(log);
      if (cat === 'Event') counts.events++;
      else if (cat === 'Bulletin') counts.bulletins++;
      else if (cat === 'User Account') counts.accounts++;
      else if (cat === 'Document Template') counts.templates++;
    });
    return counts;
  }, [logsList]);

  const columns = useMemo(
    () => [
      {
        key: 'created_at',
        label: 'Date & Time',
        sortable: true,
        render: (log) => (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
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
          const userEmail = log.user_email || log.user || 'mardee131@gmail.com';
          const initial = userEmail.charAt(0).toUpperCase();
          return (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {initial}
              </div>
              <span className="font-semibold text-slate-900 dark:text-white text-xs font-sans truncate max-w-[180px]">
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                <Calendar className="w-3 h-3 text-purple-600" /> Event
              </span>
            );
          }
          if (cat === 'Bulletin') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                <Newspaper className="w-3 h-3 text-blue-600" /> Bulletin
              </span>
            );
          }
          if (cat === 'User Account') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <UserPlus className="w-3 h-3 text-amber-600" /> User Account
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <FileText className="w-3 h-3 text-emerald-600" /> Document Template
            </span>
          );
        },
      },
      {
        key: 'action',
        label: 'Creation Action',
        sortable: true,
        render: (log) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            {log.action}
          </span>
        ),
      },
      {
        key: 'details',
        label: 'Activity Details',
        sortable: false,
        render: (log) => (
          <span className="text-slate-700 dark:text-slate-300 text-xs font-sans max-w-sm line-clamp-2 leading-relaxed">
            {log.details || 'Creation record successfully saved.'}
          </span>
        ),
      },
    ],
    []
  );

  const statusTabs = {
    activeTab: activeCategory,
    onChange: (tabId) => setActiveCategory(tabId),
    tabs: [
      { id: 'all', label: 'All Permitted Logs', count: tabCounts.all },
      { id: 'events', label: 'Events Created', count: tabCounts.events },
      { id: 'bulletins', label: 'Bulletins Created', count: tabCounts.bulletins },
      { id: 'accounts', label: 'Accounts Created', count: tabCounts.accounts },
      { id: 'templates', label: 'Templates Created', count: tabCounts.templates },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Activity Logs
          </h2>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Records of created events, bulletins, user accounts, and document templates.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLiveLogs}
            disabled={loading}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Refresh Activity Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 text-blue-400">
            <Terminal className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            {isSupabaseConfigured() ? 'Live Audit Engine' : 'Local Audit Engine'}
          </span>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Filter by Date:
          </span>
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className={`px-2.5 py-1 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className={`px-2.5 py-1 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                datePreset === p.id
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}

          {(startDate || endDate) && (
            <button
              onClick={() => handlePresetChange('all')}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Clear Dates ✕
            </button>
          )}
        </div>
      </div>

      {/* Production DataTable with 10-row default pagination, sorting & search */}
      <DataTable
        data={processedLogs}
        columns={columns}
        keyField="id"
        searchable={true}
        searchPlaceholder="Search action, details, user..."
        searchKeys={['action', 'details', 'user_email', 'feature']}
        statusTabs={statusTabs}
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        emptyTitle="No Creation Activity Logs Found"
        emptySubtitle="Only events, bulletins, user accounts, and document template creation actions are logged."
        loading={loading}
      />
    </div>
  );
}
