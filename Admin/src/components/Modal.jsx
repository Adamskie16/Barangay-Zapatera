// Admin/src/components/Modal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', darkMode = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`rounded-2xl shadow-2xl border w-full ${maxWidth} overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 ${
        darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between backdrop-blur-sm ${
          darkMode
            ? 'border-slate-800 bg-slate-900/80'
            : 'border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80'
        }`}>
          <h3 className={`text-base font-extrabold tracking-tight ${
            darkMode ? 'text-slate-100' : 'text-slate-900 dark:text-slate-100'
          }`}>{title}</h3>
          <button
            onClick={onClose}
            title="Close Modal"
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

