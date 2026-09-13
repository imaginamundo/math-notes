const cacheName = 'math-notes-v34';
const urlsToCache = [
  '../index.html',
  '../style.css',
  './core/aggregate.js',
  './core/autocomplete.js',
  './core/clockFormat.js',
  './core/language.js',
  './i18n/index.js',
  './i18n/ui/en.js',
  './i18n/ui/pt.js',
  './i18n/ui/es.js',
  './core/vocabulary.js',
  './eval/aliases.js',
  './core/calculate.js',
  './eval/cssUnits.js',
  './eval/currency.js',
  './eval/datetime.js',
  './evalClient.js',
  './ui/autocomplete.js',
  './render/format.js',
  './render/formatResult.js',
  './index.js',
  './storage/snapshots.js',
  './storage/tabsStore.js',
  './ui/find.js',
  './ui/io.js',
  './ui/lineNumbers.js',
  './ui/loading.js',
  './ui/modal.js',
  './core/parseLine.js',
  './eval/percentage.js',
  './core/preprocess.js',
  './registerServiceWorker.js',
  './ui/examples.js',
  './ui/recipes.js',
  './ui/onboarding.js',
  './ui/settings.js',
  './share/shareLink.js',
  './ui/share.js',
  './ui/starterPrompt.js',
  './util/clipboard.js',
  './util/compress.js',
  './eval/scales.js',
  './eval/symbols.js',
  './eval/units.js',
  './util/debounce.js',
  './eval/wordOperators.js',
  './render/renderInput.js',
  './ui/shortcuts.js',
  './render/renderTotal.js',
  './ui/tabs.js',
  './ui/tabsHistory.js',
  './ui/tabsView.js',
  './ui/cosmetic.js',
  './ui/editor.js',
  './ui/help.js',
  './ui/helpContent.js',
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

// Stale-while-revalidate for same-origin GETs: a cached asset answers
// immediately (so repeat loads are instant and offline works), while a
// background fetch refreshes the copy for next time. Uncached requests wait on
// the network and are cached on success.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      if (cached) {
        // Keep the worker alive until the revalidation settles, but do not make
        // the page wait on it.
        event.waitUntil(network.catch(() => {}));
        return cached;
      }
      return network;
    })
  );
});
