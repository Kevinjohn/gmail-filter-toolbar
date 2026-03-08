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
  experimental_description: 'Experimental features are in active testing and may only be available in English.',
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
    description: document.querySelector('[data-i18n="experimental_description"]')?.textContent ?? null,
    showAiNotetakersLabel: document.querySelector('[data-i18n="options_show_ai_notetakers"]')?.textContent ?? null,
    showAiNotetakersChecked: document.getElementById('show-ai-notetakers-checkbox')?.checked ?? false,
    showDevNotificationsLabel: document.querySelector('[data-i18n="options_show_dev_notifications"]')?.textContent ?? null,
    showDevNotificationsChecked: document.getElementById('show-dev-notifications-checkbox')?.checked ?? false,
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
      ${includeAlignmentSelect ? `<select id="alignment-select">
        ${includeOptionals ? '<option id="alignmentOptionStart" value="start"></option>' : ''}
        ${includeOptionals ? '<option id="alignmentOptionCenter" value="center"></option>' : ''}
      </select>` : ''}
      ${includeOptionals && includeFavouritesCheckbox ? '<label for="show-favourites-checkbox" id="showFavouritesLabel"></label>' : ''}
      ${includeFavouritesCheckbox ? '<input type="checkbox" id="show-favourites-checkbox" />' : ''}
    </fieldset>
    <fieldset>
      ${includeOptionals ? '<legend id="themeLegend"></legend>' : ''}
      ${includeOptionals ? '<label for="theme-select" id="themeLabel"></label>' : ''}
      ${includeThemeSelect ? `<select id="theme-select">
        ${includeOptionals ? '<option id="themeOptionSystem" value="system"></option>' : ''}
        ${includeOptionals ? '<option id="themeOptionLight" value="light"></option>' : ''}
        ${includeOptionals ? '<option id="themeOptionDark" value="dark"></option>' : ''}
      </select>` : ''}
    </fieldset>
    ${includeExperimental ? `<fieldset id="experimental-section">
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
    </fieldset>` : ''}
  `;
};

async function loadModule({
  storageValues = makeOptionsPayload(),
  getError,
  setError,
  renderOptions,
} = {}) {
  jest.resetModules();
  const chrome = useChromeMock({
    i18n: {
      getMessage: jest.fn((key) => baseMessages[key] ?? ''),
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
      ['gmailCalDebug', 'showButtonText', 'showFavourites', 'showAiNotetakers', 'showDevNotifications', 'toolbarAlignment', 'gmailCalTheme'],
      expect.any(Function),
    );
    expect(document.getElementById('pageTitle').textContent).toBe('Mock Page Title');
    expect(document.title).toBe('Mock Page Title');
    expect(document.getElementById('alignmentOptionCenter').textContent).toBe('Align Center');
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

    const lastPayload = chrome.storage.sync.set.mock.calls.pop()[0];
    expect(lastPayload).toMatchObject({
      gmailCalDebug: true,
      gmailCalTheme: 'dark',
      showButtonText: false,
      showFavourites: true,
      showAiNotetakers: false,
      showDevNotifications: false,
      toolbarAlignment: 'center',
    });
  });

  test('logs retrieval errors from storage', async () => {
    const chrome = await loadModule({ getError: 'boom' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Wait for Promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error retrieving options:', expect.any(Error));
    errorSpy.mockRestore();
  });

  test('logs saving errors to storage', async () => {
    const chrome = await loadModule({ setError: 'save failure' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const debugBox = document.getElementById('debug');
    debugBox.checked = true;

    debugBox.dispatchEvent(new Event('change'));

    // Wait for Promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('Error saving options:', expect.any(Error));
    errorSpy.mockRestore();
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
    const experimentalDescription = document.querySelector('[data-i18n="experimental_description"]');

    expect(experimentalLegend.textContent).toBe('Experimental');
    expect(experimentalDescription.textContent).toBe('Experimental features are in active testing and may only be available in English.');
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

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ showAiNotetakers: true }),
      expect.any(Function),
    );
  });
});
