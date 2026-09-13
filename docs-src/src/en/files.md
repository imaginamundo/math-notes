# Files, sharing & data

Math Notes keeps your work on your device. There is no account and no server: sheets are saved in your browser, backed up in a versioned local store, and shared only when you choose to.

## Tabs

Use the tabs at the top to keep separate worksheets. Every tab is saved automatically as you type.

- **Switch** — click a tab (or use `←`/`→` once focused, or `Ctrl+Tab`).
- **Reorder** — click and drag a tab to a new position.
- **Rename** — double-click the tab name.
- **Close** — click the `×` (you are asked to confirm).
- **Add** — click the `+` tab.

## Export and import

Use **Settings → Files** to download the active sheet as a text file, or load one from a file. The same actions are on `⇧⌘E` / `Ctrl+Shift+E` (export) and `⇧⌘I` / `Ctrl+Shift+I` (import).

## Share links

The **Share** button copies a link that carries the active sheet inside it. Anyone who opens it is asked whether to open the sheet in a new tab; it never replaces what they already have.

Nothing is uploaded. The sheet travels in the link's `#` fragment, which browsers never send to a server — it does not land in an access log and is not forwarded in a `Referer` header.

## Auto-saved snapshots

Every tab's edits are backed up to IndexedDB as versioned snapshots. Open **Settings → Recover** to see the history and restore a snapshot, or use **Restore all from latest backup** to bring back every tab. Snapshots are stored deflated to keep them small.

If localStorage is unavailable or corrupt, sheets are rebuilt automatically from the backups.

## Reset

**Settings → Reset → Reset data** clears the theme, tabs and all stored data back to their defaults. Export anything you want to keep first.

## Privacy

Sheets stay on your device. The only network request the app makes is for currency rates, and those are cached for offline use. See [About](/docs/about/) for the libraries involved.
