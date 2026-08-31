// Alias names Numi users expect on top of the mathjs built-ins.
function initAliases(math) {
  math.import({
    ln: math.log,
    fact: math.factorial,
    arcsin: math.asin,
    arccos: math.acos,
    arctan: math.atan,
    root: math.nthRoot,
  }, { override: true });
}

export default initAliases;
