const CACHE = 'nexin-v34';
const SHELL = ['./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./wordmark-dark.png','./favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // index.html — never cache, always network
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || req.destination === 'document') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Shell assets — cache first
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  // CDN images — network with cache fallback
  e.respondWith(fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req)));
});
