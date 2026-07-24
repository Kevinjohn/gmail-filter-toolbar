/**
 * Creates a debounced function that delays invoking `func` until after `delay` milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param {Function} func The function to debounce.
 * @param {number} delay The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function, with a `cancel()` method that discards
 * any pending invocation.
 */
export function debounce(func, delay) {
  let timeout;
  const debounced = function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
  // WHY: When an observer is replaced (SPA navigation), a pending invocation from the old closure
  // would still fire once against the detached subtree; cancel() lets callers drop it.
  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
  };
  return debounced;
}
