// Resident/public/sw.js
// Service Worker for Barangay Zapatera Resident Mobile Push Notifications

const CACHE_NAME = 'zapatera-resident-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification events dispatched from server or push manager
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Barangay Zapatera Announcement',
        message: event.data.text() || 'New announcement published by Barangay Zapatera administration.',
      };
    }
  }

  const title = data.title || 'Barangay Zapatera Announcement';
  const options = {
    body: data.message || data.body || 'New announcement published by Barangay Zapatera administration.',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || `zapatera-announcement-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || '/?tab=announcements',
      announcementId: data.id,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'view', title: 'View Bulletin' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle message from client page to show a notification via service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        vibrate: [200, 100, 200, 100, 300],
        ...options,
      })
    );
  }
});

// Handle resident tapping the notification on their cellphone screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/?tab=announcements';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and notify it to open announcements
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'OPEN_ANNOUNCEMENT_TAB',
            announcementId: event.notification.data?.announcementId,
          });
          return client.focus();
        }
      }
      // If no window is currently open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
