// The one place the sheet reads the wall clock. A line that calls `currentTime()`
// (`now`, `today`, `unix()`, `days until X`) depends on when it runs, not only on its
// text, so the engine counts the reads: a line whose evaluation read the clock is
// marked volatile and is evaluated again with the lines after it, instead of keeping
// the value from the last time the sheet changed.
let reads = 0;

function currentTime() {
  reads++;
  return new Date();
}

function clockReads() {
  return reads;
}

export { currentTime, clockReads };
