# Suggestions

Review of the Math Notes application across security, bugs, performance,
accessibility, architecture, solidity and developer experience.

## Security — solid

- **No XSS**: user content is rendered exclusively via `textContent` and DOM
  creation; the only `innerHTML` use is clearing (`tabBarNode.innerHTML = ''`).
  No `eval` / `new Function` / `document.write`.
- `math.evaluate` is a sandboxed expression engine (no DOM/window access), and
  it runs in a **worker**, so a hostile expression can't freeze the UI
  (DoS-resilience win).
- External call is one HTTPS endpoint (`api.frankfurter.dev`), no keys, no user
  data sent.
- Service worker caches **same-origin only**; no secrets in the repo.
- **Minor**: no CSP header (defense-in-depth gap; the app is static, so risk is
  low). `registerRates` doesn't validate that each `perBase` is a finite number
  (a malicious API response could inject `Infinity`/`NaN` unit definitions).

## Bugs

1. **[High] `⇧⌘C` (copy) can suppress a pending render** — `js/index.js` shares
   one `latestId` counter between `update()` and the copy shortcut's
   `requestEvaluate`. If you copy while an evaluation is in flight, the copy
   bumps `latestId`, so the update's response (`id !== latestId`) is skipped and
   the ghost/total go stale until the next edit.
2. **[Medium] `nextTabNumber` is stale after recovery** — `restoreAll` /
   `restoreTab` (`js/ui/tabs.js`) rebuild tabs but leave `nextTabNumber` from
   the pre-recovery state, so a subsequent "new tab" can collide with a
   recovered "Tab 2".
3. **[Low] No timeout on the pending map** — if the worker ever dies,
   `update()` promises never resolve, leaving the sheet frozen with no error
   surfaced.
4. **[Low] Fallback path double-fetches currency** rates (once via
   `fetchRates()`, once via `calculate.js`'s `initCurrency` when the lazy
   fallback loads).

## Performance — already strong

All prior work is in place (worker, incremental eval/render, debounce,
single-pass find, cached formatter, reused line rows, `content-visibility`).
No meaningful remaining hot spots. Two micro-items:

- `js/ui/settings.js` re-imports the snapshots module on every modal open.
- The `scroll` listener in `js/index.js` is non-passive (harmless for scroll).

## Accessibility

- **Missing `aria-label`** on icon-only buttons: tab close (`×`) and tab new
  (`+`) use only `title`; find-bar buttons (`↑`, `↓`, `Aa`, `×`) use `title`
  too — `title` isn't reliably read by screen readers.
- **Tablist contract incomplete**: `role="tablist"` / `role="tab"` without
  `role="tabpanel"` / `aria-controls`; the line-number gutter isn't
  `aria-hidden`, so screen readers may announce every number.
- **No keyboard alternative for drag-to-reorder** tabs (only mouse/pointer).
- `user-scalable=no` disables pinch-zoom (WCAG 1.4.4).
- Ghost text contrast is intentionally faint (hint layer) — acceptable.

## Architecture — clean with some hot spots

Good separation (`core` / `eval` / `render` / `ui` / `storage`), pure logic
exported for tests, worker keeps mathjs off the main thread. Growth areas:

- `js/ui/tabs.js` (567 lines) now owns state, persistence, undo/redo, drag,
  snapshots, restore — cohesive but heavy.
- `js/ui/find.js` inlines the DOM text-walk/highlight algorithm; extractable.
- `js/index.js` is the composition root and does worker plumbing + debounce +
  currency events; could become a small `evalClient` module.
- Repeated debounce/persist patterns could share a tiny utility.

## Solidity

Strong guards everywhere (try/catch on `math.evaluate`, IndexedDB,
localStorage; worker error channel). Gaps:

- The pending-map timeout (bug 3 above).
- Worker evaluation errors just log and leave a stale view (no user-facing
  fallback).

## Developer experience

- Tests are fast, lint/format enforced in CI, README current, mathjs rebuild
  documented.
- **Gaps**:
  - `npm test` covers pure logic only — no automated coverage for the
    DOM-heavy behavior (find highlighting, drag reorder, undo, snapshots),
    which is verified only via throwaway browser scripts.
  - No `npm run dev` static server script.
  - ESLint's config doesn't match root-level `.mjs` files, so stray temp
    scripts break `npm run lint`.
