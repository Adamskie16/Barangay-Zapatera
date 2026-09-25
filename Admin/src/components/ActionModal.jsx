// Admin/src/components/ActionModal.jsx
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
  isDestructive = false,
  maxWidth = 'max-w-md',
}) {
  const modalRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
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
  }, [isOpen, isProcessing, onClose]);

  // Initial focus management
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

  // Icon and theme styling
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />,
          bg: 'bg-emerald-50 border-emerald-200',
          badge: 'bg-emerald-100/80',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-8 h-8 text-rose-600" aria-hidden="true" />,
          bg: 'bg-rose-50 border-rose-200',
          badge: 'bg-rose-100/80',
        };
      case 'warning':
      case 'confirmation':
        if (isDestructive) {
          return {
            icon: <AlertTriangle className="w-8 h-8 text-rose-600" aria-hidden="true" />,
            bg: 'bg-rose-50 border-rose-200',
            badge: 'bg-rose-100/80',
          };
        }
        return {
          icon: <HelpCircle className="w-8 h-8 text-blue-600" aria-hidden="true" />,
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100/80',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-blue-600" aria-hidden="true" />,
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100/80',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      aria-describedby="action-modal-desc"
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${maxWidth} overflow-hidden transform transition-all motion-reduce:transform-none scale-100 animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Top Close Button for non-critical dialogs */}
        {!isProcessing && (
          <div className="flex justify-end p-3 pb-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="px-6 pt-2 pb-6 text-center space-y-4">
          {/* Animated Icon Circle */}
          <div className="flex justify-center">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs ${iconConfig.bg}`}
            >
              {iconConfig.icon}
            </div>
          </div>

          {/* Title and Message */}
          <div className="space-y-1.5">
            <h3
              id="action-modal-title"
              className="text-lg font-bold text-slate-900 tracking-tight cursor-text"
            >
              {title}
            </h3>
            <div
              id="action-modal-desc"
              className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto cursor-text"
              role={type === 'error' ? 'alert' : type === 'success' ? 'status' : undefined}
              aria-live={type === 'error' ? 'assertive' : type === 'success' ? 'polite' : undefined}
            >
              {message}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {type === 'confirmation' || type === 'warning' ? (
              <>
                <button
                  ref={cancelBtnRef}
                  type="button"
                  disabled={isProcessing}
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  disabled={isProcessing}
                  onClick={onConfirm}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 inline-flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 shadow-rose-900/20'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-900/20'
                  }`}
                >
                  {isProcessing ? (
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
                className={`w-full sm:w-36 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                    : type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
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
