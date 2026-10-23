// Unit defaults that don't match everyday usage, and units mathjs does not ship.
function initUnits(math) {
  if (!math.createUnit) return;
  // mathjs ships `ton` as the US short ton (907.18... kg), so make it the metric
  // tonne. The plural and the SI prefixes are part of the redefinition: left out,
  // `tons` stays the short ton and `kton` stops working.
  math.createUnit(
    'ton',
    { definition: '1000 kg', aliases: ['tons'], prefixes: 'short' },
    { override: true }
  );
  // The metric carat is exactly 200 mg. `ct` would otherwise read as a centitonne.
  math.createUnit('carat', { definition: '200 mg', aliases: ['carats', 'ct'] }, { override: true });
  // The US butter stick is 4 oz, so that a stick is half a US cup of butter and a pound
  // is two cups (mathjs has 115 g).
  math.createUnit('stick', { definition: '4 oz', aliases: ['sticks'] }, { override: true });

  // mathjs also has a (deprecated) constant called `coulomb`, Coulomb's constant, which
  // wins over the unit of the same name. The unit is what the reference lists.
  math.import({ coulomb: math.unit(1, 'C') }, { override: true });

  // Units the app lists and mathjs lacks. Each is created only when it is missing,
  // so a later mathjs that ships one is not overridden.
  const missing = {
    pound: { definition: '1 lb', aliases: ['pounds'] },
    stones: { definition: '1 stone' },
    metre: { definition: '1 m', aliases: ['metres'], prefixes: 'long' },
    fathom: { definition: '1.8288 m', aliases: ['fathoms', 'ftm'] },
    furlong: { definition: '201.168 m', aliases: ['furlongs', 'fur'] },
    lightyear: { definition: '9460730472580800 m', aliases: ['lightyears', 'ly'] },
    nmi: { definition: '1852 m', aliases: ['nauticalmile', 'nauticalmiles'] },
    knot: { definition: '1 nmi/hour', aliases: ['knots', 'kn'] },
  };
  for (const [name, options] of Object.entries(missing)) {
    try {
      math.createUnit(name, options);
    } catch {
      // already defined
    }
  }
}

export default initUnits;
