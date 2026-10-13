// AccountManagement/src/core/security.js
// Input Validation, Security Sanitization, Rate Limiting & Robust 3-Attempt Account Lockout Core Utilities

import { supabase, isSupabaseConfigured } from './supabase';

export const getSecurityChannel = () => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel('zapatera_security_channel');
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const broadcastSecurityEvent = (type, email, data = {}) => {
  const channel = getSecurityChannel();
  if (channel) {
    channel.postMessage({ type, email: String(email).toLowerCase().trim(), data, timestamp: Date.now() });
  }
};

export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).toLowerCase().trim());
};

export const generateTrackingNumber = (prefix = 'BZ-2026') => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
};

export const formatCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(numericAmount);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const logActivityEvent = async (action, details, level = 'info', userEmail = 'system', feature = 'Authentication') => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('activity_logs').insert([{
        action,
        details,
        level,
        user_email: userEmail,
        feature,
        created_at: new Date().toISOString(),
      }]);
    }
  } catch (err) {}
};

/**
 * Rate Limiting Check with 10-second cooldown interval
 */
export const checkRateLimit = async (identifier, maxAttempts = 5, windowSeconds = 10) => {
  const cleanId = String(identifier).toLowerCase().trim();
  const now = new Date();

  let localLastAttempt = 0;
  if (typeof localStorage !== 'undefined') {
    localLastAttempt = parseInt(localStorage.getItem(`zapatera_ratelimit_${cleanId}`) || '0', 10);
    const secondsPassed = Math.floor((now.getTime() - localLastAttempt) / 1000);
    if (localLastAttempt > 0 && secondsPassed < windowSeconds) {
      const waitRemaining = windowSeconds - secondsPassed;
      return {
        allowed: false,
        remaining: 0,
        message: `Too many authentication attempts. Please wait ${waitRemaining} second${waitRemaining > 1 ? 's' : ''} before trying again.`,
      };
    }
  }
  
  try {
    if (isSupabaseConfigured()) {
      const { data: limitData, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (!error && limitData) {
        const lastAttempt = new Date(limitData.last_attempt || limitData.window_start).getTime();
        const secondsDiff = Math.floor((now.getTime() - lastAttempt) / 1000);

        if (secondsDiff < windowSeconds && limitData.attempts >= maxAttempts) {
          const waitRemaining = windowSeconds - secondsDiff;
          return {
            allowed: false,
            remaining: 0,
            message: `Too many authentication attempts. Please wait ${waitRemaining} second${waitRemaining > 1 ? 's' : ''} before trying again.`,
          };
        } else if (secondsDiff >= windowSeconds) {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
          }
          return { allowed: true, remaining: maxAttempts - 1 };
        } else {
          await supabase
            .from('rate_limits')
            .update({ attempts: limitData.attempts + 1, last_attempt: now.toISOString() })
            .eq('id', limitData.id);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
          }
          return { allowed: true, remaining: maxAttempts - (limitData.attempts + 1) };
        }
      } else if (!error) {
        await supabase
          .from('rate_limits')
          .insert([{ identifier: cleanId, attempts: 1, window_start: now.toISOString(), last_attempt: now.toISOString() }]);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
        }
        return { allowed: true, remaining: maxAttempts - 1 };
      }
    }
  } catch (err) {}

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`zapatera_ratelimit_${cleanId}`, String(now.getTime()));
  }
  return { allowed: true, remaining: maxAttempts - 1 };
};

/**
 * Check whether an account is locked in Supabase profiles database.
 * Single source of truth is public.profiles table.
 */
export const isAccountLocked = async (email) => {
  const cleanEmail = String(email).toLowerCase().trim();

  let localLocked = false;
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(`zapatera_locked_${cleanEmail}`) === 'true') {
      localLocked = true;
    }
    const localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    if (localAttempts >= 3) {
      localLocked = true;
    }
  }

  try {
    if (isSupabaseConfigured()) {
      // 1. Try atomic SECURITY DEFINER RPC first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('check_account_lockout', {
          user_email: cleanEmail,
        });
        if (!rpcErr && rpcData && typeof rpcData.is_locked === 'boolean') {
          if (rpcData.is_locked) {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
              localStorage.setItem(`zapatera_failed_${cleanEmail}`, '3');
            }
            return true;
          } else {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
            }
            return false;
          }
        }
      } catch (e) {}

      // 2. Direct profiles table query fallback
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, is_locked, failed_login_attempts, failed_attempts, is_active, locked_at')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!profErr && profile) {
        const attempts = Math.max(profile.failed_login_attempts || 0, profile.failed_attempts || 0);
        const isDbLocked = profile.is_locked === true || attempts >= 3 || profile.is_active === false;
        if (isDbLocked) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
            localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(Math.max(3, attempts)));
          }
          return true;
        } else {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
            localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
          }
          return false;
        }
      }
    }
  } catch (err) {}

  return localLocked;
};

/**
 * Record a consecutive failed password attempt directly on profiles table.
 * Tracks both failed_login_attempts and failed_attempts.
 * Auto-locks account after 3 consecutive failures.
 */
export const recordFailedAttempt = async (email, userRole = 'super_admin') => {
  const cleanEmail = String(email).toLowerCase().trim();
  const nowTs = new Date().toISOString();

  let localAttempts = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localAttempts = parseInt(localStorage.getItem(`zapatera_failed_${cleanEmail}`) || '0', 10);
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      // 1. Try atomic SECURITY DEFINER RPC first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('record_failed_login_attempt', {
          user_email: cleanEmail,
        });
        if (!rpcErr && rpcData && rpcData.attempts !== undefined) {
          const newAttempts = Number(rpcData.attempts) || 1;
          const isLocked = Boolean(rpcData.is_locked);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(newAttempts));
            if (isLocked) {
              localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
            }
          }
          if (isLocked) {
            broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: newAttempts, lockedAt: nowTs });
          }
          return { attempts: newAttempts, isLockedOut: isLocked, remaining: Math.max(0, 3 - newAttempts) };
        }
      } catch (e) {}

      // 2. Direct profiles table query and update fallback
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, email, failed_login_attempts, failed_attempts, is_locked, full_name, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      const dbAttempts = profData ? Math.max(profData.failed_login_attempts || 0, profData.failed_attempts || 0) : 0;
      const currentAttempts = Math.max(dbAttempts, localAttempts) + 1;
      const isLockedOut = currentAttempts >= 3;

      if (profData?.id) {
        await supabase
          .from('profiles')
          .update({
            failed_login_attempts: currentAttempts,
            failed_attempts: currentAttempts,
            is_locked: isLockedOut,
            is_active: !isLockedOut,
            locked_at: isLockedOut ? nowTs : null,
            updated_at: nowTs,
          })
          .eq('id', profData.id);

        if (isLockedOut) {
          await supabase
            .from('account_unlock_requests')
            .upsert([{
              user_id: profData.id,
              email: cleanEmail,
              full_name: profData.full_name || cleanEmail.split('@')[0],
              role: profData.role || userRole,
              status: 'pending',
              failed_attempts: currentAttempts,
              locked_at: nowTs,
              created_at: nowTs,
            }], { onConflict: 'email' });

          broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: currentAttempts, lockedAt: nowTs });
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(currentAttempts));
        if (isLockedOut) {
          localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
        }
      }

      return { attempts: currentAttempts, isLockedOut, remaining: Math.max(0, 3 - currentAttempts) };
    }
  } catch (err) {}

  const currentAttempts = localAttempts + 1;
  const isLockedOut = currentAttempts >= 3;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`zapatera_failed_${cleanEmail}`, String(currentAttempts));
    if (isLockedOut) {
      localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
    }
  }

  return { attempts: currentAttempts, isLockedOut, remaining: Math.max(0, 3 - currentAttempts) };
};

/**
 * Reset failed attempts immediately upon successful authentication or verified unlock.
 * failed_login_attempts = 0, failed_attempts = 0
 */
export const resetFailedAttempts = async (email) => {
  const cleanEmail = String(email).toLowerCase().trim();
  const nowTs = new Date().toISOString();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
      localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      try {
        await supabase.rpc('reset_account_lockout', { user_email: cleanEmail });
      } catch (e) {}

      await supabase
        .from('profiles')
        .update({
          failed_login_attempts: 0,
          failed_attempts: 0,
          updated_at: nowTs,
        })
        .eq('email', cleanEmail)
        .eq('is_locked', false);
    }
  } catch (err) {}
};

/**
 * Unlock a user account manually or programmatically.
 * Sets is_locked = false, resets failed attempts, records unlocked_at and unlocked_by.
 */
export const unlockUserAccount = async (targetEmail, adminIdentifier = null) => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  const nowTs = new Date().toISOString();
  let adminUuid = (adminIdentifier && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminIdentifier))
    ? adminIdentifier
    : null;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`zapatera_failed_${cleanEmail}`);
      localStorage.removeItem(`zapatera_locked_${cleanEmail}`);
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      if (!adminUuid && adminIdentifier) {
        const { data: adminProf } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', String(adminIdentifier).toLowerCase().trim())
          .maybeSingle();
        if (adminProf?.id) {
          adminUuid = adminProf.id;
        }
      }

      try {
        await supabase.rpc('admin_unlock_account', {
          target_user_email: cleanEmail,
          admin_user_id: adminUuid,
        });
      } catch (e) {}

      await supabase
        .from('account_unlock_requests')
        .delete()
        .eq('email', cleanEmail);

      const updatePayload = {
        is_locked: false,
        is_active: true,
        failed_login_attempts: 0,
        failed_attempts: 0,
        locked_at: null,
        unlocked_at: nowTs,
        updated_at: nowTs,
      };
      if (adminUuid) {
        updatePayload.unlocked_by = adminUuid;
      }

      await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('email', cleanEmail);

      broadcastSecurityEvent('ACCOUNT_UNLOCKED', cleanEmail);
      return true;
    }
  } catch (err) {}
  return true;
};

/**
 * Lock a user account manually or programmatically.
 */
export const lockUserAccount = async (targetEmail, adminIdentifier = null, reason = 'Manual Admin Lockout') => {
  const cleanEmail = String(targetEmail).toLowerCase().trim();
  const nowTs = new Date().toISOString();
  let adminUuid = (adminIdentifier && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminIdentifier))
    ? adminIdentifier
    : null;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`zapatera_failed_${cleanEmail}`, '3');
      localStorage.setItem(`zapatera_locked_${cleanEmail}`, 'true');
    }
  } catch (e) {}

  try {
    if (isSupabaseConfigured()) {
      if (!adminUuid && adminIdentifier) {
        const { data: adminProf } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', String(adminIdentifier).toLowerCase().trim())
          .maybeSingle();
        if (adminProf?.id) {
          adminUuid = adminProf.id;
        }
      }

      try {
        await supabase.rpc('admin_lock_account', {
          target_user_email: cleanEmail,
          admin_user_id: adminUuid,
          lock_reason: reason,
        });
      } catch (e) {}

      await supabase
        .from('profiles')
        .update({
          is_locked: true,
          is_active: false,
          failed_login_attempts: 3,
          failed_attempts: 3,
          locked_at: nowTs,
          updated_at: nowTs,
        })
        .eq('email', cleanEmail);

      broadcastSecurityEvent('ACCOUNT_LOCKED', cleanEmail, { attempts: 3, lockedAt: nowTs });
      return true;
    }
  } catch (err) {}
  return true;
};
