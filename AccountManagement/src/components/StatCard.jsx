// SuperAdmin/src/components/StatCard.jsx
import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'emerald', trend, subtitle }) {
  const colorMap = {
    emerald: {
      pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    },
    blue: {
      pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
    },
    amber: {
      pill: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    },
    purple: {
      pill: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60',
    },
    rose: {
      pill: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight tabular-nums">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl border ${scheme.pill} shadow-xs transition-transform duration-200 group-hover:scale-110 shrink-0 ml-3`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">{trend}</span>
          <span className="text-slate-400 text-[11px]">vs last month</span>
        </div>
      )}
    </div>
  );
}
