// Unit defaults that don't match everyday usage: mathjs ships `ton` as the US
// short ton (907.18... kg), so make it the metric tonne.
function initUnits(math) {
  if (!math.createUnit) return;
  // The plural and the SI prefixes are part of the redefinition: left out, `tons` stays
  // the short ton and `kton` stops working.
  math.createUnit(
    'ton',
    { definition: '1000 kg', aliases: ['tons'], prefixes: 'short' },
    { override: true }
  );
}

export default initUnits;
