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

A compound result that cancels down to one plain unit (`(USD year) / day` → `USD`,
`(GB s) / MB` → `s`, `(km year) / day` → `km`) is stored as that unit: `evaluateLine`
passes every result through `normalizeUnit` (`js/core/unitForm.js`) right after the
mix check. The raw form used to be stored and only simplified when drawn, so
rounding, `prev`, `sum` and the total bar worked on the raw number (24 for `$24 a
day for a year`) instead of the value shown (US$ 8,766). The currency the user wrote
is kept (`simplify()` folds a currency into the base one), and a computed duration is
stored in seconds with its `timespan` marker so it is still drawn as `5 min`; the
aggregate rebuild carries that marker, so a sum of durations is also drawn as one.
Anything that does not reduce to one unit (a rate such as `USD/hour`, a power such
as `m^3`) is left as it was. Rounding reduces its argument the same way, because
`$24 a day for a year to nearest 100`rounds an intermediate value that never
passed through`evaluateLine`, and it uses mathjs's own `round`, `ceil`and`floor`
on the number, so halves, negatives and a value a hair off a whole number behave
exactly as they do for a plain number. A rounding step may carry its own unit
(`to nearest 15 minutes`), a bare step is read in the value's own unit, and a
duration written in several units (`2 hours 17 minutes`) is first expressed in the
smallest one it names. `to nearest 16th` on a unit or currency rounds the unit's own
number and keeps the exact numerator and denominator (`fractionParts`), which
`formatResult`draws as`37/16 in`.

A rewrite must not introduce a name the user did not type. The rounding phrases call the
private `__round`/`__ceil`/`__floor`/`__fractionRound`, and the time rewrites emit
`__unit(5, "minutes")` when the sheet has a variable called `minutes`, so neither a variable
named `round` nor one named `hours` captures the app's own call or unit; a variable named
`k` or `rounded` is the user's, and wins over the scale and the phrase (`k = 2`, then `3 k`
is 6).

Numbers grouped in threes: results print `1,500` and Copy result copies that text, but
pasting it back was a syntax error, and inside a call or list the comma silently split the
number in two. `stripGrouping` (`js/core/numberGrouping.js`, the first preprocessing step)
removes the commas of a grouped number outside any bracket, and inside a bracket that
also separates its items with `, ` (`sum(1,000, 2,000)`); `max(10,200)` and `[1,234]` stay
two numbers, as they always were. Copy result now copies the number without its separators
(`ungroupDisplay`), so what is copied reads back as the same value.

Quoted text is data: `maskStrings` (`js/core/stringMask.js`) swaps every closed `"..."` or
`'...'` for an inert slot before the preprocessing steps run and restores it afterwards,
and aggregate substitution and multi-word-name mangling skip it through `outsideStrings`.
So `"2k items"`, `"total"` and `"my rate"` come back as typed, and no internal name
(`__agg_0`, `__var_my_rate`) can leak into a string. An unclosed quote is not a string.

Aggregate substitution also skips a keyword that is a field or a parameter: after a `.`
(`stats.total`), as a key before `:` inside `{ }`, or named in a function's parameter
list (`tip = f(total) = total * 0.15`), where it is that name and not the sheet's total.

Phrases work wherever an expression can stand. Most phrase patterns are anchored to the
whole expression they rewrite, so `preprocess` (`js/core/preprocess.js`) hands them one
expression at a time: the innermost body of `a = f(x) = body`, and every `( )` or `[ ]`
group and call argument, innermost first. A group's rewritten inside is parked in a slot
while the outside is rewritten, so each piece is rewritten once and an outer phrase sees
the group as one operand. `(100 km at 10 km/hour) * 2`, `pay = f(h) = h at $20/hour` and
`max(1, 3.456 to 2 dp)` all work. A bare `h:mm` inside a group stays the range `1:50`
(`concat(1:50, 1:50)`); on its own line it is a time of day. `stripGrouping` still runs on
the whole line first, because a comma means something different once a line is cut into
arguments.

A custom unit cannot take a name the date grammar owns (`mo`, `mos`, `w`, `wk`, `wks`,
`yr`, `yrs`), because the date and time-span phrases would capture it first. A plural that
is already something else (`ds` is deciseconds) is dropped rather than failing the
definition, so `unit d = 8 hours` defines `d` and the built-in keeps `ds`.

Date arithmetic (`applyDuration` in `calendarArithmetic.js`): whole months and days move
the calendar and keep the time of day, so `16:00 + 1 day` is tomorrow at 16:00 and
`now + 2 years` keeps the minute. Fractions (`1.5 days`, `1.5 months` at 30.4375 days) and
hours, minutes and seconds are elapsed time. A plain date has no time of day, so sub-day
time counts from the start of its day and the result becomes a clock time
(`today + 12 hours` is 12:00, and equals `today + 0.5 days`); the date is never left
carrying a hidden noon. A clock time not in the current year shows the year.

Yearless dates (`resolveInterval` and `resolveYear`): on its own a yearless date is the
nearest occurrence of its month and day among the years around the current one (so
`Dec 31` in early January is last December, and `Feb 29` finds the nearest leap day). Next
to a date that has a year, it takes its year from that date: in a forward reading (`to`,
`through`, `since`, `until`) a yearless first date is the latest occurrence on or before
the second and a yearless second date the earliest on or after the first (`days since
March 1`, `today to Christmas`); in a span (`-`, `between`, `midpoint`) it is the latest
occurrence on or before the dated end. Two yearless dates in a span give the smaller gap
(`Feb 5 - Jan 10` is the same 26 days either way round); in a forward reading they wrap
into the next year (`Dec 1 to Feb 5`).

Clock-dependent lines: every read of the wall clock goes through `currentTime()`
(`js/eval/clock.js`), which counts reads. `evaluateLines` compares the count around each
line and marks a line that read the clock `volatile`; the next evaluation starts no later
than the first volatile line, even when no text changed, so `now`, `today`, `unix()` and
`days until X` are not frozen while lines below them are edited. A date literal does not
read the clock. The page re-evaluates when it becomes visible or regains focus.

Clock arithmetic is in wall-clock time: an interval between two clock times counts minutes
of the day (so `1:00 - 4:00` is 3 hours on the day the clocks change), and hours added to
a clock time or to a plain date move the wall clock. A midpoint is whole days at noon, the
later day for an odd span, so it is the same date in every time zone. A timespan takes
years and months apart with mathjs's own sizes (365.25 and 30.4375 days), so `1 year`
comes out as exactly 1 year.

Dates as operands (`js/eval/dateOperators.js`): the engine adds typed `Date` overloads to
mathjs's `add` and `subtract`, so a date in a variable, a chain (`start + 2 weeks + 3 days`)
or a longer expression has its calendar meaning without a regex for every shape. `Date +/-
duration` moves the calendar (a month or year unit is a calendar step, a whole number of
days lands on a date); `Date - Date` is the interval between them. That interval, and
`__dateInterval`, return a days Unit that also carries the calendar parts it is drawn with
(`2 months 6 days`), so it sums, scales and converts like any duration and counts in group
subtotals and the total bar. The grammar chains terms after a literal date or clock time
and, when no anchored phrase matches, rewrites `today`/`now`/`tomorrow`/`yesterday`, written
dates (`March 4, 2025`, padded ISO dates) and am/pm clock times wherever they stand (a bare
`9:00` stays a range). A date given to an operator that cannot take one gets a sentence, not
mathjs's type error.

Unit data (`js/eval/units.js`, `js/core/measures.js`): `ton` is the metric tonne with its plural
and SI prefixes (`tons`, `kton`), `ct` is the 200 mg carat, a stick is 4 oz, and units mathjs
lacks (pound, metre, fathom, furlong, lightyear, nautical mile `nmi`, `knot`) are created only
when missing. Every spelling of a cooking volume unit (`tablespoons`, `fluidounces`, `cp`) is
listed under its measurement system, because mathjs copies each plural and short name when it
loads and an override of the base would leave the copy at its old size. Cooking densities are
household values (spooned and levelled, as in USDA portion weights). `unit:` names offered by
autocomplete are held to the engine by the vocabulary ratchet.

Currency: the code set is `CURRENCY_CODES` in `currencySymbols.js` (BGN is not in it: the rate
feed dropped it with the euro), and autocomplete offers every code in it. A symbol is
written as its code wherever it can stand, including after `to`, `in` and `as`. A code or
symbol followed by digits and then more letters (`cad3d`, `RM2x`, `top10RM`) is a name, not
money; `usd2024` alone still is. `coulomb` is the unit (mathjs's constant of that name is
shadowed).

Error messages (`js/core/errorCatalogue.js`, `friendlyErrors.js`): one catalogue maps the mathjs
message patterns (type errors by operation and operand kind, wrong argument counts, parse errors,
unit mismatches, undefined names) to short plain sentences in one voice: impersonal, the user's own
words in double quotes, "list" for matrix, no internal function names and no `(char N)` offsets,
which count the rewritten text and not the typed line. A conversion error names the unit as it was
typed (`Cannot convert "g" to "m"`, not the `1.5 kg` mathjs simplified it to). An unknown name is
`"x" is not defined` (and `"f" is not a known function`), and the unknown word is named alone when a
unit or connector sits beside it (`5 kg in zorkmids`). A time that cannot exist (`25:00`, `9:75`)
is reported as an invalid time instead of becoming a range. A total that cannot be worked out (two
currencies) is styled as an error, like the same message on a `sum` line. The error-leak ratchet
sweeps value kinds against operators and functions and is at zero.

Autocomplete context (`js/core/autocomplete.js`): a multi-word name completes as a whole (`2 * monthly re` →
`2 * monthly rent`, the earlier words are part of the replacement) and is not offered again once typed. After a
number or `to`/`in`/`as` only units (and the sheet's own names) are offered, units first, so `3 mi` never becomes
`3 min(`. A function that is already followed by `(` does not get another. Names are offered where they can be
used: variables, functions (`name = f(x) = …`, offered with their bracket) and custom units from the lines above
the caret, tags from anywhere; reserved words, calls, indexes and comments are never offered. The reserved-word
check is shared with the engine (`reservedWords.js`).

Editor and docs behaviour (Wave 8): find wraps to the first remaining match after a replace at the end of the sheet,
and closing the bar selects the active match so the next keystroke edits it. Enter and Esc belong to an IME while it
composes (rename, Go to line, find and replace ignore them then). Comments, gutter numbers and placeholders use the
solid `--color-dim` token, chosen per theme to reach 4.5:1 on the editor, the gutter and a group row, and the
editor's text selection is translucent so the glyphs under it stay readable. A share link is refused up front when
the sheet is over the importer's 256 KiB cap, names from links follow the rename rules, a link left in the address
bar by a failed copy is not offered back on reload, an import that is not text is refused, and the export file name
uses the local date. With two windows open each keeps its own active tab, caret and undo history; the other
window's changes to the tab list and to other tabs are adopted, and this window's own tab is replaced only when its
text changed. The docs search is an ARIA combobox (options, active descendant, a live result count, closes when focus
leaves it), and the mobile drawer is a modal: dialog semantics, the page behind it inert and Tab wrapping inside it.

Safari/WebKit (Wave 9, untested here: no WebKit available): the editor remembers its selection and scroll when it loses focus and restores them when focus returns by keyboard with the selection reset to the start (WebKit resets a textarea on Tab and the next Tab then indented line 1). The highlighter splits unmatched text by grapheme cluster, so an emoji is one text node and not lone surrogates (drawn as boxes). Share starts its clipboard write inside the click with the link still being built (`ClipboardItem` holding a promise), because WebKit allows a write only shortly after the gesture. Theme and text size follow changes made in another window, and the theme-colour meta follows the saved theme on every load.

Language and rates (Wave 9): the clear-sheet confirm, the fallback tab names and the share default name come from `t()` in every language, the next tab number counts `Tab`, `Aba` and `Hoja` names and a restore never lowers it, and Go to line reads full-width digits and stays put on input that is not a number. A currency code with no rate behind it says the exchange rates are not available yet (not "undefined symbol"), the notice stays up until rates arrive, and a damaged cached rate table is dropped and fetched again.

Line syntax (Wave 9): `//` starts a comment like `#` (outside quotes), a `;` between statements is an error (a line is one calculation; inside `[...]` it still separates matrix rows), a ghost result is always one line (a line break in a message or a `help()` text becomes a space), and the active tab is scrolled into view in the tab bar whenever the bar renders.

Sheet language (Wave 9): `js/eval/unitWords.js` rewrites area and volume words (`sq cm`, `square inches`, `m squared`, `sqm`, `cbm`, `²`/`³`) and base conversions (`in hex|bin|oct|decimal|sci`); a symbol followed by a code (`$30 CAD`) takes the code; `start:stop` with `start` a variable above is a range, not a label; a resolved `line(n)` is parenthesised so a unit or digit after it is a separate factor; the bit operators are exact for whole numbers (arbitrary-size integers, refusing a result a number cannot hold). A user function still receives the whole list (the documented, pinned behaviour); `map` and the dot operators work element by element.

Evaluation scheduling (Wave 9): the client runs one evaluation at a time; an edit that arrives meanwhile
sets a flag and a single follow-up evaluates the newest text, so a slow sheet never queues one evaluation per
keystroke. The worker posts `ready` (with `PROTOCOL_VERSION`) once its bundle has loaded; an evaluation is timed
from then, with a longer allowance before it (a slow first download is not a stuck worker). A worker that reports
another protocol version, or answers before ever reporting, is another release's worker (a hard reload pairs a page
with the worker the old service worker serves) and is not used: the main thread evaluates. Copy result waits at
most three seconds and writes nothing if the sheet or the caret moved meanwhile.

Rate and worker notes (Wave 9): a worker that errors is started again once; a second error moves evaluation to the main thread for the session, and a failed fallback import is retried under a new URL (the browser remembers a failed import by URL). Assigning to `end` says it is a reserved word, and a row's old error text is cleared when a shorter message replaces it.

Tags in calculations: trailing `#tags` label a line only when the code before them is a
finished expression (`isCompleteCode` in `parseLine.js`); after an operator, `=`, `(` or a
word operator (`5 + #food`, `x = #food`) the tag is an operand and the line is not
tagged. `substituteTags` replaces an optional `sum|total|average|avg [of]` and a run of
adjacent tags with one value, computed as the same request on its own line is, so
`sum #food * 2` and `#food #drink * 2` apply the operator to the request. A tag request
counts the tagged value lines above it.

Other phrases fixed at the text level: `time to` takes an optional verb (a number is never
one, or the amount's own number was dropped); `days until|since|between … in|to|as <unit>`
is a calendar phrase with a conversion on the end, so the measures step skips it and the
grammar converts the day count; `workdays in` accepts a period or a plain run of
number-and-unit pairs (`parseDurationExact`) and reports anything else instead of
adding the pairs it happens to contain; and a name followed by one bare-letter
duration (`width + 30 m`) is ordinary arithmetic, while a date, or a name followed by
a full duration word (`start + 2 days`), is still date arithmetic.

A measurement written in two units of one dimension, with nothing between them
(`6 ft 2 in`, `1 m 80 cm`, `1 lb 4 oz`), is read by mathjs as a product, so it was an area.
`preprocessUnitRuns` (`js/eval/unitRuns.js`, the first preprocessing step) turns such a
run of length, mass or metric volume into `((6 ft + 2 inch) to inch)`: their sum, in the
smallest unit named, as one operand, so a trailing `to cm` still works. Runs of different
dimensions or of one unit twice are left alone. Time runs are joined by `timespan.js`,
which also reads `min` and `sec` as the unit wherever a unit goes (after a number, as a
conversion target, in a compound such as `km/min`) while `min(2, 3)` stays the function.
In `rates.js`, `at` joins operands of any length, only lowercase `a`/`an` are rate words
(a capital `A` is the ampere) and never before `to`/`as`/`in`, and a variable named `a`
is not one.

mathjs reads `%` followed by `+` or `-` as the remainder operator, so `50 + 10% + 1` was
`50 + (10 % (+1))` and gave 50. `preprocessPercent` (`js/eval/percentage.js`) sets such a
percentage apart: as the right operand of an additive chain it closes the chain
(`(50 + 10%) + 1`, which is what `50 + 10%` already means), and elsewhere it stands
alone (`(10%) + 5`, and the `5%` in `(10%) + 5%`); `10 % 3` is still the remainder.
A phrase's operand ends at the end of the line, an unbalanced closing bracket, a comma, the
operator in front of another percent phrase (`10% of 50 + 10% of 20` is two phrases), or a
trailing conversion or rounding clause (`to 2 dp`, `in EUR`), which then applies to the whole
result; otherwise a phrase still takes the rest of the line, so `10% of 50 + 5` is 5.5. The
percentage may be a number or a variable (`x% of 80`). The `of`/`on`/`off` phrases take a sign that belongs to the percentage (`-20% on 50`,
but not the binary minus in `10 - 20% on 50`), and each replacement is parenthesised so
it stays one operand of whatever surrounds it.

A bare unit (`USD`, `km`, `hour`) has no amount, so it showed as 0 and counted as 0 in
totals while `USD * 5` and `USD to EUR` read it as 1; `evaluateLine` stores it as one
of that unit, and a valueless operand elsewhere (`USD + 1 USD`) gets a plain hint
instead of mathjs's "contains a unit with undefined value".

Float residue is not an answer. `0.1 + 0.2 - 0.3` is 5.6e-17 in binary doubles, so
`evaluateLine` snaps a number result that is below 1e-12 of the largest number written
in the expression to 0, but only when the expression adds or subtracts at least two
written numbers (a value that is small on its own, `1e-8`, or `tiny * 1`, is a small
answer, not residue, and stays; digits inside names are not numbers), and an aggregate snaps a sum that cancels below 1e-12 of its
largest term. Whatever residue is left reads `0…`, like any value below the
precision step, instead of ten digits of exponent that ignore the setting.
`formatNumber` first rounds a value to 15 significant digits, so one ulp of binary
noise (`700000.0000000001`) is not drawn as exact trailing digits, and then shows the
ellipsis whenever that cleaned value was cut by the precision, at every precision and
size; a scientific result follows the precision too (`1.845e+19…`).

Which unit a compound result is shown in must depend only on that line. mathjs's
`simplify()` follows its current unit system, and the default (`auto`) remembers the
last unit of each dimension it parsed anywhere, so the same line once read `gallon`
or `BTU` depending on other lines, deleted lines and other tabs. The engine therefore
runs on the fixed `si` system, and every simplification goes through `simplifyLocal`
(`js/core/unitSimplify.js`), which builds a one-off preference list from SI plus the
unit's own factors (the first unit of each dimension it was written with, prefix
included) and restores the system afterwards. `24 km a day for a year` stays in km,
`5 N * 2 m` is `J`, and `2 m * 300 cm * 4 m` is `24 m^3`, whatever else is in the sheet.

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
from cached values, and only re-evaluates from there. The variables are one object
for the engine's life, cleared and refilled by that rebuild, and a variable is
restored only from a cached row that assigned it (each row records its `label` and
what it `assigned`): a user function keeps the scope it was defined in, so a new
object per run would leave functions above the first changed line reading
variables from a run that no longer exists. Each line goes through
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
over the same two sources. mathjs changes a list or object in place when an element
is assigned (`n[2] = 99`), and that object is also held by the rows above, by any
variable set from it and by `prev`; so such a line works on a private copy of its
base variable and records the base's new value as the variable (the row's `value`
is still what was assigned), and a restored variable is therefore never mutated.
`f(x) = x * 2` is kept as the variable `f` (the line's own scope is dropped after
the line, and its label `f(x)` names nothing), so it shadows a built-in and survives
an incremental edit.

When an assignment to a plain name fails, the name is bound to a _failure_: reading
it raises `"x" has an error on line 2`, so a later line cannot quietly use an older
value, or a unit or constant of the same name (`m = foo` then `m * 3`). The row
remembers the label (`failedLabel`) so a rebuild binds the same failure, and the next
successful assignment replaces it (the marker has a setter for that). Reserved words
and element or function targets are not bound, and code that reads variables
generically must not trip over one (`in` rather than a value read).

A line `unit widget = 3.5 kg` defines a custom unit (`js/core/userUnits.js`
parses it, `js/eval/userUnits.js` registers it with its plural and removes it
when the line goes). A definition is excluded from the total and from `prev`,
and a name already taken by a built-in unit, a symbol or a reserved word is an
error. A unit defined from money (`unit coffee = $4.5`) records its currency on its
own mathjs definition (`createUserUnit`), and the aggregates classify a value by
`moneyCurrency` (`js/core/unitForm.js`), not by its name, so `3 coffees` totals with
`$10`, and two such units on different currencies raise the same conflict as two
currencies do. mathjs decides when a function body is compiled whether a free symbol names a
unit, so a function defined above a `unit` line would never see it; the engine
re-checks in `SymbolNode.onUndefinedSymbol`, which is reached when the function is
called.

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
calls, so ordinary lines skip the extra parse. It also rejects an indexed
assignment past the cap (`n[1000000000] = 1` grows the list to fit), because a
parsed assignment does not go through the maths namespace.

A static check can only read sizes that are literals, so `js/core/sizeLimits.js`
enforces the same cap where the allocation happens. It wraps every size-taking
function (`ones`, `zeros`, `identity`, `random`, `randomInt`, `resize`, `reshape`,
`matrixFromFunction`, `kron`, `diag`, `concat`, `sparse`, `setCartesian`, `range`,
`subset`) to count what it is about to build from its already-evaluated
arguments (sizes held in variables, lists and BigNumbers included) and to throw
past 100 items; `setPowerset` is capped at 16 elements because it doubles with
each one. A worker that runs out of memory takes the whole tab down, so
`test/sizeLimits.test.mjs` runs these lines in a child process with a small heap.

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
which re-checks hourly; a cached table counts as current for just under an hour,
so a table fetched before the day's rates were published is replaced on the next load
or hourly check; a fetch times out after 10 s and falls back to the cached
rates, reported as `source: 'stale'`) and, on each `CURRENCY_UPDATED`, calls
`evalClient.syncRates`. That posts a `{ type: 'setting', name: 'rates', value }`
message and, when the main-thread fallback is in use, calls
`registerCurrencyRates` on its engine directly. A lazy `calculate.js` import is
the fallback when `Worker` is unavailable or dies. `evalClient` remembers the last
value of every setting, and the last rates, it was told, and seeds a restarted
worker and a freshly loaded fallback engine from those; storage is only the answer
before anything was sent. A restart is internal recovery and must not change results
because a storage write failed or another window changed a setting. Registering a
rates table identical to the one already registered is ignored by the engine: the
same table arrives twice on every load (the seed, then the cached-rates event), and
each registration would otherwise discard the whole per-line cache. When a reply is
dropped because the sheet moved on, its `startLine` is remembered and the next
rendered reply is widened to it, since the engine's cache has already advanced and
the next reply only covers what changed since. The base currency (`BASE`) is
defined once in `js/core/currencySymbols.js`.

A sheet that still kills the tab (an out-of-memory worker takes the whole
renderer with it) would otherwise be restored and re-run on every load, with no
way to reach Settings. `js/storage/evalGuard.js` breaks that loop: before a sheet
is evaluated its fingerprint is stored as _running_, and cleared when the reply or
a failure arrives (and on `pagehide`, so a normal close is not mistaken for a
crash). If the next load finds a _running_ fingerprint, the page died mid-
evaluation, and that exact sheet text is kept on a short list of paused sheets.
`evalClient.update` does not evaluate a paused sheet: it draws the typed text,
clears any results, and reports `code: 'paused'`, which `js/index.js` shows as a
notice that outlives the rate messages. Any edit changes the fingerprint, so one
keystroke calculates the sheet again.

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
**snapshots** of each tab (id, name, content, timestamp, and its position in the
bar, capped at 10 per tab) are auto-saved to IndexedDB (`js/storage/snapshots.js`) on a pause in typing and
on blur/tab-switch/close/pagehide; the content is stored deflated through
`js/util/compress.js` when the platform supports it, and inflated on read.

Each write of the collection carries a `savedAt` timestamp. If a write fails
(the quota is full, or storage is blocked), the saved collection stays at its last
good write while snapshots, which live in IndexedDB, keep up. On load,
`newerSnapshots` (in `js/core/tabsState.js`) picks the snapshots saved after
`savedAt` that hold work the collection lacks (a tab it never saved, or different
text) and `recoverNewerSnapshots` merges them in, unless that tab was edited since
the page opened; a notice says so. Comparing content as well as time matters: a
snapshot is normally saved a moment after the collection and is newer without being
different. `js/util/storage.js` reports why a write failed (`reason: 'full'` or
`'blocked'`) and announces the first write that works again (`STORAGE_OK`), and the
status line holds the storage notice until then instead of letting it time out; a
held notice is one rate messages do not replace.

A tab the app fills in itself (a template or share import through `openSheet`,
the Welcome sheet through `seedSheet`) is never typed in, so no edit would ever
snapshot it; both snapshot it as soon as it is filled in, or a restore would not
know it existed.

If localStorage is unavailable or corrupt on load, the collection is rebuilt
from the latest snapshot of each tab; a corrupt value is first copied to
`math-notes-tabs-backup` so it is never silently lost. Settings shows every
snapshot grouped by tab (not just the latest) plus a "restore all" action, and
closing a tab deletes its snapshots. Both paths go through `mergeSnapshots` in
`js/core/tabsState.js`: a snapshot only supplies a tab's name and content, the
open tabs keep their order and the active tab, a tab with no snapshot is kept,
and snapshots of tabs that are no longer open are appended by their recorded
position. The rebuild after unreadable storage also drops the one fresh empty tab
the app wrote over the unreadable collection.

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
Examples content is cached too, so the modal works on a first offline visit. The install fails
if any asset fails (a half-cached version could mix new and old modules; the browser retries
on the next visit), and each asset is fetched with `cache: 'reload'`, so a release installed
within the HTTP cache's `max-age` of the last visit still caches its own files, not the
previous release's. The documentation, the manifest and the icons are cached at run time, and
`scripts/sw-manifest.mjs` hashes them too (`watchedFiles`), so a docs-only change bumps the
cache and reaches returning visitors. Both the app
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
