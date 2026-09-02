# AGENTS.md

Guidance for AI coding agents working on Math Notes.

## Overview

Math Notes is a browser-based inline calculator (a Numi-style sheet). You type
calculations line by line; each line's result appears inline as dimmed "ghost"
text, and a running total sits at the bottom. It runs as plain ES modules with
no build step and is installable as a PWA.

## Commands

- `npm run dev` — start the local static server (`http://localhost:8080`).
- `npm test` — Node test runner: pure-logic unit tests plus puppeteer browser
  tests (find & replace, undo, snapshots, tab reordering).
- `npm run lint` / `npm run lint:fix` — ESLint.
- `npm run format` / `npm run format:check` — Prettier.
- `make -C js/lib` — rebuild the committed mathjs bundle (after bumping the
  version in `js/lib/math.js` and `package.json`).

Always run `npm run lint`, `npm run format:check`, and `npm test` before
committing. Make one focused change per commit.

## Architecture (summary)

- The editor is a transparent `<textarea>` overlaid by a styled `#view` ghost
  layer. Both share identical metrics (font, line-height, padding,
  `white-space: pre`) and scroll position, mirrored in `js/index.js`.
- Evaluation runs in a Web Worker (`js/worker.js`) so heavy sheets never block
  typing. `evaluateLines` in `js/core/calculate.js` is the pure engine; it
  caches per-line results and only re-evaluates from the first changed line.
- The worker serializes every result value to a string before posting back
  (mathjs `Unit`/`BigNumber` instances lose their prototypes in structured
  clone). The main thread renders from those strings.
- Per-tab state lives in `js/ui/tabs.js`; current content persists to
  localStorage, and versioned snapshots are auto-saved to IndexedDB
  (`js/storage/snapshots.js`) and recoverable from Settings.

See `docs/architecture.md` for the full design and `docs/glossary.md` for the
project's terminology.

## Invariants you must not break

1. The `.content-editable` and `.view` layers must stay pixel-aligned: same
   font, line-height, padding, and `white-space`. They are content-sized grid
   cells inside `.editor-scroll`; keep them inside that scroll container (the
   textarea no longer scrolls natively). Change one only together with the
   other.
2. `.editor-scroll` is the scroll owner and `.line-row` is `width: max-content`,
   so a line's ghost result is scrollable content (scrolling to the end of a
   long line reveals it). `js/ui/editor.js` keeps the caret in view manually —
   the textarea has `overflow: hidden` and provides no native caret scrolling.
   Don't move the layers out of the scroll container or re-enable textarea
   scrolling without restoring caret tracking.
3. Worker results are pre-formatted strings; `renderInput`'s ghost formatting
   must accept both numbers (fallback path) and strings (worker path).
4. The view is built as `.line-row` block wrappers, and `find.js`'s text walker
   (`textNodesInOrder`) counts `.line-row` boundaries as newlines so match
   offsets map to the raw text. Keep that structure.
5. `evaluateLines` keeps a module-level cache (`cache.lines`, `cache.results`);
   results must stay correct across interleaved calls (the diff/recompute
   logic).
6. Aggregate blocks (`sum`/`average`/`total`) and `prev` depend on the per-line
   cache; incremental edits recompute from the first changed line.
7. Grouping (`js/core/blocks.js`) is **derived, never stored**, and the results
   array stays indexed by **physical line**. A group may span several lines,
   but it never collapses rows: one `.line-row` per physical line always. The
   recompute window widens back to `groups[firstDiff].startIndex`, which is
   only sound because the grouping pass looks backwards only.
8. Anything the main thread needs from the worker must be clone-safe. `kinds`
   is an array of plain strings for that reason; mathjs `Unit`/`BigNumber`
   instances and functions never survive the boundary.

## Conventions

- ES modules everywhere; no build step. One default export per `js/ui/*.js`
  init module; pure helpers are named exports and unit-tested.
- `js/core/` evaluation, `js/eval/` mathjs extensions/preprocessors,
  `js/render/` highlighting/formatting, `js/ui/` DOM behavior,
  `js/storage/` persistence.
- Guard every storage/worker call (localStorage, IndexedDB, clipboard may be
  unavailable); wrap in try/catch or `.catch(() => {})`.
- Worker updates are async: use the debounced `scheduleUpdate`/`flushUpdate` in
  `js/index.js`; `find` awaits `onUpdate` before applying marks.
