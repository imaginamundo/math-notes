// Unit defaults that don't match everyday usage: mathjs ships `ton` as the US
// short ton (907.18... kg), so make it the metric tonne.
function initUnits(math) {
  if (!math.createUnit) return;
  math.createUnit('ton', { definition: '1000 kg' }, { override: true });
}

export default initUnits;
