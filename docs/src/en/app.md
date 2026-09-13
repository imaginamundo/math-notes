# App & platform

Math Notes is a progressive web app: it installs like a native app, works offline, and respects your system preferences.

## Install

Open the app in a modern browser and use the browser's **Install** or **Add to Home Screen** action. Once installed it launches in its own window, with no address bar or browser chrome.

## Offline

A service worker keeps the app available offline. After the first visit, the app shell and its code are served from the cache and refreshed in the background, so later visits are instant and a lost connection does not interrupt your work.

Currency rates are cached too, so conversions keep working offline using the most recent rates the app has seen.

## Keyboard shortcuts

Every action has a shortcut; the full list is in [Reference](/docs/reference/). The most common ones:

| Shortcut | Action |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Undo |
| `⇧⌘Z` `Ctrl+Shift+Z` | Redo |
| `⌘F` `Ctrl+F` | Find & replace |
| `⌘G` `Ctrl+G` | Jump to a line |
| `Ctrl+Space` | Autocomplete |
| `Tab` `Shift+Tab` | Indent / outdent |
| `⇧⌘C` `Ctrl+Shift+C` | Copy the current line's result |
| `⇧⌘S` `Ctrl+Shift+S` | Copy a share link |

## Accessibility

- The text size control scales from your browser's default size, so it honours your system preference.
- The editor has an accessible label, the status bar announces state with `aria-live`, and the modals are native `<dialog>` elements with a labelled header and a close button that is reachable by keyboard.
- The total bar's aggregate is a labelled `<select>`.
- The documentation you are reading is static HTML with a skip link, landmarks and a keyboard-reachable sidebar.
