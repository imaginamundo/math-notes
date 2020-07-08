const cacheName = 'v1';
const urlsToCache = [
  '/index.html',
  '/style.css',
  '/js/',
  '/js/format.js',
  '/js/index.js',
  '/js/linesLoop.js',
  '/js/printInputs.js',
  '/js/PrintResults.js',
  '/js/printTotal.js',
  '/js/storeValues.js',
  '/js/dom/cosmetic.js',
  '/js/dom/help.js',
  '/js/store/math.js',
  '/js/store/results.js',
  '/js/store/variables.js',
  '/js/store/view.js',
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