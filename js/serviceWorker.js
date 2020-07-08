const cacheName = 'v1';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './',
  './format.js',
  './index.js',
  './linesLoop.js',
  './printInputs.js',
  './PrintResults.js',
  './printTotal.js',
  './storeValues.js',
  './dom/cosmetic.js',
  './dom/help.js',
  './store/math.js',
  './store/results.js',
  './store/variables.js',
  './store/view.js',
  'https://cdn.pika.dev/mathjs@^7.0.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request)
    })
  )
})