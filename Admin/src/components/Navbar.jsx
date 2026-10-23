// Admin/src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  LogOut,
  User,
  Bell,
  Calendar,
  ChevronDown,
  Inbox,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  ShieldAlert,
  CheckCheck,
  ArrowUpRight,
} from 'lucide-react';
import UserAvatar from './UserAvatar';

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Navbar({
  activeTitle,
  pendingCount = 0,
  requests = [],
  logs = [],
  onSelectRequest,
  onToggleMobileMenu,
  currentUser,
  onLogout,
  onNavigate,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'requests'
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('zapatera_admin_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Persist read notification IDs
  const saveReadIds = (nextIds) => {
    setReadIds(nextIds);
    try {
      localStorage.setItem('zapatera_admin_read_notifications', JSON.stringify(nextIds.slice(-200)));
    } catch {}
  };

  // Build unified admin notifications list primarily focused on new/pending document requests + key alerts
  const notifications = useMemo(() => {
    const items = [];

    // 1. Document requests (prioritize pending and under_review, then recent requests)
    const sortedRequests = [...(Array.isArray(requests) ? requests : [])].sort((a, b) => {
      const aPending = a.status === 'pending' ? 1 : 0;
      const bPending = b.status === 'pending' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });

    sortedRequests.slice(0, 15).forEach((req) => {
      const status = String(req.status || 'pending').toLowerCase();
      const docTitle = req.document_title || req.document_name || req.doc_type || 'Barangay Document';
      const residentName = req.resident_name || req.user_name || req.full_name || 'Resident Applicant';
      const tracking = req.tracking_number || 'BZ-REQ';
      const notifId = `req-${req.id || tracking}-${status}`;

      const isPending = status === 'pending';
      const isReview = status === 'under_review';
      const isApproved = status === 'approved' || status === 'ready_for_pickup' || status === 'completed';

      items.push({
        id: notifId,
        category: 'requests',
        type: isPending ? 'pending_request' : isReview ? 'review_request' : isApproved ? 'approved_request' : 'request_update',
        title: isPending
          ? `New Document Request: ${docTitle}`
          : isReview
          ? `Under Review: ${docTitle}`
          : `Request ${status.replace(/_/g, ' ')}: ${docTitle}`,
        subtitle: `${residentName} • #${tracking}`,
        badge: isPending ? 'New Request' : status.replace(/_/g, ' '),
        timestamp: req.created_at || req.updated_at,
        rawRequest: req,
      });
    });

    // 2. Recent high-importance security / system logs (optional supplement)
    const recentSecurityLogs = (Array.isArray(logs) ? logs : [])
      .filter((l) => {
        const act = String(l.action || '').toLowerCase();
        return act.includes('lock') || act.includes('fail') || act.includes('create') || act.includes('submit');
      })
      .slice(0, 5);

    recentSecurityLogs.forEach((log, idx) => {
      const notifId = `log-${log.id || idx}-${log.timestamp || log.created_at || ''}`;
      items.push({
        id: notifId,
        category: 'system',
        type: 'security_log',
        title: log.action || 'System Activity Alert',
        subtitle: log.details || log.user || 'Barangay Admin Portal',
        badge: 'System Log',
        timestamp: log.timestamp || log.created_at,
        rawLog: log,
      });
    });

    return items;
  }, [requests, logs]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)),
    [notifications, readIds]
  );

  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !readIds.includes(n.id));
    }
    if (notifFilter === 'requests') {
      return notifications.filter((n) => n.category === 'requests');
    }
    return notifications;
  }, [notifications, notifFilter, readIds]);

  const badgeCount = unreadNotifications.length;

  const handleMarkAsRead = (id) => {
    if (!readIds.includes(id)) {
      saveReadIds([...readIds, id]);
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const merged = Array.from(new Set([...readIds, ...allIds]));
    saveReadIds(merged);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    if (isProfileMenuOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileMenuOpen, isNotificationsOpen]);

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-7 py-3.5 rounded-b-3xl shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Hamburger + Breadcrumb Subtitle + Active Title */}
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Mobile Hamburger Button (< 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden cursor-pointer active:scale-95"
          title="Open navigation menu"
          aria-label="Toggle mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo (< 1024px) */}
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 lg:hidden flex items-center justify-center p-1 bg-white border border-slate-200 shadow-2xs">
          <img src="/logo.png" alt="Barangay Seal" className="w-full h-full object-contain" />
        </div>

        {/* Title & Workspace Indicator */}
        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd]" />
            <span>Barangay Zapatera Workspace</span>
          </div>
          <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 tracking-tight truncate leading-snug">
            {activeTitle}
          </h2>
        </div>
      </div>

      {/* Right: Date Pill, Notifications Dropdown Bell & User Profile Pill */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
        {/* Current Date Pill (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f3f4f8] border border-slate-200/70 text-xs font-semibold text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-[#3b5bfd]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Admin Notifications Dropdown Container */}
        <div className="relative" ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setIsProfileMenuOpen(false);
            }}
            className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isNotificationsOpen
                ? 'bg-blue-50 border-blue-200 text-[#3b5bfd] shadow-xs'
                : 'bg-[#f3f4f8] hover:bg-blue-50 border-slate-200/70 text-slate-600 hover:text-[#3b5bfd]'
            }`}
            title={
              badgeCount > 0
                ? `${badgeCount} Unread Notification(s)`
                : 'Admin Notifications'
            }
            aria-label="Open Admin Notifications"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-4 h-4 stroke-[2.2]" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#3b5bfd] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-xs">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {isNotificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-slate-950/10 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                onClick={() => setIsNotificationsOpen(false)}
                aria-hidden="true"
              />

              <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-96 rounded-[26px] bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.14)] overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150">
                {/* Dropdown Header */}
                <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#3b5bfd] flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Notifications</h3>
                        {pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                            {pendingCount} Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Document requests & system updates
                      </p>
                    </div>
                  </div>

                  {badgeCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="px-2.5 py-1 rounded-full bg-[#f4f7fb] hover:bg-blue-50 text-[11px] font-bold text-[#3b5bfd] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="px-4 py-2.5 bg-[#f4f7fb]/60 border-b border-slate-100 flex items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All', count: notifications.length },
                    { id: 'unread', label: 'Unread', count: unreadNotifications.length },
                    {
                      id: 'requests',
                      label: 'Doc Requests',
                      count: notifications.filter((n) => n.category === 'requests').length,
                    },
                  ].map((tab) => {
                    const active = notifFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifFilter(tab.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#3b5bfd] text-white shadow-2xs'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Notifications List */}
                <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                  {displayedNotifications.length === 0 ? (
                    <div className="py-10 px-6 text-center space-y-2">
                      <div className="w-11 h-11 rounded-2xl bg-[#f4f7fb] border border-slate-200/70 text-slate-400 flex items-center justify-center mx-auto">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-extrabold text-slate-700">No notifications here</p>
                      <p className="text-[11px] text-slate-400">
                        New resident document applications and alerts will appear here.
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((item) => {
                      const isUnread = !readIds.includes(item.id);
                      const isPendingReq = item.type === 'pending_request';
                      const isReviewReq = item.type === 'review_request';
                      const isSecurity = item.type === 'security_log';

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            if (item.rawRequest && onSelectRequest) {
                              setIsNotificationsOpen(false);
                              onSelectRequest(item.rawRequest);
                            } else if (item.category === 'requests' && onNavigate) {
                              setIsNotificationsOpen(false);
                              onNavigate('receive_request');
                            }
                          }}
                          className={`px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                            isUnread
                              ? 'bg-blue-50/35 hover:bg-blue-50/70'
                              : 'bg-white hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Notification Icon */}
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                              isPendingReq
                                ? 'bg-amber-50 border-amber-200/80 text-amber-600'
                                : isReviewReq
                                ? 'bg-blue-50 border-blue-200/80 text-[#3b5bfd]'
                                : isSecurity
                                ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                                : 'bg-emerald-50 border-emerald-200/80 text-emerald-600'
                            }`}
                          >
                            {isPendingReq ? (
                              <FileText className="w-4 h-4" />
                            ) : isReviewReq ? (
                              <Clock className="w-4 h-4" />
                            ) : isSecurity ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>

                          {/* Notification Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-xs leading-snug truncate ${
                                  isUnread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'
                                }`}
                              >
                                {item.title}
                              </p>
                              {isUnread && (
                                <span
                                  className="w-2 h-2 rounded-full bg-[#3b5bfd] shrink-0 mt-1"
                                  title="Unread"
                                />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.subtitle}
                            </p>

                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                  isPendingReq
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isReviewReq
                                    ? 'bg-blue-50 text-[#3b5bfd] border-blue-200'
                                    : isSecurity
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {item.badge}
                              </span>

                              <span className="text-[10px] font-semibold text-slate-400">
                                {formatRelativeTime(item.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer */}
                <div className="p-2.5 bg-[#f4f7fb] border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      if (onNavigate) onNavigate('receive_request');
                    }}
                    className="w-full py-2 px-4 rounded-full bg-white hover:bg-blue-50 text-[#3b5bfd] border border-slate-200/80 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>View All Document Requests</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar & Profile Pill Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen((prev) => !prev);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:pl-1.5 sm:pr-3 sm:py-1 rounded-full bg-[#f3f4f8] hover:bg-white border border-slate-200/80 hover:shadow-xs active:scale-98 transition-all cursor-pointer"
            title="Profile & Options"
            aria-label="User Profile Menu"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="relative shrink-0">
              <UserAvatar
                src={currentUser?.avatar_url}
                name={currentUser?.full_name || 'Barangay Admin'}
                role={currentUser?.role || 'admin'}
                size="xs"
                isDarkMode={false}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="hidden sm:block text-left max-w-[130px]">
              <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                {currentUser?.full_name?.split(' ')[0] || 'Admin'}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#3b5bfd] leading-none mt-0.5">
                Admin Desk
              </p>
            </div>

            <ChevronDown
              className={`hidden sm:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isProfileMenuOpen ? 'rotate-180 text-[#3b5bfd]' : ''
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-slate-950/10 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                onClick={() => setIsProfileMenuOpen(false)}
                aria-hidden="true"
              />

              <div className="absolute right-0 top-full mt-2.5 w-64 rounded-3xl bg-white border border-slate-200/80 shadow-xl py-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                {/* Profile Identity Details */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-3">
                  <UserAvatar
                    src={currentUser?.avatar_url}
                    name={currentUser?.full_name || 'Barangay Admin'}
                    role={currentUser?.role || 'admin'}
                    size="sm"
                    isDarkMode={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {currentUser?.full_name || 'Barangay Admin'}
                      </p>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {currentUser?.email}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-[#3b5bfd] border border-blue-200/60 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd]" />
                      {currentUser?.role?.replace('_', ' ') || 'Barangay Admin'}
                    </span>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="p-2 space-y-1">
                  {onNavigate && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigate('receive_request');
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 hover:text-[#3b5bfd] hover:bg-blue-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Inbox className="w-4 h-4 text-slate-400" />
                          <span>Request Queue</span>
                        </div>
                        {pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#3b5bfd] text-white text-[10px] font-bold">
                            {pendingCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigate('account');
                        }}
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 hover:text-[#3b5bfd] hover:bg-blue-50/70 transition-colors cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Account Settings</span>
                      </button>
                    </>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
