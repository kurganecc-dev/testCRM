const CACHE_VERSION = 'v4';
const CACHE_NAME = `andromeda-static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/dist/styles.min.css',
  './assets/dist/app.bundle.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Не кэшируем Supabase/API/CDN-запросы
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML всегда пробуем брать свежий
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // CSS/JS/images: cache first, потом сеть
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;

        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));

        return response;
      });
    })
  );
});
