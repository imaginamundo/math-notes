# App & platform

Math Notes is a progressive web app: it installs like a native app, works offline, and respects your system preferences.

## Install

Open the app in a modern browser and use the browser's **Install** or **Add to Home Screen** action. Once installed it launches in its own window, with no address bar or browser chrome.

## Offline

A service worker keeps the app available offline. After the first visit, the app shell and its code are served from the cache; a new version is installed in the background and takes over on a later visit, once every tab has closed, so an open page never mixes versions.

Currency rates are cached too, so conversions keep working offline using the most recent rates the app has seen.

## Keyboard shortcuts

The common actions have a shortcut; the full list is in [Reference](/docs/reference/). The most common ones:

| Shortcut | Action |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Undo |
| `⇧⌘Z` `Ctrl+Shift+Z` | Redo |
| `⌘F` `Ctrl+F` | Find & replace |
| `⌘G` `Ctrl+G` | Jump to a line |
| `Ctrl+Space` | Autocomplete |
| `Tab` `Shift+Tab` | Indent / outdent at a line start |
| `Esc` | Leave the editor for the tab bar |
| `⇧⌘C` `Ctrl+Shift+C` | Copy the current line's result |
| `⇧⌘S` `⇧⌘L` `Ctrl+Shift+S` `Ctrl+Shift+L` | Copy a share link (`L` also works where the browser reserves `Ctrl+Shift+S`) |

## Accessibility

- The text size control scales from your browser's default size, so it honours your system preference.
- The editor has an accessible label, the status bar announces state with `aria-live`, and the active line's result is announced through a separate polite live region.
- The autocomplete keeps the editor a plain text box (`aria-controls`, `aria-autocomplete`) and announces the number of suggestions and the highlighted one through a status message.
- Tabs can be renamed from the keyboard (`F2`) or by touch (press and hold).
- The tab bar is a roving-tabindex tablist: `Tab` reaches it in one stop, `←`/`→` switch tabs, and `Delete` / `Backspace` closes the focused tab.
- The editor never traps the keyboard: `Tab` indents at a line start and moves focus on anywhere else, and `Esc` leaves the editor for the tab bar (an open suggestion popup or find bar takes `Esc` first).
- The modals are native `<dialog>` elements with a labelled header and a close button that is reachable by keyboard, and closing one returns focus to the button that opened it.
- The total bar's aggregate is a labelled `<select>`.
- The documentation you are reading is static HTML with a skip link, landmarks and a keyboard-reachable sidebar.
