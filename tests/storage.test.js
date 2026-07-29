import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { storageGet, storageSet, onStorageChanged } from '../src/modules/storage.js';

const { useChromeMock, resetChromeMock } = global;

afterEach(() => {
  resetChromeMock();
});

describe('storageGet', () => {
  test('uses storage.sync on Chrome/Firefox', async () => {
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

  test('uses storage.local when storage.sync is unavailable', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: undefined,
        local: {
          get: jest.fn((keys, callback) => callback({ testKey: 'safariValue' })),
        },
      },
      runtime: { lastError: null },
    });

    const result = await storageGet(['testKey']);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(['testKey'], expect.any(Function));
    expect(result).toEqual({ testKey: 'safariValue' });
  });

  test('rejects on storage error', async () => {
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

  test('rejects rather than throwing when the storage API is missing entirely', async () => {
    // WHY: Firefox strips an orphaned content script's chrome global after an extension update, so
    // resolving the backend throws synchronously. loadState() attaches .catch to the returned
    // promise instead of wrapping the call, so a synchronous throw would skip its fail-safe
    // defaults and abort content-script initialisation with an unhandled rejection.
    const chrome = useChromeMock();
    delete chrome.storage;

    let thrownSynchronously = false;
    let promise;
    try {
      promise = storageGet(['testKey']);
    } catch {
      thrownSynchronously = true;
    }

    expect(thrownSynchronously).toBe(false);
    await expect(promise).rejects.toThrow();
  });
});

describe('storageSet', () => {
  test('uses storage.sync on Chrome/Firefox', async () => {
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

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { testKey: 'testValue' },
      expect.any(Function),
    );
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  test('uses storage.local when storage.sync is unavailable', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: undefined,
        local: {
          set: jest.fn((items, callback) => callback()),
        },
      },
      runtime: { lastError: null },
    });

    await storageSet({ testKey: 'safariValue' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { testKey: 'safariValue' },
      expect.any(Function),
    );
  });

  test('rejects on storage error', async () => {
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

describe('getActiveAreaName', () => {
  test('reports sync when sync storage exists', async () => {
    useChromeMock();
    const { getActiveAreaName } = await import('../src/modules/storage.js');
    expect(getActiveAreaName()).toBe('sync');
  });

  test('reports local when sync storage is unavailable', async () => {
    const chrome = useChromeMock();
    delete chrome.storage.sync;
    const { getActiveAreaName } = await import('../src/modules/storage.js');
    expect(getActiveAreaName()).toBe('local');
  });
});
