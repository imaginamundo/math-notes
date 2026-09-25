// Served from the site root so its scope is `/` and it can cache the app shell
// and the documentation (a worker under /js/ could only control /js/).
const cacheName = 'math-notes-v40';
const urlsToCache = [
  './index.html',
  './style.css',
  './js/core/aggregate.js',
  './js/core/autocomplete.js',
  './js/core/calculate.js',
  './js/core/clockFormat.js',
  './js/core/currencySymbols.js',
  './js/core/decimalPrecision.js',
  './js/core/history.js',
  './js/core/identifiers.js',
  './js/core/language.js',
  './js/core/measurementSystem.js',
  './js/core/measures.js',
  './js/core/multiWordVariables.js',
  './js/core/parseLine.js',
  './js/core/preprocess.js',
  './js/core/tabsState.js',
  './js/core/totalMode.js',
  './js/core/unitMix.js',
  './js/core/unitNames.js',
  './js/core/vocabulary.js',
  './js/eval/aliases.js',
  './js/eval/calendar.js',
  './js/eval/cssUnits.js',
  './js/eval/currency.js',
  './js/eval/datetime.js',
  './js/eval/measures.js',
  './js/eval/percentage.js',
  './js/eval/rates.js',
  './js/eval/rounding.js',
  './js/eval/scales.js',
  './js/eval/symbols.js',
  './js/eval/timespan.js',
  './js/eval/units.js',
  './js/eval/wordOperators.js',
  './js/evalClient.js',
  './js/i18n/examples/en.js',
  './js/i18n/examples/es.js',
  './js/i18n/examples/pt.js',
  './js/i18n/index.js',
  './js/i18n/ui/en.js',
  './js/i18n/ui/es.js',
  './js/i18n/ui/pt.js',
  './js/index.js',
  './js/lib/math.bundle.min.js',
  './js/registerServiceWorker.js',
  './js/render/exampleText.js',
  './js/render/format.js',
  './js/render/formatResult.js',
  './js/render/marks.js',
  './js/render/renderInput.js',
  './js/render/renderTotal.js',
  './js/share/shareLink.js',
  './js/storage/snapshots.js',
  './js/storage/tabsStore.js',
  './js/ui/autocomplete.js',
  './js/ui/cosmetic.js',
  './js/ui/docsLink.js',
  './js/ui/editor.js',
  './js/ui/editorInput.js',
  './js/ui/examples.js',
  './js/ui/find.js',
  './js/ui/goToLine.js',
  './js/ui/indent.js',
  './js/ui/io.js',
  './js/ui/lineNumbers.js',
  './js/ui/loading.js',
  './js/ui/modal.js',
  './js/ui/onboarding.js',
  './js/ui/recipes.js',
  './js/ui/settings.js',
  './js/ui/share.js',
  './js/ui/shortcuts.js',
  './js/ui/starterPrompt.js',
  './js/ui/tabs.js',
  './js/ui/tabsHistory.js',
  './js/ui/tabsView.js',
  './js/ui/totalModeControl.js',
  './js/util/clipboard.js',
  './js/util/compress.js',
  './js/util/debounce.js',
  './js/util/scroll.js',
  './js/util/sequence.js',
  './js/util/storage.js',
  './js/util/text.js',
  './js/worker.js',
];

self.addEventListener('install', (event) => {
  // Add each asset on its own so one failure (a transient network error) cannot
  // abort the whole install and leave the app without an offline shell.
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => Promise.allSettled(urlsToCache.map((url) => cache.add(url))))
  );
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
