// A small trailing-edge debounce with explicit flush/run/cancel control, used
// for persistence, undo bursts and evaluation scheduling.
export default function debounce(fn, delay) {
  let timer = null;
  const clear = () => {
    clearTimeout(timer);
    timer = null;
  };
  return {
    // Schedule a run on the trailing edge; resets any pending run.
    schedule() {
      clear();
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, delay);
    },
    // Run now only if a schedule is pending, and return the result.
    flush() {
      if (timer === null) return undefined;
      clear();
      return fn();
    },
    // Always run now (clearing any pending schedule) and return the result.
    run() {
      clear();
      return fn();
    },
    cancel() {
      clear();
    },
  };
}
