// AccountManagement/src/components/UserAvatar.jsx
import React, { useState, useEffect } from 'react';
import { ShieldCheck, User as UserIcon, Lock } from 'lucide-react';

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.trim();
  if (clean.includes('@')) return clean.charAt(0).toUpperCase();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({
  src,
  name,
  role = 'resident',
  size = 'md',
  className = '',
  isDarkMode = false,
  showStatus = false,
  isLocked = false,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials = getInitials(name);

  // Sizing tokens
  const sizeMap = {
    xs: { box: 'w-7 h-7 text-[10px]', badge: 'w-2 h-2 -bottom-0.5 -right-0.5' },
    sm: { box: 'w-8 h-8 text-xs', badge: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
    md: { box: 'w-10 h-10 text-sm font-bold', badge: 'w-3 h-3 -bottom-0.5 -right-0.5' },
    lg: { box: 'w-12 h-12 text-base font-bold', badge: 'w-3.5 h-3.5 -bottom-1 -right-1' },
    xl: { box: 'w-16 h-16 text-xl font-extrabold', badge: 'w-4 h-4 -bottom-1 -right-1' },
    '2xl': { box: 'w-24 h-24 text-2xl font-black', badge: 'w-5 h-5 -bottom-1 -right-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Role color palette for fallback badges
  const roleStyles = {
    super_admin: isDarkMode
      ? 'bg-purple-950/70 border-purple-500/40 text-purple-300'
      : 'bg-purple-100 border-purple-300 text-purple-800',
    admin: isDarkMode
      ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
      : 'bg-blue-100 border-blue-300 text-blue-800',
    resident: isDarkMode
      ? 'bg-slate-800 border-slate-700 text-slate-200'
      : 'bg-slate-100 border-slate-300 text-slate-700',
  };

  const palette = roleStyles[role] || roleStyles.resident;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${currentSize.box} rounded-2xl flex items-center justify-center overflow-hidden border shadow-xs select-none transition-all duration-200 ${palette}`}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name || 'User avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <span className="tracking-tight uppercase">{initials}</span>
        )}
      </div>

      {showStatus && (
        <span
          className={`absolute rounded-full border-2 ${
            isDarkMode ? 'border-slate-900' : 'border-white'
          } ${currentSize.badge} ${isLocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
          title={isLocked ? 'Account Locked' : 'Active Account'}
        />
      )}
    </div>
  );
}
