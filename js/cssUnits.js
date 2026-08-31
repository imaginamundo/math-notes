// CSS units. mathjs already uses `pt` for pints, so the typography point is
// registered as `point` and px/em use a default 96 ppi and 16 px em.
const INCH = 0.0254; // meters
const PPI = 96;
const PX = INCH / PPI; // meters per pixel

function initCssUnits(math) {
  if (!math.createUnit) return;
  math.createUnit('px', { definition: `${PX} m` }, { override: true });
  math.createUnit('em', { definition: '16 px' }, { override: true });
  math.createUnit('point', { definition: `${INCH / 72} m` }, { override: true });
}

export default initCssUnits;
