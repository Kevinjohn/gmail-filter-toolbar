import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { isSafari, storageGet, storageSet, onStorageChanged } from '../src/modules/storage.js';

const { useChromeMock, resetChromeMock } = global;

afterEach(() => {
  resetChromeMock();
  // Clean up Safari global if set
  delete global.safari;
});

describe('isSafari', () => {
  test('returns false when safari global is not defined', () => {
    delete global.safari;
    expect(isSafari()).toBe(false);
  });

  test('returns true when safari global is defined', () => {
    global.safari = {};
    expect(isSafari()).toBe(true);
  });
});

describe('storageGet', () => {
  test('uses storage.sync on Chrome/Firefox', async () => {
    delete global.safari;
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({ testKey: 'testValue' })),
        },
        local: {
          get: jest.fn((keys, callback) => callback({})),
        },
      },
      runtime: { lastError: null },
    });

    const result = await storageGet(['testKey']);

    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['testKey'], expect.any(Function));
    expect(chrome.storage.local.get).not.toHaveBeenCalled();
    expect(result).toEqual({ testKey: 'testValue' });
  });

  test('uses storage.local on Safari', async () => {
    global.safari = {};
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({})),
        },
        local: {
          get: jest.fn((keys, callback) => callback({ testKey: 'safariValue' })),
        },
      },
      runtime: { lastError: null },
    });

    const result = await storageGet(['testKey']);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(['testKey'], expect.any(Function));
    expect(chrome.storage.sync.get).not.toHaveBeenCalled();
    expect(result).toEqual({ testKey: 'safariValue' });
  });

  test('rejects on storage error', async () => {
    delete global.safari;
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            chrome.runtime.lastError = new Error('Storage error');
            callback({});
          }),
        },
      },
      runtime: { lastError: null },
    });

    await expect(storageGet(['testKey'])).rejects.toThrow('Storage error');
  });
});

describe('storageSet', () => {
  test('uses storage.sync on Chrome/Firefox', async () => {
    delete global.safari;
    const chrome = useChromeMock({
      storage: {
        sync: {
          set: jest.fn((items, callback) => callback()),
        },
        local: {
          set: jest.fn((items, callback) => callback()),
        },
      },
      runtime: { lastError: null },
    });

    await storageSet({ testKey: 'testValue' });

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ testKey: 'testValue' }, expect.any(Function));
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  test('uses storage.local on Safari', async () => {
    global.safari = {};
    const chrome = useChromeMock({
      storage: {
        sync: {
          set: jest.fn((items, callback) => callback()),
        },
        local: {
          set: jest.fn((items, callback) => callback()),
        },
      },
      runtime: { lastError: null },
    });

    await storageSet({ testKey: 'safariValue' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'safariValue' }, expect.any(Function));
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('rejects on storage error', async () => {
    delete global.safari;
    const chrome = useChromeMock({
      storage: {
        sync: {
          set: jest.fn((items, callback) => {
            chrome.runtime.lastError = new Error('Write error');
            callback();
          }),
        },
      },
      runtime: { lastError: null },
    });

    await expect(storageSet({ testKey: 'value' })).rejects.toThrow('Write error');
  });
});

describe('onStorageChanged', () => {
  test('adds listener to chrome.storage.onChanged', () => {
    const chrome = useChromeMock();
    const callback = jest.fn();

    onStorageChanged(callback);

    expect(chrome.storage.onChanged.addListener).toHaveBeenCalledWith(callback);
  });
});
