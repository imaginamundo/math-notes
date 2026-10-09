import { buildShareUrl, decodeSheet, parseShareHash } from '../share/shareLink.js';
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
    if (!built) {
      showStatus(t('share.buildFailed'));
      return;
    }
    // Exposed so the browser test can read the built URL without needing
    // clipboard permissions in headless Chrome.
    buttonNode.dataset.url = built.url;
    if (await copyText(built.url)) {
      showStatus(built.long ? t('share.copiedLong') : t('share.copied'));
      return;
    }
    // Nothing reached the clipboard, so leave the link where it can be copied
    // by hand. replaceState puts it there without firing a hashchange —
    // importing our own token would prompt to open the sheet already on screen.
    showStatus(t('share.copyFailed'));
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
    const name = sheet.name || t('share.defaultName');
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
