// Admin/src/features/dashboard/DashboardView.jsx
import React, { useMemo } from 'react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  Inbox,
  CheckSquare,
  FileCheck2,
  Clock,
  Activity,
  AlertCircle,
  FileText,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BarChart2,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '../../core/security';
import MonthlyAnalytics from '../../components/MonthlyAnalytics';

export default function DashboardView({ requests = [], events = [], logs = [], setActiveTab, onQueueAction }) {
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const reviewRequests = requests.filter((r) => r.status === 'under_review' || r.status === 'under review' || r.status === 'processing');
  const approvedRequests = requests.filter((r) => r.status === 'approved' || r.status === 'ready_for_pickup');
  const issuedRequests = requests.filter((r) => r.status === 'issued' || r.status === 'completed');
  const declinedRequests = requests.filter((r) => r.status === 'declined' || r.status === 'rejected');

  const totalRequests = requests.length;
  const activeQueue = pendingRequests.length + reviewRequests.length;
  const completedTotal = approvedRequests.length + issuedRequests.length;
  const fulfillmentRate = totalRequests > 0 ? Math.round((completedTotal / totalRequests) * 100) : 0;
  const declineRate = totalRequests > 0 ? Math.round((declinedRequests.length / totalRequests) * 100) : 0;

  // Document Type Demand Distribution
  const docTypeStats = useMemo(() => {
    const counts = {};
    requests.forEach((r) => {
      const title = r.document_title || r.document_name || 'Barangay Clearance';
      counts[title] = (counts[title] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([title, count]) => ({
        title,
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, 5);
  }, [requests, totalRequests]);

  // Funnel Stage Percentages
  const pendingPct = totalRequests > 0 ? ((pendingRequests.length / totalRequests) * 100).toFixed(1) : 0;
  const reviewPct = totalRequests > 0 ? ((reviewRequests.length / totalRequests) * 100).toFixed(1) : 0;
  const approvedPct = totalRequests > 0 ? ((approvedRequests.length / totalRequests) * 100).toFixed(1) : 0;
  const issuedPct = totalRequests > 0 ? ((issuedRequests.length / totalRequests) * 100).toFixed(1) : 0;
  const declinedPct = totalRequests > 0 ? ((declinedRequests.length / totalRequests) * 100).toFixed(1) : 0;

  // Recent 5 Requests for Streamlined Activity
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <CheckSquare className="w-3.5 h-3.5 mr-1" /> Barangay Admin Desk
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">Barangay Zapatera Document Desk</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Live operational intelligence, workflow pipeline analytics, and real-time document issuance performance.
          </p>
        </div>

        <div className="hidden sm:flex space-x-3">
          <button
            onClick={() => setActiveTab('receive_request')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Open Request Queue ({activeQueue})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="New Requests Inbox"
          value={pendingRequests.length}
          icon={Inbox}
          color="amber"
          subtitle="Waiting for review"
        />
        <StatCard
          title="Under Review"
          value={reviewRequests.length}
          icon={Clock}
          color="blue"
          subtitle="Checking IDs and requirements"
        />
        <StatCard
          title="Ready for Pickup"
          value={approvedRequests.length}
          icon={CheckSquare}
          color="emerald"
          subtitle="Approved certificates"
        />
        <StatCard
          title="Issued Documents"
          value={issuedRequests.length}
          icon={FileCheck2}
          color="purple"
          subtitle="Claimed by residents"
        />
      </div>

      {/* Monthly Analytics Widget */}
      <MonthlyAnalytics requests={requests} />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Graphs, Funnel & Demand Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Processing Pipeline Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">Document Processing Pipeline Funnel</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual stage progression across {totalRequests} total resident application{totalRequests !== 1 && 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {fulfillmentRate}% Fulfillment Rate
                </span>
              </div>
            </div>

            {/* Stacked Visual Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-4 shadow-inner">
              <div
                style={{ width: `${pendingPct}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`Pending: ${pendingRequests.length} (${pendingPct}%)`}
              />
              <div
                style={{ width: `${reviewPct}%` }}
                className="bg-blue-500 transition-all duration-500"
                title={`Under Review: ${reviewRequests.length} (${reviewPct}%)`}
              />
              <div
                style={{ width: `${approvedPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Ready for Pickup: ${approvedRequests.length} (${approvedPct}%)`}
              />
              <div
                style={{ width: `${issuedPct}%` }}
                className="bg-purple-600 transition-all duration-500"
                title={`Issued / Claimed: ${issuedRequests.length} (${issuedPct}%)`}
              />
              <div
                style={{ width: `${declinedPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Declined: ${declinedRequests.length} (${declinedPct}%)`}
              />
            </div>

            {/* Stage Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
                </div>
                <div className="text-xl font-black text-amber-900">{pendingRequests.length}</div>
                <div className="text-[10px] text-amber-600 font-medium">{pendingPct}% share</div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">In Review</span>
                </div>
                <div className="text-xl font-black text-blue-900">{reviewRequests.length}</div>
                <div className="text-[10px] text-blue-600 font-medium">{reviewPct}% share</div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
                </div>
                <div className="text-xl font-black text-emerald-900">{approvedRequests.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">{approvedPct}% share</div>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-purple-700 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Issued</span>
                </div>
                <div className="text-xl font-black text-purple-900">{issuedRequests.length}</div>
                <div className="text-[10px] text-purple-600 font-medium">{issuedPct}% share</div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Declined</span>
                </div>
                <div className="text-xl font-black text-rose-900">{declinedRequests.length}</div>
                <div className="text-[10px] text-rose-600 font-medium">{declinedPct}% share</div>
              </div>
            </div>
          </div>

          {/* Card 2: Document Type Demand Distribution Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Top Document Types Demand Distribution</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Relative Application Volume</span>
            </div>

            {docTypeStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No document requests recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {docTypeStats.map((item, idx) => (
                  <div key={item.title} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.count} req</span>
                        <span className="text-[11px] text-slate-400">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(item.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Operational SLA & Turnaround Health Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Turnaround</p>
                <h4 className="text-base font-black text-slate-900 mt-0.5">&lt; 24 Hours</h4>
                <p className="text-[10px] text-emerald-600 font-semibold">Standard SLA compliant</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fulfillment Index</p>
                <h4 className="text-base font-black text-slate-900 mt-0.5">{fulfillmentRate}%</h4>
                <p className="text-[10px] text-slate-500">Approvals & pick-ups</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Queue Load</p>
                <h4 className="text-base font-black text-slate-900 mt-0.5">{activeQueue} Items</h4>
                <p className="text-[10px] text-amber-600 font-semibold">Pending + under review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Streamlined Recent Activity & System Logs */}
        <div className="space-y-6">
          {/* Recent Submissions Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Recent Submissions</h3>
              </div>
              <button
                onClick={() => setActiveTab('receive_request')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No incoming applications yet.</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((r) => (
                  <div
                    key={r.id || r.tracking_number}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                        {r.tracking_number || 'BZ-REQ'}
                      </span>
                      <Badge variant={r.status || 'pending'}>
                        {r.status || 'pending'}
                      </Badge>
                    </div>
                    <p className="font-bold text-xs text-slate-800 truncate">
                      {r.resident_name || r.user_name || 'Resident'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {r.document_title || r.document_name || 'Clearance'}
                    </p>
                    <span className="text-[10px] text-slate-400 block pt-1.5">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Recent Activity Logs</h3>
              </div>
            </div>

            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                    <Badge variant={log.level}>{log.level}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">Barangay Zapatera Document Issuance System</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
