// mathjs's bit operators work on 32-bit integers: `1 << 32` is 1, `1 << 40` is 256 and
// `0xFFFFFFFF | 0` is -1, wrong results that then flow into sums and the total. For whole
// numbers these versions compute with arbitrary-size integers and refuse a result that a
// number cannot hold exactly; anything else (a list, a unit) goes to the original function.

function wholeNumber(value) {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function back(result) {
  const number = Number(result);
  if (!Number.isSafeInteger(number)) throw new Error('That result is too large to hold exactly');
  return number;
}

function shiftCount(count) {
  if (count < 0 || count > 1024) throw new Error('A shift needs a count from 0 to 1024');
  return BigInt(count);
}

function initBitwise(math) {
  const original = {
    leftShift: math.leftShift,
    rightArithShift: math.rightArithShift,
    rightLogShift: math.rightLogShift,
    bitAnd: math.bitAnd,
    bitOr: math.bitOr,
    bitXor: math.bitXor,
    bitNot: math.bitNot,
  };
  const binary = (name, compute) =>
    function (a, b) {
      return wholeNumber(a) && wholeNumber(b)
        ? back(compute(BigInt(a), b, BigInt(b)))
        : original[name](a, b);
    };
  math.import(
    {
      leftShift: binary('leftShift', (a, count) => a << shiftCount(count)),
      rightArithShift: binary('rightArithShift', (a, count) => a >> shiftCount(count)),
      // A logical shift of a negative number needs a width; only non-negative values are
      // exact, so a negative one keeps mathjs's 32-bit reading.
      rightLogShift: function (a, b) {
        if (wholeNumber(a) && wholeNumber(b) && a >= 0) return back(BigInt(a) >> shiftCount(b));
        return original.rightLogShift(a, b);
      },
      bitAnd: binary('bitAnd', (a, _count, b) => a & b),
      bitOr: binary('bitOr', (a, _count, b) => a | b),
      bitXor: binary('bitXor', (a, _count, b) => a ^ b),
      bitNot: (a) => (wholeNumber(a) ? back(~BigInt(a)) : original.bitNot(a)),
    },
    { override: true }
  );
}

export default initBitwise;
