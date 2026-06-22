const CACHE_NAME = 'nexin-v33-banner-final';
// index.html is NEVER cached — always fetched fresh so updates reach users immediately.
const CACHE_NAME = 'nexin-v33';
const STATIC_SHELL = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './wordmark-dark.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  // index.html: always network-first, no caching — ensures updates always land
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static shell assets: cache-first
  const isShell = STATIC_SHELL.some(s => url.pathname.endsWith(s.replace('./','')));
  if (url.origin === self.location.origin && isShell) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }))
    );
    return;
  }

  // Everything else (CDN images etc): network with cache fallback
  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
