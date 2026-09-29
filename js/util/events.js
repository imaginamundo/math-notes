// The names of the custom events modules use to talk to each other. Centralised
// so a typo is a reference error instead of a silently ignored event, and so the
// full set of cross-module signals is visible in one place.
export const CURRENCY_UPDATED = 'currency:updated';
export const CURRENCY_ERROR = 'currency:error';
export const MEASUREMENT_UPDATED = 'measurement:updated';
export const PRECISION_UPDATED = 'precision:updated';
export const TOTAL_MODE_UPDATED = 'total-mode:updated';
export const CLOCK_FORMAT_UPDATED = 'clock-format:updated';
export const LANGUAGE_UPDATED = 'language:updated';
export const STORAGE_ERROR = 'storage:error';
export const STATUS_MESSAGE = 'status:message';
export const FONT_SIZE_CHANGED = 'math:font-size-changed';
export const SHARE_COPY = 'share:copy';
