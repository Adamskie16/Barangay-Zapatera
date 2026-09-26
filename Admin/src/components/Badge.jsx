// Admin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'info' }) {
  const normalized = (variant || '').toLowerCase().replace(/ /g, '_');
  const variants = {
    pending: 'bg-amber-50 text-amber-800 border-amber-300/80 font-bold',
    processing: 'bg-blue-50 text-blue-800 border-blue-300/80 font-bold',
    under_review: 'bg-indigo-50 text-indigo-800 border-indigo-300/80 font-bold',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-300/80 font-bold',
    ready_for_pickup: 'bg-teal-50 text-teal-800 border-teal-300/80 font-bold',
    completed: 'bg-emerald-50 text-emerald-800 border-emerald-300/80 font-bold',
    declined: 'bg-rose-50 text-rose-800 border-rose-300/80 font-bold',
    rejected: 'bg-rose-50 text-rose-800 border-rose-300/80 font-bold',
    issued: 'bg-purple-50 text-purple-800 border-purple-300/80 font-extrabold',
    active: 'bg-emerald-50 text-emerald-800 border-emerald-300/80 font-bold',
    inactive: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
    info: 'bg-sky-50 text-sky-800 border-sky-300/80 font-bold',
    danger: 'bg-rose-50 text-rose-800 border-rose-300/80 font-bold',
  };

  const dotColors = {
    pending: 'bg-amber-500',
    processing: 'bg-blue-500',
    under_review: 'bg-indigo-500',
    approved: 'bg-emerald-500',
    ready_for_pickup: 'bg-teal-500',
    completed: 'bg-emerald-500',
    declined: 'bg-rose-500',
    rejected: 'bg-rose-500',
    issued: 'bg-purple-500',
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight shadow-2xs capitalize select-none ${variants[normalized] || variants.info}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[normalized] || 'bg-sky-500'}`} />
      <span>{children}</span>
    </span>
  );
}


