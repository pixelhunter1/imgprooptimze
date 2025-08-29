// Version will be injected at build time
const APP_VERSION = '1.0.2'; // This will be replaced during build
const BUILD_HASH = '31432e18'; // This will be replaced during build
const CACHE_NAME = `image-optimizer-v${APP_VERSION}-${BUILD_HASH}`;
const STATIC_CACHE_NAME = `image-optimizer-static-v${APP_VERSION}-${BUILD_HASH}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app-icon.svg',
  '/version.json',
  // Dynamic assets will be cached as they're requested
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`Service Worker installing... Version: ${APP_VERSION}, Hash: ${BUILD_HASH}`);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        // Skip waiting to activate immediately for updates
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Service Worker activating... Version: ${APP_VERSION}, Hash: ${BUILD_HASH}`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete all caches that don't match current version
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated and old caches cleared');
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: APP_VERSION,
              buildHash: BUILD_HASH
            });
          });
        });
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Special handling for version.json - always fetch fresh
  if (event.request.url.includes('/version.json')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).catch(() => {
        // Fallback to cached version if network fails
        return caches.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // For HTML requests, always try network first to get updates
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                // Cache the new version
                const responseToCache = response.clone();
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
                return response;
              }
              return cachedResponse || response;
            })
            .catch(() => {
              // Network failed, serve from cache
              return cachedResponse || caches.match('/');
            });
        }

        // For other resources, serve from cache first
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);

            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }

            throw error;
          });
      })
  );
});

// Message handling for update commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      buildHash: BUILD_HASH,
      cacheName: CACHE_NAME
    });
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Handle background sync tasks here
      Promise.resolve()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Image optimization complete!',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Results',
        icon: '/app-icon.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/app-icon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Image Optimizer Pro', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
