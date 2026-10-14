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
math and scrolls `.editor-scroll` on input, `keyup`, clicks and selection
changes. It tracks the scroller's offsets from its `scroll` event rather than
reading them (a read while the rows are dirty forces a layout of the whole
sheet), and writes `scrollLeft`/`scrollTop` only when they change. A `scroll`
listener on the textarea resets any native scroll it is given, so the layers
cannot slide apart.

Both layers must share **identical metrics** — font, font-size, line-height,
padding, and `white-space: pre` — or the ghost text drifts from the caret.

### Line rows

The view is a sequence of `.line-row` block wrappers (one per line), each
containing the highlighted `.line` span and an optional `.ghost-result`. Rows
are `width: max-content` so the view (and therefore the scrollable extent)
spans the line plus its result. There are no `<br>` separators; each row is
exactly one line high: `js/ui/editor.js` sets `--editor-line-height` to the
font size × 1.65, rounded to whole pixels, on both layers.

### End-of-line padding

The textarea's own scroll range would exclude right padding, but here the
wrapper scrolls the full content box, so `padding-right` on the layers counts
toward the scrollable extent and gives breathing room after long lines.

## Evaluation

### Preprocessing

Each line goes through `preprocess` (`js/core/preprocess.js`) before mathjs:
`measures` → `scales` → `symbols` → `percentage` → `wordOperators` → `rates` →
`calendar` → `timespan` → `rounding`, in that order (measures first so a
scale-like subject such as `4k video` is recognised before `scales` rewrites it;
scales before currency so `$2k` becomes `2000 USD`; percentage before word
operators so its `of|on|off` phrases are consumed first; calendar before
timespan so a date's `as <pattern>` is not read as a conversion; rounding last,
so it wraps the normalised value).
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
formatted as `mm:ss/km`). `formatResult` simplifies genuinely compound units
before display, so `30 hours at 10 km/hour` shows `300 km`, not
`(hours km)/hour`. It leaves two shapes alone: a plain ratio (`l/km`, `GB/h`,
`kg/m^3`) is shown as written, because simplifying can fold related dimensions
into a surprising result (`l/km` is length², so `7 l / 100 km` would read as an
area), and repeated same-unit factors become a power (`m * m * m` → `m^3`)
rather than letting `simplify()` pick an arbitrary named unit (`gallon`).

Currencies are units too. `formatResult` writes a single currency amount with
its symbol from `CURRENCY_DISPLAY` in `js/core/currencySymbols.js`
(`350usd` → `US$ 350`), keeping the sign in front (`-US$ 50`), and reads a
currency rate as a phrase (`100 USD/hour` → `US$ 100 per hour`,
`BRL/day` → `R$ 12 per day`). The currency is read from the original unit before
`unit.simplify()`, which would otherwise fold it into whichever currency mathjs
made the base; a compound that reduces to a currency (`2h * prev` where `prev`
is a rate) is read back in the currency that was written. Currencies with no
distinct symbol (CHF, ZAR, the Nordic krona) keep their ISO code so a result can
always be typed back in. `js/core/currencySymbols.js` owns the whole currency
vocabulary — the symbol maps plus the live set of known codes, extended as rates
register — so the evaluator (`js/eval/symbols.js`), the highlighter and the
domain (`aggregate`/`unitMix`) all read one source instead of the domain
reaching into `eval/`.

Units only combine in shapes that mean something. `js/core/unitMix.js` inspects
each line's result — simplified, with the net power per base dimension — and
allows a single unit, area/volume (`m^2`, `m^3`), a ratio of two dimensions
(`km/day`, `USD/hour`, `kg/m^2`) and any named derived unit mathjs keeps whole
(`N`, `J`, `5 N * 2 m` → `J`). A product of two kinds (`kg L`, `BRL hour`,
`GB m`), a non-length power (`h^2`, `kg^2`, `m^0.5`) or a three-dimensional
ratio is an error; a currency mix also suggests a rate. `evaluateLine` calls it
right after `math.evaluate`, so the message flows through the normal error path
(`Cannot combine "kg" and "m" — that unit has no meaning`,
`Cannot multiply a currency by "hour" — use a rate like "BRL per hour"`).

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

Dates live under `js/eval/calendar*.js`, split by concern: the facade
`calendar.js` registers the helpers, `calendarGrammar.js` owns
`preprocessCalendar`, `calendarDate.js` the parsers and Date primitives,
`calendarArithmetic.js` the date/clock/workday math, and `calendarFormat.js` the
rendering. `preprocessCalendar` recognises date
literals (`10 June`, `2019-04-01`, `12/02/1988`), `today`/`now`/`yesterday`/
`tomorrow`, fixed-date holidays, and the operations around them (add/subtract a
duration, `N units after/before`, `N days from now`/`today`/`ago`, intervals, `days
until/since/between`, date parts, and `as <pattern>`), rewriting each to a
`__date*` helper since mathjs has no date type. It also rewrites the right-hand
side of an assignment, so a date can be stored and reused (`start = March 4`,
then `start + 2 weeks` → `__dateAdd(start, "2 weeks", 1)`); a variable works
anywhere a literal does (`days until start`, `5 workdays after start`,
`weekday on start`), because the helpers read a Date through `toDate`. `__dateAdd`
accepts a Date (calendar arithmetic) or a duration Unit (plain duration
addition).
Clock times (`9:45 am`, `16:00`) parse to a Date marked `.clock`; `__clockAdd`
and `__clockInterval` handle duration arithmetic and intervals (`to` runs
forward past midnight, `-` keeps both on the same day per Soulver's ambiguity
rule). An interval is a timespan Unit, so it chains and aggregates
(`9:00 am to 5:30 pm - 45 minutes`), and `formatResult` renders a marked Date per
the **Clock** setting (`js/core/clockFormat.js`, 24-hour by default) as `19:12`
or `7:12 pm`, prefixed `Yesterday at` / `Tomorrow at` when it is not today.
`now` is marked too, so `now + 3 hours` stays a clock time; durations accept the
timespan shorthand (`now + 4h 3m 5s`), since `parseDuration` maps `h`/`m`/`s` and
their full names alike.
Dates are JS Date objects at
local noon (so DST never shifts a day); `formatResult` renders a date as
`D Month [YYYY]` (the year is omitted when it is the current one) and an
interval as `3 weeks 5 days`. Workdays/weekdays are Monday–Friday, counted or
advanced by `countWorkdays`/`addWorkdays` (public holidays are not modelled
yet); `work hours` assume an eight-hour workday, and a `workday` unit (8 h) lets
`55h in workdays` convert. `work hours in <month>` is rewritten wherever it
appears, so it composes with the arithmetic around it
(`work hours in June * 25 EUR`).

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

Despite the `core/` name this file is not strictly pure: it is the composition
root for the engine and reads two stored settings (total mode, measurement
system) at build time. Currency rates are not among them: they are an argument
(`createEngine({ rates })`), so the engine never reads rate storage. Settings
changed later are pushed in — to the worker as a message, to the main-thread
engine by `js/evalClient.js` — so the engine never subscribes to browser
events. The rules it wires are pure and live in sibling modules:
`parseLine.js`, `preprocess.js`, `aggregate.js`, `unitMix.js`, and the pieces
split out of the engine — `tags.js` (tag aggregation and substitution),
`lineRefs.js` (`line(n)`), `boundedExpression.js` (the size guard),
`aggregateSubstitution.js` (`sum`/`average` as scope values) and
`friendlyErrors.js` (readable messages). The assembly stays here rather than in
a separate layer.

`evaluateLines(lines)` parses each line, evaluates it against a `variables`
scope (with `prev` and aggregate blocks), and returns
`{ results, total, startLine }`. Each engine keeps a per-input cache of the
last lines and their per-line results. When called with new input, it diffs to
the first changed line, rebuilds the variable/aggregate context up to that line
from cached values, and only re-evaluates from there. Each line goes through
an ordered list of handlers (`LINE_HANDLERS`: group end, stray `end`, unit
definition, tag substitution, tag request, reserved label, bare aggregate,
expression), and the first that claims the line produces its result.
**Invariant:** results
must stay correct across any sequence of interleaved calls (the cache is not
per caller). Registering new currency rates bumps an _environment revision_
that forces a full recompute, so cached conversions never go stale.

A sheet is untrusted text, so `js/core/engineLock.js` locks the engine's maths
after it is configured: `config`, `createUnit`, `import`, the functions that
evaluate text (`evaluate`, `parse`, `compile`, `parser`, `simplify`, `derivative`,
`help`, …) and the expression-node constructors are replaced, as a sheet sees them,
by stubs that throw. The engine keeps the real ones through a `trusted` view and
uses it to register rates, units and measurement systems and to check a line's
size. Without this a line like `createUnit("USD", "2 EUR", {override: true})` would
corrupt every tab until a reload.

An expression line is evaluated against a scope created with
`Object.create(ctx.variables)`: the sheet's variables are reached through the
prototype instead of being copied for every line (which made a sheet of
assignments cost O(lines²)), and what only that line needs — `prev`, tag
aggregates, line references — is assigned as own properties of the fresh object,
so nothing leaks into the next line. The preprocessors are given a `names` view
over the same two sources.

A line `unit widget = 3.5 kg` defines a custom unit (`js/core/userUnits.js`
parses it, `js/eval/userUnits.js` registers it with its plural and removes it
when the line goes). A definition is excluded from the total and from `prev`,
and a name already taken by a built-in unit, a symbol or a reserved word is an
error.

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
  unit rules as the total. A row with several tags is the full amount split
  equally between them, so each tag gets its share while the row and the group
  total keep the full price. Tags used inside a calculation
  (`#food * 2`, `#food + #other`) are substituted with their aggregate values
  before evaluation (`substituteTags`), so they act as scope variables; a tag
  with no matching rows is an error either way.
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
allocate an unbounded array in the worker. It also bounds `range(...)` and
the `ones`/`zeros` constructors, whose size sits inside a call rather than a
literal. It parses only when the expression contains `[`, `:` or one of those
calls, so ordinary lines skip the extra parse.

### The worker

Evaluation runs in a Web Worker (`js/worker.js`) so a heavy sheet never blocks
typing, and the main thread never parses the large mathjs bundle. The worker is
created on the first evaluation, not at load, so opening the page does not parse
the 646 KB bundle until the sheet is actually typed into. The worker client
lives in `js/evalClient.js`: it owns the worker connection, the request/reply
protocol, and the debounced `schedule`/`flush` update scheduling.

Each request posts `{ id, type: 'evaluate', lines, from }`, where `lines` is only
the suffix from the first changed line and `from` its start index (0 for the
first request, or the line count with an empty suffix when nothing changed;
`-1` is the reply's `startLine`, meaning no line changed). The worker keeps the full sheet and
rebuilds it with `applyLinePatch`, so an edit near the end of a long sheet ships
a few lines instead of the whole document. `update()` draws the typed input
first (phase one) and then, on reply, applies the results — but only if the
sheet text is still unchanged, so a stale reply is never rendered and two
back-to-back requests for the same text cannot both be dropped. Every request
has a 10 s timeout, and `recoveryFor` decides what a failure means. If the
worker fails to load (its module graph was never cached, which is common
offline) or crashes, the failing request is re-run on the main-thread engine and
every later evaluation uses it, so the sheet still evaluates instead of staying
blank. A timeout only means this worker is stuck: it is terminated and the same
request goes to a fresh one. A second timeout for that request is reported as a
status message and not retried on the main thread, which would block typing for
at least as long as the worker already needed.

The messages and setting names both ends speak live in `js/protocol.js` (`MSG`,
`SETTING`): `evaluate`, `setting`, `result` and `error`, and the settings `rates`,
`measurement`, `total-mode`, `precision` and `clock-format`. The worker routes all
of them; the main-thread fallback applies only the engine-owned ones (rates,
measurement system, total mode), since precision and clock format only affect
how results are formatted. `test/protocol.test.mjs` pins both tables to the
protocol.

**Serialization:** mathjs `Unit`, `BigNumber`, etc. lose their prototypes in
structured clone. The worker therefore pre-formats every result value into a
string before posting. `patchResults` must accept both numbers (main-thread
fallback path) and strings (worker path).

Currency rates are fetched on the main thread and cached in localStorage by
`js/storage/currencyRates.js`, which has no mathjs dependency. The composition
root (`js/index.js`) starts the fetch (`fetchRates`, then `startRateRefresh`,
which re-checks hourly; a fetch times out after 10 s and falls back to the cached
rates, reported as `source: 'stale'`) and, on each `CURRENCY_UPDATED`, calls
`evalClient.syncRates`. That posts a `{ type: 'setting', name: 'rates', value }`
message and, when the main-thread fallback is in use, calls
`registerCurrencyRates` on its engine directly. A lazy `calculate.js` import is
the fallback when `Worker` is unavailable or dies; `evalClient` seeds a fresh
worker, and a freshly loaded fallback engine, from the cached rates. The base
currency (`BASE`) is defined once in `js/core/currencySymbols.js`.

### The composition root

`js/index.js` runs `boot()` in a fixed order, which is a contract: resolve the
language, capture the onboarding keys _before_ `initTabs` persists a fresh
collection, initialise tabs (which evaluate whatever was restored), then the
features that read the active sheet, then the starter prompt, then onboarding
last. `initAutocomplete` must run before `initIndent`, because an open popup
swallows Tab. Every listener `js/index.js` owns is registered _before_ `boot()`
runs, since the inits inside it notify synchronously (a quota hit while the
collection persists, a font size restored at startup, the first cached rate) and
a later listener would miss that message; a conventions test checks it. A failed
boot reports a sticky status message and leaves the saved collection untouched.
The rate fetch starts last, after every `CURRENCY_*` listener exists.

## Tabs and persistence

Per-tab state is a single object `{ tabs, activeId, nextTabNumber }` held by the
`js/ui/tabs.js` controller; each tab is `{ id, name, content, caret }`, where
`caret` is the last selection (`{start, end}`) or null. Three side concerns are
separate modules: persistence (`js/storage/tabsStore.js` — the one-time load
with legacy-key migration, plus a debounced writer), the per-tab undo store
(`js/ui/tabsHistory.js`) and the tab-bar DOM (`js/ui/tabsView.js` — rendering,
inline rename and drag-reorder, calling back into the controller). Current
content persists to localStorage (debounced). The caret is captured as the user
moves it and restored on load through `normalizeCaret`, which drops anything
that is not a valid in-range selection, so a corrupt value simply leaves the
caret where the browser put it. Separately, versioned
**snapshots** of each tab (id, name, content, timestamp, capped at 10 per tab)
are auto-saved to IndexedDB (`js/storage/snapshots.js`) on a pause in typing and
on blur/tab-switch/close/pagehide; the content is stored deflated through
`js/util/compress.js` when the platform supports it, and inflated on read.

If localStorage is unavailable or corrupt on load, the collection is rebuilt
from the latest snapshot of each tab; a corrupt value is first copied to
`math-notes-tabs-backup` so it is never silently lost. Settings shows every
snapshot grouped by tab (not just the latest) plus a "restore all" action, and
closing a tab deletes its snapshots.

Undo/redo is per tab, kept in memory only: edits are grouped into bursts
(a 700ms idle timer commits the draft), each burst becoming one undo step —
except a burst that ends where it began, which is dropped. The pure helpers
(`recordChange`/`commitDraft`/`applyUndo`/`applyRedo`) live in
`js/core/history.js`; `js/ui/tabsHistory.js` is the per-tab store around them.
After a step the caret is placed at the end of the changed region (`changeCaret`
in `js/util/text.js`), so undoing a deletion leaves it after the restored text
instead of at the old offset.
The history is capped by both count (100 steps) and total size (2 MB), so a
large sheet cannot retain an unbounded stack of full copies.

## Sharing a sheet by link

`js/share/shareLink.js` is a pure module that packs the **active** sheet into a
URL and back out again. `js/ui/share.js` wires the button and the incoming
import; `js/util/clipboard.js` holds the clipboard write both it and
`js/ui/shortcuts.js` use. The base64url and deflate helpers it needs live in
`js/util/compress.js`, shared with the snapshot store.

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

## Autocomplete

`js/ui/autocomplete.js` draws a caret-anchored `role="listbox"` popup inside
`.editor-scroll`. The editor stays a plain textbox: ARIA does not allow
`combobox` on a `<textarea>`, so it carries only `aria-controls` and
`aria-autocomplete="list"`, and a polite `role="status"` region outside the
popup announces the count ("5 suggestions") and, as the arrow keys move, the
highlighted suggestion and its position. It opens while a word of at least two
letters (`MIN_PREFIX`) is being typed
(or right after a single `#`) and on `Ctrl`/`Cmd`+`Space`, offering the sheet's
own assignments and tags plus the curated vocabulary in
`js/core/vocabulary.js` (keywords, functions, constants and the units from
`core/measures.js` and `core/currencySymbols.js`).

A popup that opened by itself is only an offer. `Tab` takes the highlighted
entry, but `Enter` does so only once the user has _chosen_ — moved the highlight
with the arrow keys, or opened the popup with `Ctrl+Space`; otherwise `Enter`
closes it and is an ordinary line break. Without that, finishing a complete word
at the end of a line would replace it with a longer one (`grams` →
`kilograms`, `pi` → `pint`). For the same reason a word that already names an
entry (a unit, constant, function or variable; not a `#tag`, which is always in
the sheet it is typed in) opens no popup on its own.

The logic is pure and unit-tested in `js/core/autocomplete.js`: `wordRangeAt`
finds the word around the caret (leading digits stay outside it, so `300g`
completes `g`; a `#tag` comes back with `tag: true` and `-` allowed inside),
`suggestionsFor` ranks matches (variables and prefix matches first, exact
matches dropped; a leading `#` restricts matches to tags), and `applyCompletion`
rewrites the range (functions get an opening bracket); at most eight (`MAX_ITEMS`)
entries show. `suggestionFacts` reads
one line (its variable, unit definition and tags, via `parseLine`) and
`suggestionsFrom` turns the per-line facts into the popup's list, so the UI keeps
facts per line text and re-parses only the lines an edit touched.

The popup is positioned from `editorScroll.caretPosition()` — the glyph and line
metrics `js/ui/editor.js` already measures — and flips above the caret when
there is no room below. Its keydown listener is registered before
`js/ui/indent.js` and uses `stopImmediatePropagation`, so while it is open `Tab`
accepts instead of indenting. Accepting goes through `setEditorValue`, so undo,
the renderer and find all treat it as a normal edit.

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
  merges compatible units into the largest present for display (currencies and
  affine temperatures never merge), folds bare numbers in using the first unit
  seen for the group, and ignores mixed kinds — except two currencies, which is
  an error. An `aria-live` region announces the settled total after a pause; the
  view adds a second one for the active line's result. The bottom bar's dropdown
  chooses sum, average or median (`computeTotal(results, mode)`). The engine
  holds the mode, and since it only affects the total, the per-line cache stays
  valid.

### The typing hot path

`js/index.js` runs a fixed sequence per input: `renderText` (phase one),
`syncSize`, `updateActiveLine`, then a debounced evaluation. Each step is built
so its cost tracks the edit, not the sheet:

- `renderText` rescans the multi-word names only when a changed line is a
  definition (`isMultiWordDefinition`), and re-highlights just the changed rows.
- `js/ui/editor.js` caches the font-derived metrics, the content extent (longest
  line and count), the line-gutter inset, the scroller's client size (a
  `ResizeObserver`) and its scroll offsets (its `scroll` event), so sizing and
  caret tracking do not read `getComputedStyle`/`getBoundingClientRect` or force
  a layout per keystroke; a resize or font change invalidates them.
- The autocomplete keeps each line's parsed facts by line text, so an edit
  re-parses only the lines it touched, an inserted line costs one parse, and the
  option rows are updated in place instead of rebuilt.
- `updateActiveLine` touches only the outgoing and incoming rows, and the
  line-number gutter (`js/ui/lineNumbers.js`) likewise moves only its highlight.
- `patchResults` refreshes group shading and `line(n)` references from the first
  changed row on, and lays out only the groups it touched, clearing all widths
  before the reads to avoid layout thrash.
- The renderers read the decimal precision from memory
  (`getDecimalPrecision`), and the sheet text is split once per edit
  (`sheetLines` in `js/util/text.js`).

## Line numbers

A `.line-numbers` gutter (`js/ui/lineNumbers.js`) numbers every line (plus one
phantom row for the next Enter), follows the caret, and mirrors the scroll
container's vertical offset so the numbers stay glued to the text. It is
`aria-hidden`.

## Onboarding

Two independent parts, both dismissible.

**The starter sheet.** On a first run the first tab is renamed `Welcome` and
filled with a short working sheet (`starterSheet()` in `js/ui/onboarding.js`, built
from the translated `starter.*` strings, so it is localized) —
every line evaluates, so the opening screen demonstrates the app rather than
describing it. It is seeded through `tabsApi.seedSheet`, which fills the
_active_ tab, like an import (which replaces the active sheet's content after a
confirm) and unlike a share link, which opens in a new tab.

**The starter prompt.** `js/ui/starterPrompt.js` adds a small floating **Keep
content** / **Clear content** control just below the seeded sheet. It is visible
only while the active tab still holds exactly `starterSheet()` and the visitor
has not dismissed it; either button (or editing away from the sheet) sets
`math-notes-starter-dismissed`, so it never returns.

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

The flag is written **before** seeding, so a crash mid-seed cannot loop a user
through onboarding on every reload. `RESET_KEYS` in `js/ui/settings.js`
includes it, so "Reset data" genuinely returns the app to a first run.

## Internationalization

The interface ships in English, Portuguese and Spanish. The choice is a stored
preference (`js/core/language.js`, key `math-notes-language`) that falls back to
the system language (`navigator.languages`) when unset. `js/i18n/index.js`
normalizes a BCP-47 tag (`pt-BR` → `pt`), exposes `t(key, params)` with
interpolation and an English fallback, and keeps the active dictionary in
memory.

Static text is marked in `index.html` with `data-i18n` (text), `data-i18n-html`
(markup) and `data-i18n-aria-label` / `-title` / `-placeholder` (attributes),
which `applyTranslations()` repaints. Dynamically built UI calls `t()` and
re-renders on `language:updated`, dispatched by `setLocale()` after it updates
`<html lang>`, `document.title` and the static markup. Settings renders one card
per language, with the resolved one active. Because the static markup is
authored in English, the head bootstrap adds an `i18n-pending` class (only when
the resolved language is not English) that hides `.layout` until `setLocale`
applies the language, so the English source never flashes.

Strings are split by area. `js/i18n/ui/<lang>.js` is the app chrome, eager and
marked with `data-i18n` in `index.html`. The Examples prose is authored in
Markdown at `js/i18n/src/examples.<lang>.md` and rendered at **build time**
(`npm run build:i18n`, Node + marked) into the committed
modules `js/i18n/examples/<lang>.js`; a ` ```calc ` fence becomes a clickable
example chip. `js/ui/recipes.js` lazy-imports the active language only when the
Examples modal opens, so the prose never touches the boot path or the worker. The
evaluator stays English — keywords, error messages and result formatting are
unchanged. `test/conventions.test.mjs` asserts that every `data-i18n` key in
`index.html` resolves in every locale, that the Markdown languages keep the same
examples and section count, and that `core`/`eval` never import `js/i18n/`.

## Performance

The design keeps per-keystroke work proportional to the edit, not the sheet: the
engine evaluates only changed lines and reuses the cached grouping; the renderer
rebuilds only changed rows; and the client sends the worker only the changed
suffix. On the pure side, `mangleLines` rewrites every multi-word name in one
combined pass, and the autocomplete reuses its entry list unless a changed line
contains `=` or `#`.

`test/perf.test.mjs` guards this. It seeds a 1000-line sheet and measures the
synchronous first paint and per-keystroke cost, failing on order-of-magnitude
regressions; run `node --test test/perf.test.mjs` to compare a change against a
baseline.

## Offline

The service worker lives at the **repository root** (`serviceWorker.js`), not
under `js/`, so its default scope is `/` and it can cache the app shell as well
as the documentation. A worker under `/js/` could only ever control `/js/`
(the browser's max-scope rule), which would leave the app and `/docs` online
only. It precaches the shell and every module (except the build-only
`js/i18n/build.js`) into a versioned
cache and serves same-origin GETs cache-first, with no revalidation: a version's
modules are immutable until the next install, so a session never mixes versions.
There is no `skipWaiting`, so a new version waits until every tab is closed. The
Examples content is cached too, so the modal works on a first offline visit. Each asset is added
to the cache independently, so one transient failure cannot abort the whole
install. Both the app
(`js/registerServiceWorker.js`) and the docs (`docs-src/src/docs.js`) register
it; `test/browser.test.mjs` asserts the registration scope is the whole origin.

Because nothing is revalidated, a change to any precached file only reaches an
installed PWA if `serviceWorker.js` changes bytes. `scripts/sw-manifest.mjs`
(`npm run build:sw-manifest`) hashes every precached file into
`cache-manifest.json` and bumps the version in `cacheName` whenever a hash
changed; `test/serviceWorker.test.mjs` fails if the committed manifest or version
is stale.

## Accessibility notes

- The view and line gutter are `aria-hidden`; the textarea is the accessible
  input.
- The tabs implement the ARIA tabs pattern (`role="tab"` /
  `role="tabpanel"` with `aria-controls` and `aria-labelledby`).
- A tab contains no other interactive control: its `×` is a pointer-only,
  `aria-hidden` span, and Delete/Backspace closes the focused tab (after a
  confirm), advertised with `aria-keyshortcuts`. The tab bar is one tab stop
  (roving `tabindex`).
- The editor never traps the keyboard (WCAG 2.1.2). Tab indents only for a
  multi-line selection or a caret at a line start or in its leading whitespace,
  and moves focus on anywhere else; Escape moves focus to the active tab, unless
  the suggestion popup or the find bar is open, which take Escape first
  (`js/ui/indent.js`).
- The active line's result and the total are announced through separate polite
  live regions, and the autocomplete count through its own (see Autocomplete).
- Icon-only buttons carry `aria-label`s (a `title` is not reliably read).
- Text on the editor background meets WCAG AA contrast (4.5:1) in every theme;
  `test/contrast.test.mjs` checks it.
- The documentation site is static HTML with a skip link, landmark elements and
  a keyboard-reachable sidebar.

## Rules the tests enforce

Several structural rules are checked by `npm test`, so a violation fails the
build instead of surfacing in a browser:

- `localStorage` is only touched inside `js/util/storage.js`
  (`test/conventions.test.mjs`).
- `core/` and `eval/` do not import `ui/`, `i18n/`, and (for `eval/`) `storage/`,
  so the engine and the worker graph stay free of the DOM, the dictionary and
  persistence.
- `js/index.js` registers its listeners before it calls `boot()`.
- The CSP `<meta>` in `index.html` carries the SHA-256 digest of every inline
  script. Editing the inline bootstrap script means recomputing that digest, or
  a real browser blocks it while every other test still passes.
- Every `data-i18n` key exists in every locale, and every language has the same
  Examples and section count.
- Every module imports cleanly in Node (`test/modules.test.mjs`; the browser-only
  entry points are excluded), and every module the app imports is precached.
- The precache manifest and the service-worker version are current (see
  Offline).
- Editor text meets WCAG AA contrast in every theme (`test/contrast.test.mjs`).

## Documentation site

The long-form user guide lives at `/docs`. It is authored in Markdown under
`docs-src/src/<lang>/` — one file per category, ordered by
`docs-src/src/structure.json` — and rendered at **build time** by
`docs-src/build.js` (Node + marked, the same toolchain as the Examples content)
into committed static HTML in `docs/`. No runtime Markdown and no backend are
involved, and because the built site sits directly under `docs/`, any static
server rooted at the repository serves it.

The site is multi-page per category and per language: `/docs` (English),
`/docs/pt` and `/docs/es`, each page a real HTML file with a generated sidebar,
breadcrumbed language switcher, canonical URL and `hreflang` alternates. A
` ```calc ` fence becomes a `<figure class="doc-example">` carrying the raw
expression in `data-expr`; `docs.js` colours it with the app's own highlighter
(`js/render/format.js`) and puts each line in a numbered gutter row using the
editor's surfaces (`--color-primary` for the code, `--color-surface` and
`--border-strong` for the number column), so an example reads like a small
sheet. It also wires **Copy** and **Open in Math Notes**, the latter
building a share link through `js/share/shareLink.js` so the example opens in the
app. The pages load `style.css` for the colour tokens and themes plus a dedicated
`docs.css`.

The build also emits a per-language search index (`docs/search.json`,
`docs/pt/search.json`, `docs/es/search.json`): one entry per page and per h2,
with a plain-text body capped at 600 characters and a link to the page or
section anchor. The header search box in `docs.js` fetches the index lazily on
first use and does an accent- and case-insensitive substring match, ranking
title matches first — so search stays client-side with no backend and no runtime
Markdown.

`scripts/dev.mjs` serves `docs/` directly for local development, and
`.github/workflows/publish.yml` copies `docs/` to `public/docs`. The app's
footer Documentation link is pointed at the active language by
`js/ui/docsLink.js`. `test/docs.test.mjs` checks source/output parity and that
every internal `/docs` link resolves; `test/browser.test.mjs` loads a page and
asserts the examples are highlighted. The site is committed output: run
`npm run build:docs` after editing the Markdown.
