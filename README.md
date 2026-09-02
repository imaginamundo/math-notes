# Math Notes

An inline calculator that runs in the browser. Type calculations line by line
and each result appears right beside it as ghost text, with an automatic
running total.

Based on [Numi](https://numi.app/).

## Features

- **Line-by-line evaluation** with an automatic total of numeric results.
- **Tabs** for separate worksheets — rename by double-clicking a tab, close with
  `×` (you're asked to confirm), add with `+`, or drag a tab to reorder it.
  Switch with `Ctrl+Tab` or `⌘1…9` / `Ctrl+1…9`. Everything is saved locally.
- **Undo / redo** per tab — `⌘Z` / `Ctrl+Z` (and `⇧⌘Z` to redo) restores the
  last change, with a separate history for every tab.
- **Variables and functions**: `price = 30`, `double = f(x) = x * 2`.
- **Sequences and iteration**: mathjs ranges — `1:5` makes `[1, 2, 3, 4, 5]`,
  `1:2:10` steps by 2, and calling a function with a range applies it to every
  element (`double(1:5)`); aggregate with `sum(1:100)` or `mean(1:5)`.
- **`prev`** — reference the previous line's result.
- **`sum` / `total` / `average` / `avg`** — aggregate the lines above (until a
  blank line).
- **Comments** with `#` and **labels** like `Price: 10 + 5`.
- **Unit conversion** (`1 cm to m`) including CSS units (`px`, `em`, `point`).
- **Currency conversion** (`100 USD to EUR`, `$5 to GBP`, `R$5 to EUR`) with
  live rates from the European Central Bank, cached for offline use.
- **Percentages**: `20% of $10`, `5% on $30`, `6% off 40 EUR`,
  `$50 as a % of $100`, `5% of what is 6`.
- **Number scales**: `2k`, `2M eur`, `5 million`.
- **Word operators**: `8 times 9`, `2 plus 3`, `10 minus 3`, `6 multiplied by 7`.
- **Function aliases**: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`.
- **Dates**: `fromunix(1446587186)`, `unix()`.
- **Find & replace** — press `⌘F` / `Ctrl+F` to search the active sheet with
  live match highlighting, then replace one or all matches.
- **Line numbers** — a left gutter numbers the sheet and highlights the line
  the caret is on.
- **Auto-saved snapshots** — every tab's edits are backed up to IndexedDB and
  can be recovered from the **Settings** modal; sheets are rebuilt automatically
  if localStorage is unavailable or corrupt.
- **Keyboard shortcuts** (see below).
- Offline-first PWA via a service worker, with a maskable icon and store
  screenshots in the manifest.
- **Rich link previews** — Open Graph and Twitter card tags with a generated
  cover image, plus a canonical URL, `robots.txt` and `sitemap.xml`.

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
| `⇧⌘C` / `Ctrl+Shift+C`         | Copy the current line's result  |
| `⇧⌘E` / `Ctrl+Shift+E`         | Export the active sheet         |
| `⇧⌘I` / `Ctrl+Shift+I`         | Import a sheet                  |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Clear the active sheet          |

The **Help** button opens the full reference with clickable examples.

## Reserved words

`prev`, `sum`, `total`, `average` and `avg` are treated as operators, so they
cannot be used as variable names.

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

### Tests

The calculation pipeline is pure and covered by the Node test runner:

```sh
npm test
```

### Architecture

- `js/core/` — parsing and evaluation (`calculate.js`, `parseLine.js`,
  `preprocess.js`, `aggregate.js`).
- `js/eval/` — mathjs extensions and preprocessors (`aliases.js`, `cssUnits.js`,
  `currency.js`, `datetime.js`, `scales.js`, `symbols.js`, `wordOperators.js`,
  `percentage.js`).
- `js/render/` — highlighting and result rendering.
- `js/ui/` — tabs, modals, help, recipes, settings, find & replace, line
  numbers, import/export, shortcuts and font controls.
