import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

const { useChromeMock } = global;

async function loadBackground() {
  jest.resetModules();
  await jest.isolateModulesAsync(async () => {
    await import('../src/modules/background.js');
  });
}

describe('background.js', () => {
  let nowSpy;
  let infoSpy;
  let warnSpy;

  beforeEach(() => {
    useChromeMock();
    nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => 0);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    nowSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('sets siftMode to ALL on installation', async () => {
    const chrome = useChromeMock();
    await loadBackground();

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    await installListener({ reason: 'install' });

    // Wait for Promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { siftMode: 'ALL', siftShowAiNotetakers: false, siftShowDevNotifications: false },
      expect.any(Function),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[perf] background:onInstalled storage.set completed in 0ms'),
    );
  });

  test('preserves preferences on extension updates', async () => {
    const chrome = useChromeMock();
    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

    await installListener({ reason: 'update' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.get).not.toHaveBeenCalled();
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });

  test('only seeds missing install defaults', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) =>
            callback({ siftMode: 'CALENDAR', siftShowAiNotetakers: true }),
          ),
          set: jest.fn((data, callback) => callback?.()),
        },
      },
    });
    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

    await installListener({ reason: 'install' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { siftShowDevNotifications: false },
      expect.any(Function),
    );
  });

  test('does not report a storage.set duration when every default is already present', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) =>
            callback({
              siftMode: 'CALENDAR',
              siftShowAiNotetakers: true,
              siftShowDevNotifications: true,
            }),
          ),
          set: jest.fn((data, callback) => callback?.()),
        },
      },
    });
    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

    await installListener({ reason: 'install' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('background:onInstalled defaults already present'),
    );
    expect(infoSpy).not.toHaveBeenCalledWith(expect.stringContaining('storage.set'));
  });

  test('warns when installing defaults is slow', async () => {
    const chrome = useChromeMock();
    nowSpy.mockImplementationOnce(() => 0).mockImplementationOnce(() => 750);
    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

    await installListener({ reason: 'install' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[perf] background:onInstalled storage.set completed in 750ms'),
    );
  });

  test('opens the options page when the toolbar icon is clicked', async () => {
    const chrome = useChromeMock();
    await loadBackground();

    expect(chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
    const clickListener = chrome.action.onClicked.addListener.mock.calls[0][0];
    clickListener();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test('logs an error when openOptionsPage rejects', async () => {
    // WHY: under MV3 openOptionsPage returns a promise, so the failure path is a rejection rather
    // than a throw and try/catch alone would never see it.
    const chrome = useChromeMock({
      runtime: {
        openOptionsPage: jest.fn(() => Promise.reject(new Error('options page unavailable'))),
      },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadBackground();

    const clickListener = chrome.action.onClicked.addListener.mock.calls[0][0];
    clickListener();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error opening the options page:', expect.any(Error));

    errorSpy.mockRestore();
  });

  test('logs an error when the options page cannot be opened', async () => {
    const chrome = useChromeMock({
      runtime: {
        openOptionsPage: jest.fn(() => {
          throw new Error('no options page');
        }),
      },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadBackground();

    const clickListener = chrome.action.onClicked.addListener.mock.calls[0][0];
    expect(() => clickListener()).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith('Error opening the options page:', expect.any(Error));

    errorSpy.mockRestore();
  });

  test('logs storage error when initial mode fails to persist', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          set: jest.fn((data, callback) => {
            chrome.runtime.lastError = new Error('quota exceeded');
            callback?.();
          }),
        },
      },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    nowSpy.mockImplementationOnce(() => 0).mockImplementationOnce(() => 1200);

    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    await installListener({ reason: 'install' });

    // Wait for Promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error setting initial mode:', expect.any(Error));

    errorSpy.mockRestore();
  });
});
