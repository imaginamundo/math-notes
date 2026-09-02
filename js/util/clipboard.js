// Clipboard writes, with a fallback for insecure contexts and browsers where
// the async Clipboard API is unavailable. Never throws.

/**
 * Copy text to the clipboard, falling back to a hidden textarea + execCommand.
 * @param {string} text
 */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

/**
 * Copy via a hidden textarea. Used when the Clipboard API is missing or the
 * page is not a secure context (plain http, some embeds).
 * @param {string} text
 */
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // clipboard unavailable
  }
  document.body.removeChild(textarea);
}

export { copyText, fallbackCopy };
export default copyText;
