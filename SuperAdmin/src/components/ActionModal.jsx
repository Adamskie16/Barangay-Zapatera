// SuperAdmin/src/components/ActionModal.jsx
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
          icon: <HelpCircle className="w-8 h-8 text-blue-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-blue-950/40 border-blue-800/80' : 'bg-blue-50 border-blue-200',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-blue-500" aria-hidden="true" />,
          bg: isDarkMode ? 'bg-blue-950/40 border-blue-800/80' : 'bg-blue-50 border-blue-200',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby="action-modal-desc"
    >
      <div
        ref={modalRef}
        className={`rounded-2xl shadow-2xl border w-full ${maxWidth} overflow-hidden transform transition-all motion-reduce:transform-none scale-100 animate-in fade-in zoom-in-95 duration-200 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {!isProcessing && (
          <div className="flex justify-end p-3 pb-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal"
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="px-6 pt-2 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs ${iconConfig.bg}`}>
              {iconConfig.icon}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3
              id="action-modal-title"
              className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
            >
              {title}
            </h3>
            <div
              id="action-modal-desc"
              className={`text-xs leading-relaxed max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
              role={type === 'error' ? 'alert' : type === 'success' ? 'status' : undefined}
            >
              {message}
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {type === 'confirmation' || type === 'warning' ? (
              <>
                <button
                  ref={cancelBtnRef}
                  type="button"
                  disabled={isProcessing}
                  onClick={onClose}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  disabled={isProcessing}
                  onClick={onConfirm}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-75 inline-flex items-center justify-center space-x-2 ${
                    isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Processing...</span>
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
                className={`w-full sm:w-36 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center justify-center ${
                  type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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
