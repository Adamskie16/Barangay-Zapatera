import React from 'react';
import Spinner from './Spinner';

/**
 * Button
 * Production-ready action button with integrated inline loading state.
 * Prevents CLS (Cumulative Layout Shift) by preserving exact button dimensions
 * when transitioning into and out of the loading state.
 *
 * @param {boolean} isLoading - Activates inline micro-spinner and locks interaction
 * @param {string} loadingText - Optional replacement text (e.g. "Saving...")
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'} variant
 * @param {'sm' | 'md' | 'lg'} size
 */
export function Button({
  children,
  isLoading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none';

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500 active:bg-blue-800 border border-blue-700/20',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-white shadow-sm focus:ring-slate-500 active:bg-slate-900 border border-slate-700',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:ring-slate-400',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 focus:ring-slate-400',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 active:bg-rose-800 border border-rose-700/20',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500 active:bg-emerald-800 border border-emerald-700/20',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[32px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[40px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5',
  };

  const spinnerSize = size === 'sm' ? 'sm' : 'md';
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      onClick={isDisabled ? undefined : onClick}
      className={`
        ${baseStyles}
        ${variantStyles[variant] || variantStyles.primary}
        ${sizeStyles[size] || sizeStyles.md}
        ${isLoading ? 'opacity-85 cursor-wait pointer-events-none' : ''}
        ${disabled && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Loading overlay / spinner */}
      {isLoading && (
        <span className="inline-flex items-center gap-1.5 shrink-0" aria-hidden="true">
          <Spinner size={spinnerSize} />
          {loadingText && <span>{loadingText}</span>}
        </span>
      )}

      {/* Button content (hidden from sight if loadingText is provided, otherwise rendered next to spinner) */}
      <span className={isLoading && loadingText ? 'sr-only' : 'inline-flex items-center gap-2'}>
        {children}
      </span>
    </button>
  );
}

export default Button;
