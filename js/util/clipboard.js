// Clipboard writes, with a fallback for insecure contexts and browsers where
// the async Clipboard API is unavailable. Never rejects: the resolved value says
// whether the text really reached the clipboard, so callers can stop reporting a
// copy that silently did nothing.

/**
 * Copy text to the clipboard, falling back to a hidden textarea + execCommand.
 * @param {string} text
 * @returns {Promise<boolean>} whether the text was copied
 */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => fallbackCopy(text)
      );
    } catch {
      return Promise.resolve(fallbackCopy(text));
    }
  }
  return Promise.resolve(fallbackCopy(text));
}

/**
 * Copy text that is still being produced (a share link is compressed first). WebKit only lets a
 * clipboard write happen within a short window after the click, and an `await` before the write
 * can use it up, so where `ClipboardItem` exists the write is started at once with the pending
 * text, and the browser waits for it. Elsewhere it waits, then copies as usual.
 * @param {Promise<string>} textPromise
 * @returns {Promise<boolean>} whether the text was copied
 */
async function copyPendingText(textPromise) {
  if (navigator.clipboard && window.isSecureContext && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = textPromise.then((text) => new Blob([text], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    } catch {
      // fall through to the ordinary path
    }
  }
  try {
    return await copyText(await textPromise);
  } catch {
    return false;
  }
}

/**
 * Copy via a hidden textarea. Used when the Clipboard API is missing or the
 * page is not a secure context (plain http, some embeds).
 * @param {string} text
 * @returns {boolean} whether the copy was accepted
 */
function fallbackCopy(text) {
  let textarea = null;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy');
  } catch {
    // clipboard unavailable
    return false;
  } finally {
    if (textarea) textarea.remove();
  }
}

export { copyText, copyPendingText, fallbackCopy };
export default copyText;
