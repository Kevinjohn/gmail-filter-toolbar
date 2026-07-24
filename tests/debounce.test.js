import { describe, test, expect, jest } from '@jest/globals';
import { debounce } from '../src/modules/utils/debounce.js';

describe('debounce', () => {
  test('delays invocation until after wait period', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');

    jest.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');

    jest.useRealTimers();
  });
});

describe('debounce cancel', () => {
  test('cancel() discards a pending invocation', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    // Still usable after cancel
    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
