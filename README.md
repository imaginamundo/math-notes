# Math Notes

An inline calculator that runs in the browser. Type calculations line by line
and each result appears in the sidebar, with an automatic running total.

Based on [Numi](https://numi.app/).

## Features

- **Line-by-line evaluation** with an automatic total of numeric results.
- **Tabs** for separate worksheets — rename by double-clicking a tab, close with
  `×` (you're asked to confirm), add with `+`. Everything is saved locally.
- **Variables and functions**: `price = 30`, `double = f(x) = x * 2`.
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
- **Import / Export** of the active sheet as plain text.
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

| Shortcut | Action |
| --- | --- |
| `⇧⌘C` / `Ctrl+Shift+C` | Copy the current line's result |
| `⇧⌘E` / `Ctrl+Shift+E` | Export the active sheet |
| `⇧⌘I` / `Ctrl+Shift+I` | Import a sheet |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Clear the active sheet |

The **Help** button opens the full reference with clickable examples.

## Reserved words

`prev`, `sum`, `total`, `average` and `avg` are treated as operators, so they
cannot be used as variable names.

## Development

There is no runtime build step: the app runs as plain ES modules. Only the
math.js dependency is pre-bundled and committed in `js/lib/`.

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
- `js/ui/` — tabs, modal, help, shortcuts, import/export and font controls.
