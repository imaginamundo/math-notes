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
- **Objects**: `invoice = {subtotal: 120, tax: 12}` then reach fields with a
  dot — `invoice.subtotal + invoice.tax`.
- **Sequences and iteration**: mathjs ranges — `1:5` makes `[1, 2, 3, 4, 5]`,
  `1:2:10` steps by 2, and calling a function with a range applies it to every
  element (`double(1:5)`); aggregate with `sum(1:100)` or `mean(1:5)`.
- **`prev`** — reference the previous line's result.
- **`sum` / `total` / `average` / `avg`** — aggregate the lines above (until a
  blank line), following the total's unit rule.
- **Groups** — wrap lines in `Groceries:` … `end` to show a subtotal on the
  header line and shade the block; the inner lines still count in the bottom
  total.
- **Comments** with `#` and **labels** like `Price: 10 + 5`.
- **Unit conversion** (`1 cm to m`) including CSS units (`px`, `em`, `point`).
- **Currency conversion** (`100 USD to EUR`, `$5 to GBP`, `R$5 to EUR`) with
  live rates from the European Central Bank, cached for offline use.
- **Percentages**: `20% of $10`, `5% on $30`, `6% off 40 EUR`,
  `$50 as a % of $100`, `5% of what is 6`.
- **Number scales**: repeated `k` — `2k` (2,000), `1kk` (1,000,000),
  `1kkk` (1,000,000,000).
- **Word operators**: `8 times 9`, `2 plus 3`, `10 minus 3`, `6 multiplied by 7`.
- **Function aliases**: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`.
- **Dates**: `fromunix(1446587186)`, `unix()`.
- **Find & replace** — press `⌘F` / `Ctrl+F` to search the active sheet with
  live match highlighting, then replace one or all matches.
- **Line numbers** — a left gutter numbers the sheet and highlights the line
  the caret is on. Click a number to comment or uncomment that line.
- **Jump to line** — press `⌘G` / `Ctrl+G` and type a line number to move the
  caret there quickly.
- **Text size** — the footer's − / + steps the editor text as a percentage of
  your browser's default font size (100% = your setting), so it respects
  accessibility preferences.
- **Auto-saved snapshots** — every tab's edits are backed up to IndexedDB and
  can be recovered from the **Settings** modal; sheets are rebuilt automatically
  if localStorage is unavailable or corrupt.
- **Shareable links** — the **Share** button copies a link with the active
  sheet packed into its `#` fragment. No server, no database, and because it is
  a fragment the sheet is never sent to the origin, never lands in an access
  log, and is not forwarded in a `Referer` header. Opening one asks first, then
  adds a new tab — it never overwrites the sheet you already have.
- **Onboarding** — a first visit opens with a working `Welcome` sheet instead
  of an empty page, plus a five-step tour of the interface. Both are
  dismissible, and **Settings → Replay tutorial** brings the tour back.
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
  `preprocess.js`, `aggregate.js`, `history.js`).
- `js/eval/` — mathjs extensions and preprocessors (`aliases.js`, `cssUnits.js`,
  `currency.js`, `datetime.js`, `scales.js`, `symbols.js`, `wordOperators.js`,
  `percentage.js`).
- `js/render/` — highlighting and result rendering.
- `js/ui/` — tabs, modals, help, recipes, settings, find & replace, line
  numbers, import/export, shortcuts and font controls.
- `js/util/` — shared pure helpers (debounce, storage, clipboard, text, scroll,
  sequence).
