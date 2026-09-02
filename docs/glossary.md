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
  (`renderTotal`).
- **Tab** — a worksheet. `TabState` is `{ tabs, activeId, nextTabNumber }`;
  each `Tab` is `{ id, name, content }`.
- **Snapshot** — a versioned backup of a tab (id, name, content, timestamp)
  stored in IndexedDB and capped at 10 per tab.
- **Worker** — the Web Worker (`js/worker.js`) that evaluates sheets off the
  main thread.
- **Fallback** — main-thread evaluation used only when `Worker` is unavailable;
  `js/core/calculate.js` is lazy-imported for it.
- **Burst** — a run of edits grouped into a single undo step by the 700ms idle
  timer.
- **Aggregate** — `sum`/`total`/`average`/`avg` keywords that combine the
  numeric lines above (stopping at a blank line).
- **`prev`** — a scope variable holding the previous line's result.
- **Preprocessors** — the regex transforms run before mathjs, in order: scales,
  symbols (currency), percentages, word operators.
- **Currency context** — places where a 3-letter code is treated as a unit
  (next to a number or a `to`/`in` conversion), so codes used as variables stay
  lowercase.
- **Group** — one logical unit spanning one or more physical lines, produced by
  the grouping pre-pass in `js/core/blocks.js`. Every line gets a `kind`
  (`code`, `comment`, `fence`, `continuation`, `blank`), an `ownerIndex` and a
  `startIndex`.
- **Fence** — a `###` line. It toggles block-comment mode.
- **Block comment** — the lines between two fences (or from a fence to the end
  of the sheet). Not evaluated, no ghost result, excluded from the total; a
  blank line inside one does not reset an aggregate block.
- **Continuation** — a line that ends in a dangling operator or an explicit
  `\` and therefore joins with the line below. Its result renders on the
  **owner**, the last physical line of the run.
- **Owner** — the line of a group whose result is rendered and whose joined
  expression is evaluated.
