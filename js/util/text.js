// Pure text helpers shared by the editor, line numbers, find and shortcuts.
// Kept free of any DOM or module dependencies so any layer can use them.

// The 0-based index of the line containing `position`.
function indexOfLineAt(text, position) {
  let lineIndex = 0;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === '\n') lineIndex++;
  }
  return lineIndex;
}

// The character offset where the line containing `position` begins.
function startOfLine(text, position) {
  let start = 0;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === '\n') start = i + 1;
  }
  return start;
}

// A memoized `value.split('\n')`. Several consumers run per edit (the renderer,
// the editor's sizing, the worker request, autocomplete), so they share one
// allocation per text value. Treat the returned array as read-only.
let linesValue = null;
let linesCache = [];
function sheetLines(value) {
  if (value !== linesValue) {
    linesValue = value;
    linesCache = value.split('\n');
  }
  return linesCache;
}

// Where the caret belongs after `current` is replaced by `next`: at the end of
// the changed region. Undoing a deletion leaves the caret after the restored
// text, while undoing an insertion leaves it where the text was removed.
function changeCaret(current, next) {
  let prefix = 0;
  const maxPrefix = Math.min(current.length, next.length);
  while (prefix < maxPrefix && current[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = Math.min(current.length - prefix, next.length - prefix);
  while (
    suffix < maxSuffix &&
    current[current.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix++;
  }
  return next.length - suffix;
}

// Whether decoded file content is text a person wrote: no NUL (binary data and UTF-16
// read as UTF-8 are full of them) and not mostly replacement characters.
function looksLikeText(text) {
  if (text.includes('\0')) return false;
  const replaced = (text.match(/\uFFFD/g) || []).length;
  return replaced === 0 || replaced / text.length < 0.02;
}

// `YYYY-MM-DD` of the local calendar day, the day the sheet's `today` shows.
function localDateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// When a snapshot was taken, as a clock time with seconds, plus the date unless it is today.
// The relative age alone ("1m ago") cannot tell two snapshots apart.
function snapshotStamp(timestamp, now = Date.now(), locale) {
  const date = new Date(timestamp);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(date);
  if (new Date(now).toDateString() === date.toDateString()) return time;
  return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)} ${time}`;
}

// The first non-empty line of a snapshot, cut to fit a row, so a version can be recognised.
function snapshotPreview(content, max = 40) {
  const first = String(content ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return '';
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

export {
  indexOfLineAt,
  startOfLine,
  sheetLines,
  changeCaret,
  looksLikeText,
  localDateStamp,
  snapshotStamp,
  snapshotPreview,
};
