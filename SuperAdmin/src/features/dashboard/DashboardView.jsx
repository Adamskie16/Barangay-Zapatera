// SuperAdmin/src/features/dashboard/DashboardView.jsx
import React, { useState, useMemo } from 'react';
import {
  Bell,
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
  Activity,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

// Decorative Character Illustration on Calendar (matching Admin Dashboard)
function CalendarCharacterIllustration() {
  return (
    <div className="hidden sm:block pointer-events-none select-none w-24 h-28 relative -mt-8 -mr-2 shrink-0">
      <svg viewBox="0 0 120 135" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        <path
          d="M42 62 C46 55, 78 52, 92 64 L112 96 C115 102, 108 112, 98 108 L82 95 L78 128 L42 124 L45 84 L26 84 C18 84, 18 70, 26 68 Z"
          fill="#facc15"
        />
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
        <rect x="12" y="67" width="14" height="12" rx="5" fill="#1e293b" />
        <path d="M22 67 L22 61 C22 58, 26 58, 26 61 L26 67 Z" fill="#1e293b" />
        <rect x="20" y="96" width="15" height="13" rx="5" fill="#1e293b" />
        <path d="M24 96 L24 89 C24 86, 28 86, 28 89 L28 96 Z" fill="#1e293b" />
        <path d="M56 48 L68 50 L66 62 L54 60 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="44" y="16" width="32" height="36" rx="14" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />
        <path
          d="M42 26 C40 14, 54 6, 72 10 C82 12, 84 22, 76 28 C72 20, 56 18, 46 24 Z"
          fill="#1e293b"
        />
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
  users = [],
  docTypes = [],
  requests = [],
  events = [],
  logs = [],
  config = {},
  setActiveTab,
}) {
  const [analyticsTab, setAnalyticsTab] = useState('evaluation');
  const [alertTab, setAlertTab] = useState('emergency');
  const [timeframe, setTimeframe] = useState('Week');
  const [chartType, setChartType] = useState('area');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(3);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appFilterStatus, setAppFilterStatus] = useState('all');

  // 1. Core Metrics
  const totalUsers = users.length;
  const totalResidents = users.filter((u) => u.role === 'resident').length;
  const lockedUsers = users.filter((u) => u.is_locked || Number(u.failed_login_attempts || 0) >= 3);

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
  const fulfillmentRate = totalRequests > 0 ? Math.round((completedTotal / totalRequests) * 100) : 78;

  const totalFeesCollected = useMemo(() => {
    return requests
      .filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        return s === 'completed' || s === 'issued' || s === 'released' || Boolean(r.is_claimed);
      })
      .reduce((sum, r) => {
        const feeVal =
          r.claimed_fee !== undefined && r.claimed_fee !== null
            ? Number(r.claimed_fee)
            : r.amount_paid !== undefined && r.amount_paid !== null
            ? Number(r.amount_paid)
            : Number(r.fee || 0);
        return sum + (isNaN(feeVal) ? 0 : feeVal);
      }, 0);
  }, [requests]);

  // 2. Request Analytics Metrics
  const analyticsMetrics = useMemo(() => {
    if (analyticsTab === 'evaluation') {
      const positive = totalRequests > 0 ? Math.round(((completedTotal + reviewRequests.length) / totalRequests) * 100) : 78;
      const negative = totalRequests > 0 ? Math.round((declinedRequests.length / totalRequests) * 100) : 22;
      return {
        firstLabel: 'Approved & On-Track',
        firstSub: 'Requests fulfilled within target SLA',
        firstPct: positive,
        secondLabel: 'Declined / Returned',
        secondSub: 'Incomplete requirements or rejected',
        secondPct: negative,
      };
    }
    if (analyticsTab === 'types') {
      const clearanceCount = requests.filter((r) =>
        String(r.document_title || r.document_name || '').toLowerCase().includes('clearance')
      ).length;
      const clearancePct = totalRequests > 0 ? Math.round((clearanceCount / totalRequests) * 100) : 64;
      return {
        firstLabel: 'Barangay Clearances',
        firstSub: 'Primary identification & clearance docs',
        firstPct: clearancePct,
        secondLabel: 'Indigency & Permits',
        secondSub: 'Residency, business & special certificates',
        secondPct: Math.max(0, 100 - clearancePct),
      };
    }
    const issuedPct = totalRequests > 0 ? Math.round((issuedRequests.length / totalRequests) * 100) : 72;
    const pickupPct = totalRequests > 0 ? Math.round((approvedRequests.length / totalRequests) * 100) : 28;
    return {
      firstLabel: 'Claimed & Released',
      firstSub: 'Officially released to barangay residents',
      firstPct: issuedPct,
      secondLabel: 'Awaiting Resident Pickup',
      secondSub: 'Approved & printed at barangay hall',
      secondPct: pickupPct,
    };
  }, [analyticsTab, totalRequests, completedTotal, reviewRequests.length, declinedRequests.length, requests, issuedRequests.length, approvedRequests.length]);

  // 3. Week Strip Calendar Data
  const weekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMon + weekOffset * 7);

    const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return shortNames.map((name, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = d.toISOString().slice(0, 10);
      const hasEvent = events.some((ev) => String(ev.event_date || ev.created_at || '').startsWith(dateStr));
      return {
        idx,
        name,
        dayNum: String(d.getDate()).padStart(2, '0'),
        monthYear: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        hasEvent,
      };
    });
  }, [weekOffset, events]);

  const currentMonthLabel = weekDays[selectedDayIdx]?.monthYear || weekDays[0]?.monthYear || 'October 2026';

  // 4. Statistics Chart Data
  const chartData = useMemo(() => {
    if (timeframe === 'Week') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const counts = [0, 0, 0, 0, 0, 0, 0];
      requests.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          const dayIdx = (d.getDay() + 6) % 7;
          counts[dayIdx] += 1;
        }
      });
      return labels.map((name, i) => ({ name, requests: counts[i] }));
    }
    if (timeframe === 'Month') {
      const labels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
      const counts = [0, 0, 0, 0];
      requests.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          const wk = Math.min(3, Math.floor((d.getDate() - 1) / 7));
          counts[wk] += 1;
        }
      });
      return labels.map((name, i) => ({ name, requests: counts[i] }));
    }
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = new Array(12).fill(0);
    requests.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      if (!isNaN(d.getTime())) {
        counts[d.getMonth()] += 1;
      }
    });
    return labels.map((name, i) => ({ name, requests: counts[i] }));
  }, [requests, timeframe]);

  const maxChartVal = Math.max(...chartData.map((d) => d.requests), 5);

  // 5. Resident Applications (Max 3)
  const displayedApplications = useMemo(() => {
    let list = [...requests].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (appFilterStatus !== 'all') {
      list = list.filter((r) => String(r.status || 'pending').toLowerCase() === appFilterStatus);
    }
    return list.slice(0, 3);
  }, [requests, appFilterStatus]);

  const activeHighlightId =
    selectedAppId ||
    displayedApplications[1]?.id ||
    displayedApplications[1]?.tracking_number ||
    displayedApplications[0]?.id ||
    displayedApplications[0]?.tracking_number;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 text-slate-800 font-sans">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        {/* ================= LEFT COLUMN (Overview, Request Analytics, Request Response) ================= */}
        <div className="xl:col-span-5 space-y-7">
          {/* 1. OVERVIEW (2x2 Colorful Gradient Cards) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Overview</h2>
              <span className="text-[11px] font-bold text-[#3b5bfd] bg-white px-2.5 py-1 rounded-full border border-slate-100 shadow-2xs">
                {config?.doc_prefix || 'BZ-2026'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Pending Requests */}
              <div
                onClick={() => setActiveTab && setActiveTab('reports')}
                className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#ff808b] via-[#ff6b8b] to-[#ff758c] text-white shadow-[0_14px_30px_-10px_rgba(255,107,139,0.55)] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                    {pendingRequests.length.toLocaleString()}
                  </div>
                  <p className="text-xs font-semibold text-white/95 mt-2">Pending Queue</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white text-[#ff6b8b] flex items-center justify-center shadow-md shrink-0">
                  <Bell className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              {/* Card 2: Total Registered Accounts */}
              <div
                onClick={() => setActiveTab && setActiveTab('users')}
                className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#34d399] via-[#10b981] to-[#2dd4bf] text-white shadow-[0_14px_30px_-10px_rgba(16,185,129,0.5)] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                    {totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs font-semibold text-white/95 mt-2">
                    User Accounts ({totalResidents} Res)
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white text-[#10b981] flex items-center justify-center shadow-md shrink-0">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              {/* Card 3: Fee Collections */}
              <div
                onClick={() => setActiveTab && setActiveTab('reports')}
                className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#fb923c] text-white shadow-[0_14px_30px_-10px_rgba(245,158,11,0.5)] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                    {formatCurrency(totalFeesCollected)}
                  </div>
                  <p className="text-xs font-semibold text-white/95 mt-2">Fee Collections</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white text-[#f59e0b] flex items-center justify-center shadow-md shrink-0">
                  <DollarSign className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              {/* Card 4: Approved & Issued */}
              <div
                onClick={() => setActiveTab && setActiveTab('documents')}
                className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#38bdf8] via-[#29b6f6] to-[#3b82f6] text-white shadow-[0_14px_30px_-10px_rgba(56,189,248,0.55)] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 flex items-center justify-between"
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                    {completedTotal.toLocaleString()}
                  </div>
                  <p className="text-xs font-semibold text-white/95 mt-2">Approved &amp; Issued</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white text-[#29b6f6] flex items-center justify-center shadow-md shrink-0">
                  <FileCheck2 className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
            </div>
          </section>

          {/* 2. REQUEST ANALYTICS */}
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight mb-4">
              Request Analytics
            </h2>

            <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-xs border border-slate-100/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5 gap-2 overflow-x-auto">
                {[
                  { id: 'evaluation', label: 'Request Evaluation' },
                  { id: 'types', label: 'Document Types' },
                  { id: 'status', label: 'Release Status' },
                ].map((tab) => {
                  const isActive = analyticsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAnalyticsTab(tab.id)}
                      className={`relative pb-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isActive ? 'text-[#38bdf8]' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-[15px] h-[3px] bg-[#38bdf8] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 shrink-0">
                    <span className="text-xl sm:text-2xl font-black text-slate-800">
                      {analyticsMetrics.firstPct}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {analyticsMetrics.firstLabel}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {analyticsMetrics.firstSub}
                    </p>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-[#fbbf24] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(analyticsMetrics.firstPct, 6)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-[#fbbf24] text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-300/40">
                    <Smile className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 shrink-0">
                    <span className="text-xl sm:text-2xl font-black text-slate-800">
                      {analyticsMetrics.secondPct}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {analyticsMetrics.secondLabel}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {analyticsMetrics.secondSub}
                    </p>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
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

          {/* 3. REQUEST RESPONSE (Donut Chart Card) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Request Response</h2>
              <span className="text-xs font-semibold text-slate-400">
                {totalRequests} Total
              </span>
            </div>

            <div className="bg-white rounded-[26px] p-5 shadow-xs border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
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

              {/* Center SVG Donut */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="14"
                    strokeDasharray={`${(fulfillmentRate / 100) * 289} 289`}
                    strokeLinecap="round"
                  />
                </svg>
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
                {[
                  { name: 'Completed', value: completedTotal, color: '#38bdf8' },
                  { name: 'In Queue', value: activeQueue, color: '#fbbf24' },
                  { name: 'Declined', value: declinedRequests.length, color: '#fb7185' },
                ].map((d) => (
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

        {/* ================= RIGHT COLUMN (Calendar, Statistics, Applications, Security Monitor) ================= */}
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

            <div className="bg-white rounded-[26px] px-5 py-4 shadow-xs border border-slate-100/80 flex items-center justify-between gap-3">
              <div className="grid grid-cols-6 gap-2 sm:gap-3 flex-1">
                {weekDays.map((d) => {
                  const isSelected = selectedDayIdx === d.idx;
                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => setSelectedDayIdx(d.idx)}
                      className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-linear-to-b from-[#4dc4ff] to-[#29b6f6] text-white shadow-lg shadow-sky-400/35 -translate-y-0.5'
                          : 'bg-transparent hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          isSelected ? 'text-white/90' : 'text-slate-400'
                        }`}
                      >
                        {d.name}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-extrabold mt-1.5 ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {d.dayNum}
                      </span>
                      <span
                        className={`w-3 h-1 rounded-full mt-2 ${
                          isSelected
                            ? 'bg-white'
                            : d.hasEvent
                            ? 'bg-amber-400'
                            : 'bg-sky-300/70'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <CalendarCharacterIllustration />
            </div>
          </section>

          {/* 2. STATISTICS (Interactive Area / Bar Chart) */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Statistics</h2>

              <div className="flex items-center gap-2.5">
                <div className="bg-white rounded-xl p-1 border border-slate-100 shadow-2xs flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-sky-50 text-[#38bdf8]'
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                    title="Bar Chart"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-sky-50 text-[#38bdf8]'
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                    title="Smooth Wave Chart"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                </div>

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
              {chartType === 'bar' ? (
                <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
                  {chartData.map((d) => {
                    const heightPct = Math.max(8, Math.round((d.requests / maxChartVal) * 100));
                    return (
                      <div key={d.name} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="text-[10px] font-extrabold text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.requests}
                        </span>
                        <div className="w-full max-w-[28px] h-36 bg-slate-100/80 rounded-xl flex items-end overflow-hidden">
                          <div
                            className="w-full bg-linear-to-t from-[#3b5bfd] to-[#38bdf8] rounded-xl transition-all duration-500"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">{d.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-52 flex flex-col justify-between">
                  <div className="relative h-40 w-full">
                    <svg viewBox="0 0 600 150" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="superAdminWaveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity="0.35" />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const pts = chartData.map((d, idx) => {
                          const x = chartData.length > 1 ? (idx / (chartData.length - 1)) * 580 + 10 : 300;
                          const y = 135 - (d.requests / maxChartVal) * 110;
                          return { x, y, val: d.requests, name: d.name };
                        });
                        const linePath = pts
                          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                          .join(' ');
                        const areaPath = `${linePath} L ${pts[pts.length - 1].x} 145 L ${pts[0].x} 145 Z`;
                        return (
                          <>
                            <path d={areaPath} fill="url(#superAdminWaveGrad)" />
                            <path d={linePath} fill="none" stroke="#29b6f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p) => (
                              <g key={p.name}>
                                <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#29b6f6" strokeWidth="2.5" />
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100">
                    {chartData.map((d) => (
                      <div key={d.name} className="text-center">
                        <span className="block text-[11px] font-semibold text-slate-400">{d.name}</span>
                        <span className="block text-[10px] font-extrabold text-slate-700">{d.requests}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  onClick={() => setActiveTab && setActiveTab('reports')}
                  className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  title="View All Requests in Reports"
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
                      onClick={() => setActiveTab && setActiveTab('reports')}
                      className={`bg-white rounded-[22px] px-4 sm:px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                        isHighlighted
                          ? 'shadow-lg shadow-slate-200/90 scale-[1.01] border border-sky-100'
                          : 'shadow-2xs border border-slate-100/80 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-[160px] flex-1">
                        <div
                          className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarGrad} text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs`}
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
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. COMPACT ACCOUNT SECURITY & AUDIT MONITOR */}
          <section>
            <div className="bg-white rounded-[24px] p-4 sm:px-6 shadow-xs border border-slate-100/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    lockedUsers.length > 0
                      ? 'bg-rose-50 text-rose-500'
                      : 'bg-emerald-50 text-emerald-500'
                  }`}
                >
                  {lockedUsers.length > 0 ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold text-slate-800">
                      Account Security &amp; Audit Monitor
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lockedUsers.length > 0
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {lockedUsers.length > 0
                        ? `${lockedUsers.length} Locked`
                        : 'All Clear'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {logs.length} security events recorded • 3-attempt lockout active
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lockedUsers.length > 0 && setActiveTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-500/20"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Accounts</span>
                  </button>
                )}
                {setActiveTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-[#38bdf8] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Logs</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
