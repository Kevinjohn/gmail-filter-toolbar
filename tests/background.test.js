import { jest, describe, beforeAll, test, expect } from '@jest/globals';

describe('background.js', () => {
  beforeAll(async () => {
    global.chrome = {
      runtime: {
        onInstalled: {
          addListener: jest.fn(),
        },
      },
      storage: {
        sync: {
          set: jest.fn(),
        },
      },
    };
    // Dynamically import background.js to ensure it runs after mocks are set up
    await import('../src/background.js');
  });

  test('should set gmailCalMode to ALL on installation', () => {
    // Ensure the addListener was called and get the callback
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    const onInstalledCallback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

    // Simulate the onInstalled event by calling the captured callback
    onInstalledCallback();

    // Verify that chrome.storage.sync.set was called correctly
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalMode: 'ALL' });
  });
});