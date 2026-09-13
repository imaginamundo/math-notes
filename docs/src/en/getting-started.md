# Getting started

Math Notes is a sheet of lines. You write one calculation per line and the answer appears to the right of it as a dimmed hint. There is no **=** button and no cell grid: the sheet recalculates as you type.

```calc returns 2
1 + 1
```

```calc returns 7
2 * 3 + 1
```

A line can be a plain number, an expression, an assignment, a comment, or a label followed by an expression. The result of the last line is also shown in the total bar at the bottom.

## The screen

- The **editor** is the large text area. Its ghost layer shows results, tags and errors in place.
- The **total bar** sits under the editor and aggregates the sheet. Use its dropdown to switch between **total**, **average** and **median**.
- The **footer** holds text-size controls and the **Share**, **Settings**, **Examples** and **Help** buttons.
- The **tabs bar** at the top holds separate sheets (see [Files, sharing & data](/docs/files/)).

## Results

Results are formatted with thousands separators and written with the unit or currency they carry.

```calc 1,000,000
1000000
```

```calc 0.01 m
1cm to m
```

By default a result shows up to **3 decimal places**. A value with more precision ends with an ellipsis, while the calculation itself keeps full precision. Change this in **Settings → Decimal precision** (see [Settings & appearance](/docs/settings/)).

When a line cannot be evaluated, the error appears inline in red. Errors never stop the rest of the sheet from evaluating.

## Editing

- **Indentation** — `Tab` indents the current line or a multi-line selection, `Shift+Tab` outdents it. Indentation is two spaces and does not change how a line is evaluated.
- **Comment a line** — click a line's number in the left gutter to comment or uncomment it. A line that already starts with `##` just loses one `#`.
- **Line numbers** — the left gutter numbers the sheet and highlights the line the caret is on.
- **Undo / redo** — `⌘Z` / `Ctrl+Z` and `⇧⌘Z` / `Ctrl+Shift+Z`, with a separate history for every tab.
- **Jump to line** — `⌘G` / `Ctrl+G`, then type a line number.
- **Find & replace** — `⌘F` / `Ctrl+F` searches the active sheet with live match highlighting, then replaces one or all matches.
- **Text size** — the footer's **−** / **+** step the editor between 50% and 200% of your browser's default font size; **Reset size** returns to 100%.

## Autocomplete

As you type, a popup suggests the sheet's variables and `#tags` plus the built-in functions, keywords, constants and units. Press `Ctrl+Space` to open it on demand. `↑`/`↓` choose, `Enter`/`Tab` insert, `Esc` dismisses.

## First run

A first visit opens with a working **Welcome** sheet instead of an empty page — variables, labels, `sum`, tags, unit durations, percentages and dates. Use its **Keep content** / **Clear content** buttons to dismiss it or empty the sheet.

## Offline

Math Notes is an installable PWA. After the first visit a service worker keeps the app available offline; currency rates are cached so conversions keep working too. See [App & platform](/docs/app/).
