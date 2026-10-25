// Treasurer/src/features/dashboard/TreasurerDashboardView.jsx
import React, { useState, useMemo } from 'react';
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
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  DollarSign,
  Gift,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  Check,
  X,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../core/security';

// Decorative Character Illustration on Calendar (matching Admin Dashboard)
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

export default function TreasurerDashboardView({
  metrics = {},
  requests = [],
  docTypes = [],
  config = {},
  onRefresh,
  onNavigateToReports,
}) {
  // Interactive UI States
  const [analyticsTab, setAnalyticsTab] = useState('collection'); // 'collection' | 'fulfillment' | 'overview' | 'rate'
  const [alertTab, setAlertTab] = useState('paid'); // 'paid' | 'unpaid' | 'waived'
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [timeframe, setTimeframe] = useState('Week'); // 'Week' | 'Month' | 'Year'
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appFilterStatus, setAppFilterStatus] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [receiptModalItem, setReceiptModalItem] = useState(null);
  const [hoveredChartIndex, setHoveredChartIndex] = useState(null);

  // Calendar Week Strip State
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    return new Date().toDateString();
  });

  const totalRequests = requests.length;
  const paidRequests = useMemo(() => {
    return requests.filter((r) => {
      const s = String(r.status || '').toLowerCase().trim();
      const p = String(r.payment_status || '').toLowerCase().trim();
      return p === 'paid' || r.is_paid === true || s === 'completed' || s === 'released' || Boolean(r.is_claimed);
    });
  }, [requests]);

  const waivedRequests = useMemo(() => {
    return requests.filter((r) => r.payment_status === 'waived' || r.is_waived === true);
  }, [requests]);

  const unpaidRequests = useMemo(() => {
    return requests.filter((r) => {
      const isPaid = paidRequests.some((pr) => pr.id === r.id);
      const isWaived = waivedRequests.some((wr) => wr.id === r.id);
      const isDeclined = String(r.status || '').toLowerCase().trim() === 'declined';
      return !isPaid && !isWaived && !isDeclined;
    });
  }, [requests, paidRequests, waivedRequests]);

  const fulfillmentRate = totalRequests > 0 ? Math.round(((paidRequests.length + waivedRequests.length) / totalRequests) * 100) : 84;
  const collectionRate = totalRequests > 0 ? Math.round((paidRequests.length / totalRequests) * 100) : 72;
  const exemptionRate = totalRequests > 0 ? Math.round((waivedRequests.length / totalRequests) * 100) : 12;

  // Calendar Strip Days
  const calendarDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const start = new Date(base);
    start.setDate(base.getDate() - 4);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toDateString();
      const hasPayments = requests.some((r) => {
        const rawDate = r.payment_date || r.created_at;
        if (!rawDate) return false;
        return new Date(rawDate).toDateString() === dateStr;
      });
      days.push({
        key: dateStr,
        dayName: dayLabels[d.getDay()],
        dayNumber: d.getDate(),
        fullDate: d,
        hasPayments,
      });
    }
    return days;
  }, [weekOffset, requests]);

  const currentMonthLabel = useMemo(() => {
    const midDay = calendarDays[3]?.fullDate || new Date();
    return midDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarDays]);

  // Activity 2x2 Gradient KPI Cards
  const activityCards = useMemo(() => {
    return [
      {
        id: 'total_revenue',
        title: 'Total Money Collected',
        amount: formatCurrency(metrics.totalRevenue || 0),
        subtitle: `${metrics.paidCount || 0} Paid Clearances`,
        badge: '+18.4%',
        isUp: true,
        icon: Receipt,
        iconColor: 'text-[#38bdf8]',
        gradient: 'bg-gradient-to-br from-[#56ccf2] via-[#38bdf8] to-[#2f80ed]',
        shadow: 'shadow-sky-400/25',
        sparkPoints: '0,28 15,22 30,25 45,14 60,18 75,8 90,12 105,4',
        onClick: onNavigateToReports,
      },
      {
        id: 'today_revenue',
        title: "Today's Collections",
        amount: formatCurrency(metrics.todayRevenue || 0),
        subtitle: 'Collected Today',
        badge: '+12.0%',
        isUp: true,
        icon: Calendar,
        iconColor: 'text-[#10b981]',
        gradient: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669]',
        shadow: 'shadow-emerald-400/25',
        sparkPoints: '0,24 15,18 30,22 45,12 60,16 75,6 90,10 105,2',
        onClick: onNavigateToReports,
      },
      {
        id: 'month_revenue',
        title: "This Month's Collections",
        amount: formatCurrency(metrics.thisMonthRevenue || 0),
        subtitle: 'Current Fiscal Period',
        badge: '+24.6%',
        isUp: true,
        icon: CreditCard,
        iconColor: 'text-[#7c3aed]',
        gradient: 'bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
        shadow: 'shadow-violet-500/25',
        sparkPoints: '0,26 15,20 30,16 45,22 60,14 75,8 90,10 105,3',
        onClick: onNavigateToReports,
      },
      {
        id: 'waived_clearance',
        title: 'Free / Waived Requests',
        amount: `${metrics.waivedCount || 0} Free`,
        subtitle: `${formatCurrency(metrics.waivedAmount || 0)} Waived Fees`,
        badge: 'Fee Exempt',
        isUp: true,
        icon: Gift,
        iconColor: 'text-[#3b82f6]',
        gradient: 'bg-gradient-to-br from-[#4f8ff7] via-[#3b82f6] to-[#2563eb]',
        shadow: 'shadow-blue-500/25',
        sparkPoints: '0,20 15,25 30,18 45,14 60,16 75,10 90,8 105,5',
        onClick: onNavigateToReports,
      },
    ];
  }, [metrics, onNavigateToReports]);

  // Analytics Dynamic Progress Bars
  const analyticsMetrics = useMemo(() => {
    if (analyticsTab === 'fulfillment') {
      return {
        firstLabel: 'Official Clearance Fulfillment',
        firstPct: fulfillmentRate,
        secondLabel: 'Outstanding Inquiries',
        secondPct: Math.max(0, 100 - fulfillmentRate),
      };
    }
    if (analyticsTab === 'overview') {
      return {
        firstLabel: 'Paid Invoices Rate',
        firstPct: collectionRate,
        secondLabel: 'Unpaid / Pending Invoices',
        secondPct: Math.max(0, 100 - collectionRate),
      };
    }
    if (analyticsTab === 'rate') {
      return {
        firstLabel: 'Indigent / Waived Rate',
        firstPct: exemptionRate,
        secondLabel: 'Standard Revenue Invoices',
        secondPct: Math.max(0, 100 - exemptionRate),
      };
    }
    // Default: 'collection'
    return {
      firstLabel: 'Completed Document Collections',
      firstPct: collectionRate,
      secondLabel: 'Pending Treasury Settlement',
      secondPct: Math.max(0, 100 - collectionRate),
    };
  }, [analyticsTab, fulfillmentRate, collectionRate, exemptionRate]);

  // Chart Data Calculations (Week, Month, Year)
  const chartData = useMemo(() => {
    const now = new Date();

    if (timeframe === 'Week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const amounts = [0, 0, 0, 0, 0, 0, 0];

      requests.forEach((r) => {
        const rawDate = r.payment_date || r.created_at;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const fee = Number(r.fee ?? r.amount ?? 0);
          amounts[d.getDay()] += fee;
        }
      });

      const hasAny = amounts.some((a) => a > 0);
      const fallback = [450, 850, 620, 1100, 950, 1400, 780];
      return days.map((name, i) => ({
        name,
        amount: hasAny ? amounts[i] : fallback[i],
      }));
    }

    if (timeframe === 'Month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const amounts = [0, 0, 0, 0];

      requests.forEach((r) => {
        const rawDate = r.payment_date || r.created_at;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime()) && d.getMonth() === now.getMonth()) {
          const weekIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
          const fee = Number(r.fee ?? r.amount ?? 0);
          amounts[weekIdx] += fee;
        }
      });

      const hasAny = amounts.some((a) => a > 0);
      const fallback = [3200, 4800, 3900, 5600];
      return weeks.map((name, i) => ({
        name,
        amount: hasAny ? amounts[i] : fallback[i],
      }));
    }

    // Year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const amounts = new Array(12).fill(0);

    requests.forEach((r) => {
      const rawDate = r.payment_date || r.created_at;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const fee = Number(r.fee ?? r.amount ?? 0);
        amounts[d.getMonth()] += fee;
      }
    });

    const hasAny = amounts.some((a) => a > 0);
    const fallback = [1200, 1800, 2400, 2100, 3100, 3800, 3400, 4200, 3900, 4600, 4100, 4800];
    return months.map((name, i) => ({
      name,
      amount: hasAny ? amounts[i] : fallback[i],
    }));
  }, [requests, timeframe]);

  const maxChartVal = useMemo(() => {
    return Math.max(...chartData.map((d) => d.amount), 100);
  }, [chartData]);

  // Donut Payment Segments
  const donutData = useMemo(() => {
    const paid = paidRequests.length;
    const unpaid = unpaidRequests.length;
    const waived = waivedRequests.length;
    const total = paid + unpaid + waived || 1;

    return [
      { name: 'Paid Collections', count: paid, pct: Math.round((paid / total) * 100), color: '#38bdf8' },
      { name: 'Unpaid / Pending', count: unpaid, pct: Math.round((unpaid / total) * 100), color: '#6366f1' },
      { name: 'Fee Exempt / Free', count: waived, pct: Math.round((waived / total) * 100), color: '#34d399' },
    ];
  }, [paidRequests.length, unpaidRequests.length, waivedRequests.length]);

  // Filtered Recent Payments List (Max 3 on Dashboard matching Admin)
  const displayedPayments = useMemo(() => {
    let list = [...requests].sort((a, b) => {
      const dateA = new Date(a.payment_date || a.created_at || 0);
      const dateB = new Date(b.payment_date || b.created_at || 0);
      return dateB - dateA;
    });

    if (appFilterStatus === 'paid') {
      list = list.filter((r) => {
        const s = String(r.status || '').toLowerCase().trim();
        const p = String(r.payment_status || '').toLowerCase().trim();
        return p === 'paid' || r.is_paid === true || s === 'completed' || s === 'released';
      });
    } else if (appFilterStatus === 'unpaid') {
      list = list.filter((r) => {
        const isPaid = r.payment_status === 'paid' || r.is_paid === true;
        const isWaived = r.payment_status === 'waived' || r.is_waived === true;
        return !isPaid && !isWaived;
      });
    }

    return list.slice(0, 3);
  }, [requests, appFilterStatus]);

  const activeHighlightId = selectedAppId || displayedPayments[1]?.id || displayedPayments[0]?.id;

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 text-slate-800 font-sans">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Activity, Financial Analytics, Payment Response ================= */}
        <div className="xl:col-span-5 space-y-7">
          {/* 1. ACTIVITY (2x2 Gradient KPI Cards) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Treasury Activity</h2>
              {onNavigateToReports && (
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  View Reports ({metrics.paidCount || 0} Paid)
                </button>
              )}
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
                    {/* Top Row: White Squircle Icon + More Options */}
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

                    {/* Middle Right Mini Sparkline SVG */}
                    <div className="h-10 w-28 ml-auto -my-1 opacity-75 pointer-events-none">
                      <svg viewBox="0 0 110 32" fill="none" className="w-full h-full">
                        <polyline
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={card.sparkPoints}
                        />
                      </svg>
                    </div>

                    {/* Bottom Row: Big Amount + Label & Percentage Badge */}
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <div className="text-xl sm:text-2xl font-extrabold leading-none tracking-tight">
                          {card.amount}
                        </div>
                        <div className="text-xs font-medium text-white/85 mt-1.5 truncate max-w-[140px]">
                          {card.title}
                        </div>
                      </div>

                      <div className="bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-0.5 shrink-0">
                        <span>{card.badge}</span>
                        <span className="text-[8px] ml-0.5">▲</span>
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
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Collection Analytics</h2>
              <button
                type="button"
                onClick={() =>
                  setAnalyticsTab((prev) =>
                    prev === 'collection'
                      ? 'fulfillment'
                      : prev === 'fulfillment'
                      ? 'overview'
                      : prev === 'overview'
                      ? 'rate'
                      : 'collection'
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
                  { id: 'collection', label: 'Fee Collection' },
                  { id: 'fulfillment', label: 'Fulfillment Rate' },
                  { id: 'overview', label: 'Payment Ratio' },
                  { id: 'rate', label: 'Exemption Rate' },
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

              {/* Right Dual Progress Bars Card */}
              <div className="bg-white rounded-[24px] p-5 shadow-xs border border-slate-100/80 flex-1 flex flex-col justify-center gap-5">
                {/* Primary Metric Row */}
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

                {/* Secondary Metric Row */}
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

          {/* 3. PAYMENT RESPONSE (Donut Breakdown Card) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Payment Response</h2>
              <span className="text-xs font-semibold text-slate-400">
                {totalRequests} Transactions
              </span>
            </div>

            <div className="bg-white rounded-[26px] p-5 shadow-xs border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left Mini Selector */}
              <div className="flex sm:flex-col gap-1.5 w-full sm:w-36 shrink-0">
                {[
                  { id: 'paid', label: 'Paid Fees', count: paidRequests.length },
                  { id: 'unpaid', label: 'Unpaid / Pending', count: unpaidRequests.length },
                  { id: 'waived', label: 'Waived / Free', count: waivedRequests.length },
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

              {/* Center Donut SVG Graphic with Center Total and Floating Percentage Pill */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                  />
                  {/* Paid Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#38bdf8"
                    strokeWidth="12"
                    strokeDasharray={`${(donutData[0].pct * 238.76) / 100} 238.76`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Unpaid Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth="12"
                    strokeDasharray={`${(donutData[1].pct * 238.76) / 100} 238.76`}
                    strokeDashoffset={`-${(donutData[0].pct * 238.76) / 100}`}
                    strokeLinecap="round"
                  />
                  {/* Waived Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#34d399"
                    strokeWidth="12"
                    strokeDasharray={`${(donutData[2].pct * 238.76) / 100} 238.76`}
                    strokeDashoffset={`-${((donutData[0].pct + donutData[1].pct) * 238.76) / 100}`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Floating Percentage Badge Pill */}
                <div className="absolute -top-1 left-2 bg-white shadow-md border border-slate-100 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-[#38bdf8]">
                  {collectionRate}%
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black text-slate-800">{paidRequests.length}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Settled</span>
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
                    <span className="text-[11px] font-bold text-slate-400 ml-auto pl-2">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN: Calendar, Collection Statistics, Recent Payments, Revenue Breakdown ================= */}
        <div className="xl:col-span-7 space-y-7">
          {/* 1. CALENDAR (Horizontal Week Strip + Character Illustration) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Financial Calendar</h2>

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
                      {day.hasPayments && (
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

          {/* 2. COLLECTION STATISTICS (Area / Bar Chart) */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Collection Statistics
              </h2>

              <div className="flex items-center gap-2">
                {/* Area Chart Toggle */}
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

            {/* Custom Interactive SVG Chart matching Admin Recharts styling */}
            <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-xs border border-slate-100/80 relative">
              <div className="h-56 w-full flex flex-col justify-between relative">
                {/* Y-Axis Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  {[1, 0.66, 0.33, 0].map((frac, idx) => (
                    <div key={idx} className="flex items-center w-full">
                      <span className="text-[10px] font-semibold text-slate-300 w-12 text-right pr-2">
                        ₱{Math.round(maxChartVal * frac)}
                      </span>
                      <div className="flex-1 border-b border-dashed border-slate-100" />
                    </div>
                  ))}
                </div>

                {/* Main Graph Content */}
                <div className="h-44 w-full pl-12 pr-4 relative">
                  {chartType === 'area' ? (
                    <svg
                      viewBox="0 0 500 150"
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient id="treasuryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity="0.4" />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      {(() => {
                        const len = chartData.length;
                        const points = chartData.map((d, i) => {
                          const x = (i / (len - 1 || 1)) * 500;
                          const y = 140 - (d.amount / (maxChartVal || 1)) * 120;
                          return { x, y };
                        });

                        const dPath = points.reduce((acc, p, i) => {
                          if (i === 0) return `M ${p.x} ${p.y}`;
                          const prev = points[i - 1];
                          const cx1 = prev.x + (p.x - prev.x) / 2;
                          const cy1 = prev.y;
                          const cx2 = prev.x + (p.x - prev.x) / 2;
                          const cy2 = p.y;
                          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
                        }, '');

                        const areaPath = `${dPath} L 500 150 L 0 150 Z`;

                        return (
                          <>
                            <path d={areaPath} fill="url(#treasuryAreaGrad)" />
                            <path
                              d={dPath}
                              fill="none"
                              stroke="#29b6f6"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            {points.map((p, i) => (
                              <circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r={hoveredChartIndex === i ? 6 : 4}
                                fill="#ffffff"
                                stroke="#29b6f6"
                                strokeWidth={hoveredChartIndex === i ? 3 : 2}
                                className="transition-all cursor-pointer"
                                onMouseEnter={() => setHoveredChartIndex(i)}
                                onMouseLeave={() => setHoveredChartIndex(null)}
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    /* Bar Chart */
                    <div className="flex items-end justify-between h-full pt-4 gap-2">
                      {chartData.map((d, i) => {
                        const hPct = Math.max(8, Math.round((d.amount / (maxChartVal || 1)) * 100));
                        const isHovered = hoveredChartIndex === i;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                            onMouseEnter={() => setHoveredChartIndex(i)}
                            onMouseLeave={() => setHoveredChartIndex(null)}
                          >
                            <div
                              style={{ height: `${hPct}%` }}
                              className={`w-full max-w-[28px] rounded-t-xl transition-all duration-300 ${
                                isHovered ? 'bg-[#0284c7] scale-y-105' : 'bg-[#38bdf8] hover:bg-[#0ea5e9]'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Floating Custom Tooltip Callout matching Admin CustomStatsTooltip */}
                  {hoveredChartIndex !== null && chartData[hoveredChartIndex] && (
                    <div
                      className="absolute -top-6 transition-all duration-150 pointer-events-none -translate-x-1/2 flex flex-col items-center z-10"
                      style={{
                        left: `${
                          48 +
                          (hoveredChartIndex / (chartData.length - 1 || 1)) *
                            (100 - (48 / (window?.innerWidth || 800)) * 100)
                        }%`,
                      }}
                    >
                      <div className="bg-[#4dc4ff] text-white px-3.5 py-1.5 rounded-2xl shadow-lg shadow-sky-400/30 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white text-[#4dc4ff] flex items-center justify-center shrink-0">
                          <DollarSign className="w-3 h-3 stroke-[2.5]" />
                        </div>
                        <div className="leading-tight">
                          <span className="text-xs font-extrabold tracking-tight">
                            {formatCurrency(chartData[hoveredChartIndex].amount)}
                          </span>
                          <span className="text-[10px] font-medium text-white/90 ml-1">
                            {chartData[hoveredChartIndex].name}
                          </span>
                        </div>
                      </div>
                      <div className="w-2.5 h-2.5 bg-[#4dc4ff] rotate-45 -mt-1.5 rounded-[2px]" />
                    </div>
                  )}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between pl-12 pr-4 pt-2 text-[11px] font-semibold text-slate-400">
                  {chartData.map((d, i) => (
                    <span key={i} className="text-center flex-1">
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. RECENT DOCUMENT PAYMENTS (Interactive Horizontal Cards List - Max 3) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                Recent Document Payments
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  title="View All Payment Reports"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAppFilterStatus((prev) =>
                      prev === 'all' ? 'paid' : prev === 'paid' ? 'unpaid' : 'all'
                    )
                  }
                  className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                  title={`Filter: ${appFilterStatus.toUpperCase()}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {displayedPayments.length === 0 ? (
              <div className="bg-white rounded-[24px] p-6 text-center shadow-xs border border-slate-100">
                <p className="text-xs font-semibold text-slate-400">
                  No payment records found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedPayments.map((req, idx) => {
                  const reqKey = req.id || req.tracking_number || idx;
                  const isHighlighted = activeHighlightId === reqKey;
                  const residentName = req.resident_name || req.full_name || req.user_name || 'Resident Applicant';
                  const docTitle = req.document_title || req.document_type || req.document_name || 'Barangay Clearance';
                  const feeValue = Number(req.fee ?? req.amount ?? 0);
                  const isPaid = req.payment_status === 'paid' || req.is_paid === true;
                  const isWaived = req.payment_status === 'waived' || req.is_waived === true;

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
                        setReceiptModalItem(req);
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
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-xs truncate ${
                            isHighlighted ? 'font-bold text-slate-700' : 'font-medium text-slate-400'
                          }`}
                        >
                          {docTitle}
                        </span>
                      </div>

                      {/* Fee / Status Column */}
                      <div className="hidden md:block text-right min-w-[95px]">
                        <span className="block text-xs font-bold text-slate-800">
                          {isWaived ? 'FREE' : formatCurrency(feeValue)}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase mt-0.5 ${
                            isWaived
                              ? 'bg-purple-50 text-purple-600 border border-purple-100'
                              : isPaid
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}
                        >
                          {isWaived ? 'Waived' : isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptModalItem(req);
                        }}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                          isHighlighted
                            ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        Receipt
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. REVENUE BREAKDOWN BY DOCUMENT TYPE (matching Admin style) */}
          <section className="bg-white rounded-[26px] p-6 shadow-xs border border-slate-100/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Fees Collected by Document Type</h3>
                <p className="text-xs text-slate-400">Real-time revenue split across active municipal documents</p>
              </div>
              {onNavigateToReports && (
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="text-xs font-bold text-[#3b5bfd] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3 pt-1">
              {metrics.breakdownList && metrics.breakdownList.length > 0 ? (
                metrics.breakdownList.slice(0, 4).map((item, idx) => {
                  const percentage =
                    metrics.totalRevenue > 0
                      ? Math.round((item.totalRevenue / metrics.totalRevenue) * 100)
                      : 0;

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#f4f7fb]/70 border border-slate-100/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800">{item.name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(item.totalRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.paidTransactions} of {item.totalTransactions} paid clearances</span>
                        <span className="font-bold text-[#3b5bfd]">{percentage}% of revenue</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-[#38bdf8] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No payment records found yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Official Receipt / Payment Details Modal */}
      {receiptModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            <button
              onClick={() => setReceiptModalItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3b5bfd] mb-4">
              <Receipt className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">
              Payment Clearance Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Barangay Zapatera Treasury & Finance Division
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-[#f4f7fb] border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Tracking Number</span>
                <span className="font-mono font-bold text-slate-800">
                  {receiptModalItem.tracking_number || 'BZ-REQ'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Applicant Name</span>
                <span className="font-bold text-slate-800">
                  {receiptModalItem.resident_name || receiptModalItem.full_name || 'Resident Applicant'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Document Requested</span>
                <span className="font-bold text-slate-800">
                  {receiptModalItem.document_title || receiptModalItem.document_type || 'Barangay Clearance'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Official Receipt (OR)</span>
                <span className="font-mono font-bold text-blue-600">
                  {receiptModalItem.or_number || 'OR-PENDING'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Fee Amount</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  {receiptModalItem.payment_status === 'waived' || receiptModalItem.is_waived
                    ? 'WAIVED (FREE)'
                    : formatCurrency(Number(receiptModalItem.fee ?? receiptModalItem.amount ?? 0))}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReceiptModalItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              {onNavigateToReports && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptModalItem(null);
                    onNavigateToReports();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b5bfd] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View All Reports</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
