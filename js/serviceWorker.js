const cacheName = 'math-notes-v13';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './aliases.js',
  './calculate.js',
  './cssUnits.js',
  './currency.js',
  './format.js',
  './formatResult.js',
  './index.js',
  './io.js',
  './modal.js',
  './parseLine.js',
  './preprocess.js',
  './scales.js',
  './wordOperators.js',
  './renderInput.js',
  './renderResults.js',
  './shortcuts.js',
  './renderTotal.js',
  './tabs.js',
  './dom/cosmetic.js',
  './dom/help.js',
  './lib/math.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== cacheName).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first with a cache fallback: always serve fresh assets when the
// server is reachable, falling back to the cached copy when offline.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(cacheName).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
