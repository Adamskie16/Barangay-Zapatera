// Resident/src/core/deviceTelemetry.ts
import { supabase, isSupabaseConfigured } from './supabase';
import { MobileStorage } from './storage';
import { ResidentUser, UserDeviceSession } from '../types';

const APP_VERSION = '1.0.0';
const DEVICE_ID_KEY = 'zapatera_device_id';

/**
 * Get or generate a persistent unique Device ID
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await MobileStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const generated = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    await MobileStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return 'dev_default_session';
  }
}

/**
 * Detect client device OS and Model information
 */
export function detectDeviceMetadata(): {
  deviceName: string;
  deviceModel: string;
  osName: string;
  osVersion: string;
  appVersion: string;
} {
  let osName = 'Unknown OS';
  let osVersion = '1.0';
  let deviceName = 'Client Device';
  let deviceModel = 'Generic Device';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      osName = 'iOS';
      deviceModel = /iPad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
      deviceName = 'iOS Device';
      const match = ua.match(/OS (\d+[_.]\d+)/);
      if (match) osVersion = match[1].replace(/_/g, '.');
    } else if (/Android/i.test(ua)) {
      osName = 'Android';
      deviceName = 'Android Device';
      deviceModel = 'Android Smartphone';
      const match = ua.match(/Android\s([0-9\.]+)/);
      if (match) osVersion = match[1];
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      osName = 'macOS';
      deviceName = 'Apple Mac';
      deviceModel = 'MacBook / Desktop';
      const match = ua.match(/Mac OS X\s([0-9_\.]+)/);
      if (match) osVersion = match[1].replace(/_/g, '.');
    } else if (/Windows/i.test(ua)) {
      osName = 'Windows';
      deviceName = 'Windows PC';
      deviceModel = 'PC Desktop / Laptop';
      if (/Windows NT 10.0/i.test(ua)) osVersion = '11 / 10';
      else if (/Windows NT 6.3/i.test(ua)) osVersion = '8.1';
      else if (/Windows NT 6.1/i.test(ua)) osVersion = '7';
    } else if (/Linux/i.test(ua)) {
      osName = 'Linux';
      deviceName = 'Linux System';
      deviceModel = 'Linux Workstation';
    }
  }

  return {
    deviceName,
    deviceModel,
    osName,
    osVersion,
    appVersion: APP_VERSION,
  };
}

/**
 * Register or update active user device session in Supabase & local storage
 */
export async function registerDeviceSession(user: ResidentUser): Promise<UserDeviceSession | null> {
  if (!user || !user.id) return null;

  const deviceId = await getOrCreateDeviceId();
  const meta = detectDeviceMetadata();
  const now = new Date().toISOString();

  const sessionData: UserDeviceSession = {
    id: `session_${deviceId}`,
    user_id: user.id,
    device_id: deviceId,
    device_name: meta.deviceName,
    device_model: meta.deviceModel,
    os_name: meta.osName,
    os_version: meta.osVersion,
    app_version: meta.appVersion,
    push_token: user.push_token || `token_${deviceId.substring(4, 12)}`,
    push_token_status: user.push_token_status || 'active',
    is_active: true,
    ip_address: '127.0.0.1',
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  // 1. Sync to local storage
  try {
    const sessionsKey = `zapatera_user_devices_${user.id}`;
    const stored = await MobileStorage.getItem(sessionsKey);
    let list: UserDeviceSession[] = stored ? JSON.parse(stored) : [];
    list = list.filter((s) => s.device_id !== deviceId);
    list.unshift(sessionData);
    await MobileStorage.setItem(sessionsKey, JSON.stringify(list));
    await MobileStorage.setItem('zapatera_current_device_session', JSON.stringify(sessionData));
  } catch (err) {
    console.warn('Failed to cache device session locally:', err);
  }

  // 2. Sync to Supabase PostgreSQL table 'user_devices' and 'profiles'
  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) {
        // Upsert into user_devices
        await supabase.from('user_devices').upsert(
          {
            user_id: user.id,
            device_id: deviceId,
            device_name: meta.deviceName,
            device_model: meta.deviceModel,
            os_name: meta.osName,
            os_version: meta.osVersion,
            app_version: meta.appVersion,
            push_token: sessionData.push_token,
            push_token_status: sessionData.push_token_status,
            is_active: true,
            ip_address: '127.0.0.1',
            last_login_at: now,
            updated_at: now,
          },
          { onConflict: 'user_id,device_id' }
        );

        // Update telemetry on profiles
        await supabase
          .from('profiles')
          .update({
            app_version: meta.appVersion,
            device_os: `${meta.osName} ${meta.osVersion}`,
            device_model: meta.deviceModel,
            push_token: sessionData.push_token,
            push_token_status: sessionData.push_token_status,
            last_active_at: now,
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Supabase device registration notice:', err);
    }
  }

  return sessionData;
}

/**
 * Check if the current device session is still active (or was terminated by Admin/SuperAdmin)
 */
export async function checkCurrentSessionActive(userId: string): Promise<boolean> {
  if (!userId) return true;

  const deviceId = await getOrCreateDeviceId();

  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
        const { data, error } = await supabase
          .from('user_devices')
          .select('is_active')
          .eq('user_id', userId)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (!error && data && data.is_active === false) {
          return false; // Terminated by administrator!
        }
      }
    } catch {
      // Ignore network errors
    }
  }

  // Fallback to local session check
  try {
    const currentStored = await MobileStorage.getItem('zapatera_current_device_session');
    if (currentStored) {
      const parsed = JSON.parse(currentStored);
      if (parsed.is_active === false) return false;
    }
  } catch {
    // Ignore
  }

  return true;
}
