# Architecture

This document explains how Math Notes works and why. It is the reference for
the invariants listed in `AGENTS.md`; read it before changing editor,
evaluation, or persistence code.

## The editor: a transparent textarea over a ghost layer

The editor is built from two overlaid layers inside a scroll container:

- `.content-editable` — a real, transparent `<textarea>`. It owns the caret
  and text selection.
- `.view` — a `<pre>` that renders the same text with syntax highlighting. It
  sits _behind_ the textarea (`z-index: 0`), and because the textarea's text is
  `transparent`, the styled copy is what the user actually sees.

Both layers are cells in a `max-content` grid (`.editor-content`) inside
`.editor-scroll`, which is the scroll container. Because the layers move
together inside it, no scroll mirroring is needed; and because the view may be
wider than the textarea — its `.ghost-result` text extends past the line — the
result is **real scrollable content**: scrolling to the end of a long line
reveals it.

The grid tracks are `minmax(max-content, 1fr)`, and `js/ui/editor.js` sizes the
textarea to `max(scrollHeight, scroller.clientHeight)` (and likewise for
width). So for a short sheet the layers stretch to fill the whole editor area —
a tap anywhere raises the keyboard on iOS — while for a long sheet they keep
growing with the content, and the ghost results stay scrollable.

The textarea no longer scrolls natively, so the caret is kept in view by
`js/ui/editor.js`, which computes the caret position from monospace column/line
math and scrolls `.editor-scroll` on input, clicks and selection changes.

Both layers must share **identical metrics** — font, font-size, line-height,
padding, and `white-space: pre` — or the ghost text drifts from the caret.

### Line rows

The view is a sequence of `.line-row` block wrappers (one per line), each
containing the highlighted `.line` span and an optional `.ghost-result`. Rows
are `width: max-content` so the view (and therefore the scrollable extent)
spans the line plus its result. There are no `<br>` separators; each row is
exactly one `1.65em` line.

### End-of-line padding

The textarea's own scroll range would exclude right padding, but here the
wrapper scrolls the full content box, so `padding-right` on the layers counts
toward the scrollable extent and gives breathing room after long lines.

## Evaluation

### Preprocessing

Each line goes through `preprocess` (`js/core/preprocess.js`) before mathjs:
`scales` → `symbols` → `percentage` → `wordOperators`, in that order (scales
before currency so `$2k` becomes `2000 USD`; percentage before word operators
so its `of|on|off` phrases are consumed first). `js/eval/symbols.js` only
treats 3-letter currency codes as units in currency contexts (amounts and
`to`/`in` conversions), so `usd = 5` stays a variable.

### The pure engine

`evaluateLines(lines)` in `js/core/calculate.js` is the pure evaluation
pipeline: it parses each line, evaluates it against a `variables` scope (with
`prev` and aggregate blocks), and returns `{ results, total, startLine }`.

It keeps a module-level cache of the last input and its per-line results.
When called with new input, it diffs to the first changed line, rebuilds the
variable/aggregate context up to that line from cached values, and only
re-evaluates from there. **Invariant:** results must stay correct across any
sequence of interleaved calls (the cache is global, not per caller).

### The worker

Evaluation runs in a Web Worker (`js/worker.js`) so a heavy sheet never blocks
typing, and the main thread never parses the large mathjs bundle. The worker
client lives in `js/evalClient.js`: it owns the worker connection, the
request/reply protocol, and the debounced `schedule`/`flush` update scheduling.
Each request posts `{ id, type: 'evaluate', lines }` and resolves when the
worker replies. `update()` gates rendering on a dedicated render counter (not
the message id), so a stale response is never rendered and unrelated requests
(e.g. copy) never suppress a pending render. Every request also has a timeout
so a dead worker can't freeze the sheet.

**Serialization:** mathjs `Unit`, `BigNumber`, etc. lose their prototypes in
structured clone. The worker therefore pre-formats every result value into a
string before posting. `renderInput` must accept both numbers (main-thread
fallback path) and strings (worker path).

Currency rates are fetched on the main thread (`fetchRates` in
`js/eval/currency.js`), cached in localStorage, and forwarded to the worker as
`{ type: 'rates', data }`; the worker registers them on its own math instance.
A lazy main-thread `calculate.js` import is the fallback when `Worker` is
unavailable.

## Tabs and persistence

Per-tab state is a single object `{ tabs, activeId, nextTabNumber }` held in
`js/ui/tabs.js`. Current content persists to localStorage (debounced).
Separately, versioned **snapshots** of each tab (id, name, content, timestamp,
capped at 10 per tab) are auto-saved to IndexedDB (`js/storage/snapshots.js`)
on a pause in typing and on blur/tab-switch/close/pagehide.

If localStorage is unavailable or corrupt on load, the tab collection is
rebuilt automatically from the latest snapshot of each tab. Settings offers
manual per-tab restore and a "restore all" action.

Undo/redo is per tab, kept in memory only: edits are grouped into bursts
(a 700ms idle timer commits the draft), each burst becoming one undo step.

## Sharing a sheet by link

`js/share/shareLink.js` is a pure module that packs the **active** sheet into a
URL and back out again. `js/ui/share.js` wires the button and the incoming
import; `js/util/clipboard.js` holds the clipboard write both it and
`js/ui/shortcuts.js` use.

The sheet goes in `location.hash`, deliberately, not in a query string. A
fragment is never sent to the server, so the sheet does not reach GitHub Pages
access logs and is not forwarded in a `Referer` header — someone's salary maths
should not end up in a log file. It also leaves the service worker's cache keys
alone, since the fragment is not part of the request URL.

The wire format is `#s=<version>.<base64url>`:

| Version | Payload                               | When                            |
| ------- | ------------------------------------- | ------------------------------- |
| `1`     | `deflate` of `{"n":name,"c":content}` | normal path                     |
| `0`     | the same JSON, uncompressed           | `CompressionStream` unavailable |

The version tag lets a future format change be rejected cleanly instead of
decoding to garbage. `deflate` rather than `deflate-raw` for portability, at a
cost of about six bytes. base64url rather than base64 so `+ / =` never need
percent-encoding.

Two guardrails, because the decoder is fed by strangers:

- **inflate cap** — decoding stops and returns `null` once a payload passes
  256 KB, so a zip bomb is abandoned mid-stream rather than materialised.
- **long-link warning** — a URL over 8000 characters is still copied, but the
  status says some chat clients may truncate it.

Every failure path in `shareLink.js` returns `null`; none throw.

Importing is **additive and confirmed**: an incoming sheet prompts by name and
then opens in a _new_ tab via `tabsApi.openSheet`, never overwriting the active
one. The fragment is stripped with `history.replaceState` either way, so a
refresh cannot re-import a duplicate and a link that failed to decode does not
re-prompt.

Imported content only ever reaches the DOM as `textarea.value`, never as
`innerHTML`, so a hostile payload is inert text.

## Find & replace

`js/ui/find.js` opens a floating bar. Matches are computed against the raw
sheet text (`computeMatches`), then wrapped as `<mark class="find-match">`
elements in the ghost view. `textNodesInOrder` walks the view's text nodes and
counts `.line-row` boundaries as newlines, so global offsets in the raw text
map correctly onto the DOM (the `<pre>` has no text for newlines). Wrapping
runs in a single pass from the last match backwards so DOM mutations only
touch already-processed text. Because a `content-visibility`-skipped row has no
layout, scrolling to a match anchors on the `.line-row` box.

## Rendering

- `renderInput` (`js/render/renderInput.js`) rebuilds only the rows from the
  first changed line (incremental), reusing the prefix DOM.
- `format` (`js/render/format.js`) tokenizes a line into typed spans
  (number, variable, currency, operator, comment, title).
- `formatResult` (`js/render/formatResult.js`) formats numbers/units into
  display strings (its `Intl.NumberFormat` is cached).
- `renderTotal` shows the running total; `aria-live` announces it.

## Line numbers

A `.line-numbers` gutter (`js/ui/lineNumbers.js`) numbers every line (plus one
phantom row for the next Enter), follows the caret, and scrolls in sync with
the textarea. It is `aria-hidden`.

## Accessibility notes

- The view and line gutter are `aria-hidden`; the textarea is the accessible
  input.
- The tabs implement the ARIA tabs pattern (`role="tab"` /
  `role="tabpanel"` with `aria-controls` and `aria-labelledby`).
- Icon-only buttons carry `aria-label`s (a `title` is not reliably read).
