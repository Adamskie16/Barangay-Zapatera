// Admin/src/features/dashboard/DashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  UserPlus,
  Users,
  FileCheck2,
  MoreHorizontal,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Smile,
  Frown,
  User,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

// Custom Floating Callout Tooltip matching the reference UI
function CustomStatsTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const val = payload[0].value ?? 0;
    return (
      <div className="relative flex flex-col items-center pointer-events-none -translate-y-2">
        <div className="bg-[#4dc4ff] text-white px-3.5 py-1.5 rounded-2xl shadow-lg shadow-sky-400/30 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white text-[#4dc4ff] flex items-center justify-center shrink-0">
            <User className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="leading-tight">
            <span className="text-xs font-extrabold tracking-tight">{val.toLocaleString()}</span>
            <span className="text-[10px] font-medium text-white/90 ml-1">reqs</span>
          </div>
        </div>
        <div className="w-2.5 h-2.5 bg-[#4dc4ff] rotate-45 -mt-1.5 rounded-[2px]" />
      </div>
    );
  }
  return null;
}

// Decorative Character Illustration on Calendar (inspired by the reference UI)
function CalendarCharacterIllustration() {
  return (
    <div className="hidden sm:block pointer-events-none select-none w-24 h-28 relative -mt-8 -mr-2 shrink-0">
      <svg viewBox="0 0 120 135" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Polka-dot Mustard Shirt Body */}
        <path
          d="M42 62 C46 55, 78 52, 92 64 L112 96 C115 102, 108 112, 98 108 L82 95 L78 128 L42 124 L45 84 L26 84 C18 84, 18 70, 26 68 Z"
          fill="#facc15"
        />
        {/* Polka dots on shirt */}
        <circle cx="55" cy="72" r="2.2" fill="#1e293b" />
        <circle cx="70" cy="68" r="2" fill="#1e293b" />
        <circle cx="84" cy="74" r="2.3" fill="#1e293b" />
        <circle cx="62" cy="86" r="2.2" fill="#1e293b" />
        <circle cx="75" cy="84" r="1.8" fill="#1e293b" />
        <circle cx="52" cy="98" r="2.3" fill="#1e293b" />
        <circle cx="68" cy="102" r="2.2" fill="#1e293b" />
        <circle cx="56" cy="114" r="2" fill="#1e293b" />
        <circle cx="72" cy="116" r="2.3" fill="#1e293b" />
        <circle cx="94" cy="88" r="2" fill="#1e293b" />
        <circle cx="36" cy="75" r="1.9" fill="#1e293b" />

        {/* Left Hand Thumbs Up */}
        <rect x="12" y="67" width="14" height="12" rx="5" fill="#1e293b" />
        <path d="M22 67 L22 61 C22 58, 26 58, 26 61 L26 67 Z" fill="#1e293b" />

        {/* Right Hand Thumbs Up */}
        <rect x="20" y="96" width="15" height="13" rx="5" fill="#1e293b" />
        <path d="M24 96 L24 89 C24 86, 28 86, 28 89 L28 96 Z" fill="#1e293b" />

        {/* Neck & Head */}
        <path d="M56 48 L68 50 L66 62 L54 60 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="44" y="16" width="32" height="36" rx="14" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />

        {/* Hair */}
        <path
          d="M42 26 C40 14, 54 6, 72 10 C82 12, 84 22, 76 28 C72 20, 56 18, 46 24 Z"
          fill="#1e293b"
        />
        {/* Eyes & Smile */}
        <circle cx="54" cy="31" r="2" fill="#1e293b" />
        <circle cx="67" cy="32" r="2" fill="#1e293b" />
        <path d="M51 26 Q54 24 57 26" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M64 27 Q67 25 70 27" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M55 40 Q60 45 65 40" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

export default function DashboardView({
  requests = [],
  events = [],
  logs = [],
  setActiveTab,
  onQueueAction,
}) {
  // Status filtering counts
  const pendingRequests = useMemo(
    () => requests.filter((r) => String(r.status || 'pending').toLowerCase().trim() === 'pending'),
    [requests]
  );
  const reviewRequests = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'under_review' || s === 'under review' || s === 'processing';
      }),
    [requests]
  );
  const approvedRequests = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'approved' || s === 'ready_for_pickup';
      }),
    [requests]
  );
  const issuedRequests = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'issued' || s === 'completed';
      }),
    [requests]
  );
  const declinedRequests = useMemo(
    () =>
      requests.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'declined' || s === 'rejected';
      }),
    [requests]
  );

  const totalRequests = requests.length;
  const activeQueue = pendingRequests.length + reviewRequests.length;
  const completedTotal = approvedRequests.length + issuedRequests.length;
  const fulfillmentRate = totalRequests > 0 ? Math.round((completedTotal / totalRequests) * 100) : 60;
  const declineRate = totalRequests > 0 ? Math.round((declinedRequests.length / totalRequests) * 100) : 20;
  const pendingRate = totalRequests > 0 ? Math.round((pendingRequests.length / totalRequests) * 100) : 25;

  // Interactive States
  const [analyticsTab, setAnalyticsTab] = useState('review');
  const [alertTab, setAlertTab] = useState('emergency');
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [timeframe, setTimeframe] = useState('Week'); // 'Week' | 'Month' | 'Year'
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appFilterStatus, setAppFilterStatus] = useState('all');

  // Compact Security Summary State (Limited for Dashboard)
  const [securityAccounts, setSecurityAccounts] = useState([]);
  const [securityViewMode, setSecurityViewMode] = useState('accounts'); // 'accounts' | 'logs'

  useEffect(() => {
    let isMounted = true;

    const loadSecuritySnapshot = async () => {
      try {
        if (isSupabaseConfigured()) {
          const [{ data: supaProfiles }, { data: unlockReqs }] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, email, full_name, first_name, last_name, role, is_locked, is_active, failed_attempts, failed_login_attempts, locked_at, created_at')
              .order('created_at', { ascending: false })
              .limit(50),
            supabase
              .from('account_unlock_requests')
              .select('email, full_name, status, failed_attempts, locked_at')
              .eq('status', 'pending'),
          ]);

          const lockedMap = new Map();
          if (Array.isArray(unlockReqs)) {
            unlockReqs.forEach((u) => {
              if (u.email) lockedMap.set(u.email.toLowerCase().trim(), u);
            });
          }

          if (Array.isArray(supaProfiles) && isMounted) {
            const seen = new Set();
            const normalized = [];
            for (const p of supaProfiles) {
              const email = (p.email || '').toLowerCase().trim();
              if (!email || seen.has(email)) continue;
              seen.add(email);
              const attempts = Math.max(p.failed_login_attempts || 0, p.failed_attempts || 0);
              const hasUnlockReq = lockedMap.has(email);
              const isExplicitlyUnlocked = p.is_locked === false && attempts < 3;
              const isLocked = isExplicitlyUnlocked ? false : (Boolean(p.is_locked) || attempts >= 3 || hasUnlockReq);
              normalized.push({
                ...p,
                email,
                is_locked: isLocked,
                failed_attempts: isLocked ? Math.max(attempts, 3) : 0,
                locked_at: isLocked ? (p.locked_at || lockedMap.get(email)?.locked_at || null) : null,
              });
            }
            setSecurityAccounts(normalized);
            return;
          }
        }
      } catch {}

      // Fallback local storage snapshot
      try {
        const storedRes = JSON.parse(localStorage.getItem('zapatera_residents_db') || '[]');
        const storedAdmins = JSON.parse(localStorage.getItem('zapatera_admins_db') || '[]');
        const combined = [...(Array.isArray(storedRes) ? storedRes : []), ...(Array.isArray(storedAdmins) ? storedAdmins : [])];
        const normalized = combined.map((u) => {
          const email = (u.email || '').toLowerCase().trim();
          const localLocked = localStorage.getItem(`zapatera_locked_${email}`) === 'true';
          const localFails = parseInt(localStorage.getItem(`zapatera_failed_${email}`) || '0', 10);
          const isExplicitlyUnlocked = u.is_locked === false && localFails < 3;
          const isLocked = isExplicitlyUnlocked ? false : (Boolean(u.is_locked) || localLocked || localFails >= 3);
          return {
            ...u,
            email,
            is_locked: isLocked,
            failed_attempts: isLocked ? Math.max(localFails, 3) : 0,
          };
        });
        if (isMounted) setSecurityAccounts(normalized);
      } catch {}
    };

    loadSecuritySnapshot();

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('zapatera_security_channel');
        bc.onmessage = () => loadSecuritySnapshot();
      } catch {}
    }

    return () => {
      isMounted = false;
      if (bc) bc.close();
    };
  }, []);

  const lockedAccounts = useMemo(
    () => securityAccounts.filter((a) => a.is_locked),
    [securityAccounts]
  );
  const activeAccountsCount = useMemo(
    () => Math.max(0, securityAccounts.length - lockedAccounts.length),
    [securityAccounts.length, lockedAccounts.length]
  );
  // Limit display to at most 3 items on dashboard
  const limitedSecurityAccounts = useMemo(() => {
    const sorted = [...securityAccounts].sort((a, b) => {
      if (a.is_locked !== b.is_locked) return a.is_locked ? -1 : 1;
      return (b.failed_attempts || 0) - (a.failed_attempts || 0);
    });
    return sorted.slice(0, 3);
  }, [securityAccounts]);

  const limitedSecurityLogs = useMemo(() => logs.slice(0, 3), [logs]);

  // Calendar Week Strip State
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const now = new Date();
    return now.toDateString();
  });

  const calendarDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const start = new Date(base);
    start.setDate(base.getDate() - 6);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    for (let i = 0; i < 9; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toDateString();
      const hasRequests = requests.some((r) => {
        if (!r.created_at) return false;
        return new Date(r.created_at).toDateString() === dateStr;
      });
      days.push({
        key: dateStr,
        dayName: dayLabels[d.getDay()],
        dayNumber: d.getDate(),
        fullDate: d,
        hasRequests,
      });
    }
    return days;
  }, [weekOffset, requests]);

  const currentMonthLabel = useMemo(() => {
    const midDay = calendarDays[4]?.fullDate || new Date();
    return midDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarDays]);

  // Activity 2x2 Cards Configuration
  const activityCards = useMemo(() => {
    const pendingShare = totalRequests > 0 ? ((pendingRequests.length / totalRequests) * 100).toFixed(2) : '2.36';
    const reviewShare = totalRequests > 0 ? ((reviewRequests.length / totalRequests) * 100).toFixed(2) : '2.06';
    const totalShare = totalRequests > 0 ? ((completedTotal / totalRequests) * 100).toFixed(2) : '2.46';
    const issuedShare = totalRequests > 0 ? ((issuedRequests.length / totalRequests) * 100).toFixed(2) : '3.36';

    return [
      {
        id: 'pending',
        title: 'Pending Alert',
        count: pendingRequests.length,
        badge: `+${pendingShare}%`,
        isUp: true,
        icon: Bell,
        iconColor: 'text-[#38bdf8]',
        gradient: 'bg-gradient-to-br from-[#56ccf2] via-[#38bdf8] to-[#2f80ed]',
        shadow: 'shadow-sky-400/25',
        sparkData: [{ v: 12 }, { v: 18 }, { v: 15 }, { v: 26 }, { v: 22 }, { v: 30 }, { v: 27 }],
        onClick: () => setActiveTab && setActiveTab('receive_request'),
      },
      {
        id: 'active_review',
        title: 'Under Review',
        count: reviewRequests.length + approvedRequests.length,
        badge: `+${reviewShare}%`,
        isUp: false,
        icon: UserPlus,
        iconColor: 'text-[#10b981]',
        gradient: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669]',
        shadow: 'shadow-emerald-400/25',
        sparkData: [{ v: 20 }, { v: 14 }, { v: 22 }, { v: 18 }, { v: 12 }, { v: 24 }, { v: 19 }],
        onClick: () => setActiveTab && setActiveTab('receive_request'),
      },
      {
        id: 'total_requests',
        title: 'Total Requests',
        count: totalRequests,
        badge: `+${totalShare}%`,
        isUp: true,
        icon: Users,
        iconColor: 'text-[#7c3aed]',
        gradient: 'bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
        shadow: 'shadow-violet-500/25',
        sparkData: [{ v: 10 }, { v: 16 }, { v: 14 }, { v: 24 }, { v: 20 }, { v: 28 }, { v: 32 }],
        onClick: () => setActiveTab && setActiveTab('reports'),
      },
      {
        id: 'issued_docs',
        title: 'Issued Docs',
        count: completedTotal,
        badge: `+${issuedShare}%`,
        isUp: true,
        icon: FileCheck2,
        iconColor: 'text-[#3b82f6]',
        gradient: 'bg-gradient-to-br from-[#4f8ff7] via-[#3b82f6] to-[#2563eb]',
        shadow: 'shadow-blue-500/25',
        sparkData: [{ v: 28 }, { v: 22 }, { v: 14 }, { v: 19 }, { v: 25 }, { v: 21 }, { v: 29 }],
        onClick: () => setActiveTab && setActiveTab('approved_documents'),
      },
    ];
  }, [pendingRequests.length, reviewRequests.length, approvedRequests.length, totalRequests, completedTotal, issuedRequests.length, setActiveTab]);

  // Analytics Tab Content (Left Column Middle)
  const analyticsMetrics = useMemo(() => {
    const posReview = totalRequests > 0 ? fulfillmentRate : 60;
    const negReview = totalRequests > 0 ? declineRate : 20;

    if (analyticsTab === 'satisfaction') {
      const issuedPct = totalRequests > 0 ? Math.round((issuedRequests.length / totalRequests) * 100) : 72;
      const pickupPct = totalRequests > 0 ? Math.round((approvedRequests.length / totalRequests) * 100) : 28;
      return {
        firstLabel: 'Claimed & Issued',
        firstPct: issuedPct,
        secondLabel: 'Ready for Pickup',
        secondPct: pickupPct,
      };
    }
    if (analyticsTab === 'overview') {
      const activePct = totalRequests > 0 ? Math.round((activeQueue / totalRequests) * 100) : 45;
      const donePct = totalRequests > 0 ? fulfillmentRate : 55;
      return {
        firstLabel: 'Completed Pipeline',
        firstPct: donePct,
        secondLabel: 'Active Queue Load',
        secondPct: activePct,
      };
    }
    if (analyticsTab === 'response') {
      const fastPct = totalRequests > 0 ? Math.min(100, Math.max(65, 100 - pendingRate)) : 80;
      const waitPct = totalRequests > 0 ? pendingRate : 20;
      return {
        firstLabel: 'On-Time Response',
        firstPct: fastPct,
        secondLabel: 'Waiting Verification',
        secondPct: waitPct,
      };
    }
    return {
      firstLabel: 'Approved Review',
      firstPct: posReview,
      secondLabel: 'Declined Review',
      secondPct: negReview,
    };
  }, [analyticsTab, totalRequests, fulfillmentRate, declineRate, issuedRequests.length, approvedRequests.length, activeQueue, pendingRate]);

  // Statistics Chart Data (Week / Month / Year)
  const chartData = useMemo(() => {
    if (timeframe === 'Week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const counts = [0, 0, 0, 0, 0, 0, 0];

      requests.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          const idx = (d.getDay() + 6) % 7;
          counts[idx] += 1;
        }
      });

      const hasAny = counts.some((c) => c > 0);
      const fallback = [2, 1, 2, 6, 6, 8, 6];

      return days.map((name, i) => ({
        name,
        requests: hasAny ? counts[i] : fallback[i],
      }));
    }

    if (timeframe === 'Month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const counts = [0, 0, 0, 0];
      const now = new Date();

      requests.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime()) && d.getMonth() === now.getMonth()) {
          const weekIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
          counts[weekIdx] += 1;
        }
      });

      const hasAny = counts.some((c) => c > 0);
      const fallback = [4, 7, 5, 9];
      return weeks.map((name, i) => ({
        name,
        requests: hasAny ? counts[i] : fallback[i],
      }));
    }

    // Year view (Jan - Dec)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = new Array(12).fill(0);
    requests.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      if (!isNaN(d.getTime())) {
        counts[d.getMonth()] += 1;
      }
    });
    const hasAny = counts.some((c) => c > 0);
    const fallback = [2, 3, 5, 4, 6, 7, 5, 8, 6, 9, 7, 8];
    return months.map((name, i) => ({
      name,
      requests: hasAny ? counts[i] : fallback[i],
    }));
  }, [requests, timeframe]);

  // Alert / Request Response Donut Chart Data
  const donutData = useMemo(() => {
    const solved = completedTotal;
    const pending = pendingRequests.length;
    const review = reviewRequests.length;
    const declined = declinedRequests.length;

    if (solved + pending + review + declined === 0) {
      return [
        { name: 'Solved', value: 40, color: '#38bdf8' },
        { name: 'Pending', value: 30, color: '#6366f1' },
        { name: 'In Review', value: 20, color: '#34d399' },
        { name: 'Declined', value: 10, color: '#e2e8f0' },
      ];
    }

    return [
      { name: 'Solved', value: solved, color: '#38bdf8' },
      { name: 'Pending', value: pending, color: '#6366f1' },
      { name: 'In Review', value: review, color: '#34d399' },
      { name: 'Declined', value: declined, color: '#f43f5e' },
    ];
  }, [completedTotal, pendingRequests.length, reviewRequests.length, declinedRequests.length]);

  // Resident Applications List (Bottom Right - Limited to 3 for clean dashboard balance)
  const displayedApplications = useMemo(() => {
    let list = [...requests].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (appFilterStatus !== 'all') {
      list = list.filter((r) => {
        const s = String(r.status || 'pending').toLowerCase().trim();
        if (appFilterStatus === 'pending') return s === 'pending' || s === 'under_review';
        if (appFilterStatus === 'approved') return s === 'approved' || s === 'issued' || s === 'completed';
        return true;
      });
    }
    return list.slice(0, 3);
  }, [requests, appFilterStatus]);

  const activeHighlightId = selectedAppId || displayedApplications[1]?.id || displayedApplications[0]?.id;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 text-slate-800 font-sans">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (Activity, Analytics, Request Response, Security) ================= */}
        <div className="xl:col-span-5 space-y-7">
          {/* 1. ACTIVITY (2x2 Gradient KPI Cards) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Activity</h2>
              <button
                type="button"
                onClick={() => setActiveTab && setActiveTab('receive_request')}
                className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors cursor-pointer"
              >
                Open Queue ({activeQueue})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activityCards.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={card.onClick}
                    className={`${card.gradient} ${card.shadow} rounded-[26px] p-5 text-white shadow-lg relative overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-0.5`}
                  >
                    {/* Top Row: White Squircle Icon + Three Dots */}
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                        <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          card.onClick();
                        }}
                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title={card.title}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Middle Right Mini Sparkline Wave */}
                    <div className="h-10 w-28 ml-auto -my-1 opacity-75 pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={card.sparkData}>
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke="#ffffff"
                            strokeWidth={2.2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bottom Row: Big Count + Label & Percentage Pill */}
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <div className="text-2xl sm:text-[28px] font-extrabold leading-none tracking-tight">
                          {card.count.toLocaleString()}
                        </div>
                        <div className="text-xs font-medium text-white/85 mt-1.5">
                          {card.title}
                        </div>
                      </div>

                      <div className="bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-0.5">
                        <span>{card.badge}</span>
                        <span className="text-[8px] ml-0.5">{card.isUp ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. ANALYTICS (Side Tab Selector + Dual Progress Bars Card) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Analytics</h2>
              <button
                type="button"
                onClick={() =>
                  setAnalyticsTab((prev) =>
                    prev === 'review'
                      ? 'satisfaction'
                      : prev === 'satisfaction'
                      ? 'overview'
                      : prev === 'overview'
                      ? 'response'
                      : 'review'
                  )
                }
                className="w-9 h-9 rounded-xl bg-white shadow-xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                title="Cycle Analytics Metrics"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              {/* Left Vertical Sub-Menu Card */}
              <div className="bg-white rounded-[24px] py-4 px-2 shadow-xs border border-slate-100/80 sm:w-44 shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center gap-1 overflow-x-auto">
                {[
                  { id: 'review', label: 'Request Review' },
                  { id: 'satisfaction', label: 'Fulfillment' },
                  { id: 'overview', label: 'Queue Overview' },
                  { id: 'response', label: 'Response Rate' },
                ].map((tab) => {
                  const isActive = analyticsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAnalyticsTab(tab.id)}
                      className={`text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap relative flex items-center ${
                        isActive
                          ? 'bg-sky-50/80 text-[#38bdf8] font-bold'
                          : 'text-slate-400 hover:text-slate-600 font-medium'
                      }`}
                    >
                      {isActive && (
                        <span className="hidden sm:block absolute left-0 top-2 bottom-2 w-1 bg-[#38bdf8] rounded-r-full" />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Progress Bars Card */}
              <div className="bg-white rounded-[24px] p-5 shadow-xs border border-slate-100/80 flex-1 flex flex-col justify-center gap-5">
                {/* Positive / Primary Metric Row */}
                <div className="flex items-center gap-3.5">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">{analyticsMetrics.firstLabel}</span>
                      <span className="font-extrabold text-slate-800">{analyticsMetrics.firstPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#38bdf8] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(analyticsMetrics.firstPct, 6)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-[#67d4ff] text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-300/40">
                    <Smile className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                {/* Negative / Secondary Metric Row */}
                <div className="flex items-center gap-3.5">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">{analyticsMetrics.secondLabel}</span>
                      <span className="font-extrabold text-slate-800">{analyticsMetrics.secondPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#34d399] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(analyticsMetrics.secondPct, 6)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-[#4ade80] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-300/40">
                    <Frown className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. ALERT / REQUEST RESPONSE (Donut Chart Card) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Request Response</h2>
              <span className="text-xs font-semibold text-slate-400">
                {totalRequests} Total
              </span>
            </div>

            <div className="bg-white rounded-[26px] p-5 shadow-xs border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left Mini Selector */}
              <div className="flex sm:flex-col gap-1.5 w-full sm:w-36 shrink-0">
                {[
                  { id: 'emergency', label: 'Pending Alert', count: pendingRequests.length },
                  { id: 'review', label: 'Under Review', count: reviewRequests.length },
                  { id: 'issued', label: 'Issued Docs', count: completedTotal },
                ].map((item) => {
                  const active = alertTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAlertTab(item.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer relative flex items-center justify-between ${
                        active
                          ? 'bg-sky-50/80 text-[#38bdf8] font-bold'
                          : 'text-slate-400 hover:text-slate-600 font-medium'
                      }`}
                    >
                      {active && (
                        <span className="hidden sm:block absolute left-0 top-2 bottom-2 w-1 bg-[#38bdf8] rounded-r-full" />
                      )}
                      <span className="truncate">{item.label}</span>
                      <span className="text-[10px] font-extrabold ml-1">{item.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Center Recharts Donut */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val}`, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Floating Percentage Pill Badge */}
                <div className="absolute -top-1 left-2 bg-white shadow-md border border-slate-100 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-[#38bdf8]">
                  {fulfillmentRate}%
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black text-slate-800">{completedTotal}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Solved</span>
                </div>
              </div>

              {/* Right Legend */}
              <div className="space-y-2.5 pr-2">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="font-semibold text-slate-600">{d.name}</span>
                    <span className="text-[11px] font-bold text-slate-400 ml-auto pl-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN (Calendar, Statistics, Applications, Compact Security) ================= */}
        <div className="xl:col-span-7 space-y-7">
          {/* 1. CALENDAR (Horizontal Week Strip + Character Illustration) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Calendar</h2>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">{currentMonthLabel}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    className="w-7 h-7 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                    title="Next Week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] px-4 sm:px-6 py-4 shadow-xs border border-slate-100/80 flex items-center justify-between gap-2 relative">
              <div className="flex items-center justify-between flex-1 overflow-x-auto gap-1 sm:gap-2 py-1">
                {calendarDays.map((day) => {
                  const isSelected = selectedDateKey === day.key;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDateKey(day.key)}
                      className={`flex flex-col items-center justify-center min-w-[42px] py-3 px-2.5 rounded-full transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#4dc4ff] to-[#60a5fa] text-white shadow-lg shadow-sky-400/40 -translate-y-0.5'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-medium mb-1.5 ${
                          isSelected ? 'text-white/90 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {day.dayName}
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          isSelected ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {day.hasRequests && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1 ${
                            isSelected ? 'bg-white' : 'bg-[#38bdf8]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <CalendarCharacterIllustration />
            </div>
          </section>

          {/* 2. REQUEST STATISTICS (Recharts AreaChart / BarChart) */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Request Statistics
              </h2>

              <div className="flex items-center gap-2">
                {/* Area / Line Chart Toggle */}
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    chartType === 'area'
                      ? 'bg-white text-slate-800 border-slate-200 shadow-xs'
                      : 'bg-white/60 text-slate-400 border-transparent hover:bg-white'
                  }`}
                  title="Smooth Area Chart"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>

                {/* Bar Chart Toggle */}
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    chartType === 'bar'
                      ? 'bg-white text-[#38bdf8] border-slate-200 shadow-xs'
                      : 'bg-white/60 text-slate-400 border-transparent hover:bg-white'
                  }`}
                  title="Bar Chart"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Timeframe Selector (Week / Month / Year) */}
                <div className="bg-white rounded-xl border border-slate-100 px-3 py-1.5 shadow-2xs">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#38bdf8] focus:outline-hidden cursor-pointer pr-1"
                  >
                    <option value="Week">Week</option>
                    <option value="Month">Month</option>
                    <option value="Year">Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-xs border border-slate-100/80">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 28, right: 16, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="requestStatsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomStatsTooltip />}
                        cursor={{ stroke: '#bae6fd', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="#29b6f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#requestStatsGrad)"
                        activeDot={{
                          r: 6,
                          fill: '#ffffff',
                          stroke: '#29b6f6',
                          strokeWidth: 3,
                        }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 28, right: 16, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomStatsTooltip />}
                        cursor={{ fill: '#f0f9ff', radius: 10 }}
                      />
                      <Bar
                        dataKey="requests"
                        fill="#38bdf8"
                        radius={[8, 8, 8, 8]}
                        barSize={24}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* 3. RESIDENT APPLICATION (Interactive Horizontal Cards List - Max 3) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Resident Application
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('receive_request')}
                  className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  title="View All Requests"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAppFilterStatus((prev) =>
                      prev === 'all' ? 'pending' : prev === 'pending' ? 'approved' : 'all'
                    )
                  }
                  className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  title={`Filter: ${appFilterStatus.toUpperCase()}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {displayedApplications.length === 0 ? (
              <div className="bg-white rounded-[24px] p-6 text-center shadow-xs border border-slate-100">
                <p className="text-xs font-semibold text-slate-400">
                  No resident document applications found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedApplications.map((req, idx) => {
                  const reqKey = req.id || req.tracking_number || idx;
                  const isHighlighted = activeHighlightId === reqKey;
                  const residentName = req.resident_name || req.user_name || 'Resident Applicant';
                  const docTitle = req.document_title || req.document_name || 'Barangay Clearance';
                  const statusLabel = String(req.status || 'pending').replace(/_/g, ' ');
                  const initials = residentName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const avatarColors = [
                    'from-sky-400 to-blue-500',
                    'from-emerald-400 to-teal-500',
                    'from-violet-400 to-purple-500',
                    'from-amber-400 to-orange-500',
                  ];
                  const avatarGrad = avatarColors[idx % avatarColors.length];

                  return (
                    <div
                      key={reqKey}
                      onMouseEnter={() => setSelectedAppId(reqKey)}
                      onClick={() => {
                        setSelectedAppId(reqKey);
                        if (onQueueAction) {
                          onQueueAction(req);
                        } else if (setActiveTab) {
                          setActiveTab('receive_request');
                        }
                      }}
                      className={`bg-white rounded-[22px] px-4 sm:px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                        isHighlighted
                          ? 'shadow-lg shadow-slate-200/90 scale-[1.01] border border-sky-100'
                          : 'shadow-2xs border border-slate-100/80 hover:shadow-md'
                      }`}
                    >
                      {/* Resident Avatar + Name */}
                      <div className="flex items-center gap-3.5 min-w-[160px] flex-1">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad} text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs sm:text-sm truncate ${
                              isHighlighted ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-600'
                            }`}
                          >
                            {residentName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {req.tracking_number || 'BZ-REQ'}
                          </p>
                        </div>
                      </div>

                      {/* Document Type Pill */}
                      <div className="flex items-center gap-2 min-w-[130px] flex-1">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#38bdf8] flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-xs truncate ${
                            isHighlighted ? 'font-bold text-slate-700' : 'font-medium text-slate-400'
                          }`}
                        >
                          {docTitle}
                        </span>
                      </div>

                      {/* Status / Date Column */}
                      <div className="hidden md:block text-right min-w-[95px]">
                        <span
                          className={`text-xs capitalize ${
                            isHighlighted ? 'font-bold text-slate-800' : 'font-medium text-slate-400'
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {formatDate(req.created_at).split(',')[0]}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onQueueAction) {
                            onQueueAction(req);
                          } else if (setActiveTab) {
                            setActiveTab('receive_request');
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                          isHighlighted
                            ? 'bg-[#4dc4ff] text-white shadow-md shadow-sky-400/35 hover:bg-[#38bdf8]'
                            : 'bg-sky-50/90 text-[#4dc4ff] hover:bg-[#4dc4ff] hover:text-white'
                        }`}
                      >
                        View Profile
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. SECURITY MONITOR (Compact / Limited Display for Dashboard) */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Account Security
                </h2>
                {lockedAccounts.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                    <Lock className="w-3 h-3" />
                    {lockedAccounts.length} Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    Protected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSecurityViewMode('accounts')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    securityViewMode === 'accounts'
                      ? 'bg-[#4dc4ff] text-white shadow-xs'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Lockouts ({lockedAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityViewMode('logs')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    securityViewMode === 'logs'
                      ? 'bg-[#4dc4ff] text-white shadow-xs'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Audit Logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('users')}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white text-sky-500 hover:bg-sky-50 border border-slate-100 transition-colors cursor-pointer"
                >
                  Manage All
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[26px] p-5 shadow-xs border border-slate-100/80 space-y-4">
              {/* Compact 3-Metric Security Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f8fafc] rounded-2xl p-3 flex items-center gap-2.5 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 leading-none">
                      {activeAccountsCount}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                      Active Users
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-3 flex items-center gap-2.5 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 leading-none">
                      {lockedAccounts.length}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                      3-Strike Locked
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-3 flex items-center gap-2.5 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#38bdf8] flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 leading-none">
                      {logs.length}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                      Security Events
                    </div>
                  </div>
                </div>
              </div>

              {/* Limited 3-Row Display (Accounts or Security Logs) */}
              {securityViewMode === 'accounts' ? (
                limitedSecurityAccounts.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400 font-medium">
                    All resident and staff accounts are secure. No lockouts detected.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {limitedSecurityAccounts.map((acc, i) => {
                      const displayName =
                        acc.full_name ||
                        [acc.first_name, acc.last_name].filter(Boolean).join(' ') ||
                        acc.email?.split('@')[0] ||
                        'Account';
                      return (
                        <div
                          key={acc.email || i}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#f8fafc] hover:bg-sky-50/40 border border-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                acc.is_locked
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {acc.is_locked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {displayName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {acc.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                acc.is_locked
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              {acc.is_locked
                                ? `Locked (${acc.failed_attempts || 3}/3)`
                                : 'Verified'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab && setActiveTab('users')}
                              className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#38bdf8] hover:bg-[#38bdf8] hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : limitedSecurityLogs.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400 font-medium">
                  No recent security audit logs recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {limitedSecurityLogs.map((log, i) => (
                    <div
                      key={log.id || i}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#f8fafc] border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-sky-50 text-[#38bdf8] flex items-center justify-center shrink-0">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {log.action || 'System Event'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {log.details || log.user_email || 'Admin security log'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {formatDate(log.created_at).split(',')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
