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

  test('migrates missing legacy local values into sync storage', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({ currentKey: 'syncValue' })),
          set: jest.fn((items, callback) => callback()),
        },
        local: {
          get: jest.fn((keys, callback) => callback({ legacyKey: 'localValue' })),
        },
      },
      runtime: { lastError: null },
    });

    const result = await storageGet(['currentKey', 'legacyKey']);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(['legacyKey'], expect.any(Function));
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { legacyKey: 'localValue' },
      expect.any(Function),
    );
    expect(result).toEqual({ currentKey: 'syncValue', legacyKey: 'localValue' });
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

describe('storage migration cleanup', () => {
  test('removes migrated legacy keys from local storage', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({ currentKey: 'syncValue' })),
          set: jest.fn((items, callback) => callback()),
        },
        local: {
          get: jest.fn((keys, callback) => callback({ legacyKey: 'localValue' })),
          remove: jest.fn((keys, callback) => callback()),
        },
      },
      runtime: { lastError: null },
    });

    const result = await storageGet(['currentKey', 'legacyKey']);

    expect(chrome.storage.local.remove).toHaveBeenCalledWith(['legacyKey'], expect.any(Function));
    expect(result).toEqual({ currentKey: 'syncValue', legacyKey: 'localValue' });
  });

  test('tolerates legacy cleanup failure and still returns recovered values', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((items, callback) => callback()),
        },
        local: {
          get: jest.fn((keys, callback) => callback({ legacyKey: 'localValue' })),
          remove: jest.fn((keys, callback) => {
            chrome.runtime.lastError = new Error('remove failed');
            callback();
            chrome.runtime.lastError = null;
          }),
        },
      },
      runtime: { lastError: null },
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await storageGet(['legacyKey']);

    expect(result).toEqual({ legacyKey: 'localValue' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
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

describe('migration write failure tolerance', () => {
  test('a failed sync write during migration does not reject storageGet', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((items, callback) => {
            chrome.runtime.lastError = new Error('quota exceeded');
            callback();
            chrome.runtime.lastError = null;
          }),
        },
        local: {
          get: jest.fn((keys, callback) => callback({ legacyKey: 'localValue' })),
          remove: jest.fn((keys, callback) => callback()),
        },
      },
      runtime: { lastError: null },
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await storageGet(['legacyKey']);

    // The read still succeeds with the recovered value, legacy keys stay for the next attempt.
    expect(result).toEqual({ legacyKey: 'localValue' });
    expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
