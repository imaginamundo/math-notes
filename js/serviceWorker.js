const cacheName = 'math-notes-v24';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './core/aggregate.js',
  './eval/aliases.js',
  './core/calculate.js',
  './eval/cssUnits.js',
  './eval/currency.js',
  './eval/datetime.js',
  './evalClient.js',
  './render/format.js',
  './render/formatResult.js',
  './index.js',
  './storage/snapshots.js',
  './ui/find.js',
  './ui/io.js',
  './ui/lineNumbers.js',
  './ui/modal.js',
  './core/parseLine.js',
  './eval/percentage.js',
  './core/preprocess.js',
  './registerServiceWorker.js',
  './ui/examples.js',
  './ui/recipes.js',
  './ui/onboarding.js',
  './ui/settings.js',
  './ui/tour.js',
  './eval/scales.js',
  './eval/symbols.js',
  './eval/units.js',
  './util/debounce.js',
  './eval/wordOperators.js',
  './render/renderInput.js',
  './ui/shortcuts.js',
  './render/renderTotal.js',
  './ui/tabs.js',
  './ui/cosmetic.js',
  './ui/editor.js',
  './ui/help.js',
  './worker.js',
  './lib/math.bundle.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first with a cache fallback: always serve fresh assets when the
// server is reachable, falling back to the cached copy when offline.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
