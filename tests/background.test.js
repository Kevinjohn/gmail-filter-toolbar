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

  test('sets gmailCalMode to ALL on installation', async () => {
    const chrome = useChromeMock();
    await loadBackground();

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    await installListener();

    // Wait for Promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalMode: 'ALL', showAiNotetakers: false }, expect.any(Function));
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[perf] background:onInstalled storage.set completed in 0ms')
    );
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
    await installListener();

    // Wait for Promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error setting initial mode:', expect.any(Error));

    errorSpy.mockRestore();
  });
});
