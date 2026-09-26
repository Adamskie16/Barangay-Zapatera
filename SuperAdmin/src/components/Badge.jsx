// SuperAdmin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'info' }) {
  const normalized = (variant || '').toLowerCase().replace(/ /g, '_');
  const variants = {
    pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/60 font-bold',
    under_review: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300/80 dark:border-blue-800/60 font-bold',
    approved: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60 font-bold',
    declined: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/60 font-bold',
    issued: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-800/60 font-extrabold',
    super_admin: 'bg-slate-900 text-emerald-400 border-slate-700 font-extrabold shadow-xs',
    admin: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800/60 font-bold',
    resident: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-semibold',
    active: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60 font-bold',
    inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 font-medium',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/60 font-bold',
    danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/60 font-bold',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/60 font-bold',
    security: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-800/60 font-bold',
  };

  const dotColors = {
    pending: 'bg-amber-500',
    under_review: 'bg-blue-500',
    approved: 'bg-emerald-500',
    declined: 'bg-rose-500',
    issued: 'bg-purple-500',
    super_admin: 'bg-emerald-400',
    admin: 'bg-indigo-500',
    resident: 'bg-slate-500',
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    security: 'bg-purple-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight shadow-2xs capitalize select-none ${variants[normalized] || variants.info}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[normalized] || 'bg-sky-500'}`} />
      <span>{children}</span>
    </span>
  );
}
