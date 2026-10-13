import React from 'react';

/**
 * Spinner
 * Enterprise-grade, clean circular SVG spinner with crisp stroke geometry.
 * Free of excessive glows or bouncing cartoon effects.
 *
 * @param {'sm' | 'md' | 'lg' | 'xl'} size
 * @param {string} className
 * @param {string} ariaLabel
 */
export function Spinner({
  size = 'md',
  className = '',
  color = 'currentColor',
  ariaLabel = 'Loading...',
}) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
  };

  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center ${dimension} ${className}`}
    >
      <svg
        className="animate-spin w-full h-full"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill={color}
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

export default Spinner;
