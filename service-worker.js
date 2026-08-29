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

// Fetch: serve from cache, fall back to network — but ONLY for this app's own
// same-origin GET requests. Cross-origin calls (Google Apps Script, fonts,
// chrome-extension:// requests, etc.) are left completely untouched by not
// calling respondWith() at all, so the browser handles them exactly as if
// this service worker didn't exist. Intercepting those was breaking every
// call to the Google Apps Script backend (it involves a cross-origin
// redirect that does not survive being re-issued from inside a service
// worker) and was the real cause of every "Failed to fetch" cloud-save error.
self.addEventListener('fetch', e => {
  const reqUrl = e.request.url;
  let isSameOrigin = false;
  try { isSameOrigin = new URL(reqUrl).origin === self.location.origin; } catch (err) {}

  if (!isSameOrigin || e.request.method !== 'GET') {
    return; // let the browser handle it normally — no interception
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          if (reqUrl.includes('finance.html')) {
            return caches.match('/Breeks-App/finance.html');
          }
          return caches.match('/Breeks-App/index.html');
        }
        // Always return a real Response — returning undefined here is what
        // caused "Failed to convert value to 'Response'" crashes before.
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
