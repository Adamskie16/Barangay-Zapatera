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
  title = 'Security Verification: Delete User Account',
  message = 'Are you sure you want to delete this record? It will be forwarded to Archive & Trash where authorized administrators can restore it. Please enter your password to confirm.',
  confirmText = 'Delete',
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !isVerifying) onClose?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white border border-slate-100 text-slate-800 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.22)] overflow-hidden transition-all duration-200 transform animate-in zoom-in-95">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              isDestructive
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-blue-50 text-[#3b5bfd] border-blue-200'
            }`}
          >
            {isDestructive ? 'Destructive Action' : 'Security Verification'}
          </span>

          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="w-8 h-8 rounded-full bg-[#f4f7fb] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-2 pb-4 flex items-start space-x-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md ${
              isDestructive
                ? 'bg-linear-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48] shadow-rose-500/25'
                : 'bg-linear-to-br from-[#38bdf8] via-[#3b5bfd] to-[#2563eb] shadow-blue-500/25'
            }`}
          >
            {isDestructive ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 id="security-modal-title" className="text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* User Identifier Tag */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#f4f7fb] border border-slate-200/70 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-2xs shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="font-extrabold text-slate-800 block truncate">{userName}</span>
                <span className="text-slate-400 font-mono text-[11px] block truncate">{userEmail}</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-[#3b5bfd] border border-blue-100 shrink-0">
              {roleName}
            </span>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="security-password-input"
              className="block text-[11px] font-bold text-slate-600"
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
                placeholder="Enter your account password..."
                className={`w-full px-4 py-2.5 pr-10 text-xs font-medium rounded-2xl border focus:outline-none transition-all ${
                  error
                    ? 'border-rose-300 bg-rose-50/40 text-rose-900'
                    : 'border-slate-200/80 bg-[#f4f7fb] focus:bg-white focus:border-[#3b5bfd] text-slate-900 placeholder-slate-400'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#f4f7fb] hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className={`px-6 py-2.5 rounded-full text-xs font-bold text-white flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25 disabled:opacity-50'
                  : 'bg-[#3b5bfd] hover:bg-blue-700 shadow-blue-500/25 disabled:opacity-50'
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
