// Admin/src/components/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans"
    >
      <div
        className={`bg-white text-slate-800 rounded-[28px] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.2)] border border-slate-100 w-full ${maxWidth} overflow-hidden transform transition-all animate-in zoom-in-95 duration-200`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <div className=" flex items-center gap-3 min-w-0">
            <span className="w-1.5 h-5 rounded-full bg-[#3b5bfd] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close Modal"
            aria-label="Close Modal"
            className="w-9 h-9 rounded-full bg-[#f4f7fb] text-slate-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[82vh] overflow-y-auto text-slate-700">
          {children}
        </div>
      </div>
    </div>
  );
}


