import {
  buildShareUrl,
  decodeSheet,
  parseShareHash,
  normalizeSheetName,
} from '../share/shareLink.js';
import { copyText } from '../util/clipboard.js';
import { t } from '../i18n/index.js';
import { SHARE_COPY } from '../util/events.js';

const STATUS_TIMEOUT = 6000;

/**
 * Wires the Share button and the incoming-share-link import.
 *
 * Sharing copies a link whose fragment carries the ACTIVE sheet only. Opening
 * such a link asks for confirmation and then opens the sheet in a NEW tab —
 * it never overwrites what the visitor already has.
 *
 * SECURITY: imported content reaches the DOM only as `textarea.value` (via
 * `tabsApi.openSheet`), never as `innerHTML`, so a hostile payload is inert
 * text. The sheet name is written with `textContent` for the same reason.
 *
 * @param {{ openSheet: Function, getActiveSheet: Function }} tabsApi
 */
// The token of the link this window last put in the address bar by hand (a failed copy).
// A reload must not offer it back as an import, and a later copy that works clears it.
const OWN_TOKEN_KEY = 'math-notes-own-share';

function ownToken() {
  try {
    return window.sessionStorage.getItem(OWN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function rememberOwnToken(token) {
  try {
    if (token) window.sessionStorage.setItem(OWN_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(OWN_TOKEN_KEY);
  } catch {
    // sessionStorage unavailable; the fragment is still stripped on import
  }
}

function initShare(tabsApi) {
  const buttonNode = document.getElementById('share-button');
  const statusNode = document.getElementById('share-status');
  if (!buttonNode) return;

  let statusTimer = null;

  function showStatus(text) {
    if (!statusNode) return;
    statusNode.textContent = text;
    statusNode.classList.add('visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => statusNode.classList.remove('visible'), STATUS_TIMEOUT);
  }

  async function share() {
    const sheet = tabsApi.getActiveSheet();
    const base = `${window.location.origin}${window.location.pathname}`;
    let built;
    try {
      built = await buildShareUrl(base, sheet);
    } catch {
      built = null;
    }
    if (built && built.tooLarge) {
      showStatus(t('share.tooLarge'));
      return;
    }
    if (!built) {
      showStatus(t('share.buildFailed'));
      return;
    }
    // Exposed so the browser test can read the built URL without needing
    // clipboard permissions in headless Chrome.
    buttonNode.dataset.url = built.url;
    if (await copyText(built.url)) {
      // An earlier failed copy left its link in the address bar; it is stale now.
      if (ownToken() && parseShareHash(window.location.hash)) {
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          // history unavailable
        }
      }
      rememberOwnToken(null);
      showStatus(built.long ? t('share.copiedLong') : t('share.copied'));
      return;
    }
    // Nothing reached the clipboard, so leave the link where it can be copied
    // by hand. replaceState puts it there without firing a hashchange —
    // importing our own token would prompt to open the sheet already on screen.
    showStatus(t('share.copyFailed'));
    rememberOwnToken(parseShareHash(built.url.slice(built.url.indexOf('#'))));
    try {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + built.url.slice(built.url.indexOf('#'))
      );
    } catch {
      // history unavailable (sandboxed frame); the status above still tells
      // the copy failed
    }
  }

  buttonNode.addEventListener('click', share);
  document.addEventListener(SHARE_COPY, share);

  async function importFromHash() {
    const token = parseShareHash(window.location.hash);
    if (!token) return;
    // Our own link, left in the address bar by a failed copy: nothing to import.
    if (token === ownToken()) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        // history unavailable
      }
      return;
    }

    const sheet = await decodeSheet(token);
    // Strip the fragment either way: a refresh must not re-import a duplicate,
    // and a link that failed to decode should not keep re-prompting.
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      // history unavailable (sandboxed frame); the confirm guard still holds
    }

    if (!sheet) {
      showStatus(t('share.unreadable'));
      return;
    }
    const name = normalizeSheetName(sheet.name) || t('share.defaultName');
    if (!window.confirm(t('share.openConfirm', { name }))) return;
    tabsApi.openSheet({ name, content: sheet.content });
    showStatus(t('share.opened', { name }));
  }

  window.addEventListener('hashchange', () => {
    importFromHash().catch(() => {});
  });
  importFromHash().catch(() => {});
}

export default initShare;
