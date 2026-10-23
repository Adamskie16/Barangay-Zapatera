// SuperAdmin/src/components/ActionModal.jsx
import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';

/**
 * Universal accessible feedback & confirmation modal component.
 * Supports: 'success' | 'error' | 'confirmation' | 'info' | 'warning'
 */
export default function ActionModal({
  isOpen,
  type = 'info', // 'success' | 'error' | 'confirmation' | 'warning' | 'info'
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  buttonText = 'OK',
  onConfirm,
  onClose,
  isProcessing = false,
  isLoading = false,
  isDestructive = false,
  maxWidth = 'max-w-md',
}) {
  const modalRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const busy = Boolean(isProcessing || isLoading);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose?.();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  // Initial focus management
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if ((type === 'confirmation' || type === 'warning') && cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        } else if (confirmBtnRef.current) {
          confirmBtnRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Icon and theme styling
  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          label: 'Action Completed',
          icon: <CheckCircle2 className="w-7 h-7 text-white" aria-hidden="true" />,
          iconGradient: 'bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/25',
          ringBg: 'bg-emerald-50 border-emerald-100',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25',
        };
      case 'error':
        return {
          label: 'System Alert',
          icon: <AlertCircle className="w-7 h-7 text-white" aria-hidden="true" />,
          iconGradient: 'bg-linear-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48] shadow-rose-500/25',
          ringBg: 'bg-rose-50 border-rose-100',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          primaryBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25',
        };
      case 'warning':
      case 'confirmation':
        if (isDestructive) {
          return {
            label: 'Security Confirmation',
            icon: <AlertTriangle className="w-7 h-7 text-white" aria-hidden="true" />,
            iconGradient: 'bg-linear-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48] shadow-rose-500/25',
            ringBg: 'bg-rose-50 border-rose-100',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            primaryBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25',
          };
        }
        return {
          label: 'Confirm Action',
          icon: <HelpCircle className="w-7 h-7 text-white" aria-hidden="true" />,
          iconGradient: 'bg-linear-to-br from-[#38bdf8] via-[#3b5bfd] to-[#2563eb] shadow-blue-500/25',
          ringBg: 'bg-blue-50 border-blue-100',
          badgeClass: 'bg-blue-50 text-[#3b5bfd] border-blue-200',
          primaryBtn: 'bg-[#3b5bfd] hover:bg-blue-700 shadow-blue-500/25',
        };
      case 'info':
      default:
        return {
          label: 'System Notice',
          icon: <Info className="w-7 h-7 text-white" aria-hidden="true" />,
          iconGradient: 'bg-linear-to-br from-[#38bdf8] via-[#3b5bfd] to-[#2563eb] shadow-blue-500/25',
          ringBg: 'bg-blue-50 border-blue-100',
          badgeClass: 'bg-blue-50 text-[#3b5bfd] border-blue-200',
          primaryBtn: 'bg-[#3b5bfd] hover:bg-blue-700 shadow-blue-500/25',
        };
    }
  };

  const theme = getThemeConfig();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity motion-reduce:transition-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby="action-modal-desc"
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-[28px] shadow-[0_24px_60px_-15px_rgba(15,23,42,0.22)] border border-slate-100 w-full ${maxWidth} overflow-hidden transform transition-all motion-reduce:transform-none scale-100 animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Top Bar with Pill Label & Close Button */}
        <div className="px-6 pt-5 pb-1 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${theme.badgeClass}`}
          >
            {theme.label}
          </span>

          {!busy && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal"
              className="w-8 h-8 rounded-full bg-[#f4f7fb] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="px-6 pt-3 pb-6 text-center space-y-4">
          {/* Gradient Squircle Icon */}
          <div className="flex justify-center">
            <div className={`p-2 rounded-[24px] border ${theme.ringBg}`}>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${theme.iconGradient}`}
              >
                {theme.icon}
              </div>
            </div>
          </div>

          {/* Title and Message */}
          <div className="space-y-1.5 px-2">
            <h3
              id="action-modal-title"
              className="text-lg font-extrabold text-slate-900 tracking-tight cursor-text"
            >
              {title}
            </h3>
            <div
              id="action-modal-desc"
              className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto cursor-text"
              role={type === 'error' ? 'alert' : type === 'success' ? 'status' : undefined}
              aria-live={type === 'error' ? 'assertive' : type === 'success' ? 'polite' : undefined}
            >
              {message}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
            {type === 'confirmation' || type === 'warning' ? (
              <>
                <button
                  ref={cancelBtnRef}
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#f4f7fb] text-slate-600 text-xs font-bold hover:bg-slate-200/70 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  disabled={busy}
                  onClick={onConfirm}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 inline-flex items-center justify-center space-x-2 focus:outline-none ${theme.primaryBtn}`}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span role="status" aria-live="polite">Processing...</span>
                    </>
                  ) : (
                    <span>{confirmText}</span>
                  )}
                </button>
              </>
            ) : (
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={onClose}
                className={`w-full sm:w-40 px-6 py-2.5 rounded-full text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center justify-center focus:outline-none ${theme.primaryBtn}`}
              >
                {buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
