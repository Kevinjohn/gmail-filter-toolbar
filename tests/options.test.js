import { jest, describe, beforeAll, test, expect } from '@jest/globals';

describe('options.js', () => {
  let chrome;
  let mockBox;
  let mockDebugLabel;

  beforeAll(async () => {
    // Mock DOM elements
    mockBox = {
      checked: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    mockDebugLabel = {
      textContent: '',
    };

    Object.defineProperty(document, 'getElementById', {
      value: jest.fn((id) => {
        if (id === 'debug') return mockBox;
        if (id === 'debugLabel') return mockDebugLabel;
        return null;
      }),
      configurable: true,
    });

    let docTitle = '';
    Object.defineProperty(document, 'title', {
      set: jest.fn((value) => { docTitle = value; }),
      get: jest.fn(() => docTitle),
      configurable: true,
    });

    // Mock chrome API
    chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            const result = {};
            if (keys.includes('gmailCalDebug')) {
              result.gmailCalDebug = true; // Simulate debug mode being on
            }
            callback(result);
          }),
          set: jest.fn((data, callback) => {
            if (callback) callback();
          }),
        },
      },
      i18n: {
        getMessage: jest.fn((key) => {
          if (key === 'page_title') return 'Mock Page Title';
          if (key === 'options_debug') return 'Mock Debug Label';
          return '';
        }),
      },
      runtime: {
        lastError: undefined,
      },
    };
    Object.defineProperty(global, 'chrome', { value: chrome, writable: true });

    // Import the script after mocks are set up
    await import('../src/options.js');
  });

  test('checkbox should be checked based on stored value', () => {
    // The get callback is called asynchronously, so we need to wait for it
    // For simplicity in this test, we assume it's already resolved by the time we check.
    // In a more complex scenario, you might use async/await with a promise for the get call.
    expect(mockBox.checked).toBe(true);
    expect(chrome.storage.sync.get).toHaveBeenCalledWith('gmailCalDebug', expect.any(Function));
  });

  test('changing checkbox should update stored value', () => {
    const changeCallback = mockBox.addEventListener.mock.calls[0][1];
    changeCallback(); // Simulate change event
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalDebug: true }, expect.any(Function));

    // Simulate unchecking the box
    mockBox.checked = false;
    changeCallback();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalDebug: false }, expect.any(Function));
  });

  test('document title should be set from i18n message', () => {
    expect(document.title).toBe('Mock Page Title');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('page_title');
  });

  test('debug label text should be set from i18n message', () => {
    expect(mockDebugLabel.textContent).toBe('Mock Debug Label');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('options_debug');
  });
});
