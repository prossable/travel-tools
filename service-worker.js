const CACHE = 'travel-tools-1.8';

const ASSETS = [
    '/travel-tools/',
    '/travel-tools/index.htm',
    '/travel-tools/styles.css',
    '/travel-tools/script.js',
    '/travel-tools/site.webmanifest',
    '/travel-tools/favicon.ico',
    '/travel-tools/favicon-16x16.png',
    '/travel-tools/favicon-32x32.png',
    '/travel-tools/apple-touch-icon.png',
    '/travel-tools/android-chrome-192x192.png',
    '/travel-tools/android-chrome-512x512.png',
    '/travel-tools/android-chrome-maskable-512x512.png',
    '/travel-tools/roboto-mono-v31-latin-regular.woff2'
];

// install — cache all assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// activate — delete old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// fetch — network first, fall back to cache
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .catch(() => caches.match(e.request))
    );
});