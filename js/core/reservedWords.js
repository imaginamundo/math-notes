// Labels a line may not assign to: `prev` and the unconditional date keywords
// (rewritten before mathjs, so a variable of that name could never be read
// back) and the whole `__` namespace, which holds the engine's own helpers and
// the generated names multi-word variables are mangled to. Aggregate keywords
// (`sum`/`total`/…) are deliberately not here: assigning one makes the variable
// shadow the keyword from then on. Checked against the raw label, before
// mangling, so a multi-word variable (which becomes `__var_...`) is never
// mistaken for a reserved name.
const RESERVED_LABELS = new Set([
  'prev',
  'today',
  'now',
  'yesterday',
  'tomorrow',
  'christmas',
  'halloween',
  // `total` is the running-total aggregate and `unit` opens a unit definition.
  'total',
  'unit',
]);

export function isReservedLabel(label) {
  // `end` closes a group, and only in lowercase (`End = 5` is an ordinary name).
  return RESERVED_LABELS.has(label.toLowerCase()) || label === 'end' || label.startsWith('__');
}
