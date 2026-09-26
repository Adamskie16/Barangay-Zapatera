// AccountManagement/src/components/ActionModal.jsx
import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  Loader2
} from 'lucide-react';

/**
 * Universal accessible feedback & confirmation modal component.
 * Supports: 'success' | 'error' | 'confirmation' | 'warning' | 'info'
 */
export default function ActionModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  buttonText = 'OK',
  onConfirm,
  onClose,
  isProcessing = false,
  isDestructive = false,
  maxWidth = 'max-w-md',
  isDarkMode = false,
}) {
  const modalRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose?.();
      }

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
  }, [isOpen, isProcessing, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (type === 'confirmation' && cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        } else if (confirmBtnRef.current) {
          confirmBtnRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-emerald-950/40 border-emerald-800/80' : 'bg-emerald-50 border-emerald-200',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8 text-rose-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-rose-950/40 border-rose-800/80' : 'bg-rose-50 border-rose-200',
        };
      case 'warning':
      case 'confirmation':
        if (isDestructive) {
          return {
            icon: <AlertTriangle className="w-8 h-8 text-rose-500" aria-hidden="true" />,
            bg: isDarkMode ? 'bg-rose-950/40 border-rose-800/80' : 'bg-rose-50 border-rose-200',
          };
        }
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-amber-950/40 border-amber-800/80' : 'bg-amber-50 border-amber-200',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-blue-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-blue-950/40 border-blue-800/80' : 'bg-blue-50 border-blue-200',
        };
    }
  };

  const config = getIconConfig();
  const isInteractive = type === 'confirmation' || type === 'warning' && Boolean(onConfirm);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby="action-modal-description"
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} rounded-2xl border shadow-2xl p-6 relative transform transition-all scale-100 duration-200 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Close Button */}
        {onClose && !isProcessing && (
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Content Body */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shadow-inner ${config.bg}`}>
            {config.icon}
          </div>

          <h3
            id="action-modal-title"
            className="text-lg font-bold tracking-tight mb-2"
          >
            {title}
          </h3>

          {message && (
            <p
              id="action-modal-description"
              className={`text-xs leading-relaxed mb-6 max-w-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 w-full">
            {isInteractive ? (
              <>
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className={`w-1/2 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {cancelText}
                </button>

                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className={`w-1/2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isDestructive
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                  }`}
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{confirmText}</span>
                </button>
              </>
            ) : (
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={onClose || onConfirm}
                className="w-full py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
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
