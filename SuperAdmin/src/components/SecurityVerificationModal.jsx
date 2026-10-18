// SuperAdmin/src/components/SecurityVerificationModal.jsx
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
  targetUser,
  item,
  title = 'Security Verification: Permanent Deletion',
  message = 'Warning: This will permanently delete this record from the database. Please enter your password to confirm.',
  confirmText = 'Verify & Permanently Delete',
  isDestructive = true,
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

  // Identify display user context (falls back to currentUser or logged in administrator)
  const activeUser = targetUser || (item && (item.full_name || item.name || item.email) ? item : null) || currentUser || {};
  const userName =
    activeUser.full_name ||
    activeUser.name ||
    currentUser?.full_name ||
    currentUser?.name ||
    (activeUser.email ? activeUser.email.split('@')[0] : 'Super Administrator');
  const userEmail = activeUser.email || currentUser?.email || 'admin@zapatera.gov.ph';
  const rawRole = activeUser.role || currentUser?.role || 'admin';
  const roleName = (rawRole === 'super_admin' ? 'ADMIN' : rawRole)
    .replace(/_/g, ' ')
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <div
        className={`w-full max-w-[490px] rounded-3xl border shadow-2xl overflow-hidden p-6 sm:p-7 transition-all duration-200 transform animate-in zoom-in-95 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header section with squircle badge, title, warning text and close button */}
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-4">
            {/* Pastel Red/Pink Squircle Icon Badge */}
            <div
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? isDarkMode
                    ? 'bg-rose-950/60 border border-rose-900/50 text-rose-400'
                    : 'bg-[#fff1f2] border border-rose-100 text-[#f43f5e]'
                  : isDarkMode
                  ? 'bg-blue-950/60 border border-blue-900/50 text-blue-400'
                  : 'bg-blue-50 border border-blue-100 text-blue-500'
              }`}
            >
              {isDestructive ? (
                <ShieldAlert className="w-7 h-7" strokeWidth={2.1} />
              ) : (
                <ShieldCheck className="w-7 h-7" strokeWidth={2.1} />
              )}
            </div>

            <div className="space-y-1 pr-2">
              <h3
                id="security-modal-title"
                className="text-lg sm:text-[19px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight"
              >
                {title}
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                {message}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 rounded-lg shrink-0 -mt-1 -mr-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Identity Card */}
        <div
          className={`mt-5 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isDarkMode
              ? 'bg-slate-800/60 border-slate-700/80'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <ShieldCheck
              className="w-5 h-5 text-blue-500 shrink-0"
              strokeWidth={2}
            />
            <div className="min-w-0">
              <div className="font-bold text-[14px] text-slate-900 dark:text-white truncate leading-snug">
                {userName}
              </div>
              <div className="text-[12px] text-slate-400 dark:text-slate-400 font-normal truncate leading-tight mt-0.5">
                {userEmail}
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
            {roleName}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5">
          {/* Password Input */}
          <div className="space-y-2">
            <label
              htmlFor="security-password-input"
              className="block text-[14px] font-bold text-slate-800 dark:text-slate-200"
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
                className={`w-full px-4 py-3 pr-11 text-[14px] rounded-2xl border-2 transition-all focus:outline-none ${
                  error
                    ? 'border-rose-400 bg-rose-50/30 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-400'
                    : isDarkMode
                    ? 'border-blue-500 bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-400/30'
                    : 'border-blue-500 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-7 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className={`px-4 py-2.5 text-[14px] font-bold rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className={`px-5 py-2.5 rounded-2xl text-[13.5px] font-bold text-white flex items-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDestructive
                  ? 'bg-[#f43f5e] hover:bg-[#e11d48]'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.2]" />
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
