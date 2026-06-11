// ============================================================
// Mutafidz PRO — Service Worker
// Strategy B: Decoupled PWA (GAS sebagai REST API)
// ============================================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_STATIC  = `mutafidz-static-${CACHE_VERSION}`;
const CACHE_API     = `mutafidz-api-${CACHE_VERSION}`;
const CACHE_CDN     = `mutafidz-cdn-${CACHE_VERSION}`;

// Aset lokal yang selalu dicache saat install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// CDN yang dicache (Bootstrap, FA, Tom Select, dsb.)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/css/tom-select.bootstrap5.min.css',
  'https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/js/tom-select.complete.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@300;400;600&display=swap',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(CACHE_CDN).then(cache =>
        Promise.allSettled(CDN_ASSETS.map(url =>
          fetch(url, { mode: 'no-cors' }).then(res => cache.put(url, res)).catch(() => {})
        ))
      )
    ])
  );
  self.skipWaiting();
});

// ── ACTIVATE (hapus cache lama) ───────────────────────────────
self.addEventListener('activate', event => {
  const VALID = [CACHE_STATIC, CACHE_API, CACHE_CDN];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH STRATEGY ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { url, method } = event.request;
  const urlObj = new URL(url);

  // 1. GAS API calls — Network First, fallback ke cache
  if (
    urlObj.hostname.includes('script.google.com') ||
    urlObj.hostname.includes('script.googleusercontent.com')
  ) {
    if (method !== 'GET') return; // POST/PUT langsung ke network
    event.respondWith(
      fetch(event.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_API).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. Al-Quran API — Network First, fallback cache
  if (urlObj.hostname.includes('api.alquran.cloud')) {
    event.respondWith(
      fetch(event.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_API).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. CDN (Bootstrap, FA, dll) — Cache First
  if (
    urlObj.hostname.includes('cdn.jsdelivr.net') ||
    urlObj.hostname.includes('cdnjs.cloudflare.com') ||
    urlObj.hostname.includes('fonts.googleapis.com') ||
    urlObj.hostname.includes('fonts.gstatic.com') ||
    urlObj.hostname.includes('cdn-icons-png.flaticon.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_CDN).then(c => c.put(event.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // 4. Aset lokal — Cache First
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});

// ── MESSAGE: force refresh cache ─────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_API_CACHE') {
    caches.delete(CACHE_API).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
});
