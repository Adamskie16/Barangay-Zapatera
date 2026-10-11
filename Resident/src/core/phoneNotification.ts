// Resident/src/core/phoneNotification.ts
// Core service for Cellphone Push, Audio, and Vibration notifications for Barangay Zapatera Residents

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

interface NotificationPayload {
  id?: string;
  title: string;
  message: string;
  isEmergency?: boolean;
  category?: string;
  banner_url?: string;
  url?: string;
  author?: string;
}

let audioContextInstance: AudioContext | null = null;

/**
 * Returns the current Notification API status on this device
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Helper to obtain or resume AudioContext safely conforming to browser autoplay policies
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextInstance) {
      audioContextInstance = new AudioCtx();
    }
    if (audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {
        // Handled silently: browser requires user interaction before audio starts
      });
    }
    return audioContextInstance;
  } catch {
    return null;
  }
}

/**
 * Register Service Worker for mobile system notifications
 */
export async function initPhoneNotifications(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Barangay Zapatera ServiceWorker registered successfully for mobile push:', reg.scope);
    } catch (err) {
      console.warn('ServiceWorker registration skipped or failed:', err);
    }
  }
}

/**
 * Request permission from the cellphone / browser to display notifications
 */
export async function requestPhoneNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const isGranted = permission === 'granted';

    if (isGranted) {
      localStorage.setItem('zapatera_phone_notif_enabled', 'true');
      playNotificationChime(false);
      vibratePhone(false);
    } else if (permission === 'denied') {
      localStorage.setItem('zapatera_phone_notif_enabled', 'false');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('zapatera_notification_permission_changed', {
          detail: { permission, isGranted },
        })
      );
    }

    return isGranted;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Synthesizes a clean, melodic notification chime using the Web Audio API
 */
export function playNotificationChime(isEmergency: boolean = false): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (isEmergency) {
      // High-priority 3-tone emergency warning sound
      const tones = [783.99, 1046.5, 783.99]; // G5, C6, G5
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.16;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } else {
      // Elegant 2-tone government bulletin chime: D5 (587.33 Hz) -> A5 (880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.14);
      gain2.gain.setValueAtTime(0.32, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.55);
    }
  } catch (err) {
    // Audio autoplay restrictions or unsupported
  }
}

/**
 * Triggers physical vibration on mobile phones
 */
export function vibratePhone(isEmergency: boolean = false): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (isEmergency) {
        // Urgent multi-pulse vibration pattern
        navigator.vibrate([300, 100, 300, 100, 500]);
      } else {
        // Standard pleasant double vibration
        navigator.vibrate([200, 100, 200]);
      }
    } catch {
      // Ignored if device doesn't support or permission blocked
    }
  }
}

/**
 * Triggers full cellphone alert:
 * 1. Physical vibration
 * 2. Sound chime
 * 3. System / OS Push Notification in the cellphone tray/lockscreen
 */
export async function triggerCellphoneNotification(payload: NotificationPayload): Promise<{ systemNotified: boolean }> {
  const {
    id = `ann-${Date.now()}`,
    title,
    message,
    isEmergency = false,
    category = 'Public Advisory',
    url = '/?tab=announcements',
  } = payload;

  // 1. Physical phone vibration
  vibratePhone(isEmergency);

  // 2. Audible notification chime
  playNotificationChime(isEmergency);

  let systemNotified = false;

  // 3. Native OS system notification (appears in phone's notification bar / lock screen)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      const cleanTitle = isEmergency
        ? `🚨 Barangay Zapatera Emergency: ${title}`
        : `📢 Barangay Zapatera: ${title}`;

      const cleanBody = (message || 'Barangay Zapatera has published a new bulletin.').trim();

      const notifOptions = {
        body: cleanBody.length > 180 ? `${cleanBody.substring(0, 177)}...` : cleanBody,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        tag: `zapatera-announcement-${id}`,
        renotify: true,
        vibrate: isEmergency ? [300, 100, 300, 100, 500] : [200, 100, 200],
        data: {
          url,
          announcementId: id,
          category,
          timestamp: Date.now(),
        },
      };

      try {
        // Try via Service Worker first (best for Android/mobile phones)
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(cleanTitle, notifOptions);
            systemNotified = true;
            return { systemNotified: true };
          }
        }
      } catch (swErr) {
        // Fallback to Window Notification
      }

      try {
        // Fallback to standard window Notification
        const n = new Notification(cleanTitle, {
          body: notifOptions.body,
          icon: notifOptions.icon,
          badge: notifOptions.badge,
          tag: notifOptions.tag,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        systemNotified = true;
      } catch (winErr) {
        console.warn('Notice: Window Notification fallback issue:', winErr);
      }
    }
  }

  return { systemNotified };
}

/**
 * Test helper for residents to preview the notification experience on their phone
 */
export async function sendTestPhoneNotification(): Promise<{ success: boolean; systemNotified: boolean; permission: NotificationPermissionStatus }> {
  const currentPermission = getNotificationPermissionStatus();

  let isGranted = currentPermission === 'granted';
  if (currentPermission === 'default') {
    isGranted = await requestPhoneNotificationPermission();
  }

  const { systemNotified } = await triggerCellphoneNotification({
    id: `test-${Date.now()}`,
    title: 'Test Cellphone Notification',
    message: 'Mobile alerts are active! You will be alerted whenever an announcement or advisory is published by Barangay Zapatera.',
    isEmergency: false,
    category: 'Public Advisory',
    url: '/?tab=announcements',
  });

  return {
    success: true,
    systemNotified,
    permission: getNotificationPermissionStatus(),
  };
}
