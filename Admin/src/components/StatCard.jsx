// Admin/src/components/StatCard.jsx
import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colorMap = {
    blue: {
      pill: 'bg-blue-50 text-blue-600 border-blue-200/80',
      accent: 'from-blue-600 to-indigo-600',
    },
    amber: {
      pill: 'bg-amber-50 text-amber-600 border-amber-200/80',
      accent: 'from-amber-500 to-orange-500',
    },
    emerald: {
      pill: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
      accent: 'from-emerald-500 to-teal-600',
    },
    purple: {
      pill: 'bg-purple-50 text-purple-600 border-purple-200/80',
      accent: 'from-purple-600 to-indigo-600',
    },
    rose: {
      pill: 'bg-rose-50 text-rose-600 border-rose-200/80',
      accent: 'from-rose-500 to-red-600',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight tabular-nums">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl border ${scheme.pill} shadow-xs transition-transform duration-200 group-hover:scale-110 shrink-0 ml-3`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
