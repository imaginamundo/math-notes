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
- **Tour** — the guided walkthrough (`js/ui/tour.js`): a data-driven `STEPS`
  array, one popover, and an `outline` ring on the anchor.
- **Tour step** — `{ anchor, title, body, placement }`. `anchor` is a CSS
  selector for a real element of the UI.
