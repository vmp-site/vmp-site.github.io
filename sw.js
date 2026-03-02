const CACHE_NAME = 'work-manager-v15';
const APP_SHELL = [
  './',
  './index.html',
  './login-new.html',
  './sites.html',
  './site-profile.html',
  './workers.html',
  './worker-profile.html',
  './attendance-form.html',
  './payment-form.html',
  './received.html',
  './material-entry.html',
  './positions.html',
  './report.html',
  './profile.html',
  './style.css',
  './config.js',
  './app.js',
  './api.js',
  './calculations.js',
  './attendance-logic.js',
  './payment-logic.js',
  './material-logic.js',
  './received.js',
  './positions.js',
  './workers.js',
  './sites.js',
  './profile.js',
  './report.js',
  './site-profile.js',
  './worker-profile.js',
  './pdf-export.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/app-icon.svg',
  './icons/app-icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.includes('/exec') || requestUrl.searchParams.has('action')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
