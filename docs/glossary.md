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
- **Sparkline** — an eight-level Unicode block rendering of a numeric list,
  appended after a line's ghost result (`js/render/sparkline.js`). Built in the
  worker, from the real array, before serialization.
- **Plot** — the modal (`js/ui/plot.js`) that draws a single-argument sheet
  function over a domain, sampled in the worker at 64 points.
- **Function tag** — the clone-safe `{ name, arity }` recorded on a result that
  defines a function. The function itself never leaves the worker; the tag is
  what the plot picker lists.
