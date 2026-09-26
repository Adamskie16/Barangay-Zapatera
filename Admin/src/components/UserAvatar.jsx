// Admin/src/components/UserAvatar.jsx
import React, { useState, useEffect } from 'react';

/**
 * Checks whether an avatar URL is a template, stock, or placeholder image.
 * If true, the system does NOT display the template image and falls back to initials.
 */
export function isTemplateAvatar(url) {
  if (!url || typeof url !== 'string') return true;
  const clean = url.trim().toLowerCase();
  if (!clean) return true;
  if (clean.includes('photo-1472099645785')) return true;
  if (clean.includes('photo-1534528741775')) return true;
  if (clean.includes('default-avatar') || clean.includes('default_avatar') || clean.includes('placeholder')) return true;
  if (clean.includes('silhouette') || clean.includes('user-template') || clean.includes('avatar-template') || clean.includes('anonymous')) return true;
  return false;
}

/**
 * Computes dynamic initials:
 * - "John Doe" -> "JD"
 * - "Maria Santos Dela Cruz" -> "MC"
 * - "Juan" -> "JU"
 * - "resident@zapatera.gov.ph" -> "R"
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.trim();
  if (clean.includes('@') && !clean.includes(' ')) {
    return clean.charAt(0).toUpperCase();
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Reusable UserAvatar component for Admin:
 * - Renders high-res avatar if `src` is present, valid (not a template), and loads successfully.
 * - Smoothly falls back to dynamic initials badge if `src` is missing, NULL, a template image, or fails to load.
 * - Eliminates all static placeholder silhouettes or stock asset URLs.
 */
export default function UserAvatar({
  src,
  name,
  role = 'resident',
  size = 'md',
  className = '',
  showStatus = false,
  isLocked = false,
  isDarkMode = false,
}) {
  const [imageError, setImageError] = useState(false);

  // Reset error state whenever the image source URL changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  const getRoleColors = () => {
    if (role === 'super_admin') {
      return isDarkMode
        ? 'bg-purple-950/60 text-purple-300 border-purple-800'
        : 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (role === 'admin') {
      return isDarkMode
        ? 'bg-blue-950/60 text-blue-300 border-blue-800'
        : 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return isDarkMode
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const initials = getInitials(name);
  const hasValidUploadedAvatar = Boolean(src && !isTemplateAvatar(src) && !imageError);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {hasValidUploadedAvatar ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          className={`${currentSize} rounded-full object-cover border ${
            isDarkMode ? 'border-slate-700' : 'border-slate-200'
          } shadow-2xs`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`${currentSize} rounded-full flex items-center justify-center font-bold tracking-wider border shadow-2xs transition-colors ${getRoleColors()}`}
          title={name || 'User Profile'}
        >
          <span>{initials}</span>
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 ${
            isDarkMode ? 'border-slate-900' : 'border-white'
          } ${size === 'xl' || size === '2xl' ? 'w-4 h-4' : 'w-2.5 h-2.5'} ${
            isLocked ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
          title={isLocked ? 'Account Locked' : 'Active Account'}
        />
      )}
    </div>
  );
}
