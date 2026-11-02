import { createClient } from '@supabase/supabase-js';
import { MobileStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qzmxwxmtuzoanwevftnd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXh3eG10dXpvYW53ZXZmdG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODIwMjQsImV4cCI6MjA5OTY1ODAyNH0.eUsrHf8qnYmx5SF_BTR0L9Hma4OkQZkSg0APrr8LgOg';

/**
 * Tracks whether the Supabase host is currently reachable (DNS + network online).
 * Prevents WebSocket connection attempts from firing while DNS or Wi-Fi is temporarily down
 * (avoiding Chromium's native `net::ERR_NAME_NOT_RESOLVED` console error).
 */
let hostReachable: boolean = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
let reachabilityCheckPromise: Promise<boolean> | null = null;

export const isSupabaseHostReachable = (): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  return hostReachable;
};

export const waitForSupabaseReachable = async (): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    hostReachable = false;
    return false;
  }
  if (hostReachable) {
    return true;
  }
  if (reachabilityCheckPromise) {
    return reachabilityCheckPromise;
  }
  reachabilityCheckPromise = (async () => {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
      const res = await fetch(`${supabaseUrl}/rest/v1/system_config?select=id&limit=1`, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      hostReachable = Boolean(res);
      return hostReachable;
    } catch {
      hostReachable = false;
      return false;
    } finally {
      reachabilityCheckPromise = null;
    }
  })();
  return reachabilityCheckPromise;
};

/**
 * Resilient WebSocket wrapper for @supabase/realtime-js.
 * Guards against calling `new WebSocket(...)` when DNS or Wi-Fi is unreachable,
 * preventing `WebSocket connection to 'wss://...' failed: net::ERR_NAME_NOT_RESOLVED`.
 */
class ResilientWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  private ws: WebSocket | null = null;
  private _binaryType: BinaryType = 'arraybuffer';
  public onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  public onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  public onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  public onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  public readyState: number = ResilientWebSocket.CONNECTING;
  public url: string = '';
  public protocol: string = '';
  public extensions: string = '';
  public bufferedAmount: number = 0;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = String(url);

    // If browser is offline or host DNS recently failed, skip native WebSocket instantiation
    if (!isSupabaseHostReachable() || typeof WebSocket === 'undefined') {
      this.readyState = ResilientWebSocket.CLOSED;
      setTimeout(() => {
        if (typeof this.onclose === 'function') {
          this.onclose.call(this as any, {
            code: 1006,
            reason: 'Supabase host temporarily unreachable (DNS/Offline)',
            wasClean: false,
          } as CloseEvent);
        }
      }, 50);
      return;
    }

    try {
      const validProtocols =
        typeof protocols === 'string' || Array.isArray(protocols) ? protocols : undefined;
      this.ws = validProtocols ? new WebSocket(url, validProtocols) : new WebSocket(url);
      this.ws.binaryType = this._binaryType;

      this.ws.onopen = (ev: Event) => {
        hostReachable = true;
        this.readyState = ResilientWebSocket.OPEN;
        if (typeof this.onopen === 'function') this.onopen.call(this.ws!, ev);
      };

      this.ws.onmessage = (ev: MessageEvent) => {
        if (typeof this.onmessage === 'function') this.onmessage.call(this.ws!, ev);
      };

      this.ws.onerror = (ev: Event) => {
        if (typeof this.onerror === 'function') this.onerror.call(this.ws!, ev);
      };

      this.ws.onclose = (ev: CloseEvent) => {
        this.readyState = ResilientWebSocket.CLOSED;
        if (typeof this.onclose === 'function') this.onclose.call(this.ws!, ev);
      };
    } catch {
      this.readyState = ResilientWebSocket.CLOSED;
      setTimeout(() => {
        if (typeof this.onclose === 'function') {
          this.onclose.call(this as any, {
            code: 1006,
            reason: 'WebSocket initialization skipped',
            wasClean: false,
          } as CloseEvent);
        }
      }, 50);
    }
  }

  get binaryType(): BinaryType {
    return this.ws ? this.ws.binaryType : this._binaryType;
  }

  set binaryType(value: BinaryType) {
    this._binaryType = value;
    if (this.ws) {
      this.ws.binaryType = value;
    }
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.ws && this.ws.readyState === ResilientWebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = ResilientWebSocket.CLOSING;
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch {}
    }
    this.readyState = ResilientWebSocket.CLOSED;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    if (this.ws) {
      this.ws.addEventListener(type, listener, options);
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    if (this.ws) {
      this.ws.removeEventListener(type, listener, options);
    }
  }
}

/**
 * Resilient Fetch Handler:
 * Specifically mitigates Chromium net::ERR_QUIC_PROTOCOL_ERROR, UDP packet drops, and transient network dropouts.
 */
const resilientFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      hostReachable = true;

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
            if (typeof localStorage !== 'undefined') {
              Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                  localStorage.removeItem(k);
                }
              });
            }

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
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
      hostReachable = false;
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
      realtime: {
        transport: ResilientWebSocket as any,
        timeout: 20000,
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => {
          if (!isSupabaseHostReachable()) {
            // Probe HTTP reachability in the background while backing off
            waitForSupabaseReachable();
            return 15000;
          }
          return [1000, 2500, 5000, 10000][tries - 1] || 15000;
        },
      },
      global: {
        fetch: resilientFetch,
      },
    });

if (typeof window !== 'undefined') {
  (window as any)[globalSupabaseKey] = supabase;

  window.addEventListener('offline', () => {
    hostReachable = false;
    try {
      supabase.realtime?.disconnect?.();
    } catch {}
  });

  window.addEventListener('online', () => {
    waitForSupabaseReachable().then((reachable) => {
      if (reachable) {
        try {
          supabase.realtime?.connect?.();
        } catch {}
      }
    });
  });
} else if (typeof globalThis !== 'undefined') {
  (globalThis as any)[globalSupabaseKey] = supabase;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
