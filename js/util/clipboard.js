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

export { copyText, fallbackCopy };
export default copyText;
