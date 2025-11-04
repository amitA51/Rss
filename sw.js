const CACHE_NAME = 'spark-pwa-v19'; // Incremented version
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install: Caches the app shell. NO LONGER SKIPS WAITING.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(APP_SHELL);
      })
      // self.skipWaiting() is removed to allow for update prompts.
  );
});

// Activate: Cleans up old caches and takes control of the page.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener to handle 'SKIP_WAITING' from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


// Fetch: Handles requests with a stale-while-revalidate strategy.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      const fetchPromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) { // Cache more liberally
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        if (!cachedResponse) throw err;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// --- PWA Features: Background Sync & Notifications ---

// Periodic Sync: Triggers roughly every 12 hours to re-engage the user.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'feed-sync') {
    console.log('Periodic sync event fired for feed-sync');
    event.waitUntil(
      self.registration.showNotification('Spark בודק עדכונים', {
        body: 'פתח את האפליקציה כדי לסנכרן את התוכן האחרון שלך.',
        icon: '/images/resized-image.png',
        tag: 'feed-sync-notification',
        actions: [
            { action: 'go_feed', title: 'פתח את הפיד' }
        ]
      })
    );
  }
});

// Push Notifications: Handles push messages from a server (if implemented).
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'התראה חדשה מ-Spark', body: 'יש לך תוכן חדש שמחכה.' };
  console.log('Push notification received', data);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/resized-image.png',
      tag: data.tag || 'spark-push-notification'
    })
  );
});

// Notification Click: Handles what happens when a user interacts with a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag, 'Action:', event.action);
  event.notification.close();

  const targetUrl = new URL(event.action === 'go_feed' ? '/?action=go_feed' : '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's an open window for this origin.
      let client = clientList.find(c => c.url.startsWith(self.location.origin) && 'focus' in c);

      if (client) {
        // If a client is found, navigate it to the target URL and focus it.
        if (client.navigate) {
          client.navigate(targetUrl);
        }
        return client.focus();
      } else {
        // If no client is found, open a new one.
        return clients.openWindow(targetUrl);
      }
    })
  );
});
