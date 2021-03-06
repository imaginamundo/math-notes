const cacheName = 'v1';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './format.js',
  './index.js',
  './linesLoop.js',
  './printInputs.js',
  './printResults.js',
  './printTotal.js',
  './storeValues.js',
  './dom/cosmetic.js',
  './dom/help.js',
  './store/math.js',
  './store/results.js',
  './store/variables.js',
  './store/view.js',
  './lib/math.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request))
  );
});