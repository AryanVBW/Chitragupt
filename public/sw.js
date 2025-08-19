// Service Worker for Push Notifications
const CACHE_NAME = 'chitragupt-notifications-v1';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/security-icon.png',
  '/system-icon.png',
  '/user-icon.png',
  '/broadcast-icon.png',
  '/test-icon.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache.map(url => {
          // Handle potential cache failures gracefully
          return fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
            console.warn(`Failed to cache ${url}:`, response.status);
          }).catch(error => {
            console.warn(`Failed to fetch ${url}:`, error);
          });
        }));
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  let notificationData = {
    title: 'Chitragupt Security System',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    data: {},
    requireInteraction: false,
    actions: []
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Service Worker: Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Add timestamp and unique ID
  const notificationId = `sw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  notificationData.data = {
    ...notificationData.data,
    notificationId,
    timestamp: Date.now()
  };

  // Define notification actions based on type
  const notificationActions = getNotificationActions(notificationData.data.type, notificationData.data.severity);
  if (notificationActions.length > 0) {
    notificationData.actions = notificationActions;
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      silent: notificationData.silent || false,
      timestamp: Date.now(),
      vibrate: getVibrationPattern(notificationData.data.severity)
    }).then(() => {
      console.log('Service Worker: Notification shown successfully');
      // Send message to client about successful notification
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'notification-shown',
            notificationId,
            data: notificationData.data
          });
        });
      });
    }).catch(error => {
      console.error('Service Worker: Error showing notification:', error);
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Handle different actions
  event.waitUntil(
    handleNotificationClick(action, data).then(() => {
      // Send message to client about notification click
      return self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          // Focus existing client
          const client = clients[0];
          client.focus();
          client.postMessage({
            type: 'notification-click',
            notificationId: data.notificationId,
            action: action,
            data: data
          });
        } else {
          // Open new client
          return self.clients.openWindow('/');
        }
      });
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
  
  const notification = event.notification;
  const data = notification.data || {};
  
  // Send message to client about notification close
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'notification-close',
          notificationId: data.notificationId,
          data: data
        });
      });
    })
  );
});

// Fetch event - serve cached resources when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Return a fallback response for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Helper function to get notification actions based on type and severity
function getNotificationActions(type, severity) {
  const actions = [];
  
  switch (type) {
    case 'security':
      actions.push(
        { action: 'view-details', title: '🔍 View Details', icon: '/security-icon.png' },
        { action: 'dismiss', title: '✖️ Dismiss', icon: '/dismiss-icon.png' }
      );
      if (severity === 'critical' || severity === 'high') {
        actions.unshift({ action: 'emergency', title: '🚨 Emergency Response', icon: '/emergency-icon.png' });
      }
      break;
      
    case 'system':
      actions.push(
        { action: 'view-status', title: '📊 View Status', icon: '/system-icon.png' },
        { action: 'dismiss', title: '✖️ Dismiss', icon: '/dismiss-icon.png' }
      );
      break;
      
    case 'user':
      actions.push(
        { action: 'view-profile', title: '👤 View Profile', icon: '/user-icon.png' },
        { action: 'dismiss', title: '✖️ Dismiss', icon: '/dismiss-icon.png' }
      );
      break;
      
    case 'broadcast':
      actions.push(
        { action: 'acknowledge', title: '✅ Acknowledge', icon: '/check-icon.png' },
        { action: 'view-details', title: '📋 View Details', icon: '/details-icon.png' }
      );
      break;
      
    default:
      actions.push(
        { action: 'open-app', title: '🔗 Open App', icon: '/favicon.ico' },
        { action: 'dismiss', title: '✖️ Dismiss', icon: '/dismiss-icon.png' }
      );
  }
  
  // Limit to 2 actions (browser limitation)
  return actions.slice(0, 2);
}

// Helper function to get vibration pattern based on severity
function getVibrationPattern(severity) {
  switch (severity) {
    case 'critical':
      return [200, 100, 200, 100, 200]; // Urgent pattern
    case 'high':
      return [150, 100, 150]; // Important pattern
    case 'medium':
      return [100, 50, 100]; // Standard pattern
    case 'low':
    default:
      return [50]; // Gentle pattern
  }
}

// Helper function to handle notification click actions
async function handleNotificationClick(action, data) {
  console.log('Service Worker: Handling notification action:', action, data);
  
  switch (action) {
    case 'emergency':
      // Handle emergency response
      console.log('Service Worker: Emergency response triggered');
      break;
      
    case 'view-details':
    case 'view-status':
    case 'view-profile':
      // These will be handled by the main app
      console.log('Service Worker: View action triggered:', action);
      break;
      
    case 'acknowledge':
      // Mark as acknowledged
      console.log('Service Worker: Broadcast acknowledged');
      break;
      
    case 'dismiss':
      // Just dismiss (already closed)
      console.log('Service Worker: Notification dismissed');
      break;
      
    case 'open-app':
    default:
      // Default action - open app
      console.log('Service Worker: Opening app');
      break;
  }
}

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      syncPendingNotifications()
    );
  }
});

// Helper function to sync pending notifications
async function syncPendingNotifications() {
  try {
    // This would typically sync with your backend
    console.log('Service Worker: Syncing pending notifications');
    
    // Send message to client about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-complete',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Service Worker: Error syncing notifications:', error);
  }
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'skip-waiting':
      self.skipWaiting();
      break;
      
    case 'claim-clients':
      self.clients.claim();
      break;
      
    case 'clear-cache':
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          console.log('Service Worker: Cache cleared');
        })
      );
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

console.log('Service Worker: Script loaded and ready');