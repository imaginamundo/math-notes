// English UI strings. This is the source of truth: every key added here should
// get a matching entry in pt.js and es.js (a test enforces key parity).
export default {
  'app.name': 'Math Notes',

  'editor.label': 'Calculator input',
  'editor.placeholder':
    'Type your calculations…\nResults appear inline\nSee Documentation for everything it understands',

  'total.label': 'Total aggregate',
  'total.sum': 'total',
  'total.average': 'average',
  'total.median': 'median',

  'loading.sr': 'Calculating',
  'loading.dots': 'Loading',

  'font.group': 'Text size',
  'font.decrease': 'Decrease text size',
  'font.increase': 'Increase text size',
  'font.reset': 'Reset size',

  'footer.share': 'Share',
  'footer.settings': 'Settings',
  'footer.examples': 'Examples',
  'footer.docs': 'Documentation',

  'modal.examples': 'Examples',
  'modal.settings': 'Settings',
  'modal.closeExamples': 'Close examples',
  'modal.closeSettings': 'Close settings',

  'status.ratesCached': 'rates: cached',
  'status.ratesLive': 'rates: live',
  'status.ratesUnavailable': 'exchange rates unavailable',

  'share.buildFailed': "Couldn't build a link for this sheet",
  'share.copiedLong': "Link copied — it's long, some apps may cut it",
  'share.copied': 'Link copied',
  'share.copyFailed': "Couldn't copy — the link is in the address bar",
  'share.unreadable': "That share link couldn't be read",
  'share.openConfirm': 'Open the shared sheet "{name}" in a new tab?',
  'share.opened': 'Opened "{name}"',
  'share.defaultName': 'Shared sheet',

  'io.importConfirm': "Importing will replace the current tab's content. Continue?",

  'tabs.list': 'Worksheets',
  'tabs.rename': 'Double-click to rename',
  'tabs.close': 'Close tab',
  'tabs.new': 'New tab',
  'tabs.defaultName': 'Tab {n}',
  'tabs.closeConfirm': 'Close "{name}"? Its content will be lost.',

  'find.placeholder': 'Find in sheet',
  'find.matchCase': 'Match case',
  'find.previous': 'Previous match (Shift+Enter)',
  'find.next': 'Next match (Enter)',
  'find.close': 'Close (Escape)',
  'find.replacePlaceholder': 'Replace with',
  'find.replace': 'Replace',
  'find.replaceHint': 'Replace current match (Enter)',
  'find.all': 'All',
  'find.replaceAll': 'Replace all matches',

  'goto.label': 'Go to line',
  'goto.lineNumber': 'Line number',

  'starter.group': 'Starter content actions',
  'starter.keep': '✓ Keep content',
  'starter.keepTitle': 'Keep this example content',
  'starter.clear': '× Clear content',
  'starter.clearTitle': 'Empty this tab',
  'starter.name': 'Welcome',
  'starter.welcomeComment': '# Welcome! Every line is evaluated; the result appears on the right.',
  'starter.labelComment': '# A label names a line; `sum` totals the block above:',
  'starter.tagComment': '# Tags name rows; a bare #tag totals them:',

  'autocomplete.label': 'Suggestions',
  'example.addTitle': 'Click to add to the editor',

  'settings.files': 'Files',
  'settings.filesBody': 'Export the active sheet as text or import one from a file.',
  'settings.export': 'Export',
  'settings.import': 'Import',
  'settings.theme': 'Theme',
  'settings.themeBody': 'Choose a theme.',
  'settings.measurement': 'Measurement system',
  'settings.measurementBody': 'Used for cooking volume units. Metric is the default.',
  'settings.precision': 'Decimal precision',
  'settings.precisionBody':
    'Decimal places shown in results. A truncated result ends with an ellipsis; calculations keep full precision.',
  'settings.precisionLabel': 'Decimal places',
  'settings.clock': 'Clock',
  'settings.clockBody': 'How clock times are written. 24-hour is the default.',
  'settings.language': 'Language',
  'settings.languageBody': 'The language of the interface. Detected from your system by default.',
  'settings.recover': 'Recover',
  'settings.recoverBody':
    'Auto-saved snapshots of each tab are kept in IndexedDB. Restore one to recover lost work.',
  'settings.restoreAll': 'Restore all from latest backup',
  'settings.noSnapshots': 'No snapshots yet. They appear a few seconds after you edit a tab.',
  'settings.restore': 'Restore',
  'settings.reset': 'Reset',
  'settings.resetBody': 'Reset the theme, tabs and all stored data back to their defaults.',
  'settings.resetButton': 'Reset data',
  'settings.resetConfirm': 'This will reset the theme, tabs and all stored data. Continue?',
  'settings.restoreConfirm': 'Restore "{name}" from {ago}? This replaces its current content.',
  'settings.restoreAllConfirm':
    'Replace all tabs with the latest snapshot of each? This discards the current tabs.',

  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.daysAgo': '{n}d ago',

  'apply.theme': 'Apply {name}',
  'apply.measurement': 'Use {name} volume units',
  'apply.clock': 'Show clock times in {name} format',
  'apply.language': 'Use {name}',

  'measurement.metric': 'Metric',
  'measurement.us': 'US customary',
  'measurement.imperial': 'Imperial',
  'clock.24': '24-hour',
  'clock.12': '12-hour',
  'language.en': 'English',
  'language.pt': 'Português',
  'language.es': 'Español',
};
