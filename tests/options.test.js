import { jest, describe, beforeAll, test, expect } from '@jest/globals';

describe('options.js', () => {
  let chrome;
  let mockDebugCheckbox;
  let mockShowButtonTextCheckbox;
  let mockDebugLabel;
  let mockShowButtonTextLabel;
  let mockShowButtonTextLegend;
  let mockPageTitle;
  let mockPageDescription;
  let mockDebugLegend;
  let mockThemeSelect;
  let mockThemeLegend;
  let mockThemeLabel;
  let mockThemeOptionSystem;
  let mockThemeOptionLight;
  let mockThemeOptionDark;
  let themeSelectValue;

  beforeAll(async () => {
    // Mock DOM elements
    mockDebugCheckbox = {
      checked: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    mockShowButtonTextCheckbox = {
      checked: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    themeSelectValue = 'system';
    mockThemeSelect = {
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      get value() {
        return themeSelectValue;
      },
      set value(newValue) {
        themeSelectValue = newValue;
      },
    };
    mockDebugLabel = {
      textContent: '',
    };
    mockShowButtonTextLabel = {
      textContent: '',
    };
    mockShowButtonTextLegend = {
      textContent: '',
    };
    mockPageTitle = {
      textContent: '',
    };
    mockPageDescription = {
      textContent: '',
    };
    mockDebugLegend = {
      textContent: '',
    };
    mockThemeLegend = {
      textContent: '',
    };
    mockThemeLabel = {
      textContent: '',
    };
    mockThemeOptionSystem = {
      textContent: '',
    };
    mockThemeOptionLight = {
      textContent: '',
    };
    mockThemeOptionDark = {
      textContent: '',
    };

    Object.defineProperty(document, 'getElementById', {
      value: jest.fn((id) => {
        if (id === 'debug') return mockDebugCheckbox;
        if (id === 'show-button-text-checkbox') return mockShowButtonTextCheckbox;
        if (id === 'debugLabel') return mockDebugLabel;
        if (id === 'showButtonTextLabel') return mockShowButtonTextLabel;
        if (id === 'showButtonTextLegend') return mockShowButtonTextLegend;
        if (id === 'pageTitle') return mockPageTitle;
        if (id === 'pageDescription') return mockPageDescription;
        if (id === 'debugLegend') return mockDebugLegend;
        if (id === 'themeLegend') return mockThemeLegend;
        if (id === 'themeLabel') return mockThemeLabel;
        if (id === 'theme-select') return mockThemeSelect;
        if (id === 'themeOptionSystem') return mockThemeOptionSystem;
        if (id === 'themeOptionLight') return mockThemeOptionLight;
        if (id === 'themeOptionDark') return mockThemeOptionDark;
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
            if (Array.isArray(keys)) {
              if (keys.includes('gmailCalDebug')) {
                result.gmailCalDebug = false; // Simulate debug mode being off initially
              }
              if (keys.includes('showButtonText')) {
                result.showButtonText = false; // Simulate showButtonText being off initially
              }
              if (keys.includes('gmailCalTheme')) {
                result.gmailCalTheme = 'system';
              }
            } else if (keys === 'gmailCalDebug') {
              result.gmailCalDebug = false;
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
          if (key === 'options_debug_label') return 'Mock Debug Label';
          if (key === 'options_page_description') return 'Mock Page Description';
          if (key === 'options_debug_legend') return 'Mock Debug Legend';
          if (key === 'optionShowButtonText') return 'Mock Show Button Text Label';
          if (key === 'options_show_text_legend') return 'Mock Show Button Text Legend';
          if (key === 'options_theme_legend') return 'Mock Theme Legend';
          if (key === 'options_theme_label') return 'Mock Theme Label';
          if (key === 'options_theme_system') return 'Mock Theme System';
          if (key === 'options_theme_light') return 'Mock Theme Light';
          if (key === 'options_theme_dark') return 'Mock Theme Dark';
          return '';
        }),
      },
      runtime: {
        lastError: undefined,
      },
    };
    Object.defineProperty(global, 'chrome', { value: chrome, writable: true });

    // Import the script after mocks are set up
    await import('../src/modules/options.js');

    // Manually trigger DOMContentLoaded after the script is imported
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('debug checkbox should be checked based on stored value', () => {
    expect(mockDebugCheckbox.checked).toBe(false);
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      ['gmailCalDebug', 'showButtonText', 'gmailCalTheme'],
      expect.any(Function),
    );
  });

  test('showButtonText checkbox should be checked based on stored value', () => {
    expect(mockShowButtonTextCheckbox.checked).toBe(false);
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      ['gmailCalDebug', 'showButtonText', 'gmailCalTheme'],
      expect.any(Function),
    );
  });

  test('changing debug checkbox should update stored value', () => {
    const changeCallback = mockDebugCheckbox.addEventListener.mock.calls[0][1];
    mockDebugCheckbox.checked = true; // Simulate checking the box
    changeCallback(); // Simulate change event
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalDebug: true, showButtonText: false, gmailCalTheme: 'system' }),
      expect.any(Function),
    );

    // Simulate unchecking the debug box
    mockDebugCheckbox.checked = false;
    changeCallback();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalDebug: false, showButtonText: false, gmailCalTheme: 'system' }),
      expect.any(Function),
    );
  });

  test('changing showButtonText checkbox should update stored value', () => {
    const changeCallback = mockShowButtonTextCheckbox.addEventListener.mock.calls[0][1];
    mockShowButtonTextCheckbox.checked = true; // Simulate checking the box
    changeCallback(); // Simulate change event
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalDebug: false, showButtonText: true, gmailCalTheme: 'system' }),
      expect.any(Function),
    );

    // Simulate unchecking the showButtonText box
    mockShowButtonTextCheckbox.checked = false;
    changeCallback();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalDebug: false, showButtonText: false, gmailCalTheme: 'system' }),
      expect.any(Function),
    );
  });

  test('theme selection should default to stored value', () => {
    expect(themeSelectValue).toBe('system');
  });

  test('changing theme selection should update stored value', () => {
    const themeChangeCallback = mockThemeSelect.addEventListener.mock.calls[0][1];
    themeSelectValue = 'dark';
    themeChangeCallback();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalTheme: 'dark' }),
      expect.any(Function),
    );
  });

  test('document title should be set from i18n message', () => {
    expect(document.title).toBe('Mock Page Title');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('page_title');
  });

  test('debug label text should be set from i18n message', () => {
    expect(mockDebugLabel.textContent).toBe('Mock Debug Label');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('options_debug_label');
  });

  test('showButtonText label text should be set from i18n message', () => {
    expect(mockShowButtonTextLabel.textContent).toBe('Mock Show Button Text Label');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('optionShowButtonText');
  });

  test('showButtonText legend text should fall back to i18n message', () => {
    expect(mockShowButtonTextLegend.textContent).toBe('Mock Show Button Text Legend');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('options_show_text_legend');
  });

  test('page title should be set from i18n message', () => {
    expect(mockPageTitle.textContent).toBe('Mock Page Title');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('page_title');
  });

  test('page description should be set from i18n message', () => {
    expect(mockPageDescription.textContent).toBe('Mock Page Description');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('options_page_description');
  });

  test('debug legend should be set from i18n message', () => {
    expect(mockDebugLegend.textContent).toBe('Mock Debug Legend');
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith('options_debug_legend');
  });

  test('theme controls should be localized', () => {
    expect(mockThemeLegend.textContent).toBe('Mock Theme Legend');
    expect(mockThemeLabel.textContent).toBe('Mock Theme Label');
    expect(mockThemeOptionSystem.textContent).toBe('Mock Theme System');
    expect(mockThemeOptionLight.textContent).toBe('Mock Theme Light');
    expect(mockThemeOptionDark.textContent).toBe('Mock Theme Dark');
  });
});
