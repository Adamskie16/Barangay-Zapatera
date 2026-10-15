import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables via Vite import.meta.env
// NEVER hardcode credentials or expose service-role / secret keys in frontend source code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Supabase] Warning: Missing Supabase environment variables. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

/**
 * Resilient fetch wrapper with retry mechanism
 * Handles transient network glitches and Chromium net::ERR_QUIC_PROTOCOL_ERROR
 */
const resilientFetch = async (input, init) => {
  const maxRetries = 3;
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);

      // Gracefully handle 401 Unauthorized caused by expired or invalid JWT session tokens
      if (response.status === 401) {
        try {
          const clone = response.clone();
          const bodyText = await clone.text();
          const isJwtExpiry =
            bodyText.includes('PGRST301') ||
            bodyText.includes('JWT expired') ||
            bodyText.includes('bad_jwt') ||
            bodyText.includes('token is expired') ||
            bodyText.includes('No suitable key') ||
            bodyText.includes('invalid claim');

          if (isJwtExpiry) {
            // 1. Purge stale Supabase auth tokens from localStorage
            if (typeof localStorage !== 'undefined') {
              Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                  localStorage.removeItem(k);
                }
              });
            }

            // 2. Retry once with clean anon key in Authorization header if present
            if (init && init.headers) {
              const newHeaders = new Headers(init.headers);
              newHeaders.set('Authorization', `Bearer ${supabasePublishableKey}`);
              const retryResponse = await fetch(input, { ...init, headers: newHeaders });
              if (retryResponse.status !== 401) {
                return retryResponse;
              }
            }
          }
        } catch (_) {}
      }

      return response;
    } catch (err) {
      lastError = err;
      const errMsg = String(err?.message || err || '').toLowerCase();
      const isNetworkOrQuicError =
        err?.name === 'TypeError' ||
        errMsg.includes('failed to fetch') ||
        errMsg.includes('network') ||
        errMsg.includes('quic') ||
        errMsg.includes('load failed') ||
        errMsg.includes('abort');

      if (isNetworkOrQuicError && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError;
};

// Initialize and export the singleton Supabase client
export const supabase = createClient(supabaseUrl || '', supabasePublishableKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: resilientFetch,
  },
});

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabasePublishableKey);
};
