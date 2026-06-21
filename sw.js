const CACHE = 'paints-portfolio-v1';
const CORE = [
  './paintpaintnosaumus.html',
  './manifest.json',
  './icon.svg',
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
];

// Install: cache core files + CDN
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        cache.addAll(CORE),
        ...CDN.map(url => fetch(url).then(r => cache.put(url, r)).catch(() => {})),
      ])
    ).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for core & CDN, network-first for everything else
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Only handle GET
  if (e.request.method !== 'GET') return;

  // Cache-first for core HTML, manifest, icon, Chart.js CDN
  const isCacheable = CORE.some(f => url.endsWith(f.replace('./',''))) ||
                      CDN.some(c => url.startsWith(c));

  if (isCacheable) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first for Yahoo Finance API (live prices) — fall back to nothing
  if (url.includes('finance.yahoo.com') || url.includes('corsproxy.io') || url.includes('allorigins.win')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Default: network with cache fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
