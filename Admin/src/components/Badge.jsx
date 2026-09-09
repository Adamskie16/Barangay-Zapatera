// Admin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'info' }) {
  const normalized = (variant || '').toLowerCase().replace(/ /g, '_');
  const variants = {
    pending: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
    processing: 'bg-blue-50 text-blue-700 border-blue-300 font-semibold',
    under_review: 'bg-blue-50 text-blue-700 border-blue-300 font-semibold',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
    ready_for_pickup: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
    declined: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    rejected: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    issued: 'bg-purple-50 text-purple-700 border-purple-300 font-extrabold',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    inactive: 'bg-slate-100 text-slate-500 border-slate-300',
    info: 'bg-sky-50 text-sky-700 border-sky-300',
    danger: 'bg-rose-50 text-rose-700 border-rose-300',
  };

  const badgeIcons = {
    pending: '🟠',
    processing: '🔵',
    under_review: '🔵',
    approved: '🟢',
    declined: '🔴',
    rejected: '🔴',
  };

  const icon = badgeIcons[normalized];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border capitalize gap-1.5 ${variants[normalized] || variants.info}`}>
      {icon && <span className="text-[10px] leading-none">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

