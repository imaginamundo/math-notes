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
layers from the measured content extent — longest line × glyph width and line
count × line height, plus padding — only pinning an explicit pixel size once
the content is wider or taller than the scroll container. So for a short sheet
the layers stretch to fill the whole editor area — a tap anywhere raises the
keyboard on iOS — while for a long sheet they keep growing with the content,
and the ghost results stay scrollable.

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
`measures` → `scales` → `symbols` → `percentage` → `wordOperators` → `rates` →
`rounding`, in that order (measures first so a scale-like subject such as
`4k video` is recognised before `scales` rewrites it; scales before currency so
`$2k` becomes `2000 USD`; percentage before word operators so its `of|on|off`
phrases are consumed first; rounding last, so it wraps the normalised value).
`js/eval/symbols.js` only treats 3-letter currency codes as units in currency
contexts (amounts and `to`/`in` conversions), so `usd = 5` stays a variable. A
currency code written before its amount is flipped so the amount leads
(`BRL 360 / 30 days` → `360 BRL / 30 days`), which mathjs reads as the rate
`BRL/day` rather than `BRL * days`.

### Measures and rates

`js/core/measures.js` holds the pure data: unit dimensions (mass, volume,
time, data, energy, distance), optional default factors, and the volume-unit
definitions per measurement system. `js/eval/measures.js` matches
`<value> <subject> in|to <target>` where the subject is **free-form** — no
dataset is required. It rewrites to `__measure(value, factor, target)`, and the
helper tries the value against the target directly (same dimension) and then
the factor both ways, so `300g butter in cups` and `10 cups olive oil in grams`
both work. A known subject uses its `DEFAULT_FACTORS` factor — cooking and
material densities, fuel energy densities (`1 l petrol in kWh`) and media
bitrates (`2 hours 4k video in GB`) — while any other label (`300g feathers in
cups`, or none at all: `300g in cups`) falls back to `DEFAULT_DENSITY` (water).
With no subject, only differing dimensions are taken over, so ordinary
conversions stay with mathjs.

`js/eval/rates.js` translates rate phrasing to the compound units mathjs
already understands: `per`/`a`/`an` → `/`, `for a year` → `* 1 year`, `X at R`
→ `__rate(X, R)` (whichever of `X*R` / `X/R` simplifies to fewer unit factors),
`time to upload X at R` → `X / R`, and `D in T` → `__pace` (time/distance,
formatted as `mm:ss/km`). `formatResult` simplifies compound units before
display, so `30 hours at 10 km/hour` shows `300 km`, not `(hours km)/hour`.

Currencies are units too. `formatResult` writes a single currency amount with
its symbol from `CURRENCY_DISPLAY` in `js/core/currencySymbols.js`
(`350usd` → `US$ 350`), keeping the sign in front (`-US$ 50`), and reads a
currency rate as a phrase (`100 USD/hour` → `US$ 100 per hour`,
`BRL/day` → `R$ 12 per day`). The currency is read from the original unit before
`unit.simplify()`, which would otherwise fold it into whichever currency mathjs
made the base; a compound that reduces to a currency (`2h * prev` where `prev`
is a rate) is read back in the currency that was written. Currencies with no
distinct symbol (CHF, ZAR, the Nordic krona) keep their ISO code so a result can
always be typed back in; `CURRENCY_SYMBOLS` is the input map the same file
supplies to `js/eval/symbols.js` and the highlighter.

`js/eval/timespan.js` handles durations. Consecutive time components are joined
with `+` (mathjs would multiply them) and `m` means minutes, so `3h 5m 10s`
evaluates as a timespan. A line that is only a timespan, `X as timespan`, and
`X in <unit> and <unit>` mark the result (a `timespan` property on the Unit) so
`formatResult` draws it as components; a duration in minutes/hours is drawn as
components too, while seconds/days keep the unit that was asked for (`2h to s`
stays `7,200 s`). `as` is accepted as a conversion alias for `to`/`in`
(`... as minutes`), and such an explicit conversion marks the Unit
(`__keepUnit`) so it keeps the requested unit instead of being drawn as a
timespan. The value stays a real Unit, so it survives arithmetic
(`line(4) + 1h`). To read the duration in seconds, `formatResult` inspects the
unit keys and `.value` (base SI) instead of calling `.to('s')` /
`.toNumber('s')`, which would change mathjs's preferred unit for later results
(typing `as` mid-word once made every later duration read in attoseconds).

`js/eval/calendar.js` handles dates. `preprocessCalendar` recognises date
literals (`10 June`, `2019-04-01`, `12/02/1988`), `today`/`now`/`yesterday`/
`tomorrow`, fixed-date holidays, and the operations around them (add/subtract a
duration, `N units after/before`, `N days from now`/`ago`, intervals, `days
until/since/between`, date parts, and `as <pattern>`), rewriting each to a
`__date*` helper since mathjs has no date type. Dates are JS Date objects at
local noon (so DST never shifts a day); `formatResult` renders a date as
`D Month [YYYY]` (the year is omitted when it is the current one) and an
interval as `3 weeks 5 days`. Workdays/weekdays are Monday–Friday, counted or
advanced by `countWorkdays`/`addWorkdays` (public holidays are not modelled
yet); `work hours` assume an eight-hour workday, and a `workday` unit (8 h) lets
`55h in workdays` convert.

The measurement system (`js/core/measurementSystem.js`) stores the preference
(metric by default, US customary or Imperial; all three define a cup) and
re-registers the volume units. Switching it dispatches `measurement:updated`;
`js/index.js` forwards the choice to the worker and the main-thread fallback,
and the engine bumps its environment revision so cached results recompute.

Rounding phrases (`1/3 to 2 dp`, `5.5 rounded up`, `37 to nearest 10`) are
rewritten to mathjs `round`/`ceil`/`floor` by `js/eval/rounding.js`, whose
`initRounding` extends those three with a Unit overload (mathjs's own wants a
valueless unit): the unit's displayed value is rounded and rebuilt, so
`round(4.567 m, 2)` is `4.57 m`. `to nearest 16th` builds a mathjs Fraction,
which `formatResult` renders as `n/d`.

### The pure engine

Evaluation is built by `createEngine()` in `js/core/calculate.js`, which wires
up one mathjs instance (aliases, CSS/currency units) together with the
incremental cache. A lazy shared instance is exported as the module's
`evaluateLines`, so importing the module never constructs the mathjs bundle and
tests or embedders can build isolated engines.

`evaluateLines(lines)` parses each line, evaluates it against a `variables`
scope (with `prev` and aggregate blocks), and returns
`{ results, total, startLine }`. Each engine keeps a per-input cache of the
last lines and their per-line results. When called with new input, it diffs to
the first changed line, rebuilds the variable/aggregate context up to that line
from cached values, and only re-evaluates from there. **Invariant:** results
must stay correct across any sequence of interleaved calls (the cache is not
per caller). Registering new currency rates bumps an _environment revision_
that forces a full recompute, so cached conversions never go stale.

A small structural pass (`findGroups`) pairs header lines (`Name:` with no
expression) with `end` rows. A closed group's **header** row becomes an
aggregate result holding the group subtotal (so it is shaded and never double
counts), the `end` row stays inert, and aggregates inside the group use the
group start instead of the last blank line. Because the header depends on the
lines below it, a change inside a group (or removing its `end`) invalidates the
header. Groups are flat and annotation-only: inner lines still feed the running
total, and an `end` with no open header is reported as an error rather than an
unknown symbol.

### Annotations and references

Three features let a line refer to other lines without becoming arithmetic of
their own:

- **Tags** (`#word`, no space) label a value row. A request line — `#word`, or
  `sum`/`total`/`average`/`avg` optionally followed by `of` and the tag —
  aggregates every row above carrying one of the requested tags, using the same
  unit rules as the total. Tags used inside a calculation (`#food * 2`,
  `#food + #other`) are substituted with their aggregate values before
  evaluation (`substituteTags`), so they act as scope variables; a tag with no
  matching rows is an error either way.
- **Line references** (`line(n)`, 1-based) inject the value of an earlier value
  row under a private `__line_n` token. A reference to the current or a later
  line, or to a row with no value, is an error; the view draws the referenced
  value in place of the token, revealing the raw token (with the value at half
  opacity over it) while the caret is on that line.
- **Multi-word variables** (`monthly rent = 1500`) are mangled to a single
  identifier before diffing and evaluation, so assignments and references
  resolve to the same name; `friendlyError` unmangles them for the message.

`assertBoundedExpression` rejects list literals and statically resolvable ranges
longer than `MAX_LIST_LENGTH` (100) before evaluation, so `1:1e9` cannot
allocate an unbounded array in the worker.

### The worker

Evaluation runs in a Web Worker (`js/worker.js`) so a heavy sheet never blocks
typing, and the main thread never parses the large mathjs bundle. The worker
client lives in `js/evalClient.js`: it owns the worker connection, the
request/reply protocol, and the debounced `schedule`/`flush` update scheduling.
Each request posts `{ id, type: 'evaluate', lines }` and resolves when the
worker replies. `update()` draws the typed input first (phase one) and then,
on reply, applies the results — but only if the sheet text is still unchanged,
so a stale reply is never rendered and two back-to-back requests for the same
text cannot both be dropped. Every request also has a timeout so a hung worker
can't freeze the sheet, and if the worker fails to load or crashes its
in-flight requests are rejected and later evaluations fall back to the
main-thread engine instead of stalling.

**Serialization:** mathjs `Unit`, `BigNumber`, etc. lose their prototypes in
structured clone. The worker therefore pre-formats every result value into a
string before posting. `patchResults` must accept both numbers (main-thread
fallback path) and strings (worker path).

Currency rates are fetched on the main thread (`fetchRates` in
`js/eval/currency.js`), cached in localStorage, and forwarded to the worker as
`{ type: 'rates', data }`; the worker registers them on its own engine. A lazy
main-thread `calculate.js` import is the fallback when `Worker` is unavailable
or dies; its engine receives live rate updates through the same
`currency:updated` event.

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
(a 700ms idle timer commits the draft), each burst becoming one undo step —
except a burst that ends where it began, which is dropped. The pure helpers
(`recordChange`/`commitDraft`/`applyUndo`/`applyRedo`) live in
`js/core/history.js`, with `js/ui/tabs.js` owning only the per-tab store.

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
touch already-processed text.

Matching needs no evaluation: the view rows are already current after
phase-one rendering, so find re-marks synchronously on input (and never forces
a worker round-trip itself). Because matches sit inside `.line-row` boxes,
scrolling to a match anchors on the row.

## Rendering

Rendering is two-phase so typing never waits on the worker. `js/index.js`
creates a row renderer once with `createRowRenderer(viewNode)`
(`js/render/renderInput.js`), which returns renderers bound to that view:

- `renderText` redraws the highlighted input rows synchronously from the first
  changed line (incremental), reusing the prefix DOM. It shows only the input —
  no placeholder — so a row without a result yet is simply empty until the
  reply fills it.
- `patchResults` fills in the ghost results when the evaluation reply arrives;
  an unchanged sheet (`startLine` -1) that was already patched is left
  untouched.
- `format` (`js/render/format.js`) tokenizes a line into typed spans
  (number, variable, currency, operator, comment, title).
- `formatResult` (`js/render/formatResult.js`) formats numbers/units into
  display strings (its `Intl.NumberFormat` is cached per precision). It rounds
  numbers to the decimal precision (`js/core/decimalPrecision.js`, 3 by
  default) and appends `…` when the value has more precision; this is display
  only — the engine keeps full precision. The worker formats with the precision
  it was sent, and a precision change forces one full re-render because the
  sheet text itself is unchanged.
- `renderTotal` shows the running total. It groups unit values by dimension,
  merges compatible units into the largest present (currencies and affine
  temperatures never merge), folds in plain numbers, and ignores mixed kinds;
  `aria-live` announces the settled value after a pause. The bottom bar's
  dropdown chooses sum, average or median (`computeTotal(results, mode)`). The
  engine holds the mode, and since it only affects the total, the per-line
  cache stays valid.

## Line numbers

A `.line-numbers` gutter (`js/ui/lineNumbers.js`) numbers every line (plus one
phantom row for the next Enter), follows the caret, and mirrors the scroll
container's vertical offset so the numbers stay glued to the text. It is
`aria-hidden`.

## Onboarding

Two independent parts, both dismissible and both replayable.

**The starter sheet.** On a first run the first tab is renamed `Welcome` and
filled with a short working sheet (`STARTER_SHEET` in `js/ui/onboarding.js`) —
every line evaluates, so the opening screen demonstrates the app rather than
describing it. It is seeded through `tabsApi.seedSheet`, which fills the
_active_ tab; that is deliberately different from an import, which adds one.

**The starter prompt.** `js/ui/starterPrompt.js` adds a small floating **Keep
content** / **Clear content** control just below the seeded sheet. It is visible
only while the active tab still holds exactly `STARTER_SHEET` and the visitor
has not dismissed it; either button (or editing away from the sheet) sets
`math-notes-starter-dismissed`, so it never returns.

**The tour.** `js/ui/tour.js` walks five anchors of the real UI. The highlight
is an `outline` drawn on the anchor itself plus a raised `z-index`, not a
cloned "spotlight" element — cheaper, and it cannot desync from what it points
at. `nextStep` and `placeFor` are pure named exports (clamping, and flipping
the popover when the preferred side would overflow the viewport), unit-tested
with no DOM at all; the init module only wires events. `Esc`, the backdrop and
`Skip tour` all dismiss; arrow keys navigate; focus is moved into the popover,
trapped while open and restored on close; `prefers-reduced-motion` disables the
transition.

### First-run detection has one sharp edge

`isFirstRun` requires **all three** of: no `math-notes-onboarded` flag, no
`math-notes-tabs` key, and an empty active sheet. Any one alone is not enough —
someone who clears a single localStorage key must not have their work
overwritten by the starter content.

The `math-notes-tabs` half has to be **snapshotted before `initTabs` runs**.
`initTabs` persists a fresh tab collection during its own start-up, so by the
time `initOnboarding` is called the key always exists and every visit would
look like a return visit. `readOnboardingState()` exists for exactly that, and
`js/index.js` calls it above `initTabs`.

The flag is written **before** seeding, so a crash mid-tour cannot loop a user
through onboarding on every reload. `RESET_KEYS` in `js/ui/settings.js`
includes it, so "Reset data" genuinely returns the app to a first run.

## Accessibility notes

- The view and line gutter are `aria-hidden`; the textarea is the accessible
  input.
- The tabs implement the ARIA tabs pattern (`role="tab"` /
  `role="tabpanel"` with `aria-controls` and `aria-labelledby`).
- Icon-only buttons carry `aria-label`s (a `title` is not reliably read).
