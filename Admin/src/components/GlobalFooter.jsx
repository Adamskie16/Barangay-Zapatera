// Admin/src/components/GlobalFooter.jsx
import React from 'react';

export default function GlobalFooter({ className = '' }) {
  return (
    <footer className={`w-full py-4 px-6 border-t border-slate-200/80 bg-white/80 backdrop-blur-xs text-center text-xs text-slate-500 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold text-slate-700">
          Barangay Zapatera Document & Records Management System
        </p>
        <p className="text-[11px] text-slate-500">
          Developed by <span className="font-semibold text-slate-800">Binghay, Adam Keith Mardee and Medina, Joshua C.</span> • Powered by <span className="font-semibold text-slate-800">Southwestern University PHINMA</span>
        </p>
      </div>
    </footer>
  );
}
