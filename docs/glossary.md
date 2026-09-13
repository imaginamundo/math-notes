# Glossary

Terms used throughout the codebase and this documentation.

- **Sheet** — the whole editor content: one expression (or comment) per line.
- **Line** — a single row of input text.
- **Ghost** — the dimmed inline result rendered after a line (e.g. `→ 15`).
  Also the name of the styled overlay layer (`#view`).
- **Ghost layer** — the `.view` `<pre>` that shows syntax-highlighted text
  behind the transparent textarea.
- **line-row** — the block wrapper around each rendered line in the ghost
  layer. `find.js` counts `.line-row` boundaries as newlines when mapping match
  offsets onto the DOM.
- **Total** — the running sum of numeric results shown at the bottom
  (`renderTotal`). Plain numbers fold into a single unit; compatible units
  (e.g. `cm` + `m`) merge into the largest one present; currencies and affine
  units (temperatures) never merge across kinds; several different kinds are
  ignored and only plain numbers are summed.
- **Total mode** — the bottom bar's dropdown: `sum` (default), `average` or
  `median`, stored by `js/core/totalMode.js` and applied by
  `computeTotal(results, mode)`. Only the total changes, so the line cache is
  unaffected.
- **Tab** — a worksheet. `TabState` is `{ tabs, activeId, nextTabNumber }`;
  each `Tab` is `{ id, name, content }`.
- **Snapshot** — a versioned backup of a tab (id, name, content, timestamp)
  stored in IndexedDB and capped at 10 per tab.
- **Worker** — the Web Worker (`js/worker.js`) that evaluates sheets off the
  main thread.
- **Fallback** — main-thread evaluation used when `Worker` is unavailable or
  dies mid-session; `js/core/calculate.js` is lazy-imported for it.
- **Burst** — a run of edits grouped into a single undo step by the 700ms idle
  timer.
- **Aggregate** — `sum`/`total`/`average`/`avg` keywords that combine the lines
  above (stopping at a blank line). They follow the total's unit rule
  (compatible units merge into the largest present, currencies/temperatures
  stay separate, mixed kinds are ignored).
- **`prev`** — a scope variable holding the most recent result above the
  current line (comments and blank lines are skipped).
- **Object** — a mathjs object literal (`{key: value}`), rendered inline as
  `{ key: value, … }`; fields are reached with `obj.key`.
- **Multi-word variable** — a variable whose name contains spaces
  (`monthly rent = 1500`); the engine rewrites the name to a single safe
  identifier so assignments and references resolve consistently.
- **Line reference** — `line(n)` uses the result of line `n` (1-based, above
  the current line). The view shows the referenced value in place of the token;
  on the line being edited the raw token is revealed with the value dimmed over
  it.
- **Autocomplete** — the caret-anchored suggestion popup
  (`js/ui/autocomplete.js`). It completes the sheet's variables and `#tags` plus
  the curated vocabulary (`js/core/vocabulary.js`: keywords, functions,
  constants, units); the pure matching lives in `js/core/autocomplete.js`.
- **Tag** — `#word` (no space) labels a line; `#` followed by a space is a
  comment. A line that is only tags, or `sum`/`total`/`average`/`avg` (optionally
  `of`) before the tag, is an aggregate over the tagged value rows above it
  (across the whole sheet); requesting a tag with no tagged rows is an error. A
  row carrying several tags is the full amount split equally between them, so
  each tag gets its share while the row and the group total keep the full price.
  Tags can also appear in calculations (`#food * 2`, `#food + #other`), where
  each is replaced by its aggregate.
- **Group** — a named block opened by a label-only line (`Groceries:`) and
  closed by `end`; the header shows the block's subtotal (an aggregate result)
  and the block is shaded, while the inner lines still count in the bottom
  total. Groups are flat, and an unterminated header is just a label.
- **Preprocessors** — the regex transforms run before mathjs, in order:
  measures, scales, symbols (currency), percentages, word operators, rates,
  rounding.
- **Subject label** — the free-form word(s) after a value and before a
  conversion (`butter` in `300g butter in cups`). No dataset is required; it is
  informational and selects a factor when one is known.
- **Measure conversion** — a subject's factor bridges two dimensions
  (`300g butter in cups`, `10 cups olive oil in grams`, or the dataset-free
  `300g feathers in cups`), rewritten to `__measure` by `js/eval/measures.js`.
  `DEFAULT_FACTORS` covers cooking and material densities, fuel energy
  densities and media bitrates; any other label (or none) uses `DEFAULT_DENSITY`
  (water).
- **Measurement system** — the preferred volume units
  (`js/core/measurementSystem.js`): metric (default), us, or imperial, each
  including a cup. Applied at engine build and on `measurement:updated`.
- **Calendar date** — a date value (`10 June`, `2019-04-01`, `today`),
  represented as a JS `Date` at local noon. `preprocessCalendar`
  (`js/eval/calendar.js`) rewrites date arithmetic to `__date*` helpers and
  `formatResult` renders `D Month [YYYY]`. A date variable works anywhere a
  literal does (`days until start`, `5 workdays after start`), since the helpers
  read a Date through `toDate`.
- **Calendar interval** — the span between two dates (`January 10 - February 5`
  → `3 weeks 5 days`), a small `calendarInterval` value that `formatResult`
  draws as years/months/weeks/days.
- **Clock time** — a moment today (`9:45 am`, `1:30`), a `Date` marked
  `.clock`. `__clockAdd` adds a duration; `__clockInterval` measures an interval
  as a timespan Unit, so it chains and aggregates
  (`9:00 am to 5:30 pm - 45 minutes`). `formatResult` renders it per the
  **Clock format** (`js/core/clockFormat.js`, 24-hour by default, 12-hour
  optional) as `19:12` or `7:12 pm`, with `Yesterday at`/`Tomorrow at` when not
  today. `to` wraps forward past midnight, `-` keeps both on the same day.
- **Workday** — Monday–Friday. `js/eval/calendar.js` counts workdays in a span
  (`10 March to 17 March in workdays`), advances a date by workdays
  (`5 workdays after March 14`), and converts `work hours` at eight hours per
  workday. Public holidays are not modelled yet.
- **Rate** — a quantity per unit (`30 km/day`). mathjs supplies the arithmetic;
  `js/eval/rates.js` translates `per`/`a`/`at`/`for`, transfer time and pace,
  and `formatResult` simplifies and formats them.
- **Timespan** — a duration rendered as components (`5 min 30 s`,
  `10 weeks 2 days`). Consecutive time components and `m` for minutes are
  joined by `js/eval/timespan.js`; `as timespan` and `in <unit> and <unit>`
  mark the result, and a duration in minutes/hours renders as components too.
  `as` also converts like `to`/`in` (`... as minutes`), which keeps the unit
  instead of drawing a timespan. The value stays a real Unit, so arithmetic
  (`line(4) + 1h`) works.
- **Decimal precision** — how many decimal places results show (3 by default,
  stored by `js/core/decimalPrecision.js`). Display only: `formatResult` rounds
  and appends `…` when the value has more precision, but the engine keeps full
  precision.
- **Rounding** — Soulver-style trailing phrases (`1/3 to 2 dp`, `5.5 rounded up`,
  `37 to nearest 10`, `0.534 to nearest 16th`) rewritten by
  `js/eval/rounding.js` to mathjs `round`/`ceil`/`floor`. Those are extended so
  a Unit rounds in its displayed unit, and a fraction result is shown as `n/d`.
- **Currency context** — places where a 3-letter code is treated as a unit
  (next to a number or a `to`/`in` conversion), so codes used as variables stay
  lowercase.
- **Currency symbol** — how a currency amount is written back: the symbol in
  front of the amount (`US$ 350`, `-US$ 50`), from `CURRENCY_DISPLAY` in
  `js/core/currencySymbols.js`. A currency rate reads as a phrase
  (`100 USD/hour` → `US$ 100 per hour`). Currencies with no distinct symbol keep
  their ISO code. `CURRENCY_SYMBOLS` in the same file maps typed symbols to
  codes.
- **Unit mix** — a unit expression that has no meaning: two different kinds
  multiplied (`kg L`, `BRL hour`), a non-length power (`h^2`, `m^0.5`) or three
  dimensions in one ratio. `unitMixError` in `js/core/unitMix.js` turns one into
  a line error (a currency mix also suggests a rate); a single unit, area/volume,
  a two-dimension ratio and named derived units (`N`, `J`) are allowed.
- **Share link** — a URL whose `#` fragment carries an encoded sheet
  (`#s=<version>.<base64url>`). Built and parsed by `js/share/shareLink.js`.
- **Share token** — the `<version>.<base64url>` part of a share link: a version
  tag, then base64url of the (usually `deflate`-compressed) sheet JSON.
- **Import** — opening a share link. Always additive: it prompts, then adds a
  new tab; it never overwrites the active sheet.
- **Onboarding** — the first-run experience: the seeded starter sheet plus the
  tour (`js/ui/onboarding.js`). Gated on `math-notes-onboarded`.
- **Starter sheet** — the `Welcome` sheet seeded on a first run. Every line
  evaluates, so the first screen already demonstrates the app.
- **Starter prompt** — the floating **Keep content** / **Clear content** control
  (`js/ui/starterPrompt.js`) shown while the active tab still holds exactly the
  starter sheet; either button (or editing away) dismisses it for good.
- **List/range limit** — `MAX_LIST_LENGTH` (100). List literals and statically
  resolvable ranges longer than this are rejected before evaluation, so a range
  like `1:1e9` cannot allocate an unbounded array and lock up the worker.
- **Tour** — the guided walkthrough (`js/ui/tour.js`): a data-driven `STEPS`
  array, one popover, and an `outline` ring on the anchor.
- **Tour step** — `{ anchor, title, body, placement }`. `anchor` is a CSS
  selector for a real element of the UI, or an array of them (e.g. the Help
  step highlights both the Help and Examples buttons).
