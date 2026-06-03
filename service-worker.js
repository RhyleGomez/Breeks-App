const CACHE_NAME = 'breeks-app-v2';
const ASSETS = [
  '/Breeks-App/',
  '/Breeks-App/index.html',
  '/Breeks-App/finance.html',
  '/Breeks-App/manifest.json',
  '/Breeks-App/finance-manifest.json',
  '/Breeks-App/icons/icon-192.png',
  '/Breeks-App/icons/icon-512.png'
];

// Install: cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (e.request.method === 'GET' && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          // Return the correct offline page based on which app was requested
          const url = e.request.url;
          if (url.includes('finance.html')) {
            return caches.match('/Breeks-App/finance.html');
          }
          return caches.match('/Breeks-App/index.html');
        }
      });
    })
  );
});
