// Admin/src/components/SecurityVerificationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { verifyLoggedInPassword } from '../core/security';

export default function SecurityVerificationModal({
  isOpen,
  onClose,
  onVerified,
  currentUser,
  title = 'Security Verification Required',
  message = 'Please confirm your administrator password to authorize this action.',
  confirmText = 'Verify & Proceed',
  isDestructive = false,
  isDarkMode = false,
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setIsVerifying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await verifyLoggedInPassword(password, currentUser);
      if (isValid) {
        setIsVerifying(false);
        setPassword('');
        if (onVerified) {
          await onVerified();
        }
        onClose?.();
      } else {
        setIsVerifying(false);
        setError('Incorrect password. Verification failed.');
        inputRef.current?.select();
      }
    } catch (err) {
      setIsVerifying(false);
      setError('An error occurred during verification. Please try again.');
    }
  };

  const userEmail = currentUser?.email || 'admin@zapatera.gov.ph';
  const userName = currentUser?.full_name || currentUser?.name || 'Administrator';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 transform animate-in zoom-in-95 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header with decorative badge */}
        <div className="p-6 pb-4 relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-4 ${
                isDestructive
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 ring-rose-500/10'
                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 ring-amber-500/10'
              }`}
            >
              {isDestructive ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1 pr-6">
              <h3 id="security-modal-title" className="text-base font-bold tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* User Identifier Tag */}
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 truncate">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{userName}</span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] block truncate">{userEmail}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {currentUser?.role || 'Admin'}
            </span>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="security-password-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Enter Password to Confirm
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="security-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={isVerifying}
                placeholder="Enter your account password"
                className={`w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30 text-rose-900 dark:text-rose-100'
                    : isDarkMode
                    ? 'border-slate-700 focus:ring-blue-500 bg-slate-800 text-white placeholder-slate-500'
                    : 'border-slate-300 focus:ring-blue-500 bg-slate-50/50 text-slate-900 placeholder-slate-400'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isDarkMode
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
