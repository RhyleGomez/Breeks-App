/* BREEKS POS — service worker (network-first)
   Always loads the latest deployed files when online.
   Falls back to the last cached copy only when offline.
   Bump CACHE when you want to force-clear old caches. */
const CACHE = 'breeks-app-2026-09-11';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // CDNs, is.gd, EmailJS → straight to network
  if (url.pathname.endsWith('service-worker.js')) return;

  const isPage = req.mode === 'navigate';
  if (isPage && !(url.pathname.endsWith('/') || url.pathname.endsWith('.html'))) return; // let GitHub redirects happen normally

  // cache key ignores ?sign=…&j=… so links don't bloat the cache
  const key = isPage ? url.origin + url.pathname : req;

  event.respondWith(
    fetch(isPage ? url.origin + url.pathname + url.search : req, isPage ? { cache: 'no-cache', credentials: 'same-origin' } : undefined)
      .then((res) => {
        if (isPage && res.redirected) return Response.redirect(res.url, 302);
        if (res && res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) => hit || caches.match(url.origin + '/Breeks-App/')))
  );
});
