import { describe, afterEach, test, expect, jest } from '@jest/globals';
import { makeOptionsPayload } from './factories/index.js';

const { useChromeMock, resetChromeMock } = global;

const baseMessages = {
  page_title: 'Mock Page Title',
  options_page_description: 'Mock Page Description',
  options_debug_legend: 'Debug Legend',
  options_debug_label: 'Debug Label',
  optionShowButtonText: 'Show Text Label',
  options_show_text_legend: 'Display Legend',
  options_alignment_legend: 'Alignment Legend',
  options_alignment_label: 'Alignment Label',
  options_alignment_start: 'Align Start',
  options_alignment_center: 'Align Center',
  options_show_favourites_label: 'Show Favourites Label',
  options_theme_legend: 'Theme Legend',
  options_theme_label: 'Theme Label',
  options_theme_system: 'System Theme',
  options_theme_light: 'Light Theme',
  options_theme_dark: 'Dark Theme',
  experimental_legend: 'Experimental',
  experimental_description:
    'Experimental features are in active testing and may only be available in English.',
  options_show_ai_notetakers: 'Show AI & Transcription button',
  options_show_dev_notifications: 'Show Dev Notifications button',
};

const getTextContent = (id) => document.getElementById(id)?.textContent ?? null;

const serializeOptionsUi = () => ({
  documentTitle: document.title,
  pageTitle: getTextContent('pageTitle'),
  pageDescription: getTextContent('pageDescription'),
  debug: {
    legend: getTextContent('debugLegend'),
    label: getTextContent('debugLabel'),
    checked: document.getElementById('debug')?.checked ?? false,
  },
  showButtonText: {
    legend: getTextContent('showButtonTextLegend'),
    label: getTextContent('showButtonTextLabel'),
    checked: document.getElementById('show-button-text-checkbox')?.checked ?? false,
  },
  alignment: {
    legend: getTextContent('alignmentLegend'),
    label: getTextContent('alignmentLabel'),
    value: document.getElementById('alignment-select')?.value ?? null,
    options: Array.from(document.querySelectorAll('#alignment-select option')).map((option) => ({
      value: option.value,
      text: option.textContent,
    })),
  },
  showFavourites: {
    label: getTextContent('showFavouritesLabel'),
    checked: document.getElementById('show-favourites-checkbox')?.checked ?? false,
  },
  theme: {
    legend: getTextContent('themeLegend'),
    label: getTextContent('themeLabel'),
    value: document.getElementById('theme-select')?.value ?? null,
    options: Array.from(document.querySelectorAll('#theme-select option')).map((option) => ({
      value: option.value,
      text: option.textContent,
    })),
  },
  experimental: {
    legend: document.querySelector('[data-i18n="experimental_legend"]')?.textContent ?? null,
    description:
      document.querySelector('[data-i18n="experimental_description"]')?.textContent ?? null,
    showAiNotetakersLabel:
      document.querySelector('[data-i18n="options_show_ai_notetakers"]')?.textContent ?? null,
    showAiNotetakersChecked:
      document.getElementById('show-ai-notetakers-checkbox')?.checked ?? false,
    showDevNotificationsLabel:
      document.querySelector('[data-i18n="options_show_dev_notifications"]')?.textContent ?? null,
    showDevNotificationsChecked:
      document.getElementById('show-dev-notifications-checkbox')?.checked ?? false,
  },
});

const renderHtml = ({
  includeOptionals = true,
  includeAlignmentSelect = true,
  includeThemeSelect = true,
  includeFavouritesCheckbox = true,
  includeExperimental = true,
} = {}) => {
  document.body.innerHTML = `
    <h1 id="pageTitle"></h1>
    <p id="pageDescription"></p>
    <fieldset>
      <legend id="debugLegend"></legend>
      <label for="debug" id="debugLabel"></label>
      <input type="checkbox" id="debug" />
    </fieldset>
    <fieldset>
      ${includeOptionals ? '<legend id="showButtonTextLegend"></legend>' : ''}
      <label for="show-button-text-checkbox" id="showButtonTextLabel"></label>
      <input type="checkbox" id="show-button-text-checkbox" />
    </fieldset>
    <fieldset>
      ${includeOptionals ? '<legend id="alignmentLegend"></legend>' : ''}
      ${includeOptionals ? '<label for="alignment-select" id="alignmentLabel"></label>' : ''}
      ${
        includeAlignmentSelect
          ? `<select id="alignment-select">
        ${includeOptionals ? '<option id="alignmentOptionStart" value="start"></option>' : ''}
        ${includeOptionals ? '<option id="alignmentOptionCenter" value="center"></option>' : ''}
      </select>`
          : ''
      }
      ${includeOptionals && includeFavouritesCheckbox ? '<label for="show-favourites-checkbox" id="showFavouritesLabel"></label>' : ''}
      ${includeFavouritesCheckbox ? '<input type="checkbox" id="show-favourites-checkbox" />' : ''}
    </fieldset>
    <fieldset>
      ${includeOptionals ? '<legend id="themeLegend"></legend>' : ''}
      ${includeOptionals ? '<label for="theme-select" id="themeLabel"></label>' : ''}
      ${
        includeThemeSelect
          ? `<select id="theme-select">
        ${includeOptionals ? '<option id="themeOptionSystem" value="system"></option>' : ''}
        ${includeOptionals ? '<option id="themeOptionLight" value="light"></option>' : ''}
        ${includeOptionals ? '<option id="themeOptionDark" value="dark"></option>' : ''}
      </select>`
          : ''
      }
    </fieldset>
    ${
      includeExperimental
        ? `<fieldset id="experimental-section">
      <legend data-i18n="experimental_legend">Experimental</legend>
      <p id="experimentalDescription">
        <span data-i18n="experimental_description">Experimental features are in active testing and may only be available in English.</span>
      </p>
      <div class="option-row">
        <label for="show-ai-notetakers-checkbox" data-i18n="options_show_ai_notetakers">Show AI & Transcription button</label>
        <input type="checkbox" id="show-ai-notetakers-checkbox">
      </div>
      <div class="option-row">
        <label for="show-dev-notifications-checkbox" data-i18n="options_show_dev_notifications">Show Dev Notifications button</label>
        <input type="checkbox" id="show-dev-notifications-checkbox">
      </div>
    </fieldset>`
        : ''
    }
  `;
};

async function loadModule({
  storageValues = makeOptionsPayload(),
  getError,
  setError,
  setHandler,
  renderOptions,
  waitForRestore = true,
} = {}) {
  jest.resetModules();
  const chrome = useChromeMock({
    i18n: {
      getMessage: jest.fn((key) => baseMessages[key] ?? ''),
      getUILanguage: jest.fn(() => 'en-US'),
    },
    storage: {
      sync: {
        get: jest.fn((keys, callback) => {
          if (getError) {
            chrome.runtime.lastError = new Error(getError);
          } else {
            chrome.runtime.lastError = null;
          }
          callback(storageValues);
        }),
        set: jest.fn((payload, callback) => {
          if (setHandler) {
            setHandler(payload, callback, chrome);
            return;
          }
          if (setError) {
            chrome.runtime.lastError = new Error(setError);
          } else {
            chrome.runtime.lastError = null;
          }
          callback?.();
        }),
      },
    },
    runtime: {
      lastError: null,
    },
  });
  renderHtml(renderOptions);
  await jest.isolateModulesAsync(async () => {
    await import('../src/modules/options.js');
  });
  document.dispatchEvent(new Event('DOMContentLoaded'));
  if (waitForRestore) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  } else {
    await Promise.resolve();
    await Promise.resolve();
  }
  return chrome;
}

describe('options module', () => {
  afterEach(() => {
    resetChromeMock();
    document.body.innerHTML = '';
  });

  test('restores state from storage and localises labels', async () => {
    const chrome = await loadModule();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      [
        'gmailCalDebug',
        'showButtonText',
        'showFavourites',
        'showAiNotetakers',
        'showDevNotifications',
        'toolbarAlignment',
        'gmailCalTheme',
      ],
      expect.any(Function),
    );
    expect(document.getElementById('pageTitle').textContent).toBe('Mock Page Title');
    expect(document.title).toBe('Mock Page Title');
    expect(document.getElementById('alignmentOptionCenter').textContent).toBe('Align Center');
  });

  test('defaults button text to visible when the key is unset', async () => {
    await loadModule({ storageValues: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.getElementById('show-button-text-checkbox').checked).toBe(true);
  });

  test('renders fallback labels without extension APIs for Lighthouse', async () => {
    jest.resetModules();
    delete global.chrome;
    renderHtml();

    await jest.isolateModulesAsync(async () => {
      await import('../src/modules/options.js');
    });
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('showButtonTextLabel').textContent).toBe(
      'Show text on filter buttons',
    );
    expect(document.getElementById('show-button-text-checkbox').checked).toBe(true);
    expect(document.documentElement.lang).toBe('en');
  });

  test('serialises localised labels for regression safety', async () => {
    await loadModule();

    expect(serializeOptionsUi()).toMatchSnapshot();
  });

  test('saves updated values when controls change', async () => {
    const chrome = await loadModule();
    const debugBox = document.getElementById('debug');
    const showTextBox = document.getElementById('show-button-text-checkbox');
    const favouritesBox = document.getElementById('show-favourites-checkbox');
    const alignmentSelect = document.getElementById('alignment-select');
    const themeSelect = document.getElementById('theme-select');

    debugBox.checked = true;
    showTextBox.checked = false;
    favouritesBox.checked = true;
    alignmentSelect.value = 'center';
    themeSelect.value = 'dark';

    debugBox.dispatchEvent(new Event('change'));
    showTextBox.dispatchEvent(new Event('change'));
    favouritesBox.dispatchEvent(new Event('change'));
    alignmentSelect.dispatchEvent(new Event('change'));
    themeSelect.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const lastPayload = chrome.storage.sync.set.mock.calls.pop()[0];
    expect(lastPayload).toMatchObject({
      gmailCalDebug: true,
      gmailCalTheme: 'dark',
      showButtonText: false,
      showFavourites: true,
      toolbarAlignment: 'center',
    });
  });

  test('applies a theme change before its storage write finishes', async () => {
    let finishWrite;
    await loadModule({
      setHandler: (_payload, callback) => {
        finishWrite = callback;
      },
    });
    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = 'dark';

    themeSelect.dispatchEvent(new Event('change'));

    expect(document.documentElement.getAttribute('data-gcal-theme')).toBe('dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishWrite();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  test('coalesces overlapping saves so only the newest value is written', async () => {
    const writes = [];
    const chrome = await loadModule({
      setHandler: (payload, callback) => writes.push({ payload, callback }),
    });
    const debugBox = document.getElementById('debug');

    debugBox.checked = true;
    debugBox.dispatchEvent(new Event('change'));
    debugBox.checked = false;
    debugBox.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writes).toHaveLength(1);
    expect(writes[0].payload.gmailCalDebug).toBe(false);
    writes[0].callback();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writes).toHaveLength(1);

    const storageListener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    storageListener({ gmailCalTheme: { newValue: 'dark' } }, 'sync');
    expect(debugBox.checked).toBe(false);
  });

  test('does not apply an older local storage acknowledgement over a pending edit', async () => {
    const writes = [];
    const chrome = await loadModule({
      setHandler: (payload, callback) => writes.push({ payload, callback }),
    });
    const debugBox = document.getElementById('debug');

    debugBox.checked = true;
    debugBox.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    debugBox.checked = false;
    debugBox.dispatchEvent(new Event('change'));

    const firstWrite = writes[0];
    firstWrite.callback();
    const storageListener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    storageListener(
      {
        gmailCalDebug: { newValue: true },
        gmailCalOptionsWriteId: { newValue: firstWrite.payload.gmailCalOptionsWriteId },
      },
      'sync',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(debugBox.checked).toBe(false);
    expect(writes[1].payload.gmailCalDebug).toBe(false);
  });

  test('does not overwrite an external setting with a queued local patch', async () => {
    const writes = [];
    const chrome = await loadModule({
      setHandler: (payload, callback) => writes.push({ payload, callback }),
    });
    const debugBox = document.getElementById('debug');
    const showTextBox = document.getElementById('show-button-text-checkbox');
    const themeSelect = document.getElementById('theme-select');

    debugBox.checked = true;
    debugBox.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    showTextBox.checked = false;
    showTextBox.dispatchEvent(new Event('change'));

    const storageListener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    storageListener({ gmailCalTheme: { newValue: 'dark' } }, 'sync');
    writes[0].callback();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(themeSelect.value).toBe('dark');
    expect(writes[1].payload).toMatchObject({ showButtonText: false });
    expect(writes[1].payload).not.toHaveProperty('gmailCalTheme');
  });

  test('logs retrieval errors from storage', async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const chrome = await loadModule({ getError: 'boom', waitForRestore: false });
      await jest.advanceTimersByTimeAsync(3500);

      expect(chrome.storage.sync.get).toHaveBeenCalledTimes(4);
      expect(errorSpy).toHaveBeenCalledWith('Error retrieving options:', expect.any(Error));
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      errorSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  test('logs saving errors to storage', async () => {
    await loadModule({
      setError: 'save failure',
      storageValues: { gmailCalDebug: false, showButtonText: true },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const debugBox = document.getElementById('debug');
    debugBox.checked = true;

    debugBox.dispatchEvent(new Event('change'));

    // Wait for Promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error saving options:', expect.any(Error));
    expect(debugBox.checked).toBe(false);
    errorSpy.mockRestore();
  });

  test('sets document direction from the UI language', async () => {
    jest.resetModules();
    const chrome = useChromeMock({
      i18n: {
        getMessage: jest.fn((key) => baseMessages[key] ?? ''),
        getUILanguage: jest.fn(() => 'ar'),
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => callback(makeOptionsPayload())),
          set: jest.fn((payload, callback) => callback?.()),
        },
      },
      runtime: { lastError: null },
    });
    renderHtml();
    await jest.isolateModulesAsync(async () => {
      await import('../src/modules/options.js');
    });
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(chrome.i18n.getUILanguage).toHaveBeenCalled();
  });

  test('skips optional localisation hooks when nodes missing', async () => {
    await loadModule({ renderOptions: { includeOptionals: false } });

    expect(document.getElementById('showButtonTextLegend')).toBeNull();
    expect(document.getElementById('alignmentLabel')).toBeNull();
    expect(document.getElementById('themeOptionDark')).toBeNull();
    // Should still localise required labels without throwing
    expect(document.getElementById('showButtonTextLabel').textContent).toBe('Show Text Label');
  });

  test('handles missing select controls without errors', async () => {
    await loadModule({
      renderOptions: {
        includeOptionals: true,
        includeAlignmentSelect: false,
        includeThemeSelect: false,
        includeFavouritesCheckbox: false,
      },
    });

    expect(document.getElementById('alignment-select')).toBeNull();
    expect(document.getElementById('theme-select')).toBeNull();
    expect(() => document.getElementById('debug').dispatchEvent(new Event('change'))).not.toThrow();
  });

  test('localises experimental section text', async () => {
    await loadModule();

    const experimentalLegend = document.querySelector('[data-i18n="experimental_legend"]');
    const experimentalDescription = document.querySelector(
      '[data-i18n="experimental_description"]',
    );

    expect(experimentalLegend.textContent).toBe('Experimental');
    expect(experimentalDescription.textContent).toBe(
      'Experimental features are in active testing and may only be available in English.',
    );
  });

  test('handles missing experimental section without errors', async () => {
    await loadModule({ renderOptions: { includeExperimental: false } });

    expect(document.querySelector('[data-i18n="experimental_legend"]')).toBeNull();
    expect(document.querySelector('[data-i18n="experimental_description"]')).toBeNull();
    // Should still work without throwing
    expect(() => document.getElementById('debug').dispatchEvent(new Event('change'))).not.toThrow();
  });

  test('localises AI & Transcription checkbox label', async () => {
    await loadModule();
    const aiNotetakersLabel = document.querySelector('[data-i18n="options_show_ai_notetakers"]');
    expect(aiNotetakersLabel.textContent).toBe('Show AI & Transcription button');
  });

  test('restores AI & Transcription checkbox state', async () => {
    await loadModule({ storageValues: { showAiNotetakers: true } });
    const aiNotetakersCheckbox = document.getElementById('show-ai-notetakers-checkbox');
    expect(aiNotetakersCheckbox.checked).toBe(true);
  });

  test('saves AI & Transcription checkbox state', async () => {
    const chrome = await loadModule();
    const aiNotetakersCheckbox = document.getElementById('show-ai-notetakers-checkbox');

    aiNotetakersCheckbox.checked = true;
    aiNotetakersCheckbox.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ showAiNotetakers: true }),
      expect.any(Function),
    );
  });
});
