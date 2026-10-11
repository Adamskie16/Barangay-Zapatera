// Admin/src/core/designTokens.js
/**
 * Production Enterprise Civic Design System Tokens
 * Strictly adhering to civic administrative design standards:
 * - 4px/8px rhythm
 * - High contrast WCAG AA/AAA compliance
 * - Slate neutrals with Navy/Emerald civic accents
 * - Crisp, deliberate radii (rounded-lg, rounded-2xl)
 * - Zero "AI-slop" neon gradients, excessive blur, or erratic padding
 */

export const DESIGN_TOKENS = {
  // Surfaces & Layout Containers
  surfaces: {
    card: 'bg-white rounded-2xl border border-slate-200 shadow-xs',
    cardHover: 'bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow',
    tableContainer: 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs',
    tableHeader: 'bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-xs',
    tableRow: 'hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0',
    tableCell: 'p-4 text-xs',
    filterBar: 'bg-white p-4 rounded-xl border border-slate-200',
    statCard: 'bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between',
    modalBackdrop: 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50',
    modalCard: 'bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden',
  },

  // Typography Hierarchy
  typography: {
    pageTitle: 'text-xl font-bold text-slate-900 tracking-tight',
    pageSubtitle: 'text-xs text-slate-500 mt-1',
    sectionTitle: 'text-base font-bold text-slate-900',
    label: 'text-xs font-semibold text-slate-700',
    muted: 'text-xs text-slate-500',
    tableHeaderCell: 'p-4 font-semibold text-slate-500 uppercase tracking-wider text-xs',
    trackingNumber: 'font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs inline-block',
  },

  // Button Variants
  buttons: {
    primary:
      'px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    emeraldAction:
      'px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    destructive:
      'px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    iconDelete:
      'p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1',
    filterPillActive:
      'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs cursor-pointer transition-all',
    filterPillInactive:
      'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-all',
    paginationBtn:
      'px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
  },

  // Status & Category Badges
  badges: {
    pending:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs',
    under_review:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-300/80 shadow-2xs',
    approved:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs',
    ready_for_pickup:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300/80 shadow-2xs',
    completed:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs',
    claimed:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs',
    unclaimed:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs',
    declined:
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300/80 shadow-2xs',
    timeSlot:
      'inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold',
  },

  // Input Field Standards
  inputs: {
    text: 'w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900',
    search: 'w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900',
    select: 'px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800',
  },
};

export default DESIGN_TOKENS;
