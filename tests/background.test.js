import { describe, beforeEach, test, expect, jest } from '@jest/globals';

const { useChromeMock } = global;

async function loadBackground() {
  jest.resetModules();
  await jest.isolateModulesAsync(async () => {
    await import('../src/modules/background.js');
  });
}

describe('background.js', () => {
  beforeEach(() => {
    useChromeMock();
  });

  test('sets gmailCalMode to ALL on installation', async () => {
    const chrome = useChromeMock();
    await loadBackground();

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    installListener();

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalMode: 'ALL' }, expect.any(Function));
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

    await loadBackground();
    const installListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    installListener();

    expect(errorSpy).toHaveBeenCalledWith('Error setting initial mode:', chrome.runtime.lastError);

    errorSpy.mockRestore();
  });
});
