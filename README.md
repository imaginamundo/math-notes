# Math Notes

An inline calculator that runs in the browser. Type calculations line by line
and each result appears right beside it as ghost text, with an automatic
running total.

Based on [Numi](https://numi.app/).

## Features

- **Line-by-line evaluation** with an automatic total of numeric results.
  Plain numbers fold into a single unit, compatible units (e.g. `cm` + `m`)
  merge into the largest present, and mixed currencies/units fall back to the
  plain numeric sum.
- **Tabs** for separate worksheets — rename by double-clicking a tab, close with
  `×` (you're asked to confirm), add with `+`, or drag a tab to reorder it.
  Switch with `Ctrl+Tab` or `⌘1…9` / `Ctrl+1…9`. Everything is saved locally.
- **Undo / redo** per tab — `⌘Z` / `Ctrl+Z` (and `⇧⌘Z` to redo) restores the
  last change, with a separate history for every tab.
- **Variables and functions**: `price = 30`, `double = f(x) = x * 2`.
- **Multi-word variables**: `monthly rent = 1500`, then `monthly rent * 12`.
- **Line references**: `line(3)` uses the result of line 3. Only lines above
  can be referenced.
- **Objects**: `invoice = {subtotal: 120, tax: 12}` then reach fields with a
  dot — `invoice.subtotal + invoice.tax`.
- **Sequences and iteration**: mathjs ranges — `1:5` makes `[1, 2, 3, 4, 5]`,
  `1:2:10` steps by 2, and calling a function with a range applies it to every
  element (`double(1:5)`); aggregate with `sum(1:100)` or `mean(1:5)`. Lists and
  ranges are capped at 100 items.
- **`prev`** — reference the previous line's result.
- **`sum` / `total` / `average` / `avg`** — aggregate the lines above (until a
  blank line), following the total's unit rule.
- **Groups** — wrap lines in `Groceries:` … `end` to show a subtotal on the
  header line and shade the block; the inner lines still count in the bottom
  total, and `sum`/`average` inside a group total that group.
- **Indentation** — `Tab` indents and `Shift+Tab` outdents the current line or
  a multi-line selection (two spaces).
- **Comments** with `# ` (hash + space) and **labels** like `Price: 10 + 5`.
- **Tags** — `20 #food` labels a line; a line that is only `#food` (or
  `sum`/`total`/`average`/`avg`, optionally `of`, before the tag) totals the
  tagged lines above, across the whole sheet. Tags can also be used in
  calculations (`#food * 2`, `#food + #other`).
- **Unit conversion** (`1 cm to m`) including CSS units (`px`, `em`, `point`).
- **Cooking & measures** — convert between dimensions with a free-form,
  optional subject label: `300g butter in cups`, `2 cups flour in grams`,
  `300g in cups` (subject optional), or `300g feathers in cups`. Known subjects
  supply a factor — cooking and material densities, fuel energy density
  (`1 l petrol in kWh`) and media bitrate (`2 hours 4k video in GB`) — and any
  other label falls back to water. Volume units follow the measurement system
  in Settings — Metric (default), US customary or Imperial, each with a `cup`
  (250 / 236.6 / 284.1 ml).
- **Rates** — `per`/`a`/`at`/`for` phrasing on top of compound units:
  `10 km per day`, `30 hours at 10 km/hour`, `$24 a day for a year`,
  `time to upload 3 GB at 10 MB/s`, and pace `5 km in 25 min` → `05:00/km`.
- **Currency conversion** (`100 USD to EUR`, `$5 to GBP`, `R$5 to EUR`) with
  live rates from the European Central Bank, cached for offline use.
- **Percentages**: `20% of $10`, `5% on $30`, `6% off 40 EUR`,
  `$50 as a % of $100`, `5% of what is 6`.
- **Number scales**: repeated `k` — `2k` (2,000), `1kk` (1,000,000),
  `1kkk` (1,000,000,000).
- **Rounding** — Soulver-style phrases: `1/3 to 2 dp`, `pi to 5 digits`,
  `5.5 rounded` / `rounded up` / `rounded down`, `37 to nearest 10`,
  `$490 rounded to nearest hundred`, and `0.534 to nearest 16th` (shown as a
  fraction). Works with units and currencies.
- **Word operators**: `plus`, `minus`, `times`, `multiplied by`, `divided by`,
  `with`, `without` and `mul` (`8 times 9`, `10 divided by 2`).
- **Function aliases**: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`; `π`
  is accepted for `pi`.
- **Dates**: `fromunix(1446587186)`, `unix()`.
- **Timespans** — `5.5 minutes as timespan` → `5 min 30 s`,
  `72 days as timespan` → `10 weeks 2 days`, `3h 5m 10s` →
  `3 hours 5 minutes 10 seconds`, and `12.5 minutes in minutes and seconds`
  → `12 min 30 s`. A timespan is a real duration, so it can be added
  (`line(1) + 1h`) or multiplied.
- **Find & replace** — press `⌘F` / `Ctrl+F` to search the active sheet with
  live match highlighting, then replace one or all matches.
- **Line numbers** — a left gutter numbers the sheet and highlights the line
  the caret is on. Click a number to comment or uncomment that line.
- **Jump to line** — press `⌘G` / `Ctrl+G` and type a line number to move the
  caret there quickly.
- **Text size** — the footer's − / + steps the editor text between 50% and 200%
  of your browser's default font size (100% = your setting), and **Reset size**
  returns to 100%, so it respects accessibility preferences.
- **Decimal precision** — results show up to 3 decimal places by default
  (**Settings → Decimal precision**). A truncated result ends with `…`; the
  calculation itself keeps full precision.
- **Auto-saved snapshots** — every tab's edits are backed up to IndexedDB and
  can be recovered from the **Settings** modal; sheets are rebuilt automatically
  if localStorage is unavailable or corrupt.
- **Shareable links** — the **Share** button copies a link with the active
  sheet packed into its `#` fragment. No server, no database, and because it is
  a fragment the sheet is never sent to the origin, never lands in an access
  log, and is not forwarded in a `Referer` header. Opening one asks first, then
  adds a new tab — it never overwrites the sheet you already have.
- **Onboarding** — a first visit opens with a working `Welcome` sheet instead
  of an empty page, plus a five-step tour of the interface. The sheet offers
  **Keep content** / **Clear content** to dismiss or empty it. Both are
  dismissible, and **Settings → Replay tutorial** brings the tour back.
- **Examples** — the **Examples** button opens ready-made sheets (bill splits,
  recipe scaling, unit prices, savings goals, interest, fuel cost, running pace,
  upload time, BMI and more) that drop into the editor with one click.
- **Keyboard shortcuts** (see below).
- Offline-first PWA via a service worker.

## Example

```
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people   → 15
```

## Keyboard shortcuts

| Shortcut                       | Action                          |
| ------------------------------ | ------------------------------- |
| `⌘Z` / `Ctrl+Z`                | Undo the last change in the tab |
| `⇧⌘Z` / `Ctrl+Shift+Z`         | Redo                            |
| `Ctrl+Tab` / `Ctrl+Shift+Tab`  | Next / previous tab             |
| `⌘1…9` / `Ctrl+1…9`            | Jump to the nth tab             |
| `⌘F` / `Ctrl+F`                | Find & replace in the sheet     |
| `⌘G` / `Ctrl+G`                | Jump to a line number           |
| `Tab` / `Shift+Tab`            | Indent / outdent the line(s)    |
| `⇧⌘C` / `Ctrl+Shift+C`         | Copy the current line's result  |
| `⇧⌘S` / `Ctrl+Shift+S`         | Copy a share link               |
| `⇧⌘L` / `Ctrl+Shift+L`         | Copy a share link (alternate)   |
| `⇧⌘E` / `Ctrl+Shift+E`         | Export the active sheet         |
| `⇧⌘I` / `Ctrl+Shift+I`         | Import a sheet                  |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Clear the active sheet          |

The **Help** button opens the full reference with clickable examples.

## Reserved words

`prev`, `sum`, `total`, `average` and `avg` are treated as operators, so they
cannot be used as variable names. `end` closes a group (and is reserved by
mathjs anyway).

## Development

There is no runtime build step: the app runs as plain ES modules. Only the
math.js dependency is pre-bundled and committed in `js/lib/`.

Run the app locally with:

```sh
npm run dev
```

### Tests

The calculation pipeline is pure and covered by the Node test runner, and the
DOM-heavy behavior (find & replace, undo, snapshots, tab reordering) is covered
by browser tests driven through puppeteer:

```sh
npm test
```

### Updating math.js

The pinned version lives in two places, keep them in sync:

- the import in `js/lib/math.js`
- the `mathjs` devDependency in `package.json`

Regenerate the bundle, then minify it into the file the app loads:

```sh
make -C js/lib
```

### Architecture

- `js/core/` — parsing and evaluation (`calculate.js`, `parseLine.js`,
  `preprocess.js`, `aggregate.js`, `multiWordVariables.js`, `currencySymbols.js`,
  `tabsState.js`, `history.js`).
- `js/eval/` — mathjs extensions and preprocessors (`aliases.js`, `cssUnits.js`,
  `currency.js`, `datetime.js`, `measures.js`, `rates.js`, `rounding.js`,
  `scales.js`, `symbols.js`, `timespan.js`, `units.js`, `wordOperators.js`,
  `percentage.js`).
- `js/render/` — highlighting and result rendering.
- `js/ui/` — tabs, modals, help, examples, onboarding and the tour, starter
  prompt, settings, find & replace, go-to-line, line numbers, indentation,
  import/export, sharing, shortcuts and font controls.
- `js/util/` — shared pure helpers (debounce, storage, clipboard, text, scroll,
  sequence).
