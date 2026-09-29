// Served from the site root so its scope is `/` and it can cache the app shell
// and the documentation (a worker under /js/ could only control /js/).
const cacheName = 'math-notes-v43';
const APP_SHELL = './index.html';
const urlsToCache = [
  './',
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
  './js/core/setting.js',
  './js/core/tabsState.js',
  './js/core/totalMode.js',
  './js/core/unitMix.js',
  './js/core/unitNames.js',
  './js/core/userUnits.js',
  './js/core/vocabulary.js',
  './js/eval/aliases.js',
  './js/eval/calendar.js',
  './js/eval/calendarArithmetic.js',
  './js/eval/calendarDate.js',
  './js/eval/calendarFormat.js',
  './js/eval/calendarGrammar.js',
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
  './js/eval/userUnits.js',
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
  './js/storage/currencyRates.js',
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
  './js/ui/tabTemplates.js',
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
  // Fail the install if any asset is missing: a half-cached version could mix
  // new and old modules. The browser retries the install on the next visit.
  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch((error) => {
            throw new Error(`Precache failed for ${url}: ${error && error.message}`);
          })
        )
      )
    )
  );
  // Deliberately no skipWaiting(): a new version waits until every tab closes,
  // so an open page keeps one consistent set of modules instead of loading new
  // ones mid-session.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
      )
  );
});

// Cache-first for same-origin GETs: a version's modules are immutable until the
// next service worker install, so a session never mixes versions. Uncached
// requests go to the network and are cached on success.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(cacheName).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          // A navigation offline must show the app shell, not the browser error.
          request.mode === 'navigate'
            ? caches.match(APP_SHELL).then((shell) => shell || Response.error())
            : Response.error()
        );
    })
  );
});
