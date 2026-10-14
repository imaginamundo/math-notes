# Files, sharing & data

Math Notes keeps your work on your device. There is no account and no server: sheets are saved in your browser, backed up in a versioned local store, and shared only when you choose to.

## Tabs

Use the tabs at the top to keep separate worksheets. Every tab is saved automatically as you type.

- **Switch** — click a tab (or use `←`/`→` once focused, or `Ctrl+Tab`).
- **Reorder** — click and drag a tab to a new position.
- **Rename** — double-click the tab name (or press `F2` on a focused tab; on a touchscreen, press and hold).
- **Close** — click the `×`, or press `Delete` / `Backspace` on a focused tab (you are asked to confirm). Closing the last tab opens a fresh one.
- **Add** — click the `+` tab, or the `⌄` beside it to start from a template (budget, trip cost, invoice, savings goal, split a bill).

## Export and import

Use **Settings → Files** to download the active sheet as a text file, or load one from a file (`.txt`, `.numi` or plain text, up to 1 MB). Importing **replaces the content of the active sheet**, after asking for confirmation if the sheet is not empty; it does not open a new tab. Exports are named `math-notes-YYYY-MM-DD.txt`. The same actions are on `⇧⌘E` / `Ctrl+Shift+E` (export) and `⇧⌘I` / `Ctrl+Shift+I` (import).

## Share links

The **Share** button copies a link that carries the active sheet inside it. Anyone who opens it is asked whether to open the sheet in a new tab; it never replaces what they already have. The link is compressed, and you are warned if it grows past about 8,000 characters, since some apps cut long links; a link that unpacks to more than 256 KB is refused.

Nothing is uploaded. The sheet travels in the link's `#` fragment, which browsers never send to a server — it does not land in an access log and is not forwarded in a `Referer` header.

## Auto-saved snapshots

Every tab's edits are backed up to IndexedDB as versioned snapshots. Open **Settings → Recover** to see every snapshot, grouped by tab, and restore any of them, or use **Restore all from latest backup** to bring back every tab. It puts each tab's latest snapshot back and leaves tabs without one, their order and the active tab alone. Sheets the app fills in for you (a template, a shared sheet, Welcome) are backed up as soon as they open. Each tab keeps its 10 most recent snapshots, saved a couple of seconds after you stop typing. Closing a tab also removes its snapshots. Snapshots are stored deflated to keep them small.

If the app stops while it is calculating a sheet, that sheet's results stay paused when the page reloads (a notice says so), so one bad line cannot lock you out. Edit the sheet to calculate it again, or close the tab.

If localStorage is unavailable or corrupt, sheets are rebuilt automatically from the backups, and a corrupt value is copied aside rather than lost.

## Reset

**Settings → Reset → Reset data** clears the theme, tabs and all stored data back to their defaults, then opens a fresh **Welcome** sheet and restarts the tab counter. Export anything you want to keep first.

## Privacy

Sheets stay on your device. The only network request the app makes is for currency rates, and those are cached for offline use. See [About](/docs/about/) for the libraries involved.
