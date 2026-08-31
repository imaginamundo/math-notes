const cacheName = 'math-notes-v7';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './calculate.js',
  './format.js',
  './index.js',
  './parseLine.js',
  './renderInput.js',
  './renderResults.js',
  './renderTotal.js',
  './dom/cosmetic.js',
  './dom/help.js',
  './lib/math.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(urlsToCache))
  );
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

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(cacheName).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request))
  );
});