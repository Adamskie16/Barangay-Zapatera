// Admin/src/components/Badge.jsx
import React from 'react';

export default function Badge({ children, variant, status }) {
  const raw = variant || status || 'info';
  const normalized = String(raw).toLowerCase().trim().replace(/ /g, '_');

  const variants = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    processing: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    under_review: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    ready_for_pickup: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    declined: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    issued: 'bg-purple-50 text-purple-700 border-purple-200 font-extrabold',
    super_admin: 'bg-purple-50 text-purple-700 border-purple-200 font-extrabold',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
    admin: 'bg-blue-50 text-[#3b5bfd] border-blue-200 font-bold',
    blue: 'bg-blue-50 text-[#3b5bfd] border-blue-200 font-bold',
    treasurer: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
    success: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
    resident: 'bg-sky-50 text-sky-700 border-sky-200 font-bold',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200 font-semibold',
    info: 'bg-sky-50 text-sky-700 border-sky-200 font-bold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    security: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
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
    cancelled: 'bg-rose-500',
    issued: 'bg-purple-500',
    super_admin: 'bg-purple-500',
    purple: 'bg-purple-500',
    admin: 'bg-[#3b5bfd]',
    blue: 'bg-[#3b5bfd]',
    treasurer: 'bg-teal-500',
    success: 'bg-teal-500',
    resident: 'bg-sky-500',
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    security: 'bg-purple-500',
  };

  const label = children ?? (status ? String(status).replace(/_/g, ' ') : '');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight whitespace-nowrap capitalize select-none ${
        variants[normalized] || variants.info
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[normalized] || 'bg-sky-500'}`} />
      <span>{label}</span>
    </span>
  );
}
