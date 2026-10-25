// Treasurer/src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Menu,
  LogOut,
  User,
  Bell,
  Calendar,
  ChevronDown,
  Inbox,
  ShieldCheck,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
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
  isRefreshing = false,
  onRefresh,
  paidTodayCount = 0,
  requests = [],
  onToggleMobileMenu,
  currentUser,
  onLogout,
  onNavigate,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'unpaid'
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('zapatera_treasurer_read_notifications');
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
      localStorage.setItem('zapatera_treasurer_read_notifications', JSON.stringify(nextIds.slice(-200)));
    } catch {}
  };

  // Build notifications list focused on payments needing collection or recent settlements
  const notifications = useMemo(() => {
    const items = [];
    const list = Array.isArray(requests) ? requests : [];

    // Sort requests: unpaid/pending first, then by date desc
    const sorted = [...list].sort((a, b) => {
      const aPaid = a.payment_status === 'paid' || a.is_paid === true || a.status === 'released' || a.status === 'completed';
      const bPaid = b.payment_status === 'paid' || b.is_paid === true || b.status === 'released' || b.status === 'completed';
      if (!aPaid && bPaid) return -1;
      if (aPaid && !bPaid) return 1;
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });

    sorted.slice(0, 15).forEach((req) => {
      const isPaid = req.payment_status === 'paid' || req.is_paid === true || req.status === 'released' || req.status === 'completed';
      const isWaived = req.payment_status === 'waived' || req.is_waived === true;
      const statusKey = isPaid ? 'paid' : isWaived ? 'waived' : 'unpaid';
      const docTitle = req.document_type || req.document_name || 'Barangay Clearance';
      const residentName = req.full_name || req.user_name || req.resident_name || 'Resident';
      const fee = Number(req.fee ?? req.amount ?? 0);
      const tracking = req.tracking_number || 'BZ-REQ';
      const notifId = `tx-${req.id || tracking}-${statusKey}`;

      items.push({
        id: notifId,
        category: !isPaid && !isWaived ? 'unpaid' : 'settled',
        type: !isPaid && !isWaived ? 'pending_payment' : isPaid ? 'completed_payment' : 'waived_fee',
        title: !isPaid && !isWaived
          ? `Pending Payment: ${docTitle}`
          : isPaid
          ? `Payment Settled: ${docTitle}`
          : `Fee Waived: ${docTitle}`,
        subtitle: `${residentName} • #${tracking} • PHP ${fee.toFixed(2)}`,
        badge: !isPaid && !isWaived ? 'To Collect' : isPaid ? 'Paid' : 'Waived',
        timestamp: req.payment_date || req.created_at || req.updated_at,
        rawRequest: req,
      });
    });

    return items;
  }, [requests]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)),
    [notifications, readIds]
  );

  const displayedNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !readIds.includes(n.id));
    }
    if (notifFilter === 'unpaid') {
      return notifications.filter((n) => n.category === 'unpaid');
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
            <span>Barangay Zapatera Treasury Desk</span>
          </div>
          <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 tracking-tight truncate leading-snug">
            {activeTitle}
          </h2>
        </div>
      </div>

      {/* Right: Date Pill, Refresh, Notifications Dropdown Bell & User Profile Pill */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Current Date Pill (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f3f4f8] border border-slate-200/70 text-xs font-semibold text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-[#3b5bfd]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Refresh Financial Data Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-full border border-slate-200/70 bg-[#f3f4f8] hover:bg-blue-50 text-slate-600 hover:text-[#3b5bfd] flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh financial data and collections"
            aria-label="Refresh financial data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#3b5bfd]' : ''}`} />
          </button>
        )}

        {/* Notifications Dropdown Container */}
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
                ? `${badgeCount} New Collection Alert(s)`
                : 'Treasurer Notifications'
            }
            aria-label="Open Treasurer Notifications"
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
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Collections Inbox</h3>
                        {badgeCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#3b5bfd] border border-blue-200 text-[10px] font-extrabold">
                            {badgeCount} New
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Payment releases & settlements
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
                      id: 'unpaid',
                      label: 'To Collect',
                      count: notifications.filter((n) => n.category === 'unpaid').length,
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
                      <p className="text-xs font-extrabold text-slate-700">No payment alerts</p>
                      <p className="text-[11px] text-slate-400">
                        New document fee collections and issued receipts will appear here.
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((item) => {
                      const isUnread = !readIds.includes(item.id);
                      const isPending = item.type === 'pending_payment';
                      const isCompleted = item.type === 'completed_payment';

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            setIsNotificationsOpen(false);
                            if (onNavigate) onNavigate('collections');
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
                              isPending
                                ? 'bg-amber-50 border-amber-200/80 text-amber-600'
                                : isCompleted
                                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600'
                                : 'bg-purple-50 border-purple-200/80 text-purple-600'
                            }`}
                          >
                            {isPending ? (
                              <Clock className="w-4 h-4" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
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
                                  isPending
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
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
                      if (onNavigate) onNavigate('collections');
                    }}
                    className="w-full py-2 px-4 rounded-full bg-white hover:bg-blue-50 text-[#3b5bfd] border border-slate-200/80 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>View All Collections & Receipts</span>
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
                name={currentUser?.full_name || 'Barangay Treasurer'}
                role="treasurer"
                size="xs"
                isDarkMode={false}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="hidden sm:block text-left max-w-[130px]">
              <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                {currentUser?.full_name?.split(' ')[0] || 'Treasurer'}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#3b5bfd] leading-none mt-0.5">
                Treasurer Desk
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
                    name={currentUser?.full_name || 'Barangay Treasurer'}
                    role="treasurer"
                    size="sm"
                    isDarkMode={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {currentUser?.full_name || 'Barangay Treasurer'}
                      </p>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3b5bfd] shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {currentUser?.email}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-[#3b5bfd] border border-blue-200/60 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3b5bfd]" />
                      Barangay Treasurer
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
                          onNavigate('collections');
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 hover:text-[#3b5bfd] hover:bg-blue-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          <span>Collections Ledger</span>
                        </div>
                        {paidTodayCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                            {paidTodayCount} Paid
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
