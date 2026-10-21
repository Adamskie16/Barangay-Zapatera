import { createClient } from '@supabase/supabase-js';
import { MobileStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qzmxwxmtuzoanwevftnd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXh3eG10dXpvYW53ZXZmdG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODIwMjQsImV4cCI6MjA5OTY1ODAyNH0.eUsrHf8qnYmx5SF_BTR0L9Hma4OkQZkSg0APrr8LgOg';

/**
 * Resilient Fetch Handler:
 * Specifically mitigates Chromium net::ERR_QUIC_PROTOCOL_ERROR, UDP packet drops, and transient network dropouts.
 *
 * Why net::ERR_QUIC_PROTOCOL_ERROR happens:
 * Cloudflare/Supabase advertises HTTP/3 (QUIC over UDP 443). If the user's ISP, Wi-Fi router, or local
 * firewall filters or corrupts UDP 443 packets, Chromium's QUIC session fails.
 * On the initial error, Chromium marks the QUIC origin as broken and schedules fallback to standard TCP (HTTP/1.1 or HTTP/2).
 * By retrying with a short backoff, the retry immediately traverses TCP and succeeds cleanly without crashing the app.
 */
const resilientFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxRetries = 3;
  let lastError: any;

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
            // 1. Purge stale Supabase auth tokens from storage
            if (typeof localStorage !== 'undefined') {
              Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                  localStorage.removeItem(k);
                }
              });
            }

            // 2. Retry once with clean anon key in Authorization header if present
            if (init && init.headers) {
              const newHeaders = new Headers(init.headers as any);
              newHeaders.set('Authorization', `Bearer ${supabaseAnonKey}`);
              const retryResponse = await fetch(input, { ...init, headers: newHeaders });
              if (retryResponse.status !== 401) {
                return retryResponse;
              }
            }
          }
        } catch (_) {}
      }

      return response;
    } catch (err: any) {
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
        // Exponential backoff: 200ms, 500ms
        // Allows Chromium's socket pool to mark the QUIC session as broken and switch to TCP
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }

  throw lastError;
};

const globalSupabaseKey = '__zapatera_resident_supabase_client__';
export const supabase = ((typeof window !== 'undefined' && (window as any)[globalSupabaseKey]) || (typeof globalThis !== 'undefined' && (globalThis as any)[globalSupabaseKey]))
  ? ((typeof window !== 'undefined' && (window as any)[globalSupabaseKey]) || (globalThis as any)[globalSupabaseKey])
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : MobileStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: resilientFetch,
      },
    });

if (typeof window !== 'undefined') {
  (window as any)[globalSupabaseKey] = supabase;
} else if (typeof globalThis !== 'undefined') {
  (globalThis as any)[globalSupabaseKey] = supabase;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
