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
      return await fetch(input, init);
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
